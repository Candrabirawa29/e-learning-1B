"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFocusTimer } from "./FocusTimerContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, ExternalLink, Coffee, Sparkles } from "lucide-react";
import { FocusMode } from "@prisma/client";

function formatSecToMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function MiniFocusFloatingWidget() {
  const pathname = usePathname();
  const {
    activeSession,
    isBreakActive,
    breakState,
    elapsedSec,
    remainingSec,
    pause,
    resume,
    pauseBreak,
    resumeBreak,
  } = useFocusTimer();

  // Jangan tampilkan jika pengguna sedang berada di halaman /home/focus
  if (pathname === "/home/focus") {
    return null;
  }

  // Tampilkan hanya jika ada sesi fokus aktif atau istirahat yang berjalan/dijeda
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

  return (
    <aside aria-label="Widget Timer Fokus" className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="flex items-center gap-2.5 bg-background/95 backdrop-blur-md border border-border shadow-lg px-3.5 py-2 rounded-full text-xs">
        <Link
          href="/home/focus"
          className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary">
            {isFocus ? (
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Coffee className="h-3.5 w-3.5 text-amber-500" />
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 font-bold font-mono text-sm leading-none">
              <span>{displayTime}</span>
              <Badge
                variant="outline"
                className={`text-[9px] px-1 py-0 h-4 border-none ${
                  isFocus
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {isFocus ? (isRunning ? "Fokus" : "Jeda") : "Break"}
              </Badge>
            </div>
            <span className="text-[10px] text-muted-foreground line-clamp-1 max-w-[120px] sm:max-w-[160px]">
              {title}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1 border-l pl-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={togglePlayPause}
            className="h-7 w-7 rounded-full text-foreground hover:bg-muted"
            title={isRunning ? "Jeda" : "Lanjutkan"}
          >
            {isRunning ? (
              <Pause className="h-3.5 w-3.5 fill-current" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
            )}
          </Button>

          <Link href="/home/focus">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
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
