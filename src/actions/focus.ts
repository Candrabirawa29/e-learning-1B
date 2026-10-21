"use server";

import { prisma } from "@/lib/prisma";
import { requireUser, assertCanMutate } from "@/lib/auth/session";
import { FocusMode, FocusSessionStatus, Prisma, StudyPreference } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  MAX_SESSION_SEC,
  EXTENSION_STEP_SEC,
  ActiveFocusSessionDto,
  StudyPreferenceDto,
  FloatMode,
  AlertIntensity,
} from "@/types/focus";
import {
  resolveFocusSessionProgress,
  extendFocusSessionPlan,
  deriveStatus,
} from "@/lib/focus/session-logic";
import { wibDayKey } from "@/lib/datetime";
import { wibLocal } from "@/lib/analytics/study-queries";

const sessionVersions = new Map<string, number>();

function getSessionVersion(sessionId: string): number {
  return sessionVersions.get(sessionId) ?? 1;
}

function bumpSessionVersion(sessionId: string): number {
  const current = sessionVersions.get(sessionId) ?? 0;
  const next = current + 1;
  sessionVersions.set(sessionId, next);
  return next;
}

function serializeActiveSession(
  session: {
    id: string;
    clientSessionId: string;
    mode: FocusMode;
    plannedSec: number;
    startedAt: Date;
    lastResumedAt: Date | null;
    accumulatedSec: number;
    lastSeenAt?: Date | null;
    isCorrected?: boolean;
    status: FocusSessionStatus;
    note: string | null;
    courseId: string | null;
    taskId: string | null;
    course?: { id: string; name: string; code: string | null } | null;
    task?: { id: string; title: string } | null;
  },
  version: number
): ActiveFocusSessionDto {
  return {
    id: session.id,
    clientSessionId: session.clientSessionId,
    mode: session.mode,
    plannedSec: session.plannedSec,
    startedAt: session.startedAt.toISOString(),
    lastResumedAt: session.lastResumedAt ? session.lastResumedAt.toISOString() : null,
    accumulatedSec: session.accumulatedSec,
    lastSeenAt: session.lastSeenAt ? session.lastSeenAt.toISOString() : null,
    isCorrected: session.isCorrected,
    status: session.status,
    note: session.note,
    courseId: session.courseId,
    taskId: session.taskId,
    course: session.course,
    task: session.task,
    version,
  };
}

/**
 * Helper internal: Menutup otomatis sesi yang terlantar > 4 jam tanpa aktivitas,
 * sesi RUNNING tanpa heartbeat > 10 menit (difinalkan pada lastSeenAt),
 * atau sesi FOCUS yang telah mencapai target dan dibiarkan > 10 menit tanpa konfirmasi (auto-complete).
 */
async function autoCleanupStaleSession(userId: string) {
  const active = await prisma.focusSession.findFirst({
    where: {
      userId,
      status: { in: [FocusSessionStatus.RUNNING, FocusSessionStatus.PAUSED] },
    },
  });

  if (!active) return null;

  const now = new Date();
  const evaluation = resolveFocusSessionProgress(
    {
      mode: active.mode,
      plannedSec: active.plannedSec,
      startedAt: active.startedAt,
      lastResumedAt: active.lastResumedAt,
      accumulatedSec: active.accumulatedSec,
      lastSeenAt: active.lastSeenAt,
      status: active.status,
      updatedAt: active.updatedAt,
    },
    now
  );

  // 1. Sesi terlantar > 4 jam: pengaman ekstrim
  if (evaluation.isAbandoned) {
    if (evaluation.focusSec < 60) {
      await prisma.focusSession.delete({ where: { id: active.id } });
    } else {
      await prisma.focusSession.update({
        where: { id: active.id },
        data: {
          status: FocusSessionStatus.STOPPED_EARLY,
          accumulatedSec: evaluation.focusSec,
          lastResumedAt: null,
          endedAt: new Date(evaluation.effectiveEndMs),
        },
      });
    }
    return null;
  }

  // 2. Sesi RUNNING tanpa heartbeat > 10 menit: finalkan pada lastSeenAt
  if (evaluation.isHeartbeatStale) {
    const derived = deriveStatus(evaluation.focusSec, active.plannedSec, active.mode);
    if (!derived) {
      // Di bawah 60 detik tidak disimpan (dihapus)
      await prisma.focusSession.delete({ where: { id: active.id } });
    } else {
      await prisma.focusSession.update({
        where: { id: active.id },
        data: {
          status: derived,
          accumulatedSec: evaluation.focusSec,
          lastResumedAt: null,
          endedAt: new Date(evaluation.effectiveEndMs),
        },
      });
    }
    return null;
  }

  // 3. Target FOCUS tercapai dan dibiarkan > 10 menit: otomatis COMPLETED (lazy finalization)
  if (evaluation.isAutoCompleted) {
    await prisma.focusSession.update({
      where: { id: active.id },
      data: {
        status: FocusSessionStatus.COMPLETED,
        accumulatedSec: active.plannedSec, // Akumulasi dikunci di plannedSec
        lastResumedAt: null,
        endedAt: new Date(evaluation.effectiveEndMs),
      },
    });
    return null;
  }

  return active;
}

