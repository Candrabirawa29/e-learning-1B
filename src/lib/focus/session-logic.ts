import {
  MAX_SESSION_SEC,
  MAX_INACTIVITY_MS,
  AUTO_COMPLETE_GRACE_SEC,
  EXTENSION_STEP_SEC,
} from "@/types/focus";

export interface FocusSessionInput {
  mode: "FOCUS" | "STOPWATCH";
  plannedSec: number;
  startedAt: Date | string | number;
  lastResumedAt?: Date | string | number | null;
  accumulatedSec: number;
  status: "RUNNING" | "PAUSED" | "COMPLETED" | "STOPPED_EARLY" | "CANCELLED";
  updatedAt?: Date | string | number | null;
}

export interface ResolvedFocusSession {
  elapsedSec: number;
  focusSec: number;
  overdueSec: number;
  remainingSec: number;
  isTargetReached: boolean;
  isAutoCompleted: boolean;
  isAbandoned: boolean;
  resolvedStatus: "RUNNING" | "PAUSED" | "COMPLETED" | "STOPPED_EARLY" | "CANCELLED";
  formattedDisplay: string;
  formattedOverdue: string | null;
}

/**
 * Konversi waktu ke milidetik secara aman.
 */
function toEpochMs(val: Date | string | number | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return val;
  if (val instanceof Date) return val.getTime();
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? null : parsed;
}

/**
 * Format detik ke string MM:SS (atau HH:MM:SS jika >= 1 jam).
 */
export function formatSecToMMSS(seconds: number): string {
  const safeSec = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safeSec / 3600);
  const m = Math.floor((safeSec % 3600) / 60);
  const s = safeSec % 60;

  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Format durasi lewat target menjadi string "+mm:ss lewat".
 */
export function formatOverdueText(overdueSec: number): string {
  return `+${formatSecToMMSS(overdueSec)} lewat`;
}

/**
 * Fungsi Murni: Menyelesaikan kalkulasi status, durasi, batasan capping,
 * dan auto-completion 10 menit untuk sesi fokus.
 *
 * Aturan Bisnis:
 * 1. Pada mode FOCUS, focusSec = min(durasi berjalan, plannedSec).
 *    Waktu lewat target dihitung sebagai overdueSec ("+mm:ss lewat"), tetapi tidak dihitung dalam fokus.
 * 2. Tanpa konfirmasi 10 menit (overdueSec >= 600) saat target tercapai, sesi otomatis COMPLETED
 *    dengan focusSec = plannedSec (finalisasi lazy, tanpa cron).
 * 3. Mode STOPWATCH tidak dibatasi durasinya oleh plannedSec.
 * 4. Sesi tanpa aktivitas > 4 jam otomatis STOPPED_EARLY dengan accumulatedSec yang valid.
 */
