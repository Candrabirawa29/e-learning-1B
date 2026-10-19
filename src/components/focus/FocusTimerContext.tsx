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
  extendFocusSessionAction,
  getStudyPreferencesAction,
} from "@/actions/focus";
import {
  ActiveFocusSessionDto,
  StudyPreferenceDto,
  FloatMode,
  AlertIntensity,
} from "@/types/focus";
import { FocusMode, FocusSessionStatus } from "@prisma/client";
import { soundEffects } from "@/lib/focus/sounds";
import { resolveFocusSessionProgress } from "@/lib/focus/session-logic";
import { PictureInPicturePortal } from "./PictureInPicturePortal";
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
  focusSec: number;
  remainingSec: number;
  overdueSec: number;
  isOverdue: boolean;
  isTargetReached: boolean;
  progressPercent: number;
  isBreakActive: boolean;

  // Alarm & Alert state
  isAlarmActive: boolean;
  stopAlarm: () => void;
  playTestAlarm: (intensity?: AlertIntensity, volume?: number) => void;

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
  extendFocus: () => Promise<void>;

  // Break actions
  startBreak: (type: "SHORT_BREAK" | "LONG_BREAK") => void;
  pauseBreak: () => void;
  resumeBreak: () => void;
  skipBreak: () => void;

  // Notifications & Sound
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  soundVolume: number;
  setSoundVolume: (volume: number) => void;
  alertIntensity: AlertIntensity;
  setAlertIntensity: (intensity: AlertIntensity) => void;
  floatMode: FloatMode;
  setFloatMode: (mode: FloatMode) => void;
  notificationsEnabled: boolean;
  requestNotificationPermission: () => Promise<boolean>;

  // Picture-in-Picture
  isPipSupported: boolean;
  isPipActive: boolean;
  requestPip: () => Promise<boolean>;
  closePip: () => void;

  refreshActiveSession: () => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const FocusTimerContext = React.createContext<FocusTimerContextType | null>(null);

const STORAGE_KEY_BREAK = "class1b_focus_break_state";
const STORAGE_KEY_CYCLES = "class1b_focus_completed_cycles";
const STORAGE_KEY_SOUND = "class1b_focus_sound_enabled";
const STORAGE_KEY_NOTIF = "class1b_focus_notif_enabled";

// Polyfill type for Document Picture-in-Picture
interface DocumentPictureInPictureOptions {
  width?: number;
  height?: number;
  disallowReturnToOpener?: boolean;
}

interface DocumentPictureInPicture {
  requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>;
  window: Window | null;
  onenter: ((event: Event) => void) | null;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

export function FocusTimerProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = React.useState<ActiveFocusSessionDto | null>(null);
  const [preferences, setPreferences] = React.useState<StudyPreferenceDto | null>(null);
  const [completedCycles, setCompletedCycles] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // Sound & Notification Preferences
  const [soundEnabled, setSoundEnabledState] = React.useState<boolean>(true);
  const [notificationsEnabled, setNotificationsEnabledState] = React.useState<boolean>(false);
  const [isAlarmActive, setIsAlarmActive] = React.useState<boolean>(false);

  // Document Picture-in-Picture state
  const [pipWindow, setPipWindow] = React.useState<Window | null>(null);
  const [isPipSupported, setIsPipSupported] = React.useState<boolean>(false);

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

  // Track if completion sound/notif was already fired for this specific session
  const alarmTriggeredSessionIdRef = React.useRef<string | null>(null);
  const notifiedBreakRef = React.useRef<boolean>(false);

