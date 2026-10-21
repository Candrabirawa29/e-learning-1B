"use client";

import * as React from "react";
import {
  getActiveFocusSessionAction,
  startFocusSessionAction,
  pauseFocusSessionAction,
  resumeFocusSessionAction,
  endFocusSessionAction,
  discardFocusSessionAction,
  extendFocusSessionAction,
  heartbeatFocusSessionAction,
  getTodayCompletedCyclesAction,
  getStudyPreferencesAction,
  updateStudyPreferencesAction,
  updateActiveSessionContextAction,
  updateSessionNoteAction,
} from "@/actions/focus";
import {
  ActiveFocusSessionDto,
  StudyPreferenceDto,
  FloatMode,
  AlertIntensity,
  HEARTBEAT_INTERVAL_MS,
} from "@/types/focus";
import { FocusMode, FocusSessionStatus } from "@prisma/client";
import {
  soundEffects,
  startRepeatingAlarm,
  stopRepeatingAlarm,
  playAlarmSample,
import {
  resolveFocusSessionProgress,
  getFocusClock,
  FocusClockPhase,
} from "@/lib/focus/session-logic";
import { toast } from "sonner";

export type BreakType = "SHORT_BREAK" | "LONG_BREAK" | "NONE";

export interface ClientBreakState {
  type: BreakType;
  plannedSec: number;
  accumulatedSec: number;
  lastResumedAt: number | null; // ms timestamp
  status: "RUNNING" | "PAUSED" | "COMPLETED";
}

export interface FocusSummaryData {
  id: string;
  status: FocusSessionStatus;
  focusSec: number;
  plannedSec: number;
  mode: FocusMode;
  note: string | null;
  course?: { id: string; name: string; code: string | null } | null;
  task?: { id: string; title: string } | null;
}

interface FocusTimerContextType {
  activeSession: ActiveFocusSessionDto | null;
  breakState: ClientBreakState;
  preferences: StudyPreferenceDto | null;
  completedCycles: number;
  isLoading: boolean;

  // Selected context (Course, Task, Mode)
  selectedCourseId: string | null;
  selectedTaskId: string | null;
  selectedMode: FocusMode;
  changeContext: (data: {
    courseId?: string | null;
    taskId?: string | null;
    mode?: FocusMode;
  }) => Promise<void>;

  // Action states & version
  isActionPending: boolean;
  clockPhase: FocusClockPhase;

  // Computed live times (updated via wall-clock timestamp delta)
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

  // Summary state after session ends
  summarySession: FocusSummaryData | null;
  dismissSummary: () => void;
  saveSummaryNote: (note: string) => Promise<void>;

  // Session Actions
  startFocus: (overrides?: {
    mode?: FocusMode;
    plannedSec?: number;
    courseId?: string | null;
    taskId?: string | null;
  }) => Promise<boolean>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  endSession: (note?: string) => Promise<{ action: "SAVED" | "DISCARDED"; status?: FocusSessionStatus | null }>;
  discardSession: () => Promise<void>;
  extendFocus: () => Promise<void>;

  // Backward compatibility aliases
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
  pipWindow: Window | null;
  requestPip: () => Promise<boolean>;
  closePip: () => void;

  refreshActiveSession: () => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const FocusTimerContext = React.createContext<FocusTimerContextType | null>(null);

const STORAGE_KEY_BREAK = "class1b_focus_break_state";
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
  const [isActionPending, setIsActionPending] = React.useState<boolean>(false);

  // State version tracking: Klien hanya menerima snapshot dengan version >= yang dimilikinya
  const sessionVersionRef = React.useRef<number>(0);

  const reconcileSession = React.useCallback(
    (incoming: ActiveFocusSessionDto | null, incomingVersion?: number) => {
      if (!incoming) {
        sessionVersionRef.current = 0;
        setActiveSession(null);
        return;
      }
      const version = incomingVersion ?? incoming.version ?? 1;
      if (version >= sessionVersionRef.current) {
        sessionVersionRef.current = version;
        setActiveSession({
          ...incoming,
          version,
        });
      } else {
        console.warn(
          `[FocusTimer] Menolak snapshot basi (v${version} < v${sessionVersionRef.current})`
        );
      }
    },
    []
  );

  // Selected context (Course / Task / Mode)
  const [selectedCourseId, setSelectedCourseId] = React.useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);
  const [selectedMode, setSelectedMode] = React.useState<FocusMode>(FocusMode.FOCUS);

  // Summary state after session ends
  const [summarySession, setSummarySession] = React.useState<FocusSummaryData | null>(null);

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

  // Track if completion alarm was already fired for this specific session
  const alarmTriggeredSessionIdRef = React.useRef<string | null>(null);
  const notifiedBreakRef = React.useRef<boolean>(false);

  // Forward ref for startFocus to allow safe calling before lexical declaration
  const startFocusRef = React.useRef<
    (overrides?: {
      mode?: FocusMode;
      plannedSec?: number;
      courseId?: string | null;
      taskId?: string | null;
    }) => Promise<boolean>
  >(async () => false);

  // 1. Initial Load: active session, preferences, today's cycles from DB
  React.useEffect(() => {
    setNowMs(Date.now());
    let mounted = true;

    if (typeof window !== "undefined") {
      setIsPipSupported("documentPictureInPicture" in window);

      const savedSound = localStorage.getItem(STORAGE_KEY_SOUND);
      if (savedSound !== null) setSoundEnabledState(savedSound === "true");

      const savedNotif = localStorage.getItem(STORAGE_KEY_NOTIF);
      if (savedNotif !== null) setNotificationsEnabledState(savedNotif === "true");

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
        const [active, pref, cyclesToday] = await Promise.all([
          getActiveFocusSessionAction(),
          getStudyPreferencesAction(),
          getTodayCompletedCyclesAction(),
        ]);
        if (mounted) {
          reconcileSession(active);
          setPreferences(pref);
          setCompletedCycles(cyclesToday);

          if (active) {
            setSelectedCourseId(active.courseId);
            setSelectedTaskId(active.taskId);
            setSelectedMode(active.mode);
          } else if (pref) {
            setSelectedCourseId(pref.lastCourseId ?? null);
            setSelectedTaskId(pref.lastTaskId ?? null);
            setSelectedMode(pref.lastMode ?? FocusMode.FOCUS);
          }
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
  }, []);

  // Heartbeat sender: every 30 seconds while session is RUNNING
  const activeSessionId = activeSession?.id;
  const activeSessionStatus = activeSession?.status;
  React.useEffect(() => {
    if (!activeSessionId || activeSessionStatus !== FocusSessionStatus.RUNNING) {
      return;
    }

    const interval = setInterval(() => {
      heartbeatFocusSessionAction(activeSessionId).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [activeSessionId, activeSessionStatus]);

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

  // Accurate Wall-clock calculations via pure getFocusClock
  const isBreakActive = breakState.type !== "NONE" && breakState.status !== "COMPLETED";

  let elapsedSec = 0;
  let focusSec = 0;
  let remainingSec = 0;
  let overdueSec = 0;
  let isOverdue = false;
  let isTargetReached = false;
  let progressPercent = 0;
  let clockPhase: FocusClockPhase = "PAUSED";

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
    clockPhase = breakState.status === "RUNNING" ? "RUNNING" : "PAUSED";
  } else if (activeSession) {
    const clock = getFocusClock(activeSession, nowMs > 0 ? nowMs : Date.now());
    clockPhase = clock.phase;
    focusSec = clock.focusSec;
    remainingSec = clock.remainingSec;
    isTargetReached = clock.phase === "TARGET_REACHED";

    // Hitung overdueSec dan auto-completion 10 menit
    const evaluation = resolveFocusSessionProgress(
      {
        mode: activeSession.mode,
        plannedSec: activeSession.plannedSec,
        startedAt: activeSession.startedAt,
        lastResumedAt: activeSession.lastResumedAt,
        accumulatedSec: activeSession.accumulatedSec,
        lastSeenAt: activeSession.lastSeenAt,
        status: activeSession.status,
      },
      nowMs > 0 ? nowMs : Date.now()
    );

    elapsedSec = evaluation.elapsedSec;
    overdueSec = evaluation.overdueSec;
    isOverdue = evaluation.overdueSec > 0;

    if (activeSession.mode === FocusMode.STOPWATCH) {
      remainingSec = 0;
      progressPercent = 100;
    } else {
      progressPercent =
        activeSession.plannedSec > 0
          ? Math.min(100, Math.round((focusSec / activeSession.plannedSec) * 100))
          : 100;
    }

    // Lazy client status sync if auto-completed (>10m overdue)
    if (evaluation.isAutoCompleted && activeSession.status === FocusSessionStatus.RUNNING) {
      const autoCompletedVersion = sessionVersionRef.current + 1;
      sessionVersionRef.current = autoCompletedVersion;
      setActiveSession((prev) =>
        prev
          ? {
              ...prev,
              status: FocusSessionStatus.COMPLETED,
              accumulatedSec: activeSession.plannedSec,
              version: autoCompletedVersion,
            }
          : null
      );
    }
  }

  // Masukan tidak valid: muat ulang satu kali dari server dan catat console.error
  const invalidReloadTriggeredRef = React.useRef(false);
  React.useEffect(() => {
    if (clockPhase === "INVALID" && activeSession) {
      console.error(
        "[FocusTimer] Masukan timer tidak valid (RUNNING tanpa lastResumedAt atau NaN):",
        activeSession
      );
      if (!invalidReloadTriggeredRef.current) {
        invalidReloadTriggeredRef.current = true;
        refreshActiveSession().finally(() => {
          setTimeout(() => {
            invalidReloadTriggeredRef.current = false;
          }, 3000);
        });
      }
    } else {
      invalidReloadTriggeredRef.current = false;
    }
  }, [clockPhase, activeSession]);

  // Alarm sound & Flashing Tab Title
  const stopAlarm = React.useCallback(() => {
    setIsAlarmActive(false);
    stopRepeatingAlarm();
  }, []);

  const playTestAlarm = React.useCallback(
    (intensity?: AlertIntensity, volume?: number) => {
      const effIntensity = intensity || preferences?.alertIntensity || AlertIntensity.NORMAL;
      const effVolume = volume !== undefined ? volume : (preferences?.soundVolume ?? 80);
      playAlarmSample(effIntensity, effVolume);
    },
    [preferences?.alertIntensity, preferences?.soundVolume]
  );

  // Tab title flash effect
  React.useEffect(() => {
    if (!isAlarmActive) return;

    let flag = false;
    const originalTitle = document.title;
    const interval = setInterval(() => {
      document.title = flag ? "🔔 Fokus Selesai!" : originalTitle;
      flag = !flag;
    }, 1000);

    return () => {
      clearInterval(interval);
      document.title = originalTitle;
    };
  }, [isAlarmActive]);

  // Trigger completion alarm when target reached in FOCUS mode
  React.useEffect(() => {
    if (
      activeSession &&
      activeSession.mode === FocusMode.FOCUS &&
      isTargetReached &&
      alarmTriggeredSessionIdRef.current !== activeSession.id
    ) {
      alarmTriggeredSessionIdRef.current = activeSession.id;

      if (soundEnabled) {
        setIsAlarmActive(true);
        startRepeatingAlarm(
          preferences?.alertIntensity || AlertIntensity.NORMAL,
          preferences?.soundVolume ?? 80,
          () => {
            setIsAlarmActive(false);
          }
        );
      }

      triggerDesktopNotification(
        "Sesi Fokus Selesai! 🎉",
        `Target fokus ${Math.round(activeSession.plannedSec / 60)} menit telah tercapai.`
      );
    }
  }, [
    activeSession,
    isTargetReached,
    soundEnabled,
    preferences?.alertIntensity,
    preferences?.soundVolume,
    triggerDesktopNotification,
  ]);

  // Trigger break completion notification
  React.useEffect(() => {
    if (
      isBreakActive &&
      remainingSec === 0 &&
      breakState.status === "RUNNING" &&
      !notifiedBreakRef.current
    ) {
      notifiedBreakRef.current = true;
      if (soundEnabled) soundEffects.playSessionComplete(preferences?.soundVolume ?? 80);
      triggerDesktopNotification(
        "Waktu Istirahat Selesai! ☕",
        "Siap untuk memulai siklus fokus berikutnya?"
      );

      // Selesaikan istirahat
      setBreakState((prev) => ({
        ...prev,
        status: "COMPLETED",
        accumulatedSec: prev.plannedSec,
      }));

      // Jika autoStartNextFocus aktif, mulai sesi fokus berikutnya secara otomatis
      if (preferences?.autoStartNextFocus) {
        startFocusRef.current().catch(() => {});
      }
    }
  }, [
    isBreakActive,
    remainingSec,
    breakState.status,
    soundEnabled,
    preferences?.soundVolume,
    preferences?.autoStartNextFocus,
    triggerDesktopNotification,
  ]);

  // Request Notification permission
  const requestNotificationPermission = async (): Promise<boolean> => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      const granted = permission === "granted";
      setNotificationsEnabledState(granted);
      localStorage.setItem(STORAGE_KEY_NOTIF, String(granted));
      if (granted) toast.success("Notifikasi sistem diaktifkan");
      else toast.info("Izin notifikasi belum diberikan");
      return granted;
    }
    return false;
  };

  // Picture-in-Picture window management
  const requestPip = async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("documentPictureInPicture" in window)) {
      toast.error("Browser tidak mendukung Document Picture-in-Picture");
      return false;
    }

    try {
      if (pipWindow && !pipWindow.closed) {
        pipWindow.focus();
        return true;
      }

      const win = await window.documentPictureInPicture!.requestWindow({
        width: 320,
        height: 180,
      });

      // 1. Salin atribut class, style, dan data-* dari <html>
      Array.from(document.documentElement.attributes).forEach((attr) => {
        if (attr.name === "class" || attr.name === "style" || attr.name.startsWith("data-")) {
          try {
            win.document.documentElement.setAttribute(attr.name, attr.value);
          } catch {
            // Abaikan error pada atribut tertentu
          }
        }
      });

      // 2. Salin atribut class, style, dan data-* dari <body>
      Array.from(document.body.attributes).forEach((attr) => {
        if (attr.name === "class" || attr.name === "style" || attr.name.startsWith("data-")) {
          try {
            win.document.body.setAttribute(attr.name, attr.value);
          } catch {
            // Abaikan error pada atribut tertentu
          }
        }
      });

      // 3. Salin styleSheets: setiap styleSheet dibungkus try/catch sendiri
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          if (sheet.cssRules) {
            const cssRules = Array.from(sheet.cssRules)
              .map((rule) => rule.cssText)
              .join("\n");
            const styleEl = win.document.createElement("style");
            styleEl.textContent = cssRules;
            win.document.head.appendChild(styleEl);
            return;
          }
        } catch {
          // Cross-origin atau security error saat membaca sheet.cssRules
        }

        if (sheet.href) {
          try {
            const linkEl = win.document.createElement("link");
            linkEl.rel = "stylesheet";
            if (sheet.type) linkEl.type = sheet.type;
            if (sheet.media?.mediaText) linkEl.media = sheet.media.mediaText;
            linkEl.href = sheet.href;
            win.document.head.appendChild(linkEl);
          } catch (err) {
            console.warn("Gagal menyalin link stylesheet ke PiP:", sheet.href, err);
          }
        }
      });

      // 4. Salin semua <style> di head (mode dev menyisipkan gaya sebagai tag style)
      Array.from(document.head.querySelectorAll("style")).forEach((styleEl) => {
        try {
          if (styleEl.textContent && styleEl.textContent.trim().length > 0) {
            const clone = styleEl.cloneNode(true) as HTMLStyleElement;
            win.document.head.appendChild(clone);
          }
        } catch (err) {
          console.warn("Gagal menyalin tag style ke PiP:", err);
        }
      });

      // 5. Salin adoptedStyleSheets bila didukung
      if ("adoptedStyleSheets" in document && "adoptedStyleSheets" in win.document) {
        try {
          win.document.adoptedStyleSheets = [...document.adoptedStyleSheets];
        } catch (err) {
          console.warn("Gagal menyalin adoptedStyleSheets ke PiP:", err);
        }
      }

      // 6. Style inline minimal pada body PiP dari computed style body utama
      try {
        const bodyComputed = window.getComputedStyle(document.body);
        const htmlComputed = window.getComputedStyle(document.documentElement);
        const isDark = document.documentElement.classList.contains("dark");

        const bgColor =
          bodyComputed.backgroundColor && bodyComputed.backgroundColor !== "rgba(0, 0, 0, 0)"
            ? bodyComputed.backgroundColor
            : htmlComputed.backgroundColor && htmlComputed.backgroundColor !== "rgba(0, 0, 0, 0)"
            ? htmlComputed.backgroundColor
            : isDark
            ? "#09090b"
            : "#ffffff";

        const textColor =
          bodyComputed.color || (isDark ? "#f4f4f5" : "#09090b");
        const fontFamily = bodyComputed.fontFamily || "system-ui, -apple-system, sans-serif";

        win.document.body.style.margin = "0";
        win.document.body.style.padding = "0";
        win.document.body.style.backgroundColor = bgColor;
        win.document.body.style.color = textColor;
        win.document.body.style.fontFamily = fontFamily;
        win.document.body.style.width = "100vw";
        win.document.body.style.height = "100vh";
        win.document.body.style.overflow = "hidden";
      } catch (err) {
        console.warn("Gagal mengatur inline style body PiP:", err);
      }

      // 7. Buat container dengan pipWindow.document.createElement dan pasang ke body PiP sebelum merender
      let container = win.document.getElementById("pip-root");
      if (!container) {
        container = win.document.createElement("div");
        container.id = "pip-root";
        container.style.width = "100%";
        container.style.height = "100%";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        win.document.body.appendChild(container);
      }

      // 8. Event listener pembersihan pada pagehide
      const handlePageHide = () => {
        setPipWindow(null);
      };
      win.addEventListener("pagehide", handlePageHide);

      // Tutup PiP jika tab utama ditutup
      const handleMainUnload = () => {
        try {
          if (!win.closed) win.close();
        } catch {
          // Abaikan
        }
      };
      window.addEventListener("pagehide", handleMainUnload, { once: true });

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

  // Action: Change Context (Course, Task, Mode)
  const changeContext = async (data: {
    courseId?: string | null;
    taskId?: string | null;
    mode?: FocusMode;
  }) => {
    if (data.courseId !== undefined) setSelectedCourseId(data.courseId);
    if (data.taskId !== undefined) setSelectedTaskId(data.taskId);
    if (data.mode !== undefined) setSelectedMode(data.mode);

    if (activeSession) {
      try {
        const res = await updateActiveSessionContextAction(activeSession.id, data);
        if (res.success && res.session) {
          setActiveSession(res.session);
          toast.info("Perubahan konteks berlaku untuk sesi aktif ini");
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Gagal memperbarui konteks sesi");
      }
    } else {
      // Simpan ke preferensi bila belum ada sesi aktif
      try {
        await updateStudyPreferencesAction({
          lastCourseId: data.courseId,
          lastTaskId: data.taskId,
          lastMode: data.mode,
        });
      } catch {
        // ignore
      }
    }
  };

  // Action: Start Break helper
  const startBreak = (type: "SHORT_BREAK" | "LONG_BREAK") => {
    stopAlarm();
    if (soundEnabled) soundEffects.playClick();
    const plannedSec =
      type === "LONG_BREAK"
        ? preferences?.longBreakDuration || 900
        : preferences?.shortBreakDuration || 300;

    notifiedBreakRef.current = false;
    setBreakState({
      type,
      plannedSec,
      accumulatedSec: 0,
      lastResumedAt: Date.now(),
      status: "RUNNING",
    });
    toast.success(`Waktu ${type === "LONG_BREAK" ? "istirahat panjang" : "istirahat pendek"} dimulai`);
  };

  // Action: Start Focus
  const startFocus = async (overrides?: {
    mode?: FocusMode;
    plannedSec?: number;
    courseId?: string | null;
    taskId?: string | null;
  }): Promise<boolean> => {
    if (isActionPending) return false;
    setIsActionPending(true);
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

      const mode = overrides?.mode ?? selectedMode ?? preferences?.lastMode ?? FocusMode.FOCUS;
      const plannedSec = overrides?.plannedSec ?? preferences?.focusDuration ?? 1500;
      const courseId =
        overrides?.courseId !== undefined
          ? overrides.courseId
          : selectedCourseId ?? preferences?.lastCourseId ?? null;
      const taskId =
        overrides?.taskId !== undefined
          ? overrides.taskId
          : selectedTaskId ?? preferences?.lastTaskId ?? null;

      const clientSessionId = `fs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const res = await startFocusSessionAction({
        clientSessionId,
        mode,
        plannedSec,
        courseId,
        taskId,
      });

      if (res.success && res.session) {
        reconcileSession(res.session, res.version);
        setSummarySession(null);
        alarmTriggeredSessionIdRef.current = null;
        toast.success("Sesi fokus berhasil dimulai!");
        return true;
      }
      return false;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memulai sesi fokus");
      return false;
    } finally {
      setIsActionPending(false);
    }
  };

  React.useEffect(() => {
    startFocusRef.current = startFocus;
  });

  // Action: Pause Focus
  const pause = async () => {
    if (!activeSession || isActionPending) return;
    setIsActionPending(true);
    try {
      stopAlarm();
      if (soundEnabled) soundEffects.playClick();

      // Optimistic update: version naik 1, freeze durasi berjalan di getFocusClock
      const optimisticVersion = sessionVersionRef.current + 1;
      sessionVersionRef.current = optimisticVersion;
      const currentClock = getFocusClock(activeSession, Date.now());

      setActiveSession((prev) =>
        prev
          ? {
              ...prev,
              accumulatedSec: currentClock.focusSec,
              lastResumedAt: null,
              status: FocusSessionStatus.PAUSED,
              version: optimisticVersion,
            }
          : null
      );

      const res = await pauseFocusSessionAction(activeSession.id);
      if (res.success && res.session) {
        reconcileSession(res.session, res.version);
      }
      toast.info("Sesi fokus dijeda");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menjeda sesi");
      await refreshActiveSession();
    } finally {
      setIsActionPending(false);
    }
  };

  // Action: Resume Focus
  const resume = async () => {
    if (!activeSession || isActionPending) return;
    setIsActionPending(true);
    try {
      stopAlarm();
      if (soundEnabled) soundEffects.playClick();

      // Optimistic update: version naik 1, set lastResumedAt ISO dengan 'Z'
      const optimisticVersion = sessionVersionRef.current + 1;
      sessionVersionRef.current = optimisticVersion;
      const nowIso = new Date().toISOString();

      setActiveSession((prev) =>
        prev
          ? {
              ...prev,
              lastResumedAt: nowIso,
              status: FocusSessionStatus.RUNNING,
              version: optimisticVersion,
            }
          : null
      );

      const res = await resumeFocusSessionAction(activeSession.id);
      if (res.success && res.session) {
        reconcileSession(res.session, res.version);
      }
      toast.success("Sesi fokus dilanjutkan");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal melanjutkan sesi");
      await refreshActiveSession();
    } finally {
      setIsActionPending(false);
    }
  };

  // Action: Extend Focus (+5 menit)
  const extendFocus = async () => {
    if (!activeSession || isActionPending) return;
    setIsActionPending(true);
    try {
      stopAlarm();
      if (soundEnabled) soundEffects.playClick();
      const res = await extendFocusSessionAction(activeSession.id);
      if (res.success && res.session) {
        reconcileSession(res.session, res.version);
        alarmTriggeredSessionIdRef.current = null;
        toast.success("Sesi fokus diperpanjang +5 menit!");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memperpanjang sesi");
    } finally {
      setIsActionPending(false);
    }
  };

  // Action: End Session (Single "Akhiri" button)
  const endSession = async (
    note?: string
  ): Promise<{ action: "SAVED" | "DISCARDED"; status?: FocusSessionStatus | null }> => {
    if (!activeSession || isActionPending) return { action: "DISCARDED" };
    setIsActionPending(true);
    try {
      stopAlarm();
      const res = await endFocusSessionAction(activeSession.id, note);

      if (res.action === "DISCARDED") {
        reconcileSession(null);
        alarmTriggeredSessionIdRef.current = null;
        toast.info("Terlalu singkat, tidak dicatat");
        return { action: "DISCARDED" };
      }

      // Sesi tersimpan
      if (soundEnabled) soundEffects.playSessionComplete(preferences?.soundVolume ?? 80);
      reconcileSession(null);
      alarmTriggeredSessionIdRef.current = null;

      // Update summary session untuk layar ringkasan
      if (res.session) {
        setSummarySession({
          id: res.session.id,
          status: res.status,
          focusSec: res.accumulatedSec,
          plannedSec: res.session.plannedSec,
          mode: res.session.mode,
          note: res.session.note,
          course: res.session.course,
          task: res.session.task,
        });
      }

      // Refresh siklus hari ini dari server
      const todayCycles = await getTodayCompletedCyclesAction();
      setCompletedCycles(todayCycles);

      // Auto start break jika diaktifkan di preferensi
      if (preferences?.autoStartBreak ?? true) {
        const longInterval = preferences?.longBreakInterval || 4;
        const isLongBreak = todayCycles > 0 && todayCycles % longInterval === 0;
        startBreak(isLongBreak ? "LONG_BREAK" : "SHORT_BREAK");
      }

      toast.success(
        res.status === FocusSessionStatus.COMPLETED
          ? "Target tercapai! Sesi berhasil dicatat."
          : "Sesi dihentikan lebih awal dan durasi fokus berhasil dicatat."
      );

      return { action: "SAVED", status: res.status };
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal mengakhiri sesi");
      return { action: "DISCARDED" };
    } finally {
      setIsActionPending(false);
    }
  };

  // Action: Discard Session ("Buang sesi")
  const discardSession = async () => {
    if (!activeSession || isActionPending) return;
    setIsActionPending(true);
    try {
      stopAlarm();
      await discardFocusSessionAction(activeSession.id);
      reconcileSession(null);
      setSummarySession(null);
      alarmTriggeredSessionIdRef.current = null;
      toast.info("Sesi telah dibuang dan tidak dicatat");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal membuang sesi");
    } finally {
      setIsActionPending(false);
    }
  };

  // Backward compatibility aliases
  const complete = async (note?: string) => {
    await endSession(note);
  };
  const stopEarly = async (note?: string) => {
    await endSession(note);
  };
  const cancel = async () => {
    await discardSession();
  };

  // Action: Break actions
  const pauseBreak = () => {
    if (!isBreakActive || breakState.status !== "RUNNING") return;
    if (soundEnabled) soundEffects.playClick();
    let current = breakState.accumulatedSec;
    if (breakState.lastResumedAt) {
      current += Math.max(0, Math.floor((Date.now() - breakState.lastResumedAt) / 1000));
    }
    setBreakState((prev) => ({
      ...prev,
      accumulatedSec: current,
      lastResumedAt: null,
      status: "PAUSED",
    }));
  };

  const resumeBreak = () => {
    if (!isBreakActive || breakState.status !== "PAUSED") return;
    if (soundEnabled) soundEffects.playClick();
    setBreakState((prev) => ({
      ...prev,
      lastResumedAt: Date.now(),
      status: "RUNNING",
    }));
  };

  const skipBreak = () => {
    if (!isBreakActive) return;
    if (soundEnabled) soundEffects.playClick();
    setBreakState({
      type: "NONE",
      plannedSec: 300,
      accumulatedSec: 0,
      lastResumedAt: null,
      status: "COMPLETED",
    });
    toast.info("Waktu istirahat dilewati");
  };

  // Action: Save Summary Note
  const saveSummaryNote = async (note: string) => {
    if (!summarySession) return;
    try {
      await updateSessionNoteAction(summarySession.id, note);
      setSummarySession((prev) => (prev ? { ...prev, note } : null));
      toast.success("Catatan berhasil disimpan!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan catatan");
    }
  };

  const dismissSummary = () => {
    setSummarySession(null);
  };

  const refreshActiveSession = async () => {
    try {
      const active = await getActiveFocusSessionAction();
      reconcileSession(active);
    } catch {
      // ignore
    }
  };

  const refreshPreferences = async () => {
    try {
      const pref = await getStudyPreferencesAction();
      setPreferences(pref);
    } catch {
      // ignore
    }
  };

  return (
    <FocusTimerContext.Provider
      value={{
        activeSession,
        breakState,
        preferences,
        completedCycles,
        isLoading,
        isActionPending,
        clockPhase,

        selectedCourseId,
        selectedTaskId,
        selectedMode,
        changeContext,

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

        summarySession,
        dismissSummary,
        saveSummaryNote,

        startFocus,
        pause,
        resume,
        endSession,
        discardSession,
        extendFocus,

        complete,
        stopEarly,
        cancel,

        startBreak,
        pauseBreak,
        resumeBreak,
        skipBreak,

        soundEnabled,
        setSoundEnabled,
        soundVolume: preferences?.soundVolume ?? 80,
        setSoundVolume,
        alertIntensity: preferences?.alertIntensity || AlertIntensity.NORMAL,
        setAlertIntensity,
        floatMode: preferences?.floatMode || FloatMode.IN_APP,
        setFloatMode,
        notificationsEnabled,
        requestNotificationPermission,

        isPipSupported,
        isPipActive: Boolean(pipWindow),
        pipWindow,
        requestPip,
        closePip,

        refreshActiveSession,
        refreshPreferences,
      }}
    >
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

export function useOptionalFocusTimer() {
  return React.useContext(FocusTimerContext);
}