/**
 * Mengambil sesi fokus aktif user saat ini (RUNNING atau PAUSED).
 */
export async function getActiveFocusSessionAction(): Promise<ActiveFocusSessionDto | null> {
  const session = await requireUser();
  const userId = session.user!.id;

  const active = await autoCleanupStaleSession(userId);
  if (!active) return null;

  // Fetch with course and task details
  const fullSession = await prisma.focusSession.findUnique({
    where: { id: active.id },
    include: {
      course: { select: { id: true, name: true, code: true } },
      task: { select: { id: true, title: true } },
    },
  });

  if (!fullSession) return null;

  const version = getSessionVersion(fullSession.id);
  return serializeActiveSession(fullSession, version);
}

/**
 * Heartbeat klien tiap 30 detik saat sesi RUNNING.
 * Endpoint hanya menerima sesi milik user dan berstatus RUNNING.
 */
export async function heartbeatFocusSessionAction(sessionId: string) {
  const session = await requireUser();
  const userId = session.user!.id;

  const target = await prisma.focusSession.findFirst({
    where: {
      id: sessionId,
      userId,
      status: FocusSessionStatus.RUNNING,
    },
  });

  if (!target) return { success: false };

  await prisma.focusSession.update({
    where: { id: sessionId },
    data: { lastSeenAt: new Date() },
  });

  return { success: true };
}

const StartFocusSchema = z.object({
  clientSessionId: z.string().min(1, "clientSessionId wajib diisi"),
  mode: z.nativeEnum(FocusMode).default(FocusMode.FOCUS),
  plannedSec: z.number().int().min(0).max(MAX_SESSION_SEC, "Durasi sesi maksimal 4 jam (14.400 detik)"),
  courseId: z.string().nullable().optional(),
  taskId: z.string().nullable().optional(),
  note: z.string().max(500, "Catatan maksimal 500 karakter").nullable().optional(),
});

/**
 * Memulai sesi fokus baru (Pomodoro atau Stopwatch).
 * Anti-duplikat via clientSessionId unik per user.
 * Menyimpan konteks terakhir ke StudyPreference.
 */
export async function startFocusSessionAction(rawInput: z.infer<typeof StartFocusSchema>) {
  const session = await requireUser();
  assertCanMutate(session);
  const userId = session.user!.id;

  const input = StartFocusSchema.parse(rawInput);

  // 1. Cek idempotensi: jika clientSessionId sudah ada untuk user ini, kembalikan sesi tersebut
  const existing = await prisma.focusSession.findUnique({
    where: {
      userId_clientSessionId: {
        userId,
        clientSessionId: input.clientSessionId,
      },
    },
    include: {
      course: { select: { id: true, name: true, code: true } },
      task: { select: { id: true, title: true } },
    },
  });

  if (existing) {
    const version = getSessionVersion(existing.id);
    return {
      success: true,
      version,
      session: serializeActiveSession(existing, version),
    };
  }

  // 2. Jalankan cleanup sesi lama yang mungkin menggantung
  const currentActive = await autoCleanupStaleSession(userId);
  if (currentActive) {
    throw new Error("Anda masih memiliki sesi fokus aktif. Selesaikan atau buang sesi tersebut terlebih dahulu.");
  }

  // 3. Buat sesi baru
  const now = new Date();
  const created = await prisma.focusSession.create({
    data: {
      userId,
      clientSessionId: input.clientSessionId,
      mode: input.mode,
      plannedSec: input.plannedSec,
      startedAt: now,
      lastResumedAt: now,
      lastSeenAt: now,
      accumulatedSec: 0,
      status: FocusSessionStatus.RUNNING,
      courseId: input.courseId || null,
      taskId: input.taskId || null,
      note: input.note?.trim() || null,
    },
    include: {
      course: { select: { id: true, name: true, code: true } },
      task: { select: { id: true, title: true } },
    },
  });

  // Simpan konteks terakhir ke StudyPreference
  await prisma.studyPreference.upsert({
    where: { userId },
    create: {
      userId,
      lastCourseId: input.courseId || null,
      lastTaskId: input.taskId || null,
      lastMode: input.mode,
    },
    update: {
      lastCourseId: input.courseId || null,
      lastTaskId: input.taskId || null,
      lastMode: input.mode,
    },
  });

  revalidatePath("/home/focus");
  revalidatePath("/home/study-analytics");

  const version = bumpSessionVersion(created.id);
  return {
    success: true,
    version,
    session: serializeActiveSession(created, version),
  };
}

