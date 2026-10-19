"use server";

import { prisma } from "@/lib/prisma";
import { requireUser, assertCanMutate } from "@/lib/auth/session";
import { FocusMode, FocusSessionStatus } from "@prisma/client";
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
} from "@/lib/focus/session-logic";

/**
 * Helper internal: Menutup otomatis sesi yang terlantar > 4 jam tanpa aktivitas,
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
      status: active.status,
      updatedAt: active.updatedAt,
    },
    now
  );

  // 1. Sesi terlantar > 4 jam: tutup STOPPED_EARLY
  if (evaluation.isAbandoned) {
    await prisma.focusSession.update({
      where: { id: active.id },
      data: {
        status: FocusSessionStatus.STOPPED_EARLY,
        accumulatedSec: evaluation.elapsedSec,
        lastResumedAt: null,
        endedAt: now,
      },
    });
    return null;
  }

  // 2. Target FOCUS tercapai dan dibiarkan > 10 menit: otomatis COMPLETED (lazy finalization)
  if (evaluation.isAutoCompleted) {
    await prisma.focusSession.update({
      where: { id: active.id },
      data: {
        status: FocusSessionStatus.COMPLETED,
        accumulatedSec: active.plannedSec, // Akumulasi dikunci di plannedSec
        lastResumedAt: null,
        endedAt: new Date(active.startedAt.getTime() + active.plannedSec * 1000),
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

  return {
    id: fullSession.id,
    clientSessionId: fullSession.clientSessionId,
    mode: fullSession.mode,
    plannedSec: fullSession.plannedSec,
    startedAt: fullSession.startedAt.toISOString(),
    lastResumedAt: fullSession.lastResumedAt?.toISOString() || null,
    accumulatedSec: fullSession.accumulatedSec,
    status: fullSession.status,
    note: fullSession.note,
    courseId: fullSession.courseId,
    taskId: fullSession.taskId,
    course: fullSession.course,
    task: fullSession.task,
  };
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
    return {
      success: true,
      session: {
        id: existing.id,
        clientSessionId: existing.clientSessionId,
        mode: existing.mode,
        plannedSec: existing.plannedSec,
        startedAt: existing.startedAt.toISOString(),
        lastResumedAt: existing.lastResumedAt?.toISOString() || null,
        accumulatedSec: existing.accumulatedSec,
        status: existing.status,
        note: existing.note,
        courseId: existing.courseId,
        taskId: existing.taskId,
        course: existing.course,
        task: existing.task,
      },
    };
  }

  // 2. Jalankan cleanup sesi lama yang mungkin menggantung > 4 jam
  const currentActive = await autoCleanupStaleSession(userId);
  if (currentActive) {
    throw new Error("Anda masih memiliki sesi fokus aktif. Selesaikan atau batalkan sesi tersebut terlebih dahulu.");
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

  revalidatePath("/home/focus");
  revalidatePath("/home/study-analytics");

  return {
    success: true,
    session: {
      id: created.id,
      clientSessionId: created.clientSessionId,
      mode: created.mode,
      plannedSec: created.plannedSec,
      startedAt: created.startedAt.toISOString(),
      lastResumedAt: created.lastResumedAt?.toISOString() || null,
      accumulatedSec: created.accumulatedSec,
      status: created.status,
      note: created.note,
      courseId: created.courseId,
      taskId: created.taskId,
      course: created.course,
      task: created.task,
    },
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
      status: FocusSessionStatus.PAUSED,
    },
  });

  revalidatePath("/home/focus");
  return { success: true, accumulatedSec: updated.accumulatedSec };
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
  await prisma.focusSession.update({
    where: { id: sessionId },
    data: {
      lastResumedAt: now,
      status: FocusSessionStatus.RUNNING,
    },
  });

  revalidatePath("/home/focus");
  return { success: true };
}

/**
 * Menyelesaikan sesi fokus secara penuh (COMPLETED).
 * Pada mode FOCUS, durasi fokus dikunci di plannedSec (waktu lewat target tidak dihitung).
 */
