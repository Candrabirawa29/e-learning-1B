"use client";

import * as React from "react";
import { useFocusTimer } from "./FocusTimerContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FocusMode, FocusSessionStatus, CourseKind } from "@prisma/client";
import { formatSecToMMSS, formatOverdueText } from "@/lib/focus/session-logic";
import { createExtraCourseAction } from "@/actions/courses";
import { toast } from "sonner";
import {
  Play,
  Pause,
  StopCircle,
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
  BookOpen,
  CheckSquare,
  Clock,
  MoreVertical,
  Trash2,
  ChevronDown,
  Info,
  Plus,
} from "lucide-react";

export interface CourseOption {
  id: string;
  name: string;
  code: string | null;
  kind?: CourseKind;
}

interface TaskOption {
  id: string;
  title: string;
  courseId: string | null;
}

interface FocusTimerDisplayProps {
  courses: CourseOption[];
  tasks: TaskOption[];
}

export function FocusTimerDisplay({ courses, tasks }: FocusTimerDisplayProps) {
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
    endSession,
    discardSession,
    startFocus,
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
    selectedCourseId,
    selectedTaskId,
    selectedMode,
    changeContext,
    summarySession,
    dismissSummary,
    saveSummaryNote,
  } = useFocusTimer();

  const [noteInput, setNoteInput] = React.useState<string>("");
  const [isEnding, setIsEnding] = React.useState<boolean>(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = React.useState<boolean>(false);

  // Belajar Mandiri (EXTRA course) creation state & local list
  const [courseList, setCourseList] = React.useState<CourseOption[]>(courses);
  const [isAddTopicOpen, setIsAddTopicOpen] = React.useState<boolean>(false);
  const [newTopicName, setNewTopicName] = React.useState<string>("");
  const [isCreatingTopic, setIsCreatingTopic] = React.useState<boolean>(false);

  React.useEffect(() => {
    setCourseList(courses);
  }, [courses]);

  const regularCourses = React.useMemo(
    () => courseList.filter((c) => c.kind !== "EXTRA"),
    [courseList]
  );
  const extraCourses = React.useMemo(
    () => courseList.filter((c) => c.kind === "EXTRA"),
    [courseList]
  );

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTopicName.trim();
    if (!name) return;
    setIsCreatingTopic(true);
    try {
      const res = await createExtraCourseAction({ name });
      if (res.success && res.course) {
        const newCourse: CourseOption = {
          id: res.course.id,
          name: res.course.name,
          code: res.course.code,
          kind: res.course.kind,
        };
        setCourseList((prev) => [...prev, newCourse]);
        await changeContext({ courseId: newCourse.id, taskId: null });
        setNewTopicName("");
        setIsAddTopicOpen(false);
        toast.success(`Topik mandiri "${name}" berhasil ditambahkan.`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menambahkan topik.");
    } finally {
      setIsCreatingTopic(false);
    }
  };

  // Sync note input with active session note or summary note
  React.useEffect(() => {
    if (summarySession?.note) {
      setNoteInput(summarySession.note);
    } else if (activeSession?.note) {
      setNoteInput(activeSession.note);
    } else {
      setNoteInput("");
    }
  }, [summarySession?.id, summarySession?.note, activeSession?.id, activeSession?.note]);

  const isFocus = Boolean(activeSession) && !isBreakActive;
  const isRunning = isFocus
    ? activeSession?.status === FocusSessionStatus.RUNNING
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
    : formatSecToMMSS(preferences?.focusDuration ?? 1500);

  // SVG Progress Ring
  const strokeWidth = 8;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (progressPercent / 100) * circumference;

  // Selected names for chips
  const selectedCourse = courseList.find((c) => c.id === selectedCourseId);
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  // Filter tasks if course selected
  const availableTasks = selectedCourseId
    ? tasks.filter((t) => !t.courseId || t.courseId === selectedCourseId)
    : tasks;

  const handleStartBreakManually = () => {
    stopAlarm();
    const longInterval = preferences?.longBreakInterval || 4;
    const isLongBreak = (completedCycles + 1) % longInterval === 0;
    startBreak(isLongBreak ? "LONG_BREAK" : "SHORT_BREAK");
  };

  const handleEndSession = async () => {
    setIsEnding(true);
    try {
      await endSession(noteInput.trim() || undefined);
    } finally {
      setIsEnding(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteInput.trim()) return;
    await saveSummaryNote(noteInput.trim());
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
      <div className="w-full flex items-center justify-between pb-4 border-b text-xs mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-medium gap-1 px-2.5 py-0.5">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Siklus Hari Ini: #{completedCycles}</span>
          </Badge>

          {isFocus && activeSession?.mode === FocusMode.STOPWATCH && (
            <Badge variant="secondary" className="text-[10px]">
              Stopwatch
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
            title={notificationsEnabled ? "Notifikasi sistem aktif" : "Aktifkan notifikasi sistem"}
          >
            {notificationsEnabled ? (
              <BellRing className="h-4 w-4 text-primary" />
            ) : (
              <Bell className="h-4 w-4 text-muted-foreground/60" />
            )}
          </Button>
        </div>
      </div>

      {/* Interactive Context Chips Bar (Course, Task, Mode) */}
      <div className="w-full flex flex-col items-center gap-1.5 mb-5">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Chip 1: Course */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs rounded-full gap-1.5 px-3 max-w-[220px] font-normal cursor-pointer"
                >
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {selectedCourse ? selectedCourse.name : "Pilih mata kuliah"}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                </Button>
              }
            />
            <DropdownMenuContent align="center" className="w-60 max-h-72 overflow-y-auto">
              <DropdownMenuItem
                onClick={() => changeContext({ courseId: null })}
                className="text-xs"
              >
                Tanpa Mata Kuliah
              </DropdownMenuItem>

              {regularCourses.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground">
                    Mata Kuliah
                  </DropdownMenuLabel>
                  {regularCourses.map((c) => (
                    <DropdownMenuItem
                      key={c.id}
                      onClick={() => changeContext({ courseId: c.id })}
                      className="text-xs"
                    >
                      <span className="truncate">{c.name}</span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground">
                Belajar Mandiri
              </DropdownMenuLabel>
              {extraCourses.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => changeContext({ courseId: c.id, taskId: null })}
                  className="text-xs"
                >
                  <span className="truncate">{c.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onClick={() => {
                  setNewTopicName("");
                  setIsAddTopicOpen(true);
                }}
                className="text-xs text-primary font-medium focus:text-primary gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Tambah topik</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Chip 2: Task (Disembunyikan jika topik EXTRA dipilih) */}
          {selectedCourse?.kind !== "EXTRA" && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs rounded-full gap-1.5 px-3 max-w-[220px] font-normal cursor-pointer"
                  >
                    <CheckSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {selectedTask ? selectedTask.title : "Pilih tugas"}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                  </Button>
                }
              />
              <DropdownMenuContent align="center" className="w-56 max-h-64 overflow-y-auto">
                <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                  Pilih Tugas Terkait
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => changeContext({ taskId: null })}
                  className="text-xs"
                >
                  Tanpa Tugas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {availableTasks.map((t) => (
                  <DropdownMenuItem
                    key={t.id}
                    onClick={() => changeContext({ taskId: t.id })}
                    className="text-xs"
                  >
                    <span className="truncate">{t.title}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Chip 3: Mode */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs rounded-full gap-1.5 px-3 font-normal cursor-pointer"
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>
                    {selectedMode === FocusMode.STOPWATCH ? "Stopwatch" : "Pomodoro"}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                </Button>
              }
            />
            <DropdownMenuContent align="center" className="w-40">
              <DropdownMenuItem
                onClick={() => changeContext({ mode: FocusMode.FOCUS })}
                className="text-xs"
              >
                Pomodoro (Fokus)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => changeContext({ mode: FocusMode.STOPWATCH })}
                className="text-xs"
              >
                Stopwatch
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isFocus && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Info className="h-2.5 w-2.5" />
            Perubahan konteks berlaku untuk seluruh sesi aktif ini
          </span>
        )}
      </div>

      {/* Alarm Alert Banner */}
      {isAlarmActive && (
        <div className="w-full max-w-md mb-4 p-3 bg-emerald-600 text-white rounded-xl flex items-center justify-between gap-3 shadow-md animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] motion-reduce:animate-none">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="text-xs font-semibold">
              Target tercapai! Waktu fokus selesai 🎉
            </span>
          </div>
          <Button
            size="sm"
            onClick={stopAlarm}
            className="h-7 text-xs bg-white text-emerald-800 hover:bg-zinc-100 font-bold shrink-0 cursor-pointer"
          >
            <BellOff className="h-3 w-3 mr-1" />
            Matikan Bunyi
          </Button>
        </div>
      )}

      {/* Circular Progress Ring */}
      <div className="relative flex items-center justify-center my-4">
        <svg className="w-64 h-64 -rotate-90 transform" viewBox="0 0 260 260">
          <circle
            cx="130"
            cy="130"
            r={radius}
            className="stroke-muted/40"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx="130"
            cy="130"
            r={radius}
            className={`transition-all duration-500 ease-in-out ${
              isAlarmActive || isTargetCompletedFocus
                ? "stroke-emerald-600"
                : isBreakActive
                ? "stroke-amber-500"
                : isOverdue
                ? "stroke-rose-500"
                : "stroke-primary"
            }`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Central Display */}
        <div className="absolute flex flex-col items-center justify-center text-center px-4">
          <span
            className={`font-mono text-4xl sm:text-5xl font-black tracking-tight tabular-nums ${
              isOverdue ? "text-rose-600 dark:text-rose-400" : "text-foreground"
            }`}
          >
            {displayTime}
          </span>

          <div className="mt-1 flex flex-col items-center">
            {isFocus ? (
              <span className="text-xs font-medium text-muted-foreground">
                {isTargetCompletedFocus
                  ? "Target Tercapai!"
                  : isRunning
                  ? activeSession?.mode === FocusMode.STOPWATCH
                    ? "Stopwatch Berjalan"
                    : "Sedang Fokus Belajar"
                  : "Sesi Dijeda"}
              </span>
            ) : isBreakActive ? (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {isRunning ? "Waktu Istirahat" : "Istirahat Dijeda"}
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
      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4 w-full max-w-md">
        {/* State 1: No active session & No break -> Direct 1-Click Start Focus */}
        {!isFocus && !isBreakActive && (
          <Button
            size="lg"
            onClick={() => startFocus()}
            className="w-full sm:w-auto px-8 py-6 text-sm font-semibold rounded-full gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Play className="h-4 w-4 fill-current" />
            Mulai Sesi Fokus
          </Button>
        )}

        {/* State 2: Target Tercapai on Focus -> Layar Selesai Options */}
        {isTargetCompletedFocus && (
          <div className="w-full flex flex-col items-center gap-3 bg-muted/40 p-4 border rounded-xl">
            <div className="text-center">
              <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                Fokus Selesai! 🎉
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Target tercapai. Silakan mulai istirahat atau tambah waktu fokus.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 w-full">
              <Button
                size="sm"
                onClick={handleStartBreakManually}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 rounded-full px-4 cursor-pointer"
              >
                <Coffee className="h-3.5 w-3.5" />
                Mulai Istirahat
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={extendFocus}
                className="text-xs gap-1.5 rounded-full px-4 cursor-pointer"
              >
                <PlusCircle className="h-3.5 w-3.5 text-primary" />
                Lanjut Fokus +5 Menit
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleEndSession}
                disabled={isEnding}
                className="text-xs gap-1.5 rounded-full px-4 cursor-pointer"
              >
                <StopCircle className="h-3.5 w-3.5" />
                Akhiri Sesi
              </Button>

              {/* Overflow: Discard */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setIsDiscardDialogOpen(true)}
                    className="text-xs text-rose-600 focus:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Buang Sesi Ini
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {/* State 3: Focus Session Running / Paused (Normal) */}
        {isFocus && !isTargetCompletedFocus && (
          <div className="flex items-center gap-2">
            {isRunning ? (
              <Button
                size="lg"
                variant="outline"
                onClick={pause}
                className="px-6 py-5 text-xs font-semibold rounded-full gap-2 cursor-pointer"
              >
                <Pause className="h-4 w-4" />
                Jeda
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={resume}
                className="px-6 py-5 text-xs font-semibold rounded-full gap-2 cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                Lanjut
              </Button>
            )}

            <Button
              size="lg"
              variant="secondary"
              onClick={handleEndSession}
              disabled={isEnding}
              className="px-6 py-5 text-xs font-semibold rounded-full gap-2 cursor-pointer"
            >
              <StopCircle className="h-4 w-4 text-rose-500" />
              Akhiri
            </Button>

            {/* Overflow: Buang Sesi */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setIsDiscardDialogOpen(true)}
                  className="text-xs text-rose-600 focus:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Buang Sesi Ini
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* State 4: Break Active */}
        {isBreakActive && (
          <div className="flex items-center gap-2">
            {isRunning ? (
              <Button
                size="sm"
                variant="outline"
                onClick={pauseBreak}
                className="text-xs rounded-full gap-1.5 px-4 cursor-pointer"
              >
                <Pause className="h-3.5 w-3.5" />
                Jeda Istirahat
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={resumeBreak}
                className="text-xs rounded-full gap-1.5 px-4 cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Lanjut Istirahat
              </Button>
            )}

            <Button
              size="sm"
              variant="secondary"
              onClick={skipBreak}
              className="text-xs rounded-full gap-1.5 px-4 cursor-pointer"
            >
              <FastForward className="h-3.5 w-3.5" />
              Lewati Istirahat
            </Button>

            <Button
              size="sm"
              onClick={() => {
                skipBreak();
                startFocus();
              }}
              className="text-xs rounded-full gap-1.5 px-4 font-semibold cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Mulai Siklus Berikutnya
            </Button>
          </div>
        )}
      </div>

      {/* Summary Box After Sesi Berakhir (Catatan Opsional & Next Cycle) */}
      {summarySession && !isFocus && (
        <div className="w-full max-w-md mt-6 p-4 bg-muted/30 border rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                className={
                  summarySession.status === FocusSessionStatus.COMPLETED
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[10px]"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-[10px]"
                }
              >
                {summarySession.status === FocusSessionStatus.COMPLETED
                  ? "Target tercapai"
                  : "Berhenti lebih awal"}
              </Badge>
              <span className="text-xs font-semibold">
                {formatSecToMMSS(summarySession.focusSec)} tercatat
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={dismissSummary}
              className="h-6 text-[10px] text-muted-foreground"
            >
              Tutup
            </Button>
          </div>

          {/* Optional Note Field */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Catatan Sesi (Opsional):
            </span>
            <Textarea
              placeholder="Apa yang berhasil dipelajari dalam sesi ini?"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              className="text-xs min-h-[50px] bg-background"
              maxLength={500}
            />
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveNote}
                className="h-7 text-xs"
              >
                Simpan Catatan
              </Button>
            </div>
          </div>

          {/* 1-Click Start Next Cycle */}
          <div className="pt-1">
            <Button
              size="sm"
              onClick={() => {
                dismissSummary();
                startFocus();
              }}
              className="w-full text-xs font-semibold gap-1.5 rounded-full cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Mulai Siklus Berikutnya
            </Button>
          </div>
        </div>
      )}

      {/* Confirm Discard Session Dialog */}
      <AlertDialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buang sesi fokus ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Sesi ini akan dihapus dan tidak akan masuk ke statistik atau riwayat belajar Anda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsDiscardDialogOpen(false);
                discardSession();
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
            >
              Ya, Buang Sesi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Tambah Topik Mandiri Inline */}
      <Dialog open={isAddTopicOpen} onOpenChange={setIsAddTopicOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Tambah Topik Belajar Mandiri
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTopic} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="topic-name-input" className="text-xs font-medium text-foreground">
                Nama Topik
              </label>
              <Input
                id="topic-name-input"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                placeholder="Contoh: Belajar Rust, Persiapan Sertifikasi..."
                className="text-xs h-9"
                autoFocus
                disabled={isCreatingTopic}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddTopicOpen(false)}
                disabled={isCreatingTopic}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!newTopicName.trim() || isCreatingTopic}
                className="text-xs"
              >
                {isCreatingTopic ? "Menyimpan..." : "Simpan Topik"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
