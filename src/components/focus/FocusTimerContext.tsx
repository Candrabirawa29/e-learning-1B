"use client";

import * as React from "react";
import {
  getActiveFocusSessionAction,
  startFocusSessionAction,
  pauseFocusSessionAction,
  resumeFocusSessionAction,
  completeFocusSessionAction,
  stopEarlyFocusSessionAction,
  cancelFocusSessionAction,
  getStudyPreferencesAction,
} from "@/actions/focus";
import { ActiveFocusSessionDto, StudyPreferenceDto } from "@/types/focus";
import { FocusMode, FocusSessionStatus } from "@prisma/client";
import { soundEffects } from "@/lib/focus/sounds";
import { toast } from "sonner";

export type BreakType = "NONE" | "SHORT_BREAK" | "LONG_BREAK";

export interface ClientBreakState {
  type: BreakType;
  plannedSec: number;
  accumulatedSec: number;
  lastResumedAt: number | null; // ms timestamp
  status: "RUNNING" | "PAUSED" | "COMPLETED";
}

interface FocusTimerContextType {
  activeSession: ActiveFocusSessionDto | null;
  breakState: ClientBreakState;
  preferences: StudyPreferenceDto | null;
  completedCycles: number;
  isLoading: boolean;

  // Computed live times (updated via accurate wall-clock timestamp delta)
  elapsedSec: number;
  remainingSec: number;
  progressPercent: number;
  isBreakActive: boolean;

  // Actions
  startFocus: (params: {
    mode: FocusMode;
    plannedSec: number;
    courseId?: string | null;
    taskId?: string | null;
    note?: string | null;
  }) => Promise<boolean>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  complete: (note?: string) => Promise<void>;
  stopEarly: (note?: string) => Promise<void>;
  cancel: () => Promise<void>;

  // Break actions
  startBreak: (type: "SHORT_BREAK" | "LONG_BREAK") => void;
  pauseBreak: () => void;
  resumeBreak: () => void;
  skipBreak: () => void;

  // Notifications & Sound
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  notificationsEnabled: boolean;
  requestNotificationPermission: () => Promise<boolean>;

  refreshActiveSession: () => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const FocusTimerContext = React.createContext<FocusTimerContextType | null>(null);

const STORAGE_KEY_BREAK = "class1b_focus_break_state";
const STORAGE_KEY_CYCLES = "class1b_focus_completed_cycles";
const STORAGE_KEY_SOUND = "class1b_focus_sound_enabled";
const STORAGE_KEY_NOTIF = "class1b_focus_notif_enabled";

export function FocusTimerProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = React.useState<ActiveFocusSessionDto | null>(null);
  const [preferences, setPreferences] = React.useState<StudyPreferenceDto | null>(null);
  const [completedCycles, setCompletedCycles] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // Sound & Notification Preferences
  const [soundEnabled, setSoundEnabledState] = React.useState<boolean>(true);
  const [notificationsEnabled, setNotificationsEnabledState] = React.useState<boolean>(false);

  // Client-side Break State
  const [breakState, setBreakState] = React.useState<ClientBreakState>({
    type: "NONE",
    plannedSec: 300,
    accumulatedSec: 0,
    lastResumedAt: null,
    status: "COMPLETED",
  });

  // Current tick timestamp for real-time reactive calculations
  const [nowMs, setNowMs] = React.useState<number>(0);

  // Track if completion sound/notif was already fired for this specific session or break
  const notifiedSessionIdRef = React.useRef<string | null>(null);
  const notifiedBreakRef = React.useRef<boolean>(false);