/**
 * Menjeda sesi fokus (PAUSE).
 * Menghitung akumulasi detik dan mengosongkan lastResumedAt agar jeda tidak dihitung.
 */
export async function pauseFocusSessionAction(sessionId: string) {
  const session = await requireUser();
  assertCanMutate(session);
  const userId = session.user!.id;

  const target = await prisma.focusSession.findUnique({
    where: { id: sessionId },
  });

  if (!target || target.userId !== userId) {
    throw new Error("Sesi tidak ditemukan atau bukan milik Anda.");
  }

  if (target.status !== FocusSessionStatus.RUNNING) {
    throw new Error("Hanya sesi yang sedang berjalan yang dapat dijeda.");
  }

  const now = new Date();
  const evaluation = resolveFocusSessionProgress(
    {
      mode: target.mode,
      plannedSec: target.plannedSec,
      startedAt: target.startedAt,
      lastResumedAt: target.lastResumedAt,
      accumulatedSec: target.accumulatedSec,
      lastSeenAt: target.lastSeenAt,
      status: target.status,
      updatedAt: target.updatedAt,
    },
    now
  );

  const updated = await prisma.focusSession.update({
    where: { id: sessionId },
    data: {
      accumulatedSec: evaluation.focusSec,
      lastResumedAt: null,
      lastSeenAt: now,
      status: FocusSessionStatus.PAUSED,
    },
    include: {
      course: { select: { id: true, name: true, code: true } },
      task: { select: { id: true, title: true } },
    },
  });

  const version = bumpSessionVersion(sessionId);
  revalidatePath("/home/focus");
  return {
    success: true,
    version,
    accumulatedSec: updated.accumulatedSec,
    session: serializeActiveSession(updated, version),
  };
}

/**
 * Melanjutkan sesi fokus yang dijeda (RESUME).
 */
export async function resumeFocusSessionAction(sessionId: string) {
  const session = await requireUser();
  assertCanMutate(session);
  const userId = session.user!.id;

  const target = await prisma.focusSession.findUnique({
    where: { id: sessionId },
  });

  if (!target || target.userId !== userId) {
    throw new Error("Sesi tidak ditemukan atau bukan milik Anda.");
  }

  if (target.status !== FocusSessionStatus.PAUSED) {
    throw new Error("Hanya sesi yang sedang dijeda yang dapat dilanjutkan.");
  }

  if (target.accumulatedSec >= MAX_SESSION_SEC) {
    throw new Error("Sesi telah mencapai batas maksimum 4 jam.");
  }

  const now = new Date();
  const updated = await prisma.focusSession.update({
    where: { id: sessionId },
    data: {
      lastResumedAt: now,
      lastSeenAt: now,
      status: FocusSessionStatus.RUNNING,
    },
    include: {
      course: { select: { id: true, name: true, code: true } },
      task: { select: { id: true, title: true } },
    },
  });

  const version = bumpSessionVersion(sessionId);
  revalidatePath("/home/focus");
  return {
    success: true,
    version,
    session: serializeActiveSession(updated, version),
  };
}

/**
 * Mengakhiri sesi fokus (tombol tunggal "Akhiri").
 * Status diturunkan dari angka via deriveStatus:
 * - focusSec >= plannedSec = COMPLETED
 * - 60 <= focusSec < plannedSec = STOPPED_EARLY
 * - focusSec < 60 = Dihapus (tidak disimpan, return DISCARDED)
 */
