import { FocusMode, FocusSessionStatus, FloatMode, AlertIntensity } from "@prisma/client";

export { FloatMode, AlertIntensity };

export const MAX_SESSION_SEC = 14400; // 4 jam (dalam detik)
export const MAX_INACTIVITY_MS = 14400 * 1000; // 4 jam (dalam milidetik)
export const AUTO_COMPLETE_GRACE_SEC = 600; // 10 menit (dalam detik) toleransi tanpa konfirmasi
export const HEARTBEAT_INTERVAL_MS = 30000; // 30 detik interval heartbeat klien
export const HEARTBEAT_TIMEOUT_SEC = 600; // 10 menit batas waktu tanpa heartbeat
export const MIN_LOGGED_FOCUS_SEC = 60; // 60 detik batas minimal sesi dicatat
export const EXTENSION_STEP_SEC = 300; // 5 menit (dalam detik) perpanjangan sesi

export interface ActiveFocusSessionDto {
  id: string;
  clientSessionId: string;
  mode: FocusMode;
  plannedSec: number;
  startedAt: string;
  lastResumedAt: string | null;
  accumulatedSec: number;
  lastSeenAt?: string | null;
  isCorrected?: boolean;
  status: FocusSessionStatus;
  note: string | null;
  courseId: string | null;
  taskId: string | null;
  course?: { id: string; name: string; code: string | null } | null;
  task?: { id: string; title: string } | null;
}

export interface StudyPreferenceDto {
  id: string;
  userId: string;
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
  weeklyTargetMin: number;
  minActiveDayMin: number;
  aiConsent: boolean;
  floatMode: FloatMode;
  alertIntensity: AlertIntensity;
  soundVolume: number;
  lastCourseId?: string | null;
  lastTaskId?: string | null;
  lastMode?: FocusMode | null;
  autoStartBreak: boolean;
  autoStartNextFocus: boolean;
}

