"use client";

import * as React from "react";
import { useFocusTimer, FocusSummaryData } from "./FocusTimerContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import {
  getFocusView,
  formatSecToMMSS,
} from "@/lib/focus/session-logic";
import {
  filterFocusCourses,
  filterFocusTasks,
} from "@/lib/focus/context-search";
import { createExtraCourseAction } from "@/actions/courses";
import { toast } from "sonner";
import {
  Play,
  Pause,
  StopCircle,
  Coffee,
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

/**
 * Kartu Ringkasan Sesi Belajar:
 * - Satu baris: "<status> · <durasi> tercatat" dan tombol Tutup
 * - Kolom catatan tersimpan otomatis (debounce 800 ms, flush saat blur/pindah layar/tombol utama)
 * - Tanpa tombol "Simpan Catatan" dan tanpa tombol mulai lain
 * - Teks tetap ada jika gagal dengan pesan inline "Gagal menyimpan, coba lagi" tanpa toast
 * - Batas 500 karakter dengan penghitung
 */
function SessionSummaryCard({
  summarySession,
  onDismiss,
  onSaveNote,
}: {
  summarySession: FocusSummaryData;
  onDismiss: () => void;
  onSaveNote: (note: string) => Promise<boolean>;
}) {
  const [note, setNote] = React.useState<string>(summarySession.note ?? "");
  const [saveStatus, setSaveStatus] = React.useState<"IDLE" | "SAVING" | "SAVED" | "ERROR">("IDLE");
  const noteRef = React.useRef(note);
  const lastSavedRef = React.useRef<string>(summarySession.note ?? "");
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    noteRef.current = note;
  }, [note]);

  const flushSave = React.useCallback(
    async (val?: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      const textToSave = val !== undefined ? val : noteRef.current;
      if (textToSave === lastSavedRef.current) return;

      setSaveStatus("SAVING");
      const ok = await onSaveNote(textToSave);
      if (ok) {
        lastSavedRef.current = textToSave;
        setSaveStatus("SAVED");
      } else {
        setSaveStatus("ERROR");
      }
    },
    [onSaveNote]
  );

  // Flush saat pindah layar / unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        flushSave();
      }
    };
  }, [flushSave]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, 500);
    setNote(val);
    noteRef.current = val;
    setSaveStatus("IDLE");

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      flushSave(val);
    }, 800);
  };

  const handleBlur = () => {
    flushSave();
  };

  const statusLabel =
    summarySession.status === FocusSessionStatus.COMPLETED
      ? "Target tercapai"
      : "Berhenti lebih awal";

  return (
    <div className="w-full max-w-md mt-6 p-4 bg-muted/30 border rounded-xl space-y-3">
      {/* Satu baris: <status> · <durasi> tercatat */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Badge
            className={
              summarySession.status === FocusSessionStatus.COMPLETED
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[10px]"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-[10px]"
            }
          >
            {statusLabel}
          </Badge>
          <span className="font-semibold text-foreground">
            {formatSecToMMSS(summarySession.focusSec)} tercatat
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
        >
          Tutup
        </Button>
      </div>

      {/* Kolom Catatan Sesi */}
      <div className="space-y-1.5">
        <Textarea
          placeholder="Catatan sesi (tersimpan otomatis)..."
          value={note}
          onChange={handleChange}
          onBlur={handleBlur}
          className="text-xs min-h-[55px] bg-background"
          maxLength={500}
        />
        <div className="flex items-center justify-between text-[10px]">
          <div>
            {saveStatus === "SAVING" && (
              <span className="text-muted-foreground">Menyimpan...</span>
            )}
            {saveStatus === "SAVED" && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Tersimpan
              </span>
            )}
            {saveStatus === "ERROR" && (
              <span className="text-destructive font-medium">
                Gagal menyimpan, coba lagi
              </span>
            )}
          </div>
          <span className="text-muted-foreground tabular-nums">
            {note.length}/500
          </span>
        </div>
      </div>
    </div>
  );
}

