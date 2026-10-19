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
} from "lucide-react";

interface PictureInPicturePortalProps {
  pipWindow: Window | null;
}

export function PictureInPicturePortal({ pipWindow }: PictureInPicturePortalProps) {
  const {
    activeSession,
    isBreakActive,
    breakState,
    elapsedSec,
    remainingSec,
    overdueSec,
    isOverdue,
    isTargetReached,
    isAlarmActive,
    stopAlarm,
    extendFocus,
    pause,
    resume,
    endSession,
    pauseBreak,
    resumeBreak,
    startBreak,
    completedCycles,
    preferences,
  } = useFocusTimer();

  if (!pipWindow) return null;

  const isFocus = Boolean(activeSession) && !isBreakActive;
  const isRunning = isFocus
    ? activeSession?.status === "RUNNING"
    : breakState.status === "RUNNING";

  const displayTime = isFocus
    ? activeSession?.mode === FocusMode.STOPWATCH
      ? formatSecToMMSS(elapsedSec)
      : isOverdue
      ? formatOverdueText(overdueSec)
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

  // Status visual color and pulse
  // Alarm active: full-color background, slow pulse (<= 1 Hz), text contrast WCAG AAA (white on dark green/amber)
  // prefers-reduced-motion is respected via motion-reduce:animate-none
  let containerBg = "bg-background text-foreground";
  if (isAlarmActive || (isFocus && isTargetReached)) {
    containerBg =
      "bg-emerald-600 text-white dark:bg-emerald-700 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] motion-reduce:animate-none";
  } else if (isBreakActive) {
    containerBg = "bg-amber-500/10 text-foreground border-amber-500/30";
  }

  return createPortal(
    <div
      className={`h-screen w-screen flex flex-col justify-between p-3 select-none font-sans overflow-hidden transition-colors duration-300 ${containerBg}`}
    >
      {/* Header: Title & Phase Badge */}
      <div className="flex items-center justify-between gap-2 border-b border-white/20 pb-1.5 text-xs">
        <div className="flex items-center gap-1.5 truncate font-medium">
          {isFocus ? (
            <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-80" />
          ) : (
            <Coffee className="h-3.5 w-3.5 shrink-0 opacity-80" />
          )}
          <span className="truncate max-w-[190px]">{title}</span>
        </div>

        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
            isAlarmActive || (isFocus && isTargetReached)
              ? "bg-white text-emerald-800"
              : isFocus
              ? isRunning
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-muted text-muted-foreground"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
          }`}
        >
          {isAlarmActive || (isFocus && isTargetReached)
            ? "Selesai"
            : isFocus
            ? isRunning
              ? "Fokus"
              : "Jeda"
            : "Istirahat"}
        </span>
      </div>

      {/* Center: Large Time & Overdue Indicator */}
      <div className="flex flex-col items-center justify-center my-1">
        <div
          className={`font-mono font-black tracking-tight ${
            isOverdue ? "text-2xl" : "text-3xl"
          }`}
        >
          {displayTime}
        </div>
        {isOverdue && (
          <span className="text-[10px] font-semibold opacity-90 mt-0.5">
            Waktu fokus terkunci • Tidak dihitung
          </span>
        )}
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-center gap-2 pt-1 border-t border-white/20">
        {isFocus && isTargetReached ? (
          <>
            {isAlarmActive && (
              <button
                onClick={stopAlarm}
                title="Hentikan Bunyi Alarm"
                className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <BellOff className="h-3.5 w-3.5" />
                <span>Mute</span>
              </button>
            )}

            <button
              onClick={() => {
                stopAlarm();
                extendFocus();
              }}
              title="Perpanjang fokus +5 menit"
              className="px-2.5 py-1 bg-white text-emerald-800 hover:bg-white/90 rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>+5m Fokus</span>
            </button>

            <button
              onClick={handleStartBreakAfterFocus}
              title="Selesaikan sesi dan mulai istirahat"
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Coffee className="h-3.5 w-3.5" />
              <span>Istirahat</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={togglePlayPause}
              className="px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
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

            {isFocus && (
              <button
                onClick={() => endSession()}
                className="px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                <StopCircle className="h-3.5 w-3.5 text-rose-500" />
                <span>Akhiri</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>,
    pipWindow.document.body
  );
}