  // 1. Initial Load from server and localStorage
  React.useEffect(() => {
    setNowMs(Date.now());
    let mounted = true;

    // Load local settings
    if (typeof window !== "undefined") {
      const savedSound = localStorage.getItem(STORAGE_KEY_SOUND);
      if (savedSound !== null) setSoundEnabledState(savedSound === "true");

      const savedNotif = localStorage.getItem(STORAGE_KEY_NOTIF);
      if (savedNotif !== null) setNotificationsEnabledState(savedNotif === "true");

      const savedCycles = localStorage.getItem(STORAGE_KEY_CYCLES);
      if (savedCycles) setCompletedCycles(parseInt(savedCycles, 10) || 0);

      const savedBreak = localStorage.getItem(STORAGE_KEY_BREAK);
      if (savedBreak) {
        try {
          const parsed = JSON.parse(savedBreak) as ClientBreakState;
          if (parsed.type !== "NONE" && parsed.status !== "COMPLETED") {
            setBreakState(parsed);
          }
        } catch {
          // ignore parsing error
        }
      }
    }

    async function init() {
      try {
        const [active, pref] = await Promise.all([
          getActiveFocusSessionAction(),
          getStudyPreferencesAction(),
        ]);
        if (mounted) {
          setActiveSession(active);
          setPreferences(pref);
        }
      } catch (err) {
        console.error("Gagal memuat sesi fokus aktif:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Save break state to localStorage
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_BREAK, JSON.stringify(breakState));
    }
  }, [breakState]);

  // Save cycles to localStorage
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_CYCLES, String(completedCycles));
    }
  }, [completedCycles]);

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_SOUND, String(enabled));
    }
  };

  // High-frequency clock tick (500ms is gentle on battery and ensures second precision)
  React.useEffect(() => {
    const isFocusRunning = activeSession?.status === FocusSessionStatus.RUNNING;
    const isBreakRunning = breakState.type !== "NONE" && breakState.status === "RUNNING";

    if (!isFocusRunning && !isBreakRunning) return;

    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 500);

    return () => clearInterval(interval);
  }, [activeSession?.status, breakState.type, breakState.status]);

  // Fire desktop notification helper
  const triggerDesktopNotification = React.useCallback(
    (title: string, body: string) => {
      if (!notificationsEnabled) return;
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          try {
            new Notification(title, {
              body,
              icon: "/favicon.ico",
            });
          } catch {
            // ignore
          }
        }
      }
    },
    [notificationsEnabled]
  );

  // Accurate Wall-clock calculations
  const isBreakActive = breakState.type !== "NONE" && breakState.status !== "COMPLETED";

  // Calculate live focus session times
  let elapsedSec = 0;
  let remainingSec = 0;
  let progressPercent = 0;

  if (isBreakActive) {
    let currentBreakSec = breakState.accumulatedSec;
    if (breakState.status === "RUNNING" && breakState.lastResumedAt && nowMs > 0) {
      currentBreakSec += Math.max(0, Math.floor((nowMs - breakState.lastResumedAt) / 1000));
    }
    elapsedSec = currentBreakSec;
    remainingSec = Math.max(0, breakState.plannedSec - currentBreakSec);
    progressPercent = breakState.plannedSec > 0
      ? Math.min(100, Math.round((currentBreakSec / breakState.plannedSec) * 100))
      : 100;
  } else if (activeSession) {
    let currentFocusSec = activeSession.accumulatedSec;
    if (activeSession.status === FocusSessionStatus.RUNNING && activeSession.lastResumedAt && nowMs > 0) {
      const resumeMs = new Date(activeSession.lastResumedAt).getTime();
      currentFocusSec += Math.max(0, Math.floor((nowMs - resumeMs) / 1000));
    }

    elapsedSec = currentFocusSec;

    if (activeSession.mode === FocusMode.STOPWATCH) {
      remainingSec = 0;
      progressPercent = 100;
    } else {
      remainingSec = Math.max(0, activeSession.plannedSec - currentFocusSec);
      progressPercent = activeSession.plannedSec > 0
        ? Math.min(100, Math.round((currentFocusSec / activeSession.plannedSec) * 100))
        : 100;
    }
  }

  // Effect: Trigger audio and desktop notification on completion
  React.useEffect(() => {
    if (isBreakActive && remainingSec === 0 && !notifiedBreakRef.current) {
      notifiedBreakRef.current = true;
      if (soundEnabled) soundEffects.playBreakComplete();
      triggerDesktopNotification(
        "Istirahat Selesai! ☕",
        "Waktu istirahat Anda telah usai. Siap untuk kembali fokus?"
      );
      toast.success("Waktu istirahat selesai! Siap untuk kembali fokus?", {
        id: "break-finish-toast",
      });
      setBreakState((prev) => ({ ...prev, status: "COMPLETED" }));
    } else if (
      !isBreakActive &&
      activeSession &&
      activeSession.mode !== FocusMode.STOPWATCH &&
      remainingSec === 0 &&
      notifiedSessionIdRef.current !== activeSession.id
    ) {
      notifiedSessionIdRef.current = activeSession.id;
      if (soundEnabled) soundEffects.playSessionComplete();
      triggerDesktopNotification(
        "Target Sesi Tercapai! 🎉",
        "Hebat! Sesi fokus Anda telah selesai. Saatnya istirahat sejenak."
      );
      toast.success("Target fokus tercapai! Selesaikan sesi untuk mencatat waktumu.", {
        id: "focus-finish-toast",
      });
    }
  }, [isBreakActive, remainingSec, activeSession, soundEnabled, triggerDesktopNotification]);

  // Action: Start Focus
  const startFocus = async (params: {
    mode: FocusMode;
    plannedSec: number;
    courseId?: string | null;
    taskId?: string | null;
    note?: string | null;
  }): Promise<boolean> => {
    try {
      if (soundEnabled) soundEffects.playClick();
      // Reset break if starting a focus session
      setBreakState({
        type: "NONE",
        plannedSec: 300,
        accumulatedSec: 0,
        lastResumedAt: null,
        status: "COMPLETED",
      });

      const clientSessionId = `fs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const res = await startFocusSessionAction({
        clientSessionId,
        mode: params.mode,
        plannedSec: params.plannedSec,
        courseId: params.courseId,
        taskId: params.taskId,
        note: params.note,
      });

      if (res.success && res.session) {
        setActiveSession(res.session);
        notifiedSessionIdRef.current = null;
        toast.success("Sesi fokus berhasil dimulai!");
        return true;
      }
      return false;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memulai sesi fokus");
      return false;
    }
  };

  // Action: Pause Focus
  const pause = async () => {
    if (!activeSession) return;
    try {
      if (soundEnabled) soundEffects.playClick();
      const res = await pauseFocusSessionAction(activeSession.id);
      setActiveSession((prev) =>
        prev
          ? {
              ...prev,
              accumulatedSec: res.accumulatedSec,
              lastResumedAt: null,
              status: FocusSessionStatus.PAUSED,
            }
          : null
      );
      toast.info("Sesi fokus dijeda");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menjeda sesi");
    }
  };

  // Action: Resume Focus
  const resume = async () => {
    if (!activeSession) return;
    try {
      if (soundEnabled) soundEffects.playClick();
      await resumeFocusSessionAction(activeSession.id);
      const nowIso = new Date().toISOString();
      setActiveSession((prev) =>
        prev
          ? {
              ...prev,
              lastResumedAt: nowIso,
              status: FocusSessionStatus.RUNNING,
            }
          : null
      );
      toast.success("Sesi fokus dilanjutkan");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal melanjutkan sesi");
    }
  };

  // Action: Complete Focus
  const complete = async (note?: string) => {
    if (!activeSession) return;
    try {
      if (soundEnabled) soundEffects.playSessionComplete();
      await completeFocusSessionAction(activeSession.id, note);
      setActiveSession(null);

      // Increment cycle count
      const nextCycle = completedCycles + 1;
      setCompletedCycles(nextCycle);

      // Otomatis tawarkan istirahat sesuai interval
      const longInterval = preferences?.longBreakInterval || 4;
      const isLongBreak = nextCycle % longInterval === 0;
      const breakType = isLongBreak ? "LONG_BREAK" : "SHORT_BREAK";

      toast.success("Sesi fokus selesai dan berhasil dicatat!", {
        action: {
          label: isLongBreak ? "Mulai Istirahat Panjang" : "Mulai Istirahat",
          onClick: () => startBreak(breakType),
        },
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menyelesaikan sesi");
    }
  };

  // Action: Stop Early
  const stopEarly = async (note?: string) => {
    if (!activeSession) return;
    try {
      if (soundEnabled) soundEffects.playClick();
      await stopEarlyFocusSessionAction(activeSession.id, note);
      setActiveSession(null);
      toast.info("Sesi diakhiri lebih awal. Waktu fokus tetap tersimpan!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal mengakhiri sesi");
    }
  };

  // Action: Cancel Focus
  const cancel = async () => {
    if (!activeSession) return;
    try {
      if (soundEnabled) soundEffects.playClick();
      await cancelFocusSessionAction(activeSession.id);
      setActiveSession(null);
      toast.info("Sesi fokus dibatalkan.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal membatalkan sesi");
    }
  };

  // Break Actions
  const startBreak = (type: "SHORT_BREAK" | "LONG_BREAK") => {
    if (soundEnabled) soundEffects.playClick();
    const duration =
      type === "LONG_BREAK"
        ? preferences?.longBreakDuration || 900
        : preferences?.shortBreakDuration || 300;

    notifiedBreakRef.current = false;
    setBreakState({
      type,
      plannedSec: duration,
      accumulatedSec: 0,
      lastResumedAt: Date.now(),
      status: "RUNNING",
    });

    toast.info(type === "LONG_BREAK" ? "Istirahat panjang dimulai (15m)" : "Istirahat pendek dimulai (5m)");
  };

  const pauseBreak = () => {
    if (breakState.type === "NONE" || breakState.status !== "RUNNING") return;
    const now = Date.now();
    const additional = breakState.lastResumedAt ? Math.floor((now - breakState.lastResumedAt) / 1000) : 0;
    setBreakState((prev) => ({
      ...prev,
      accumulatedSec: prev.accumulatedSec + additional,
      lastResumedAt: null,
      status: "PAUSED",
    }));
  };

  const resumeBreak = () => {
    if (breakState.type === "NONE" || breakState.status !== "PAUSED") return;
    setBreakState((prev) => ({
      ...prev,
      lastResumedAt: Date.now(),
      status: "RUNNING",
    }));
  };

  const skipBreak = () => {
    if (soundEnabled) soundEffects.playClick();
    setBreakState({
      type: "NONE",
      plannedSec: 300,
      accumulatedSec: 0,
      lastResumedAt: null,
      status: "COMPLETED",
    });
    toast.info("Istirahat dilewati. Siap untuk sesi fokus berikutnya!");
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Browser Anda tidak mendukung notifikasi desktop.");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === "granted";
      setNotificationsEnabledState(granted);
      localStorage.setItem(STORAGE_KEY_NOTIF, String(granted));
      if (granted) {
        toast.success("Notifikasi desktop diizinkan!");
      } else {
        toast.info("Notifikasi desktop belum diizinkan.");
      }
      return granted;
    } catch {
      return false;
    }
  };

  const refreshActiveSession = async () => {
    try {
      const active = await getActiveFocusSessionAction();
      setActiveSession(active);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshPreferences = async () => {
    try {
      const pref = await getStudyPreferencesAction();
      setPreferences(pref);
    } catch (err) {
      console.error(err);
    }
  };

  const value: FocusTimerContextType = {
    activeSession,
    breakState,
    preferences,
    completedCycles,
    isLoading,
    elapsedSec,
    remainingSec,
    progressPercent,
    isBreakActive,
    startFocus,
    pause,
    resume,
    complete,
    stopEarly,
    cancel,
    startBreak,
    pauseBreak,
    resumeBreak,
    skipBreak,
    soundEnabled,
    setSoundEnabled,
    notificationsEnabled,
    requestNotificationPermission,
    refreshActiveSession,
    refreshPreferences,
  };

  return (
    <FocusTimerContext.Provider value={value}>
      {children}
    </FocusTimerContext.Provider>
  );
}

export function useFocusTimer() {
  const context = React.useContext(FocusTimerContext);
  if (!context) {
    throw new Error("useFocusTimer harus digunakan di dalam FocusTimerProvider");
  }
  return context;
}