  // 1. Initial Load & PiP Support Check
  React.useEffect(() => {
    setNowMs(Date.now());
    let mounted = true;

    if (typeof window !== "undefined") {
      setIsPipSupported("documentPictureInPicture" in window);

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
          // ignore
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

  const setSoundVolume = (volume: number) => {
    setPreferences((prev) => (prev ? { ...prev, soundVolume: volume } : null));
  };

  const setAlertIntensity = (intensity: AlertIntensity) => {
    setPreferences((prev) => (prev ? { ...prev, alertIntensity: intensity } : null));
  };

  const setFloatMode = (mode: FloatMode) => {
    setPreferences((prev) => (prev ? { ...prev, floatMode: mode } : null));
  };

  // Clock tick & Visibility/Focus listeners
  // Menggunakan timestamp wall-clock, diperbarui tiap 500ms dan saat tab kembali aktif
  React.useEffect(() => {
    const updateTick = () => {
      setNowMs(Date.now());
    };

    const interval = setInterval(updateTick, 500);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateTick();
      }
    };
    const onWindowFocus = () => {
      updateTick();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onWindowFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [activeSession?.status, breakState.type, breakState.status]);

  // Fire desktop notification helper (with requireInteraction)
  const triggerDesktopNotification = React.useCallback(
    (title: string, body: string) => {
      if (!notificationsEnabled) return;
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          try {
            new Notification(title, {
              body,
              icon: "/favicon.ico",
              requireInteraction: true,
            });
          } catch {
            // ignore
          }
        }
      }
    },
    [notificationsEnabled]
  );

  // Accurate Wall-clock calculations via pure function
  const isBreakActive = breakState.type !== "NONE" && breakState.status !== "COMPLETED";

  let elapsedSec = 0;
  let focusSec = 0;
  let remainingSec = 0;
  let overdueSec = 0;
  let isOverdue = false;
  let isTargetReached = false;
  let progressPercent = 0;

  if (isBreakActive) {
    let currentBreakSec = breakState.accumulatedSec;
    if (breakState.status === "RUNNING" && breakState.lastResumedAt && nowMs > 0) {
      currentBreakSec += Math.max(0, Math.floor((nowMs - breakState.lastResumedAt) / 1000));
    }
    elapsedSec = currentBreakSec;
    focusSec = currentBreakSec;
    remainingSec = Math.max(0, breakState.plannedSec - currentBreakSec);
    progressPercent =
      breakState.plannedSec > 0
        ? Math.min(100, Math.round((currentBreakSec / breakState.plannedSec) * 100))
        : 100;
  } else if (activeSession) {
    const evaluation = resolveFocusSessionProgress(
      {
        mode: activeSession.mode,
        plannedSec: activeSession.plannedSec,
        startedAt: activeSession.startedAt,
        lastResumedAt: activeSession.lastResumedAt,
        accumulatedSec: activeSession.accumulatedSec,
        status: activeSession.status,
      },
      nowMs > 0
        ? nowMs
        : activeSession.lastResumedAt
          ? new Date(activeSession.lastResumedAt).getTime()
          : new Date(activeSession.startedAt).getTime()
    );

    elapsedSec = evaluation.elapsedSec;
    focusSec = evaluation.focusSec;
    remainingSec = evaluation.remainingSec;
    overdueSec = evaluation.overdueSec;
    isOverdue = evaluation.overdueSec > 0;
    isTargetReached = evaluation.isTargetReached;

    if (activeSession.mode === FocusMode.STOPWATCH) {
      remainingSec = 0;
      progressPercent = 100;
    } else {
      progressPercent =
        activeSession.plannedSec > 0
          ? Math.min(100, Math.round((evaluation.focusSec / activeSession.plannedSec) * 100))
          : 100;
    }

    // Auto-complete lazy trigger
    if (evaluation.isAutoCompleted && activeSession.status === FocusSessionStatus.RUNNING) {
      setActiveSession((prev) =>
        prev
          ? {
              ...prev,
              status: FocusSessionStatus.COMPLETED,
              accumulatedSec: prev.plannedSec,
            }
          : null
      );
      setIsAlarmActive(false);
      soundEffects.stopRepeatingAlarm();
    }
  }

  // Trigger audio alarm and desktop notification on completion
  React.useEffect(() => {
    if (isBreakActive && remainingSec === 0 && !notifiedBreakRef.current) {
      notifiedBreakRef.current = true;
      if (soundEnabled) {
        soundEffects.playBreakComplete(preferences?.soundVolume ?? 80);
      }
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
      isTargetReached &&
      alarmTriggeredSessionIdRef.current !== activeSession.id
    ) {
      alarmTriggeredSessionIdRef.current = activeSession.id;
      setIsAlarmActive(true);

      if (soundEnabled) {
        soundEffects.startRepeatingAlarm(
          preferences?.alertIntensity || "NORMAL",
          preferences?.soundVolume ?? 80,
          () => setIsAlarmActive(false)
        );
      }

      triggerDesktopNotification(
        "Target Fokus Tercapai! 🎉",
        "Hebat! Sesi fokus Anda telah selesai. Mulai istirahat atau perpanjang fokus."
      );
      toast.success("Target fokus tercapai! Sesi terkunci. Silakan pilih istirahat atau lanjut fokus.", {
        id: "focus-target-toast",
      });
    }
  }, [
    isBreakActive,
    remainingSec,
    activeSession,
    isTargetReached,
    soundEnabled,
    preferences?.alertIntensity,
    preferences?.soundVolume,
    triggerDesktopNotification,
  ]);

  // Judul tab berkedip saat alarm aktif
  React.useEffect(() => {
    if (!isAlarmActive) return;
    const originalTitle = document.title;
    let flashState = false;

    const interval = setInterval(() => {
      flashState = !flashState;
      document.title = flashState
        ? "⏰ [00:00] Fokus Selesai! - Class 1-B"
        : originalTitle;
    }, 1000);

    return () => {
      clearInterval(interval);
      document.title = originalTitle;
    };
  }, [isAlarmActive]);

  // Stop alarm action
  const stopAlarm = React.useCallback(() => {
    setIsAlarmActive(false);
    soundEffects.stopRepeatingAlarm();
  }, []);

  // Play test alarm sample
  const playTestAlarm = (intensity?: AlertIntensity, volume?: number) => {
    soundEffects.playAlarmSample(
      intensity || preferences?.alertIntensity || "NORMAL",
      volume ?? preferences?.soundVolume ?? 80
    );
  };

  // Picture-in-Picture controls
  const requestPip = async (): Promise<boolean> => {
    if (!isPipSupported || !window.documentPictureInPicture) {
      toast.error("Browser Anda belum mendukung Document Picture-in-Picture.");
      return false;
    }

    try {
      if (pipWindow) {
        pipWindow.close();
      }

      const win = await window.documentPictureInPicture.requestWindow({
        width: 340,
        height: 190,
      });

      // Salin stylesheets ke pipWindow
      [...document.styleSheets].forEach((sheet) => {
        try {
          const cssRules = [...sheet.cssRules].map((rule) => rule.cssText).join("");
          const styleEl = win.document.createElement("style");
          styleEl.textContent = cssRules;
          win.document.head.appendChild(styleEl);
        } catch {
          if (sheet.href) {
            const linkEl = win.document.createElement("link");
            linkEl.rel = "stylesheet";
            linkEl.type = sheet.type;
            linkEl.media = sheet.media.mediaText;
            linkEl.href = sheet.href;
            win.document.head.appendChild(linkEl);
          }
        }
      });

      // Salin mode dark/light
      win.document.documentElement.className = document.documentElement.className;

      win.addEventListener("pagehide", () => {
        setPipWindow(null);
      });

      setPipWindow(win);
      return true;
    } catch (err) {
      console.error("Gagal membuka Document PiP:", err);
      toast.error("Gagal membuka jendela Picture-in-Picture");
      return false;
    }
  };

  const closePip = () => {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
    }
  };

