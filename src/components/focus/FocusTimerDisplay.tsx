"use client";

import * as React from "react";
import { useFocusTimer } from "./FocusTimerContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FocusMode } from "@prisma/client";
import { formatSecToMMSS, formatOverdueText } from "@/lib/focus/session-logic";
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
  PlusCircle,
  BellOff,
  PictureInPicture2,
} from "lucide-react";

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
    overdueSec,
    isOverdue,
    isTargetReached,
    progressPercent,
    isAlarmActive,
    stopAlarm,
    extendFocus,
    pause,
    resume,
    cancel,
    stopEarly,
    complete,
    pauseBreak,
    resumeBreak,
    skipBreak,
    startBreak,
    soundEnabled,
    setSoundEnabled,
    notificationsEnabled,
    requestNotificationPermission,
    completedCycles,
    preferences,
    isPipSupported,
    requestPip,
  } = useFocusTimer();

  const isFocus = Boolean(activeSession) && !isBreakActive;
  const isRunning = isFocus
    ? activeSession?.status === "RUNNING"
    : isBreakActive && breakState.status === "RUNNING";

  const isTargetCompletedFocus =
    isFocus && activeSession?.mode === FocusMode.FOCUS && isTargetReached;

  const displayTime = isFocus
    ? activeSession?.mode === FocusMode.STOPWATCH
      ? formatSecToMMSS(elapsedSec)
      : isOverdue
      ? formatOverdueText(overdueSec)
      : formatSecToMMSS(remainingSec)
    : isBreakActive
    ? formatSecToMMSS(remainingSec)
    : "25:00";

  // SVG Progress Ring calculations
  const strokeWidth = 8;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (progressPercent / 100) * circumference;

  const handleStartBreakAfterFocus = () => {
    stopAlarm();
    const longInterval = preferences?.longBreakInterval || 4;
    const isLongBreak = (completedCycles + 1) % longInterval === 0;
    complete();
    startBreak(isLongBreak ? "LONG_BREAK" : "SHORT_BREAK");
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-6 sm:p-8 bg-card border rounded-2xl shadow-sm relative overflow-hidden transition-colors duration-300 ${
        isAlarmActive
          ? "border-emerald-500/60 ring-2 ring-emerald-500/20"
          : "border-border"
      }`}
    >
      {/* Top Bar: Sound, Notification, PiP & Cycle counters */}
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

          {isFocus && isTargetCompletedFocus && (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[10px]">
              Target Tercapai
            </Badge>
          )}

          {isBreakActive && (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-[10px]">
              {breakState.type === "LONG_BREAK" ? "Istirahat Panjang" : "Istirahat Pendek"}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* PiP Button */}
          {isPipSupported && (isFocus || isBreakActive) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => requestPip()}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 hidden sm:flex cursor-pointer"
              title="Buka timer di jendela Picture-in-Picture"
            >
              <PictureInPicture2 className="h-3.5 w-3.5" />
              <span>Melayang</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
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
            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
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
              isTargetCompletedFocus
                ? "text-emerald-500"
                : isBreakActive
                ? "text-amber-500"
                : activeSession?.mode === FocusMode.STOPWATCH
                ? "text-blue-500"
                : "text-primary"
            }`}
            fill="transparent"
          />
        </svg>

        {/* Center Timer text & Status */}
        <div className="absolute flex flex-col items-center justify-center text-center max-w-[200px]">
          <div
            className={`font-mono font-extrabold tracking-tighter text-foreground select-none ${
              isOverdue ? "text-3xl sm:text-4xl" : "text-5xl sm:text-6xl"
            }`}
          >
            {displayTime}
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            {isBreakActive ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                <Coffee className="h-3.5 w-3.5" />
                {isRunning ? "Waktu Istirahat..." : "Istirahat Dijeda"}
              </span>
            ) : isTargetCompletedFocus ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse">
                🎉 Fokus Selesai!
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

          {isFocus && !isTargetCompletedFocus && (
            <div className="text-[11px] text-muted-foreground mt-1 font-mono">
              Akumulasi: {formatSecToMMSS(elapsedSec)}
            </div>
          )}

          {isOverdue && activeSession && (
            <div className="text-[10px] text-muted-foreground mt-1 leading-tight">
              Akumulasi dikunci di {Math.round(activeSession.plannedSec / 60)}m (waktu lewat tidak dihitung)
            </div>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6 w-full max-w-md">
        {/* State 1: No active session & No break -> Open Config / Start */}
        {!isFocus && !isBreakActive && (
          <Button
            size="lg"
            onClick={onOpenConfig}
            className="w-full sm:w-auto px-8 py-6 text-sm font-semibold rounded-full gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Play className="h-4 w-4 fill-current" />
            Mulai Sesi Fokus
          </Button>
        )}

        {/* State 2A: Focus Target Reached ("Layar Fokus Selesai") */}
        {isTargetCompletedFocus && (
          <div className="w-full flex flex-col items-center gap-3">
            {/* Alarm banner if ringing */}
            {isAlarmActive && (
              <div className="w-full flex items-center justify-between p-2.5 px-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200">
                <span className="font-medium flex items-center gap-1.5">
                  <BellRing className="h-4 w-4 text-emerald-600 animate-bounce" />
                  Target tercapai! Alarm sedang berbunyi...
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={stopAlarm}
                  className="h-7 text-xs border-emerald-400 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 gap-1 cursor-pointer"
                >
                  <BellOff className="h-3.5 w-3.5" />
                  Hentikan Bunyi
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
              {/* Tombol Mulai Istirahat */}
              <Button
                size="lg"
                onClick={handleStartBreakAfterFocus}
                className="rounded-full px-6 gap-2 text-xs font-semibold shadow-md bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              >
                <Coffee className="h-4 w-4" />
                Mulai Istirahat
              </Button>

              {/* Tombol Lanjut Fokus +5 Menit */}
              <Button
                size="lg"
                variant="outline"
                onClick={extendFocus}
                className="rounded-full px-6 gap-2 text-xs font-semibold border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
              >
                <PlusCircle className="h-4 w-4 text-emerald-600" />
                Lanjut Fokus +5 Menit
              </Button>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
              <button
                onClick={onOpenCompleteModal}
                className="hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Simpan & Beri Catatan
              </button>
              <span>•</span>
              <button
                onClick={() => complete()}
                className="hover:underline cursor-pointer"
              >
                Selesai Sekarang
              </button>
            </div>
          </div>
        )}

        {/* State 2B: Normal Focus Running/Paused (Before Target Reached or Stopwatch) */}
        {isFocus && !isTargetCompletedFocus && (
          <>
            {isRunning ? (
              <Button
                variant="outline"
                size="lg"
                onClick={pause}
                className="rounded-full px-6 gap-2 text-xs font-medium border-amber-400/40 text-amber-600 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
              >
                <Pause className="h-4 w-4 fill-current" />
                Jeda Sesi
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={resume}
                className="rounded-full px-6 gap-2 text-xs font-medium shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                Lanjutkan
              </Button>
            )}

            <Button
              size="lg"
              onClick={onOpenCompleteModal}
              className="rounded-full px-6 gap-2 text-xs font-semibold shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              Selesai
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => stopEarly()}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
              title="Akhiri lebih awal dan simpan durasi yang sudah diraih"
            >
              <StopCircle className="h-3.5 w-3.5" />
              Akhiri Awal
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={cancel}
              className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 gap-1.5 cursor-pointer"
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
                className="rounded-full px-6 gap-2 text-xs font-medium cursor-pointer"
              >
                <Pause className="h-4 w-4 fill-current" />
                Jeda Istirahat
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={resumeBreak}
                className="rounded-full px-6 gap-2 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                Lanjutkan Istirahat
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={skipBreak}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
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
