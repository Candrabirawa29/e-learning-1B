"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFocusTimer } from "./FocusTimerContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatSecToMMSS, formatOverdueText } from "@/lib/focus/session-logic";
import {
  Play,
  Pause,
  ExternalLink,
  Coffee,
  Sparkles,
  PlusCircle,
  BellOff,
  PictureInPicture2,
} from "lucide-react";
import { FocusMode, FloatMode } from "@prisma/client";

export function MiniFocusFloatingWidget() {
  const pathname = usePathname();
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
    pauseBreak,
    resumeBreak,
    preferences,
    isPipSupported,
    isPipActive,
    requestPip,
  } = useFocusTimer();

  // 1. Jangan tampilkan jika pengguna berada di /home/focus
  if (pathname === "/home/focus") {
    return null;
  }

  // 2. Pengaturan pengguna: bila floatMode === OFF, sembunyikan widget
  if (preferences?.floatMode === FloatMode.OFF) {
    return null;
  }

  // 3. Jika floatMode === PIP dan PiP aktif, sembunyikan widget in-app
  if (preferences?.floatMode === FloatMode.PIP && isPipActive) {
    return null;
  }

  // 4. Tampilkan hanya jika ada sesi fokus aktif atau istirahat
  const hasActiveSession = Boolean(activeSession);
  if (!hasActiveSession && !isBreakActive) {
    return null;
  }

  const isFocus = hasActiveSession && !isBreakActive;
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

  const togglePlayPause = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFocus) {
      if (isRunning) pause();
      else resume();
    } else {
      if (isRunning) pauseBreak();
      else resumeBreak();
    }
  };

  const isAlertMode = isAlarmActive || (isFocus && isTargetReached);

  return (
    <aside
      aria-label="Widget Timer Fokus"
      className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300"
    >
      <div
        className={`flex items-center gap-2.5 backdrop-blur-md border shadow-lg px-3.5 py-2 rounded-full text-xs transition-colors duration-300 ${
          isAlertMode
            ? "bg-emerald-600 text-white dark:bg-emerald-700 border-emerald-400 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] motion-reduce:animate-none"
            : "bg-background/95 text-foreground border-border"
        }`}
      >
        <Link
          href="/home/focus"
          className="flex items-center gap-2 text-inherit hover:opacity-90 transition-opacity"
        >
          <div
            className={`flex items-center justify-center h-6 w-6 rounded-full shrink-0 ${
              isAlertMode
                ? "bg-white/20 text-white"
                : "bg-primary/10 text-primary"
            }`}
          >
            {isFocus ? (
              <Sparkles className="h-3.5 w-3.5" />
            ) : (
              <Coffee className="h-3.5 w-3.5 text-amber-500" />
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 font-bold font-mono text-sm leading-none">
              <span>{displayTime}</span>
              <Badge
                variant="outline"
                className={`text-[9px] px-1 py-0 h-4 border-none font-semibold ${
                  isAlertMode
                    ? "bg-white text-emerald-800"
                    : isFocus
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {isAlertMode
                  ? "Selesai"
                  : isFocus
                  ? isRunning
                    ? "Fokus"
                    : "Jeda"
                  : "Break"}
              </Badge>
            </div>
            <span
              className={`text-[10px] line-clamp-1 max-w-[120px] sm:max-w-[160px] ${
                isAlertMode ? "text-white/80" : "text-muted-foreground"
              }`}
            >
              {title}
            </span>
          </div>
        </Link>

        {/* Action Controls */}
        <div
          className={`flex items-center gap-1 border-l pl-2 ${
            isAlertMode ? "border-white/30" : "border-border"
          }`}
        >
          {isAlertMode ? (
            <>
              {isAlarmActive && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={stopAlarm}
                  className="h-7 w-7 rounded-full text-white hover:bg-white/20"
                  title="Hentikan Bunyi Alarm"
                >
                  <BellOff className="h-3.5 w-3.5" />
                </Button>
              )}

              <Button
                size="sm"
                variant="secondary"
                onClick={extendFocus}
                className="h-7 px-2 text-[11px] font-bold rounded-full bg-white text-emerald-800 hover:bg-white/90 shadow-xs gap-1"
                title="Lanjut fokus +5 menit"
              >
                <PlusCircle className="h-3 w-3" />
                <span>+5m</span>
              </Button>
            </>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              onClick={togglePlayPause}
              className={`h-7 w-7 rounded-full ${
                isAlertMode
                  ? "text-white hover:bg-white/20"
                  : "text-foreground hover:bg-muted"
              }`}
              title={isRunning ? "Jeda" : "Lanjutkan"}
            >
              {isRunning ? (
                <Pause className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
              )}
            </Button>
          )}

          {/* Picture-in-Picture Button */}
          {isPipSupported && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => requestPip()}
              className={`h-7 w-7 rounded-full ${
                isAlertMode
                  ? "text-white hover:bg-white/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Melayang (Picture-in-Picture)"
            >
              <PictureInPicture2 className="h-3.5 w-3.5" />
            </Button>
          )}

          <Link href="/home/focus">
            <Button
              size="icon"
              variant="ghost"
              className={`h-7 w-7 rounded-full ${
                isAlertMode
                  ? "text-white hover:bg-white/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Buka Ruang Fokus"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  );
}
