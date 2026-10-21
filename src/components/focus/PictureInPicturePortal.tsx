"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useFocusTimer } from "./FocusTimerContext";
import { formatSecToMMSS, formatOverdueText } from "@/lib/focus/session-logic";
import { FocusMode } from "@prisma/client";
import {
  Play,
  Pause,
  Coffee,
  Sparkles,
  PlusCircle,
  BellOff,
  StopCircle,
  SkipForward,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface PipErrorBoundaryProps {
  children: React.ReactNode;
}

interface PipErrorBoundaryState {
  hasError: boolean;
  error?: unknown;
}

class PipErrorBoundary extends React.Component<PipErrorBoundaryProps, PipErrorBoundaryState> {
  constructor(props: PipErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): PipErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error("PiP render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center p-3 text-center bg-background text-foreground select-none">
          <AlertCircle className="h-5 w-5 text-destructive mb-1.5 opacity-90" />
          <span className="text-xs font-semibold text-destructive">Gagal merender timer</span>
          <span className="text-[11px] text-muted-foreground mt-0.5">Menghubungkan timer...</span>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Komponen konten utama di dalam jendela Document Picture-in-Picture.
 * - Menggunakan layout penuh jendela (h-full w-full flex flex-col justify-between).
 * - Tanpa posisi fixed dan tanpa kelas breakpoint responsif (hidden md:..., sm:...).
 * - Ukuran teks dan tombol proporsional untuk jendela berdimensi kecil (width ~300-340px).
 */
function PipWindowContent() {
  const {
    activeSession,
    isBreakActive,
    breakState,
    elapsedSec,
    focusSec,
    remainingSec,
    overdueSec,
    isOverdue,
    isTargetReached,
    isActionPending,
    clockPhase,
    isAlarmActive,
    stopAlarm,
    extendFocus,
    pause,
    resume,
    endSession,
    pauseBreak,
    resumeBreak,
    skipBreak,
    startBreak,
    completedCycles,
    preferences,
  } = useFocusTimer();

  // 4. Jika state timer belum siap, tampilkan teks cadangan ("Menghubungkan timer...")
  const hasActiveSession = Boolean(activeSession);
  if (!hasActiveSession && !isBreakActive) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-4 text-center bg-background text-foreground select-none">
        <Loader2 className="h-5 w-5 animate-spin mb-2 text-primary opacity-80" />
        <span className="text-xs font-medium text-muted-foreground">Menghubungkan timer...</span>
      </div>
    );
  }

  const isFocus = hasActiveSession && !isBreakActive;
  const isRunning = isFocus
    ? activeSession?.status === "RUNNING"
    : breakState.status === "RUNNING";

  const isTargetCompletedFocus = isFocus && activeSession?.mode === FocusMode.FOCUS && isTargetReached;

  const displayTime = isFocus
    ? clockPhase === "INVALID"
      ? "Menyinkronkan..."
      : activeSession?.mode === FocusMode.STOPWATCH
      ? formatSecToMMSS(focusSec)
      : isOverdue
      ? formatOverdueText(overdueSec)
      : remainingSec === 0 && !isTargetCompletedFocus
      ? "Menyinkronkan..."
      : formatSecToMMSS(remainingSec)
    : formatSecToMMSS(remainingSec);

  const title = isFocus
    ? activeSession?.course?.name || activeSession?.task?.title || "Sesi Fokus"
    : breakState.type === "LONG_BREAK"
    ? "Istirahat Panjang"
    : "Istirahat Pendek";

  const togglePlayPause = () => {
    if (isFocus) {
      if (isRunning) pause();
      else resume();
    } else {
      if (isRunning) pauseBreak();
      else resumeBreak();
    }
  };

  const handleStartBreakAfterFocus = () => {
    stopAlarm();
    const longInterval = preferences?.longBreakInterval || 4;
    const isLongBreak = (completedCycles + 1) % longInterval === 0;
    endSession();
    startBreak(isLongBreak ? "LONG_BREAK" : "SHORT_BREAK");
  };

  // Status Visual: Alarm / Target Reached vs Normal
  const isAlertMode = isAlarmActive || (isFocus && isTargetReached);

  let containerBg = "bg-background text-foreground";
  let borderLineColor = "border-border/60";

  if (isAlertMode) {
    containerBg =
      "bg-emerald-600 text-white dark:bg-emerald-700 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] motion-reduce:animate-none";
    borderLineColor = "border-white/20";
  } else if (isBreakActive) {
    containerBg = "bg-amber-500/10 text-foreground";
    borderLineColor = "border-amber-500/30";
  }

  return (
    <div
      className={`h-full w-full flex flex-col justify-between p-2.5 box-border select-none font-sans overflow-hidden transition-colors duration-300 ${containerBg}`}
    >
      {/* Header: Title & Status Badge (Tanpa kelas breakpoint/hidden) */}
      <div className={`flex items-center justify-between gap-2 border-b pb-1.5 text-xs ${borderLineColor}`}>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {isFocus ? (
            <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-80" />
          ) : (
            <Coffee className="h-3.5 w-3.5 shrink-0 opacity-80" />
          )}
          <span className="truncate font-semibold text-[11px] leading-tight">
            {title}
          </span>
        </div>

        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
            isAlertMode
              ? "bg-white text-emerald-800"
              : isFocus
              ? isRunning
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-muted text-muted-foreground"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
          }`}
        >
          {isAlertMode
            ? "Selesai"
            : isFocus
            ? isRunning
              ? "Fokus"
              : "Jeda"
            : "Istirahat"}
        </span>
      </div>

      {/* Center: Large Time & Overdue Indicator */}
      <div className="flex-1 flex flex-col items-center justify-center my-1 min-h-0">
        <div
          className={`font-mono font-black tracking-tight leading-none ${
            isOverdue ? "text-2xl" : "text-3xl"
          }`}
        >
          {displayTime}
        </div>
        {isOverdue && (
          <span className="text-[10px] font-semibold opacity-90 mt-1 leading-none">
            Waktu fokus terkunci • Tidak dihitung
          </span>
        )}
      </div>

      {/* Footer Controls: Interaktif (Pause, Resume, Akhiri, dsb) */}
      <div className={`flex items-center justify-center gap-2 pt-1 border-t ${borderLineColor}`}>
        {isFocus && isTargetReached ? (
          <>
            {isAlarmActive && (
              <button
                type="button"
                onClick={stopAlarm}
                title="Hentikan Bunyi Alarm"
                className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <BellOff className="h-3.5 w-3.5" />
                <span>Mute</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                stopAlarm();
                extendFocus();
              }}
              disabled={isActionPending}
              title="Perpanjang fokus +5 menit"
              className="px-2.5 py-1 bg-white text-emerald-800 hover:bg-white/90 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>+5m Fokus</span>
            </button>

            <button
              type="button"
              onClick={handleStartBreakAfterFocus}
              title="Selesaikan sesi dan mulai istirahat"
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Coffee className="h-3.5 w-3.5" />
              <span>Istirahat</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={togglePlayPause}
              disabled={isActionPending}
              className="px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  <span>Jeda</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Lanjut</span>
                </>
              )}
            </button>

            {isFocus ? (
              <button
                type="button"
                onClick={() => endSession()}
                disabled={isActionPending}
                className="px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-md text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
              >
                <StopCircle className="h-3.5 w-3.5 text-rose-500" />
                <span>Akhiri</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => skipBreak()}
                className="px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-md text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <SkipForward className="h-3.5 w-3.5" />
                <span>Lewati</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface PictureInPicturePortalProps {
  pipWindow?: Window | null;
}

/**
 * Host portal Picture-in-Picture yang memasang PipWindowContent ke dalam pipWindow.
 * Secara mandiri mendeteksi container di dalam pipWindow.document dan menyinkronkan tema.
 */
export function PictureInPicturePortal({ pipWindow: propPipWindow }: PictureInPicturePortalProps = {}) {
  const context = useFocusTimer();
  const pipWindow = propPipWindow !== undefined ? propPipWindow : context.pipWindow;

  // Sinkronkan kelas tema (dark/light) dari induk ke pipWindow jika berubah secara dinamis
  React.useEffect(() => {
    if (!pipWindow || pipWindow.closed) return;

    const syncTheme = () => {
      try {
        if (pipWindow.document && pipWindow.document.documentElement) {
          pipWindow.document.documentElement.className = document.documentElement.className;
        }
      } catch {
        // Abaikan
      }
    };

    syncTheme();

    const observer = new MutationObserver(() => syncTheme());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });

    return () => observer.disconnect();
  }, [pipWindow]);

  if (!pipWindow || pipWindow.closed) return null;

  // Temukan atau buat container di dalam body PiP
  let container: HTMLElement | null = null;
  try {
    container = pipWindow.document.getElementById("pip-root");
    if (!container) {
      container = pipWindow.document.createElement("div");
      container.id = "pip-root";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      pipWindow.document.body.appendChild(container);
    }
  } catch (err) {
    console.error("Gagal menyiapkan container DOM PiP:", err);
    return null;
  }

  if (!container) return null;

  return createPortal(
    <PipErrorBoundary>
      <PipWindowContent />
    </PipErrorBoundary>,
    container
  );
}