export async function endFocusSessionAction(sessionId: string, note?: string | null) {
  const session = await requireUser();
  assertCanMutate(session);
  const userId = session.user!.id;

  const target = await prisma.focusSession.findUnique({
    where: { id: sessionId },
  });

  if (!target || target.userId !== userId) {
    throw new Error("Sesi tidak ditemukan atau bukan milik Anda.");
  }

  if (
    target.status !== FocusSessionStatus.RUNNING &&
    target.status !== FocusSessionStatus.PAUSED
  ) {
    throw new Error("Sesi sudah tidak aktif.");
  }

  const now = new Date();
  const evaluation = resolveFocusSessionProgress(
    {
      mode: target.mode,
      plannedSec: target.plannedSec,
      startedAt: target.startedAt,
      lastResumedAt: target.lastResumedAt,
      accumulatedSec: target.accumulatedSec,
      lastSeenAt: target.lastSeenAt,
      status: target.status,
      updatedAt: target.updatedAt,
    },
    now
  );

  const focusSec = evaluation.focusSec;
  const status = deriveStatus(focusSec, target.plannedSec, target.mode);

  if (!status) {
    // Kurang dari 60 detik: tidak disimpan (dihapus dari DB)
    await prisma.focusSession.delete({ where: { id: sessionId } });
    revalidatePath("/home/focus");
    revalidatePath("/home/study-analytics");
    return {
      success: true,
      action: "DISCARDED" as const,
      message: "Terlalu singkat, tidak dicatat",
      focusSec,
      status: null,
    };
  }

  const updated = await prisma.focusSession.update({
    where: { id: sessionId },
    data: {
      accumulatedSec: focusSec,
      lastResumedAt: null,
      lastSeenAt: now,
      endedAt: now,
      status,
      note: note !== undefined ? note?.slice(0, 500) : target.note,
    },
    include: {
      course: { select: { id: true, name: true, code: true } },
      task: { select: { id: true, title: true } },
    },
  });

  const version = bumpSessionVersion(sessionId);
  revalidatePath("/home/focus");
  revalidatePath("/home/study-analytics");

  return {
    success: true,
    version,
    action: "SAVED" as const,
    status,
    accumulatedSec: updated.accumulatedSec,
    session: serializeActiveSession(updated, version),
  };
}

/**
 * Backward compatibility wrappers.
 */
export async function completeFocusSessionAction(sessionId: string, note?: string | null) {
  return endFocusSessionAction(sessionId, note);
}

export async function stopEarlyFocusSessionAction(sessionId: string, note?: string | null) {
  return endFocusSessionAction(sessionId, note);
}

/**
 * "Buang sesi": Menghapus baris dari database, tidak masuk statistik.
 */
export async function discardFocusSessionAction(sessionId: string) {
  const session = await requireUser();
  assertCanMutate(session);
  const userId = session.user!.id;

  const target = await prisma.focusSession.findUnique({
    where: { id: sessionId },
  });

  if (!target || target.userId !== userId) {
    throw new Error("Sesi tidak ditemukan atau bukan milik Anda.");
  }

  await prisma.focusSession.delete({
    where: { id: sessionId },
  });

  revalidatePath("/home/focus");
  revalidatePath("/home/study-analytics");

  return { success: true, action: "DISCARDED" as const };
}

/**
 * Mengubah konteks (mata kuliah, tugas, mode) saat sesi aktif atau sebelum sesi.
 * Berlaku untuk seluruh sesi aktif.
 */
export async function updateActiveSessionContextAction(
  sessionId: string,
  data: {
    courseId?: string | null;
    taskId?: string | null;
    mode?: FocusMode;
  }
) {
  const session = await requireUser();
  assertCanMutate(session);
  const userId = session.user!.id;

  const target = await prisma.focusSession.findUnique({
    where: { id: sessionId },
  });

  if (!target || target.userId !== userId) {
    throw new Error("Sesi tidak ditemukan atau bukan milik Anda.");
  }

  const updateData: {
    courseId?: string | null;
    taskId?: string | null;
    mode?: FocusMode;
  } = {};

  if (data.courseId !== undefined) updateData.courseId = data.courseId;
  if (data.taskId !== undefined) updateData.taskId = data.taskId;
  if (data.mode !== undefined) updateData.mode = data.mode;

  const updated = await prisma.focusSession.update({
    where: { id: sessionId },
    data: updateData,
    include: {
      course: { select: { id: true, name: true, code: true } },
      task: { select: { id: true, title: true } },
    },
  });

  // Simpan juga ke preferensi pengguna untuk sesi berikutnya
  await prisma.studyPreference.upsert({
    where: { userId },
    create: {
      userId,
      lastCourseId: data.courseId ?? null,
      lastTaskId: data.taskId ?? null,
      lastMode: data.mode ?? target.mode,
    },
    update: {
      ...(data.courseId !== undefined ? { lastCourseId: data.courseId } : {}),
      ...(data.taskId !== undefined ? { lastTaskId: data.taskId } : {}),
      ...(data.mode !== undefined ? { lastMode: data.mode } : {}),
    },
  });

  const version = bumpSessionVersion(sessionId);
  revalidatePath("/home/focus");

  return {
    success: true,
    version,
    session: serializeActiveSession(updated, version),
  };
}

