"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useFocusTimer } from "./FocusTimerContext";
import { getFocusView } from "@/lib/focus/session-logic";
import {
  Play,
  Pause,
  Coffee,
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
    focusSec,
    remainingSec,
    overdueSec,
    isTargetReached,
    isActionPending,
    clockPhase,
    isAlarmActive,
    stopAlarm,
    extendFocus,
    pause,
    resume,
    endSession,
    startFocus,
    pauseBreak,
    resumeBreak,
    skipBreak,
    startBreak,
    completedCycles,
    preferences,
  } = useFocusTimer();

  // Jika state timer belum siap, tampilkan teks cadangan ("Menghubungkan timer...")
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
  const clockView = getFocusView({
    mode: activeSession?.mode,
    status: activeSession?.status,
    focusSec,
    plannedSec: activeSession?.plannedSec ?? preferences?.focusDuration ?? 1500,
    remainingSec,
    overdueSec,
    isTargetReached,
    isBreakActive,
    breakStatus: breakState.status,
    breakRemainingSec: remainingSec,
    hasActiveSession,
    clockPhase,
  });

  const title = isFocus
    ? activeSession?.course?.name || activeSession?.task?.title || "Sesi Fokus"
    : breakState.type === "LONG_BREAK"
    ? "Istirahat Panjang"
    : "Istirahat Pendek";

  const handleStartBreakAfterFocus = async () => {
    stopAlarm();
    await endSession();
    const longInterval = preferences?.longBreakInterval || 4;
    const isLongBreak = (completedCycles + 1) % longInterval === 0;
    startBreak(isLongBreak ? "LONG_BREAK" : "SHORT_BREAK");
  };

  const isAlertMode = isAlarmActive || clockView.kind === "TARGET_REACHED";

  let containerBg = "bg-background text-foreground";
  let borderLineColor = "border-border/60";

  if (isAlertMode) {
    containerBg = "bg-card text-foreground border-emerald-500/40";
    borderLineColor = "border-border";
  } else if (isBreakActive) {
    containerBg = "bg-amber-500/5 text-foreground";
    borderLineColor = "border-amber-500/20";
  }

  return (
    <div
      className={`h-full w-full flex flex-col justify-between p-2.5 box-border select-none font-sans overflow-hidden transition-colors duration-300 ${containerBg}`}
    >
      {/* Header: Title & Status Badge */}
      <div className={`flex items-center justify-between gap-2 border-b pb-1.5 text-xs ${borderLineColor}`}>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="truncate font-semibold text-[11px] leading-tight">
            {title}
          </span>
        </div>

        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
            clockView.kind === "TARGET_REACHED"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : isFocus
              ? clockView.kind === "RUNNING"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-muted text-muted-foreground"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
          }`}
        >
          {clockView.kind === "TARGET_REACHED"
            ? "Target Tercapai"
            : isFocus
            ? clockView.kind === "RUNNING"
              ? "Fokus"
              : "Jeda"
            : "Istirahat"}
        </span>
      </div>

      {/* Center: Waktu / Status */}
      <div className="flex-1 flex flex-col items-center justify-center my-1 min-h-0 text-center px-2">
        {clockView.kind === "TARGET_REACHED" ? (
          <>
            <span className="font-bold tracking-tight text-sm leading-tight text-foreground whitespace-nowrap">
              {clockView.teksTengah}
            </span>
            <span className="font-semibold font-mono text-xs text-muted-foreground whitespace-nowrap mt-0.5">
              {clockView.durasiTercatat}
            </span>
            {clockView.teksOverdue && (
              <span className="text-[10px] text-muted-foreground mt-1 leading-none">
                {clockView.teksOverdue}
              </span>
            )}
          </>
        ) : (
          <>
            <div className="font-mono font-black tracking-tight leading-none text-3xl text-foreground">
              {clockView.teksTengah}
            </div>
            <span className="text-[10px] font-medium text-muted-foreground mt-1">
              {clockView.pesan}
            </span>
          </>
        )}
      </div>

      {/* Footer Controls: Pemetaan getFocusView */}
      <div className={`flex items-center justify-center gap-2 pt-1 border-t ${borderLineColor}`}>
        {isAlarmActive && (
          <button
            type="button"
            onClick={stopAlarm}
            title="Matikan bunyi alarm"
            className="px-2 py-1 bg-muted hover:bg-muted/80 text-foreground rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <BellOff className="h-3.5 w-3.5" />
            <span>Matikan</span>
          </button>
        )}

        {clockView.kind === "TARGET_REACHED" ? (
          <>
            <button
              type="button"
              onClick={handleStartBreakAfterFocus}
              disabled={isActionPending}
              className="px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
            >
              <Coffee className="h-3.5 w-3.5" />
              <span>{clockView.tombolUtama.label}</span>
            </button>

            {clockView.tombolSekunder.map((btn) => (
              <button
                key={btn.action}
                type="button"
                onClick={extendFocus}
                disabled={isActionPending}
                className="px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
              >
                <PlusCircle className="h-3.5 w-3.5 text-primary" />
                <span>+5m</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => endSession()}
              disabled={isActionPending}
              className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer ml-1"
            >
              {clockView.teksKecil}
            </button>
          </>
        ) : clockView.kind === "BREAK" ? (
          <>
            <button
              type="button"
              onClick={() => skipBreak()}
              disabled={isActionPending}
              className="px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
            >
              <SkipForward className="h-3.5 w-3.5" />
              <span>{clockView.tombolUtama.label}</span>
            </button>

            {clockView.tombolSekunder.map((btn) => (
              <button
                key={btn.action}
                type="button"
                onClick={() => {
                  if (btn.action === "PAUSE_BREAK") pauseBreak();
                  else if (btn.action === "RESUME_BREAK") resumeBreak();
                }}
                disabled={isActionPending}
                className="px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-md text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
              >
                {btn.action === "PAUSE_BREAK" ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                <span>{btn.label}</span>
              </button>
            ))}
          </>
        ) : clockView.kind === "BREAK_OVERDUE" ? (
          <button
            type="button"
            onClick={() => startFocus()}
            disabled={isActionPending}
            className="px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            <span>{clockView.tombolUtama.label}</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                if (clockView.tombolUtama.action === "PAUSE") pause();
                else if (clockView.tombolUtama.action === "RESUME") resume();
                else startFocus();
              }}
              disabled={isActionPending}
              className="px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
            >
              {clockView.tombolUtama.action === "PAUSE" ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              <span>{clockView.tombolUtama.label}</span>
            </button>

            {clockView.tombolSekunder.map((btn) => (
              <button
                key={btn.action}
                type="button"
                onClick={() => endSession()}
                disabled={isActionPending}
                className="px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-md text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
              >
                <StopCircle className="h-3.5 w-3.5 text-rose-500" />
                <span>{btn.label}</span>
              </button>
            ))}
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
