"use client";

import * as React from "react";
import { useFocusTimer } from "./FocusTimerContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FocusMode } from "@prisma/client";
import {
  Play,
  Pause,
  CheckCircle2,
  StopCircle,
  XCircle,
  Coffee,
  Sparkles,
  Volume2,
  VolumeX,
  Bell,
  BellRing,
  FastForward,
} from "lucide-react";

function formatSecToMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface FocusTimerDisplayProps {
  onOpenConfig: () => void;
  onOpenCompleteModal: () => void;
}

export function FocusTimerDisplay({
  onOpenConfig,
  onOpenCompleteModal,
}: FocusTimerDisplayProps) {
  const {
    activeSession,
    breakState,
    isBreakActive,
    elapsedSec,
    remainingSec,
    progressPercent,
    pause,
    resume,
    cancel,
    stopEarly,
    pauseBreak,
    resumeBreak,
    skipBreak,
    soundEnabled,
    setSoundEnabled,
    notificationsEnabled,
    requestNotificationPermission,
    completedCycles,
  } = useFocusTimer();

  const isFocus = Boolean(activeSession) && !isBreakActive;
  const isRunning = isFocus
    ? activeSession?.status === "RUNNING"
    : isBreakActive && breakState.status === "RUNNING";

  const displayTime = isFocus
    ? activeSession?.mode === FocusMode.STOPWATCH
      ? formatSecToMMSS(elapsedSec)
      : formatSecToMMSS(remainingSec)
    : isBreakActive
    ? formatSecToMMSS(remainingSec)
    : "25:00";

  // SVG Progress Ring calculations
  const strokeWidth = 8;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  // In focus mode: dashoffset starts full and empties as remainingSec decreases, or fills as elapsed
  const dashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-card border rounded-2xl shadow-sm relative overflow-hidden">
      {/* Top Bar inside Card: Sound, Notification & Cycle counters */}
      <div className="w-full flex items-center justify-between pb-4 border-b text-xs mb-6">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-medium gap-1 px-2 py-0.5">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Siklus #{completedCycles + 1}</span>
          </Badge>

          {isFocus && activeSession?.mode === FocusMode.STOPWATCH && (
            <Badge variant="secondary" className="text-[10px]">
              Mode Stopwatch
            </Badge>
          )}

          {isBreakActive && (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-[10px]">
              {breakState.type === "LONG_BREAK" ? "Istirahat Panjang" : "Istirahat Pendek"}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title={soundEnabled ? "Nonaktifkan suara lonceng" : "Aktifkan suara lonceng"}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4 text-muted-foreground/60" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={requestNotificationPermission}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title={
              notificationsEnabled
                ? "Notifikasi desktop aktif"
                : "Aktifkan notifikasi desktop"
            }
          >
            {notificationsEnabled ? (
              <BellRing className="h-4 w-4 text-primary" />
            ) : (
              <Bell className="h-4 w-4 text-muted-foreground/60" />
            )}
          </Button>
        </div>
      </div>

      {/* Linked Course / Task banner */}
      {isFocus && (activeSession?.course || activeSession?.task) && (
        <div className="mb-4 text-center">
          {activeSession.course && (
            <div className="text-xs font-semibold text-primary">
              {activeSession.course.name}
            </div>
          )}
          {activeSession.task && (
            <div className="text-[11px] text-muted-foreground line-clamp-1">
              Tugas: {activeSession.task.title}
            </div>
          )}
        </div>
      )}

      {/* Circular Progress Ring */}
      <div className="relative flex items-center justify-center my-4">
        <svg className="w-64 h-64 -rotate-90 transform" viewBox="0 0 280 280">
          {/* Background circle */}
          <circle
            cx="140"
            cy="140"
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/30"
            fill="transparent"
          />
          {/* Animated active progress circle */}
          <circle
            cx="140"
            cy="140"
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            strokeLinecap="round"
            className={`transition-all duration-500 ease-linear ${
              isBreakActive
                ? "text-amber-500"
                : activeSession?.mode === FocusMode.STOPWATCH
                ? "text-blue-500"
                : "text-primary"
            }`}
            fill="transparent"
          />
        </svg>

        {/* Center Timer text & Status */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <div className="font-mono text-5xl sm:text-6xl font-extrabold tracking-tighter text-foreground select-none">
            {displayTime}
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            {isBreakActive ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                <Coffee className="h-3.5 w-3.5" />
                {isRunning ? "Waktu Istirahat..." : "Istirahat Dijeda"}
              </span>
            ) : isFocus ? (
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium ${
                  isRunning
                    ? "text-emerald-600 dark:text-emerald-400 animate-pulse"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                ● {isRunning ? "Sedang Fokus" : "Fokus Dijeda"}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground font-medium">
                Siap untuk Belajar
              </span>
            )}
          </div>

          {isFocus && (
            <div className="text-[11px] text-muted-foreground mt-1">
              Akumulasi: {formatSecToMMSS(elapsedSec)}
            </div>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6 w-full max-w-sm">
        {/* State 1: No active session & No break -> Open Config / Start */}
        {!isFocus && !isBreakActive && (
          <Button
            size="lg"
            onClick={onOpenConfig}
            className="w-full sm:w-auto px-8 py-6 text-sm font-semibold rounded-full gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <Play className="h-4 w-4 fill-current" />
            Mulai Sesi Fokus
          </Button>
        )}

        {/* State 2: Focus Session Active */}
        {isFocus && (
          <>
            {isRunning ? (
              <Button
                variant="outline"
                size="lg"
                onClick={pause}
                className="rounded-full px-6 gap-2 text-xs font-medium border-amber-400/40 text-amber-600 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              >
                <Pause className="h-4 w-4 fill-current" />
                Jeda Sesi
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={resume}
                className="rounded-full px-6 gap-2 text-xs font-medium shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Play className="h-4 w-4 fill-current" />
                Lanjutkan
              </Button>
            )}

            <Button
              size="lg"
              onClick={onOpenCompleteModal}
              className="rounded-full px-6 gap-2 text-xs font-semibold shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4" />
              Selesai
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => stopEarly()}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
              title="Akhiri lebih awal dan simpan durasi yang sudah diraih"
            >
              <StopCircle className="h-3.5 w-3.5" />
              Akhiri Awal
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={cancel}
              className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 gap-1.5"
              title="Batalkan sesi tanpa menyimpan waktu"
            >
              <XCircle className="h-3.5 w-3.5" />
              Batal
            </Button>
          </>
        )}

        {/* State 3: Break Active */}
        {isBreakActive && (
          <>
            {breakState.status === "RUNNING" ? (
              <Button
                variant="outline"
                size="lg"
                onClick={pauseBreak}
                className="rounded-full px-6 gap-2 text-xs font-medium"
              >
                <Pause className="h-4 w-4 fill-current" />
                Jeda Istirahat
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={resumeBreak}
                className="rounded-full px-6 gap-2 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Play className="h-4 w-4 fill-current" />
                Lanjutkan Istirahat
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={skipBreak}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <FastForward className="h-3.5 w-3.5" />
              Lewati Istirahat
            </Button>
          </>
        )}
      </div>

      {/* Note preview if any */}
      {isFocus && activeSession?.note && (
        <div className="mt-4 p-2.5 bg-muted/40 rounded-lg text-xs text-muted-foreground border max-w-md w-full text-center italic">
          &ldquo;{activeSession.note}&rdquo;
        </div>
      )}
    </div>
  );
}