/**
 * Memperpanjang sesi fokus aktif "Lanjut fokus +5 menit".
 * Akumulasi dikunci di target lama (plannedSec lama), plannedSec bertambah +300 detik,
 * dan waktu dihitung lagi dari saat tombol ditekan.
 */
export async function extendFocusSessionAction(sessionId: string) {
  const session = await requireUser();
  assertCanMutate(session);
  const userId = session.user!.id;

  const target = await prisma.focusSession.findUnique({
    where: { id: sessionId },
  });

  if (!target || target.userId !== userId) {
    throw new Error("Sesi tidak ditemukan atau bukan milik Anda.");
  }

  if (
    target.status !== FocusSessionStatus.RUNNING &&
    target.status !== FocusSessionStatus.PAUSED
  ) {
    throw new Error("Hanya sesi aktif yang dapat diperpanjang.");
  }

  const now = new Date();
  const plan = extendFocusSessionPlan(target.plannedSec, now, EXTENSION_STEP_SEC);

  const updated = await prisma.focusSession.update({
    where: { id: sessionId },
    data: {
      plannedSec: plan.newPlannedSec,
      accumulatedSec: plan.newAccumulatedSec,
      lastResumedAt: plan.newLastResumedAt,
      lastSeenAt: now,
      status: FocusSessionStatus.RUNNING,
    },
    include: {
      course: { select: { id: true, name: true, code: true } },
      task: { select: { id: true, title: true } },
    },
  });

  const version = bumpSessionVersion(sessionId);
  revalidatePath("/home/focus");
  revalidatePath("/home/study-analytics");

  return {
    success: true,
    version,
    session: serializeActiveSession(updated, version),
  };
}

/**
 * Membatalkan sesi fokus (disediakan untuk kompatibilitas, disarankan memakai discardFocusSessionAction).
 */
export async function cancelFocusSessionAction(sessionId: string) {
  return discardFocusSessionAction(sessionId);
}

/**
 * Memperbarui catatan sesi fokus.
 */
export async function updateSessionNoteAction(sessionId: string, rawNote: string) {
  const session = await requireUser();
  assertCanMutate(session);
  const userId = session.user!.id;

  const note = rawNote.trim().slice(0, 500);

  const target = await prisma.focusSession.findUnique({
    where: { id: sessionId },
  });

  if (!target || target.userId !== userId) {
    throw new Error("Sesi tidak ditemukan atau bukan milik Anda.");
  }

  await prisma.focusSession.update({
    where: { id: sessionId },
    data: { note },
  });

  revalidatePath("/home/focus");
  return { success: true, note };
}

/**
 * Menghitung jumlah siklus selesai (status COMPLETED) hari ini berdasarkan zona waktu WIB.
 * Reset otomatis tiap hari berdasarkan wibDayKey.
 */