export function FocusTimerDisplay({ courses, tasks }: FocusTimerDisplayProps) {
  const {
    activeSession,
    breakState,
    isBreakActive,
    focusSec,
    remainingSec,
    overdueSec,
    isTargetReached,
    progressPercent,
    isActionPending,
    clockPhase,
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

  const [isEnding, setIsEnding] = React.useState<boolean>(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = React.useState<boolean>(false);

  // Belajar Mandiri (EXTRA course) creation state & searchable combobox state
  const [courseList, setCourseList] = React.useState<CourseOption[]>(courses);
  const [courseOpen, setCourseOpen] = React.useState<boolean>(false);
  const [courseQuery, setCourseQuery] = React.useState<string>("");
  const [taskOpen, setTaskOpen] = React.useState<boolean>(false);
  const [taskQuery, setTaskQuery] = React.useState<string>("");
  const [isAddTopicOpen, setIsAddTopicOpen] = React.useState<boolean>(false);
  const [newTopicName, setNewTopicName] = React.useState<string>("");
  const [isCreatingTopic, setIsCreatingTopic] = React.useState<boolean>(false);

  // Petunjuk perubahan konteks sesi aktif: hanya tampil beberapa detik (4 detik) setelah diubah
  const [showContextChangeHint, setShowContextChangeHint] = React.useState<boolean>(false);
  const contextHintTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    setCourseList(courses);
  }, [courses]);

  React.useEffect(() => {
    return () => {
      if (contextHintTimerRef.current) clearTimeout(contextHintTimerRef.current);
    };
  }, []);

  const filteredCourses = React.useMemo(
    () => filterFocusCourses(courseList, courseQuery),
    [courseList, courseQuery]
  );

  const handleContextChange = async (data: {
    courseId?: string | null;
    taskId?: string | null;
    mode?: FocusMode;
  }) => {
    await changeContext(data);
    if (activeSession && activeSession.status === FocusSessionStatus.RUNNING) {
      setShowContextChangeHint(true);
      if (contextHintTimerRef.current) clearTimeout(contextHintTimerRef.current);
      contextHintTimerRef.current = setTimeout(() => {
        setShowContextChangeHint(false);
      }, 4000);
    }
  };

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
        await handleContextChange({ courseId: newCourse.id, taskId: null });
        setNewTopicName("");
        setIsAddTopicOpen(false);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menambahkan topik.");
    } finally {
      setIsCreatingTopic(false);
    }
  };

  const isFocus = Boolean(activeSession) && !isBreakActive;

  // Single Source of State Mapping via getFocusView
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
    hasActiveSession: Boolean(activeSession),
    clockPhase,
  });

  // SVG Progress Ring
  const strokeWidth = 8;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (progressPercent / 100) * circumference;

  // Selected names for chips
  const selectedCourse = courseList.find((c) => c.id === selectedCourseId);
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  // Filter tasks if course selected, plus search filter
  const availableTasks = selectedCourseId
    ? tasks.filter((t) => !t.courseId || t.courseId === selectedCourseId)
    : tasks;
  const filteredTasks = filterFocusTasks(availableTasks, taskQuery);

  const handleEndSession = async () => {
    setIsEnding(true);
    try {
      await endSession();
    } finally {
      setIsEnding(false);
    }
  };

  const handleStartBreakFromTargetReached = async () => {
    stopAlarm();
    await endSession();
    const longInterval = preferences?.longBreakInterval || 4;
    const isLongBreak = (completedCycles + 1) % longInterval === 0;
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
      <div className="w-full flex items-center justify-between pb-4 border-b text-xs mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-medium px-2.5 py-0.5">
            <span>Siklus Hari Ini: #{completedCycles}</span>
          </Badge>

          {isFocus && activeSession?.mode === FocusMode.STOPWATCH && (
            <Badge variant="secondary" className="text-[10px]">
              Stopwatch
            </Badge>
          )}

          {clockView.kind === "TARGET_REACHED" && (
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
          {/* Chip 1: Course & Belajar Mandiri (Searchable Combobox) */}
          <Popover
            open={courseOpen}
            onOpenChange={(open) => {
              setCourseOpen(open);
              if (!open) setCourseQuery("");
            }}
          >
            <PopoverTrigger
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
            <PopoverContent align="center" className="w-72 p-0 gap-0 overflow-hidden">
              <Command shouldFilter={false}>
                <CommandInput
                  autoFocus
                  value={courseQuery}
                  onValueChange={setCourseQuery}
                  placeholder="Cari mata kuliah atau topik..."
                  className="text-xs h-8"
                />
                <CommandList className="max-h-64">
                  {!courseQuery.trim() && (
                    <CommandGroup>
                      <CommandItem
                        value="__none__"
                        data-checked={!selectedCourseId}
                        onSelect={() => {
                          handleContextChange({ courseId: null });
                          setCourseOpen(false);
                        }}
                        className="text-xs cursor-pointer"
                      >
                        <span className="truncate">Tanpa Mata Kuliah</span>
                      </CommandItem>
                    </CommandGroup>
                  )}

                  {filteredCourses.regular.length > 0 && (
                    <CommandGroup heading="Mata Kuliah">
                      {filteredCourses.regular.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.id}
                          data-checked={selectedCourseId === c.id}
                          onSelect={() => {
                            handleContextChange({ courseId: c.id });
                            setCourseOpen(false);
                          }}
                          className="text-xs cursor-pointer"
                        >
                          <span className="truncate">{c.name}</span>
                          {c.code && (
                            <span className="ml-1.5 text-[10px] text-muted-foreground font-mono shrink-0">
                              {c.code}
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {filteredCourses.extra.length > 0 && (
                    <CommandGroup heading="Belajar Mandiri">
                      {filteredCourses.extra.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.id}
                          data-checked={selectedCourseId === c.id}
                          onSelect={() => {
                            handleContextChange({ courseId: c.id, taskId: null });
                            setCourseOpen(false);
                          }}
                          className="text-xs cursor-pointer"
                        >
                          <span className="truncate">{c.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {filteredCourses.totalMatches === 0 && (
                    <div className="py-5 px-3 text-center text-xs text-muted-foreground">
                      Topik &ldquo;{courseQuery.trim()}&rdquo; tidak ditemukan.
                    </div>
                  )}
                </CommandList>

                <div className="border-t p-1">
                  <button
                    type="button"
                    onClick={() => {
                      const prefill =
                        filteredCourses.totalMatches === 0 ? courseQuery.trim() : "";
                      setCourseOpen(false);
                      setNewTopicName(prefill);
                      setIsAddTopicOpen(true);
                    }}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-primary font-medium hover:bg-muted transition-colors cursor-pointer text-left"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {filteredCourses.totalMatches === 0 && courseQuery.trim()
                        ? `Tambah "${courseQuery.trim()}"`
                        : "Tambah topik belajar mandiri"}
                    </span>
                  </button>
                </div>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Chip 2: Task (Searchable Combobox, disembunyikan jika topik EXTRA dipilih) */}
          {selectedCourse?.kind !== "EXTRA" && (
            <Popover
              open={taskOpen}
              onOpenChange={(open) => {
                setTaskOpen(open);
                if (!open) setTaskQuery("");
              }}
            >
              <PopoverTrigger
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
              <PopoverContent align="center" className="w-72 p-0 gap-0 overflow-hidden">
                <Command shouldFilter={false}>
                  <CommandInput
                    autoFocus
                    value={taskQuery}
                    onValueChange={setTaskQuery}
                    placeholder="Cari tugas terkait..."
                    className="text-xs h-8"
                  />
                  <CommandList className="max-h-60">
                    {!taskQuery.trim() && (
                      <CommandGroup>
                        <CommandItem
                          value="__none_task__"
                          data-checked={!selectedTaskId}
                          onSelect={() => {
                            handleContextChange({ taskId: null });
                            setTaskOpen(false);
                          }}
                          className="text-xs cursor-pointer"
                        >
                          <span className="truncate">Tanpa Tugas</span>
                        </CommandItem>
                      </CommandGroup>
                    )}

                    {filteredTasks.length > 0 ? (
                      <CommandGroup heading="Pilih Tugas Terkait">
                        {filteredTasks.map((t) => (
                          <CommandItem
                            key={t.id}
                            value={t.id}
                            data-checked={selectedTaskId === t.id}
                            onSelect={() => {
                              handleContextChange({ taskId: t.id });
                              setTaskOpen(false);
                            }}
                            className="text-xs cursor-pointer"
                          >
                            <span className="truncate">{t.title}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ) : (
                      <div className="py-5 px-3 text-center text-xs text-muted-foreground">
                        Tidak ada tugas yang cocok.
                      </div>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
                onClick={() => handleContextChange({ mode: FocusMode.FOCUS })}
                className="text-xs"
              >
                Pomodoro (Fokus)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleContextChange({ mode: FocusMode.STOPWATCH })}
                className="text-xs"
              >
                Stopwatch
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Petunjuk perubahan konteks sesi aktif: tampil 4 detik lalu menghilang */}
        {showContextChangeHint && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 transition-opacity">
            <Info className="h-2.5 w-2.5" />
            Perubahan konteks berlaku untuk seluruh sesi aktif ini
          </span>
        )}
      </div>

      {/* Alarm Alert Bar: Satu bar tipis "Alarm berbunyi" dengan tombol "Matikan bunyi", tanpa emoji & tanpa ulang pesan */}
      {isAlarmActive && (
        <div className="w-full max-w-md mb-3 py-1.5 px-3 bg-muted/80 border rounded-lg flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">Alarm berbunyi</span>
          <Button
            size="sm"
            variant="outline"
            onClick={stopAlarm}
            className="h-6 text-xs px-2.5 font-medium cursor-pointer"
          >
            <BellOff className="h-3 w-3 mr-1" />
            Matikan bunyi
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
              clockView.kind === "TARGET_REACHED"
                ? "stroke-emerald-600"
                : isBreakActive
                ? "stroke-amber-500"
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
        <div className="absolute flex flex-col items-center justify-center text-center px-4 max-w-[210px] overflow-hidden select-none">
          {clockView.kind === "TARGET_REACHED" ? (
            <>
              {/* Teks tengah: "Target tercapai" (ukuran lebih kecil) dan "<durasi> tercatat", tidak membungkus / keluar lingkaran */}
              <span
                className="font-bold tracking-tight text-foreground whitespace-nowrap"
                style={{ fontSize: "clamp(1.05rem, 3.2vw, 1.45rem)" }}
              >
                {clockView.teksTengah}
              </span>
              <span
                className="font-semibold font-mono text-muted-foreground whitespace-nowrap mt-1"
                style={{ fontSize: "clamp(0.95rem, 2.5vw, 1.25rem)" }}
              >
                {clockView.durasiTercatat}
              </span>
            </>
          ) : (
            <>
              <span className="font-mono text-4xl sm:text-5xl font-black tracking-tight tabular-nums text-foreground">
                {clockView.teksTengah}
              </span>

              <div className="mt-1 flex flex-col items-center">
                <span className="text-xs font-medium text-muted-foreground">
                  {clockView.pesan}
                </span>
              </div>

              {clockView.teksKecil && (
                <div className="text-[11px] text-muted-foreground mt-1 font-mono">
                  {clockView.teksKecil}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Waktu sejak target: kecil dan netral (warna muted, bukan merah) di BAWAH lingkaran */}
      {clockView.teksOverdue && (
        <div className="text-xs text-muted-foreground mt-1 mb-2 text-center select-none font-medium">
          {clockView.teksOverdue}
        </div>
      )}

      {/* Controls Bar: 1 aksi 1 tombol, tanpa tombol duplikat */}
      <div className="flex flex-col items-center justify-center gap-2 mt-4 w-full max-w-md">
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {/* Tombol Utama (Tepat 1) */}
          <Button
            size={clockView.kind === "READY" ? "lg" : "default"}
            onClick={() => {
              if (clockView.tombolUtama.action === "START") startFocus();
              else if (clockView.tombolUtama.action === "PAUSE") pause();
              else if (clockView.tombolUtama.action === "RESUME") resume();
              else if (clockView.tombolUtama.action === "START_BREAK") handleStartBreakFromTargetReached();
              else if (clockView.tombolUtama.action === "SKIP_BREAK") skipBreak();
              else if (clockView.tombolUtama.action === "NEXT_CYCLE") startFocus();
            }}
            disabled={isActionPending}
            className={`font-semibold rounded-full gap-2 cursor-pointer ${
              clockView.kind === "READY"
                ? "min-h-12 h-12 px-8 text-sm shadow-md hover:shadow-lg"
                : "min-h-11 h-11 px-6 text-xs"
            }`}
          >
            {clockView.tombolUtama.action === "START" && <Play className="h-4 w-4 fill-current" />}
            {clockView.tombolUtama.action === "PAUSE" && <Pause className="h-4 w-4" />}
            {clockView.tombolUtama.action === "RESUME" && <Play className="h-4 w-4 fill-current" />}
            {clockView.tombolUtama.action === "START_BREAK" && <Coffee className="h-4 w-4" />}
            {clockView.tombolUtama.action === "SKIP_BREAK" && <FastForward className="h-4 w-4" />}
            {clockView.tombolUtama.action === "NEXT_CYCLE" && <Play className="h-4 w-4 fill-current" />}
            <span>{clockView.tombolUtama.label}</span>
          </Button>

          {/* Tombol Sekunder */}
          {clockView.tombolSekunder.map((btn) => (
            <Button
              key={btn.action}
              size="default"
              variant="secondary"
              onClick={() => {
                if (btn.action === "END") handleEndSession();
                else if (btn.action === "EXTEND") extendFocus();
                else if (btn.action === "PAUSE_BREAK") pauseBreak();
                else if (btn.action === "RESUME_BREAK") resumeBreak();
              }}
              disabled={isEnding || isActionPending}
              className="min-h-11 h-11 px-5 text-xs font-semibold rounded-full gap-1.5 cursor-pointer"
            >
              {btn.action === "END" && <StopCircle className="h-4 w-4 text-rose-500" />}
              {btn.action === "EXTEND" && <PlusCircle className="h-4 w-4 text-primary" />}
              {btn.action === "PAUSE_BREAK" && <Pause className="h-4 w-4" />}
              {btn.action === "RESUME_BREAK" && <Play className="h-4 w-4 fill-current" />}
              <span>{btn.label}</span>
            </Button>
          ))}

          {/* Menu Lainnya (Buang sesi) */}
          {clockView.menuLainnya.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="min-h-11 min-w-11 h-11 w-11 rounded-full cursor-pointer">
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                {clockView.menuLainnya.map((m) => (
                  <DropdownMenuItem
                    key={m.action}
                    onClick={() => {
                      if (m.action === "DISCARD") setIsDiscardDialogOpen(true);
                    }}
                    className="text-xs text-rose-600 focus:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    <span>{m.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Teks Kecil aksi pada Target tercapai: "Selesai tanpa istirahat" */}
        {clockView.teksKecil && clockView.kind === "TARGET_REACHED" && (
          <button
            type="button"
            onClick={handleEndSession}
            disabled={isEnding || isActionPending}
            className="min-h-11 px-3 inline-flex items-center justify-center text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer mt-1"
          >
            {clockView.teksKecil}
          </button>
        )}
      </div>

      {/* Kartu Ringkasan Sesi Setelah Akhiri */}
      {summarySession && !isFocus && (
        <SessionSummaryCard
          summarySession={summarySession}
          onDismiss={dismissSummary}
          onSaveNote={saveSummaryNote}
        />
      )}

      {/* Dialog Konfirmasi Buang Sesi */}
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