  // Action: Start Focus
  const startFocus = async (params: {
    mode: FocusMode;
    plannedSec: number;
    courseId?: string | null;
    taskId?: string | null;
    note?: string | null;
  }): Promise<boolean> => {
    try {
      stopAlarm();
      if (soundEnabled) soundEffects.playClick();

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
        alarmTriggeredSessionIdRef.current = null;
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
      stopAlarm();
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
      stopAlarm();
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

  // Action: Extend Focus (+5 menit)
  const extendFocus = async () => {
    if (!activeSession) return;
    try {
      stopAlarm();
      if (soundEnabled) soundEffects.playClick();
      const res = await extendFocusSessionAction(activeSession.id);
      if (res.success && res.session) {
        setActiveSession(res.session);
        alarmTriggeredSessionIdRef.current = null;
        toast.success("Sesi fokus diperpanjang +5 menit!");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memperpanjang sesi");
    }
  };

  // Action: Complete Focus
  const complete = async (note?: string) => {
    if (!activeSession) return;
    try {
      stopAlarm();
      if (soundEnabled) soundEffects.playSessionComplete(preferences?.soundVolume ?? 80);
      await completeFocusSessionAction(activeSession.id, note);
      setActiveSession(null);
      alarmTriggeredSessionIdRef.current = null;

      // Increment cycle count
      const nextCycle = completedCycles + 1;
      setCompletedCycles(nextCycle);

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
      stopAlarm();
      if (soundEnabled) soundEffects.playClick();
      await stopEarlyFocusSessionAction(activeSession.id, note);
      setActiveSession(null);
      alarmTriggeredSessionIdRef.current = null;
      toast.info("Sesi diakhiri lebih awal. Waktu fokus tetap tersimpan!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal mengakhiri sesi");
    }
  };

  // Action: Cancel Focus
  const cancel = async () => {
    if (!activeSession) return;
    try {
      stopAlarm();
      if (soundEnabled) soundEffects.playClick();
      await cancelFocusSessionAction(activeSession.id);
      setActiveSession(null);
      alarmTriggeredSessionIdRef.current = null;
      toast.info("Sesi fokus dibatalkan.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal membatalkan sesi");
    }
  };

  // Break Actions
  const startBreak = (type: "SHORT_BREAK" | "LONG_BREAK") => {
    stopAlarm();
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
    toast.info("Istirahat dijeda");
  };

  const resumeBreak = () => {
    if (breakState.type === "NONE" || breakState.status !== "PAUSED") return;
    setBreakState((prev) => ({
      ...prev,
      lastResumedAt: Date.now(),
      status: "RUNNING",
    }));
    toast.info("Istirahat dilanjutkan");
  };

  const skipBreak = () => {
    setBreakState({
      type: "NONE",
      plannedSec: 300,
      accumulatedSec: 0,
      lastResumedAt: null,
      status: "COMPLETED",
    });
    toast.info("Istirahat dilewati. Siap untuk sesi fokus berikutnya!");
  };

  // Request browser notification permission
  const requestNotificationPermission = async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Browser Anda tidak mendukung notifikasi sistem");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === "granted";
      setNotificationsEnabledState(granted);
      localStorage.setItem(STORAGE_KEY_NOTIF, String(granted));

      if (granted) {
        toast.success("Izin notifikasi browser berhasil diaktifkan!");
      } else {
        toast.info("Notifikasi browser tidak diizinkan.");
      }
      return granted;
    } catch {
      toast.error("Gagal meminta izin notifikasi browser");
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
    focusSec,
    remainingSec,
    overdueSec,
    isOverdue,
    isTargetReached,
    progressPercent,
    isBreakActive,
    isAlarmActive,
    stopAlarm,
    playTestAlarm,
    startFocus,
    pause,
    resume,
    complete,
    stopEarly,
    cancel,
    extendFocus,
    startBreak,
    pauseBreak,
    resumeBreak,
    skipBreak,
    soundEnabled,
    setSoundEnabled,
    soundVolume: preferences?.soundVolume ?? 80,
    setSoundVolume,
    alertIntensity: preferences?.alertIntensity ?? AlertIntensity.NORMAL,
    setAlertIntensity,
    floatMode: preferences?.floatMode ?? FloatMode.IN_APP,
    setFloatMode,
    notificationsEnabled,
    requestNotificationPermission,
    isPipSupported,
    isPipActive: Boolean(pipWindow),
    requestPip,
    closePip,
    refreshActiveSession,
    refreshPreferences,
  };

  return (
    <FocusTimerContext.Provider value={value}>
      {children}
      {isPipSupported && pipWindow && (
        <PictureInPicturePortal pipWindow={pipWindow} />
      )}
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