export async function getTodayCompletedCyclesAction(): Promise<number> {
  const session = await requireUser();
  const userId = session.user!.id;

  const todayKey = wibDayKey(new Date());

  const rows = await prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
    SELECT COUNT(*)::integer AS count
    FROM "focus_sessions"
    WHERE "userId" = ${userId}
      AND "status" = 'COMPLETED'
      AND to_char(${wibLocal('"startedAt"')}, 'YYYY-MM-DD') = ${todayKey};
  `);

  return rows[0]?.count ? Number(rows[0].count) : 0;
}

/**
 * Mengedit entri riwayat sesi fokus (mata kuliah, tugas, catatan, atau koreksi durasi).
 * Koreksi durasi hanya boleh mengurangi durasi yang ada, dan ditandai isCorrected = true.
 */
export async function updateFocusSessionHistoryAction(
  sessionId: string,
  data: {
    courseId?: string | null;
    taskId?: string | null;
    note?: string | null;
    correctedSec?: number;
  }
) {
  const session = await requireUser();
  assertCanMutate(session);
  const userId = session.user!.id;

  const target = await prisma.focusSession.findUnique({
    where: { id: sessionId },
  });

  if (!target || target.userId !== userId) {
    throw new Error("Sesi tidak ditemukan atau bukan milik Anda.");
  }

  const updateData: {
    courseId?: string | null;
    taskId?: string | null;
    note?: string | null;
    accumulatedSec?: number;
    isCorrected?: boolean;
    status?: FocusSessionStatus;
  } = {};

  if (data.courseId !== undefined) updateData.courseId = data.courseId;
  if (data.taskId !== undefined) updateData.taskId = data.taskId;
  if (data.note !== undefined) updateData.note = data.note?.trim() || null;

  if (data.correctedSec !== undefined) {
    if (data.correctedSec >= target.accumulatedSec) {
      throw new Error("Koreksi durasi hanya boleh mengurangi durasi yang ada.");
    }
    if (data.correctedSec < 60) {
      throw new Error("Durasi minimal hasil koreksi adalah 60 detik (1 menit).");
    }
    updateData.accumulatedSec = data.correctedSec;
    updateData.isCorrected = true;
    const newStatus = deriveStatus(data.correctedSec, target.plannedSec, target.mode);
    if (newStatus) {
      updateData.status = newStatus;
    }
  }

  const updated = await prisma.focusSession.update({
    where: { id: sessionId },
    data: updateData,
    include: {
      course: { select: { id: true, name: true, code: true } },
      task: { select: { id: true, title: true } },
    },
  });

  revalidatePath("/home/focus");
  revalidatePath("/home/study-analytics");

  return { success: true, session: updated };
}

/**
 * Menghapus sesi fokus dari riwayat oleh pemiliknya.
 */
export async function deleteFocusSessionAction(sessionId: string) {
  const session = await requireUser();
  assertCanMutate(session);
  const userId = session.user!.id;

  const target = await prisma.focusSession.findUnique({
    where: { id: sessionId },
  });

  if (!target || target.userId !== userId) {
    throw new Error("Sesi tidak ditemukan atau bukan milik Anda.");
  }

  await prisma.focusSession.delete({
    where: { id: sessionId },
  });

  revalidatePath("/home/focus");
  revalidatePath("/home/study-analytics");

  return { success: true };
}

/**
 * Helper untuk mengambil preferensi belajar atau inisialisasi default jika belum ada.
 */
export async function getOrCreateStudyPreference(userId: string): Promise<StudyPreferenceDto> {
  let pref: (StudyPreference & { showTargetRemaining?: boolean; activeDaysTarget?: number }) | null = null;
  try {
    pref = await prisma.studyPreference.findUnique({
      where: { userId },
    });
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    if (errorObj?.code === "P2021" || errorObj?.code === "P2022" || errorObj?.message?.includes("column")) {
      // Kolom baru belum di-migrate di database, fallback query raw
      const rows = await prisma.$queryRaw<StudyPreference[]>`SELECT * FROM "study_preferences" WHERE "userId" = ${userId} LIMIT 1`;
      pref = rows[0] || null;
    } else {
      throw err;
    }
  }

  if (!pref) {
    try {
      pref = await prisma.studyPreference.create({
        data: {
          userId,
          focusDuration: 1500,
          shortBreakDuration: 300,
          longBreakDuration: 900,
          longBreakInterval: 4,
          weeklyTargetMin: 600,
          minActiveDayMin: 25,
          showTargetRemaining: true,
          activeDaysTarget: 5,
          aiConsent: false,
          floatMode: FloatMode.IN_APP,
          alertIntensity: AlertIntensity.NORMAL,
          soundVolume: 80,
          autoStartBreak: true,
          autoStartNextFocus: false,
        },
      });
    } catch {
      // Fallback create jika kolom baru belum ada
      pref = await prisma.studyPreference.create({
        data: {
          userId,
          focusDuration: 1500,
          shortBreakDuration: 300,
          longBreakDuration: 900,
          longBreakInterval: 4,
          weeklyTargetMin: 600,
          minActiveDayMin: 25,
          aiConsent: false,
          floatMode: FloatMode.IN_APP,
          alertIntensity: AlertIntensity.NORMAL,
          soundVolume: 80,
          autoStartBreak: true,
          autoStartNextFocus: false,
        } as unknown as Prisma.StudyPreferenceCreateInput,
      });
    }
  }

  return {
    id: pref.id,
    userId: pref.userId,
    focusDuration: pref.focusDuration,
    shortBreakDuration: pref.shortBreakDuration,
    longBreakDuration: pref.longBreakDuration,
    longBreakInterval: pref.longBreakInterval,
    weeklyTargetMin: pref.weeklyTargetMin,
    minActiveDayMin: pref.minActiveDayMin,
    showTargetRemaining: pref.showTargetRemaining ?? true,
    activeDaysTarget: pref.activeDaysTarget ?? 5,
    aiConsent: pref.aiConsent,
    floatMode: pref.floatMode || FloatMode.IN_APP,
    alertIntensity: pref.alertIntensity || AlertIntensity.NORMAL,
    soundVolume: pref.soundVolume ?? 80,
    lastCourseId: pref.lastCourseId,
    lastTaskId: pref.lastTaskId,
    lastMode: pref.lastMode,
    autoStartBreak: pref.autoStartBreak ?? true,
    autoStartNextFocus: pref.autoStartNextFocus ?? false,
  };
}

/**
 * Mengambil preferensi belajar user (atau menginisialisasi dengan default).
 */
export async function getStudyPreferencesAction(): Promise<StudyPreferenceDto> {
  const session = await requireUser();
  const userId = session.user!.id;
  return getOrCreateStudyPreference(userId);
}

const UpdatePreferenceSchema = z.object({
  focusDuration: z.number().int().min(60).max(14400).optional(),
  shortBreakDuration: z.number().int().min(30).max(3600).optional(),
  longBreakDuration: z.number().int().min(60).max(7200).optional(),
  longBreakInterval: z.number().int().min(1).max(12).optional(),
  weeklyTargetMin: z.number().int().min(30).max(10080).optional(),
  minActiveDayMin: z.number().int().min(5).max(480).optional(),
  showTargetRemaining: z.boolean().optional(),
  activeDaysTarget: z.number().int().min(1).max(7).optional(),
  aiConsent: z.boolean().optional(),
  floatMode: z.nativeEnum(FloatMode).optional(),
  alertIntensity: z.nativeEnum(AlertIntensity).optional(),
  soundVolume: z.number().int().min(0).max(100).optional(),
  lastCourseId: z.string().nullable().optional(),
  lastTaskId: z.string().nullable().optional(),
  lastMode: z.nativeEnum(FocusMode).nullable().optional(),
  autoStartBreak: z.boolean().optional(),
  autoStartNextFocus: z.boolean().optional(),
});

/**
 * Memperbarui preferensi belajar user.
 */
export async function updateStudyPreferencesAction(rawInput: z.infer<typeof UpdatePreferenceSchema>) {
  const session = await requireUser();
  assertCanMutate(session);
  const userId = session.user!.id;

  const data = UpdatePreferenceSchema.parse(rawInput);

  let updated: (StudyPreference & { showTargetRemaining?: boolean; activeDaysTarget?: number });
  try {
    updated = await prisma.studyPreference.upsert({
      where: { userId },
      create: {
        userId,
        focusDuration: data.focusDuration ?? 1500,
        shortBreakDuration: data.shortBreakDuration ?? 300,
        longBreakDuration: data.longBreakDuration ?? 900,
        longBreakInterval: data.longBreakInterval ?? 4,
        weeklyTargetMin: data.weeklyTargetMin ?? 600,
        minActiveDayMin: data.minActiveDayMin ?? 25,
        showTargetRemaining: data.showTargetRemaining ?? true,
        activeDaysTarget: data.activeDaysTarget ?? 5,
        aiConsent: data.aiConsent ?? false,
        floatMode: data.floatMode ?? FloatMode.IN_APP,
        alertIntensity: data.alertIntensity ?? AlertIntensity.NORMAL,
        soundVolume: data.soundVolume ?? 80,
        lastCourseId: data.lastCourseId ?? null,
        lastTaskId: data.lastTaskId ?? null,
        lastMode: data.lastMode ?? null,
        autoStartBreak: data.autoStartBreak ?? true,
        autoStartNextFocus: data.autoStartNextFocus ?? false,
      },
      update: data,
    });
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    if (errorObj?.code === "P2021" || errorObj?.code === "P2022" || errorObj?.message?.includes("column")) {
      // Fallback update tanpa kolom yang belum dimigrate
      const fallbackData = { ...data };
      delete fallbackData.showTargetRemaining;
      delete fallbackData.activeDaysTarget;

      updated = await prisma.studyPreference.upsert({
        where: { userId },
        create: {
          userId,
          focusDuration: data.focusDuration ?? 1500,
          shortBreakDuration: data.shortBreakDuration ?? 300,
          longBreakDuration: data.longBreakDuration ?? 900,
          longBreakInterval: data.longBreakInterval ?? 4,
          weeklyTargetMin: data.weeklyTargetMin ?? 600,
          minActiveDayMin: data.minActiveDayMin ?? 25,
          aiConsent: data.aiConsent ?? false,
          floatMode: data.floatMode ?? FloatMode.IN_APP,
          alertIntensity: data.alertIntensity ?? AlertIntensity.NORMAL,
          soundVolume: data.soundVolume ?? 80,
          lastCourseId: data.lastCourseId ?? null,
          lastTaskId: data.lastTaskId ?? null,
          lastMode: data.lastMode ?? null,
          autoStartBreak: data.autoStartBreak ?? true,
          autoStartNextFocus: data.autoStartNextFocus ?? false,
        } as unknown as Prisma.StudyPreferenceCreateInput,
        update: fallbackData as unknown as Prisma.StudyPreferenceUpdateInput,
      });
      updated.showTargetRemaining = data.showTargetRemaining ?? true;
      updated.activeDaysTarget = data.activeDaysTarget ?? 5;
    } else {
      throw err;
    }
  }

  revalidatePath("/home/focus");
  revalidatePath("/home/study-analytics");

  return {
    success: true,
    preferences: {
      id: updated.id,
      userId: updated.userId,
      focusDuration: updated.focusDuration,
      shortBreakDuration: updated.shortBreakDuration,
      longBreakDuration: updated.longBreakDuration,
      longBreakInterval: updated.longBreakInterval,
      weeklyTargetMin: updated.weeklyTargetMin,
      minActiveDayMin: updated.minActiveDayMin,
      showTargetRemaining: updated.showTargetRemaining ?? data.showTargetRemaining ?? true,
      activeDaysTarget: updated.activeDaysTarget ?? data.activeDaysTarget ?? 5,
      aiConsent: updated.aiConsent,
      floatMode: updated.floatMode,
      alertIntensity: updated.alertIntensity,
      soundVolume: updated.soundVolume,
      lastCourseId: updated.lastCourseId,
      lastTaskId: updated.lastTaskId,
      lastMode: updated.lastMode,
      autoStartBreak: updated.autoStartBreak,
      autoStartNextFocus: updated.autoStartNextFocus,
    },
  };
}

/**
 * Mengambil riwayat sesi fokus berpaginasi untuk user login.
 * Menyembunyikan sesi berstatus CANCELLED.
 */
export async function getFocusHistoryAction(params?: {
  page?: number;
  pageSize?: number;
  status?: FocusSessionStatus;
  courseId?: string;
}) {
  const session = await requireUser();
  const userId = session.user!.id;

  const page = Math.max(1, params?.page || 1);
  const pageSize = Math.min(50, Math.max(5, params?.pageSize || 10));
  const skip = (page - 1) * pageSize;

  const where = {
    userId,
    status: {
      not: FocusSessionStatus.CANCELLED,
      ...(params?.status ? { equals: params.status } : {}),
    },
    ...(params?.courseId ? { courseId: params.courseId } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.focusSession.count({ where }),
    prisma.focusSession.findMany({
      where,
      include: {
        course: { select: { id: true, name: true, code: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { startedAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      clientSessionId: item.clientSessionId,
      mode: item.mode,
      plannedSec: item.plannedSec,
      startedAt: item.startedAt.toISOString(),
      lastResumedAt: item.lastResumedAt?.toISOString() || null,
      accumulatedSec: item.accumulatedSec,
      lastSeenAt: item.lastSeenAt?.toISOString() || null,
      isCorrected: item.isCorrected,
      endedAt: item.endedAt?.toISOString() || null,
      status: item.status,
      note: item.note,
      courseId: item.courseId,
      taskId: item.taskId,
      course: item.course,
      task: item.task,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
