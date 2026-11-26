"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFocusTimer } from "./FocusTimerContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getFocusView } from "@/lib/focus/session-logic";
import {
  Play,
  Pause,
  ExternalLink,
  PlusCircle,
  BellOff,
  PictureInPicture2,
} from "lucide-react";
import { FloatMode } from "@prisma/client";

export function MiniFocusFloatingWidget() {
  const pathname = usePathname();
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

  return (
    <aside
      aria-label="Widget Timer Fokus"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] max-w-[calc(100vw-2rem-env(safe-area-inset-left)-env(safe-area-inset-right))] z-50 animate-in fade-in slide-in-from-bottom-3 duration-300"
    >
      <div className="flex items-center gap-2.5 backdrop-blur-md border shadow-lg px-3.5 py-2 rounded-full text-xs transition-colors duration-300 bg-background/95 text-foreground border-border">
        <Link
          href="/home/focus"
          className="flex items-center gap-2 text-inherit hover:opacity-90 transition-opacity"
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 font-bold font-mono text-sm leading-none">
              {clockView.kind === "TARGET_REACHED" ? (
                <>
                  <span className="text-xs font-semibold">{clockView.teksTengah}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {clockView.durasiTercatat}
                  </span>
                </>
              ) : (
                <span>{clockView.teksTengah}</span>
              )}

              <Badge
                variant="outline"
                className={`text-[9px] px-1 py-0 h-4 border-none font-semibold ${
                  clockView.kind === "TARGET_REACHED"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : isFocus
                    ? clockView.kind === "RUNNING"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {clockView.kind === "TARGET_REACHED"
                  ? "Selesai"
                  : isFocus
                  ? clockView.kind === "RUNNING"
                    ? "Fokus"
                    : "Jeda"
                  : "Break"}
              </Badge>
            </div>
            <span className="text-[10px] line-clamp-1 max-w-[120px] sm:max-w-[160px] text-muted-foreground">
              {title}
            </span>
          </div>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-1 border-l pl-2 border-border">
          {isAlarmActive && (
            <Button
              size="icon"
              variant="ghost"
              onClick={stopAlarm}
              className="h-7 w-7 rounded-full text-foreground hover:bg-muted"
              title="Hentikan Bunyi Alarm"
            >
              <BellOff className="h-3.5 w-3.5" />
            </Button>
          )}

          {clockView.kind === "TARGET_REACHED" ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={extendFocus}
              disabled={isActionPending}
              className="h-7 px-2 text-[11px] font-bold rounded-full shadow-xs gap-1"
              title="Lanjut fokus +5 menit"
            >
              <PlusCircle className="h-3 w-3" />
              <span>+5m</span>
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (clockView.tombolUtama.action === "PAUSE") pause();
                else if (clockView.tombolUtama.action === "RESUME") resume();
                else if (clockView.tombolSekunder[0]?.action === "PAUSE_BREAK") pauseBreak();
                else if (clockView.tombolSekunder[0]?.action === "RESUME_BREAK") resumeBreak();
              }}
              disabled={isActionPending}
              className="h-7 w-7 rounded-full text-foreground hover:bg-muted"
              title={clockView.tombolUtama.label}
            >
              {clockView.tombolUtama.action === "PAUSE" ||
              clockView.tombolSekunder[0]?.action === "PAUSE_BREAK" ? (
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
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Melayang (Picture-in-Picture)"
            >
              <PictureInPicture2 className="h-3.5 w-3.5" />
            </Button>
          )}

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