export function resolveFocusSessionProgress(
  session: FocusSessionInput,
  now: Date | string | number = Date.now()
): ResolvedFocusSession {
  const nowMs = toEpochMs(now) ?? Date.now();
  const startedAtMs = toEpochMs(session.startedAt) ?? nowMs;
  const lastResumedAtMs = toEpochMs(session.lastResumedAt);
  const updatedAtMs = toEpochMs(session.updatedAt) ?? startedAtMs;

  const isFocusMode = session.mode === "FOCUS";
  const isRunning = session.status === "RUNNING";
  const isPaused = session.status === "PAUSED";

  // 1. Cek sesi terlantar (abandoned): inaktivitas > 4 jam
  const lastActiveMs = lastResumedAtMs || updatedAtMs || startedAtMs;
  const elapsedSinceActivityMs = Math.max(0, nowMs - lastActiveMs);
  const isAbandoned = (isRunning || isPaused) && elapsedSinceActivityMs > MAX_INACTIVITY_MS;

  if (isAbandoned) {
    let finalAccumulated = session.accumulatedSec;
    if (isRunning && lastResumedAtMs) {
      const allowedAdditional = Math.floor(
        (lastActiveMs + MAX_INACTIVITY_MS - lastResumedAtMs) / 1000
      );
      finalAccumulated = Math.min(
        MAX_SESSION_SEC,
        session.accumulatedSec + Math.max(0, allowedAdditional)
      );
    }

    const focusSec = isFocusMode
      ? Math.min(finalAccumulated, session.plannedSec)
      : Math.min(MAX_SESSION_SEC, finalAccumulated);

    return {
      elapsedSec: finalAccumulated,
      focusSec,
      overdueSec: isFocusMode ? Math.max(0, finalAccumulated - session.plannedSec) : 0,
      remainingSec: 0,
      isTargetReached: isFocusMode && finalAccumulated >= session.plannedSec,
      isAutoCompleted: false,
      isAbandoned: true,
      resolvedStatus: "STOPPED_EARLY",
      formattedDisplay: formatSecToMMSS(focusSec),
      formattedOverdue: null,
    };
  }

  // 2. Hitung durasi berjalan aktual (elapsedSec)
  let elapsedSec = session.accumulatedSec;
  if (isRunning && lastResumedAtMs && nowMs > lastResumedAtMs) {
    const additionalRunningSec = Math.floor((nowMs - lastResumedAtMs) / 1000);
    elapsedSec += Math.max(0, additionalRunningSec);
  }

  // Batas maksimum sesi 4 jam
  elapsedSec = Math.min(MAX_SESSION_SEC, elapsedSec);

  // 3. Batas durasi: pada mode FOCUS, focusSec = min(durasi berjalan, plannedSec)
  let focusSec = elapsedSec;
  let overdueSec = 0;
  let remainingSec = 0;
  let isTargetReached = false;
  let isAutoCompleted = false;
  let resolvedStatus = session.status;

  if (isFocusMode) {
    focusSec = Math.min(elapsedSec, session.plannedSec);
    overdueSec = Math.max(0, elapsedSec - session.plannedSec);
    remainingSec = Math.max(0, session.plannedSec - elapsedSec);
    isTargetReached = elapsedSec >= session.plannedSec;

    // Tanpa konfirmasi 10 menit (overdueSec >= 600s), sesi otomatis COMPLETED
    if (isRunning && overdueSec >= AUTO_COMPLETE_GRACE_SEC) {
      isAutoCompleted = true;
      resolvedStatus = "COMPLETED";
      focusSec = session.plannedSec; // Akumulasi dikunci di target plannedSec
    }
  } else {
    // Mode STOPWATCH: tidak dibatasi
    focusSec = elapsedSec;
    overdueSec = 0;
    remainingSec = 0;
    isTargetReached = false;
  }

  // 4. Formatted strings
  const formattedDisplay = isFocusMode
    ? overdueSec > 0
      ? formatOverdueText(overdueSec)
      : formatSecToMMSS(remainingSec)
    : formatSecToMMSS(elapsedSec);

  const formattedOverdue = overdueSec > 0 ? formatOverdueText(overdueSec) : null;

  return {
    elapsedSec,
    focusSec,
    overdueSec,
    remainingSec,
    isTargetReached,
    isAutoCompleted,
    isAbandoned: false,
    resolvedStatus,
    formattedDisplay,
    formattedOverdue,
  };
}

/**
 * Fungsi Murni: Perpanjangan sesi fokus "Lanjut fokus +5 menit".
 *
 * Aturan Bisnis:
 * - Akumulasi dikunci di plannedSec lama.
 * - plannedSec bertambah (+300 detik atau sesuai step).
 * - Waktu dihitung lagi dari saat tombol ditekan (lastResumedAt = sekarang).
 * - Status diubah/dipastikan RUNNING.
 */
export function extendFocusSessionPlan(
  currentPlannedSec: number,
  now: Date | string | number = Date.now(),
  extensionSec: number = EXTENSION_STEP_SEC
): {
  newPlannedSec: number;
  newAccumulatedSec: number;
  newLastResumedAt: Date;
  newStatus: "RUNNING";
} {
  const nowMs = toEpochMs(now) ?? Date.now();
  const nowDate = new Date(nowMs);
  const newPlannedSec = Math.min(MAX_SESSION_SEC, currentPlannedSec + extensionSec);

  return {
    newPlannedSec,
    newAccumulatedSec: currentPlannedSec, // Terkunci di target lama
    newLastResumedAt: nowDate,
    newStatus: "RUNNING",
  };
}