export async function completeFocusSessionAction(sessionId: string, note?: string | null) {
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
      endedAt: now,
      status: FocusSessionStatus.COMPLETED,
      note: note !== undefined ? note?.slice(0, 500) : target.note,
    },
  });

  revalidatePath("/home/focus");
  revalidatePath("/home/study-analytics");

  return { success: true, accumulatedSec: updated.accumulatedSec };
}

/**
 * Menghentikan sesi fokus lebih awal (STOPPED_EARLY).
 * Tetap mencatat durasi fokus yang berhasil diraih (dibatasi plannedSec jika FOCUS).
 */
export async function stopEarlyFocusSessionAction(sessionId: string, note?: string | null) {
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
      endedAt: now,
      status: FocusSessionStatus.STOPPED_EARLY,
      note: note !== undefined ? note?.slice(0, 500) : target.note,
    },
  });

  revalidatePath("/home/focus");
  revalidatePath("/home/study-analytics");

  return { success: true, accumulatedSec: updated.accumulatedSec };
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
      status: FocusSessionStatus.RUNNING,
    },
    include: {
      course: { select: { id: true, name: true, code: true } },
      task: { select: { id: true, title: true } },
    },
  });

  revalidatePath("/home/focus");
  revalidatePath("/home/study-analytics");

  return {
    success: true,
    session: {
      id: updated.id,
      clientSessionId: updated.clientSessionId,
      mode: updated.mode,
      plannedSec: updated.plannedSec,
      startedAt: updated.startedAt.toISOString(),
      lastResumedAt: updated.lastResumedAt?.toISOString() || null,
      accumulatedSec: updated.accumulatedSec,
      status: updated.status,
      note: updated.note,
      courseId: updated.courseId,
      taskId: updated.taskId,
      course: updated.course,
      task: updated.task,
    },
  };
}

/**
 * Membatalkan sesi fokus (CANCELLED).
 */
export async function cancelFocusSessionAction(sessionId: string) {
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
  await prisma.focusSession.update({
    where: { id: sessionId },
    data: {
      status: FocusSessionStatus.CANCELLED,
      lastResumedAt: null,
      endedAt: now,
    },
  });

  revalidatePath("/home/focus");
  revalidatePath("/home/study-analytics");

  return { success: true };
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
 * Helper untuk mengambil preferensi belajar atau inisialisasi default jika belum ada.
 */
export async function getOrCreateStudyPreference(userId: string): Promise<StudyPreferenceDto> {
  let pref = await prisma.studyPreference.findUnique({
    where: { userId },
  });

  if (!pref) {
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
      },
    });
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
    aiConsent: pref.aiConsent,
    floatMode: pref.floatMode || FloatMode.IN_APP,
    alertIntensity: pref.alertIntensity || AlertIntensity.NORMAL,
    soundVolume: pref.soundVolume ?? 80,
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
  aiConsent: z.boolean().optional(),
  floatMode: z.nativeEnum(FloatMode).optional(),
  alertIntensity: z.nativeEnum(AlertIntensity).optional(),
  soundVolume: z.number().int().min(0).max(100).optional(),
});

/**
 * Memperbarui preferensi belajar user.
 */
export async function updateStudyPreferencesAction(rawInput: z.infer<typeof UpdatePreferenceSchema>) {
  const session = await requireUser();
  assertCanMutate(session);
  const userId = session.user!.id;

  const data = UpdatePreferenceSchema.parse(rawInput);

  const updated = await prisma.studyPreference.upsert({
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
    },
    update: data,
  });

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
      aiConsent: updated.aiConsent,
      floatMode: updated.floatMode,
      alertIntensity: updated.alertIntensity,
      soundVolume: updated.soundVolume,
    },
  };
}

/**
 * Mengambil riwayat sesi fokus berpaginasi untuk user login.
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
    ...(params?.status ? { status: params.status } : {}),
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
