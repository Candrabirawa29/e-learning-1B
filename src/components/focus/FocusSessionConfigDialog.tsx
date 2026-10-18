"use client";

import * as React from "react";
import { useFocusTimer } from "./FocusTimerContext";
import { FocusMode } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Timer, BookOpen, CheckSquare } from "lucide-react";

interface CourseOption {
  id: string;
  name: string;
  code: string | null;
}

interface TaskOption {
  id: string;
  title: string;
  courseId: string | null;
}

interface FocusSessionConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: CourseOption[];
  tasks: TaskOption[];
}

export function FocusSessionConfigDialog({
  open,
  onOpenChange,
  courses,
  tasks,
}: FocusSessionConfigDialogProps) {
  const { startFocus, preferences } = useFocusTimer();

  const [mode, setMode] = React.useState<"PRESET_25" | "PRESET_50" | "CUSTOM" | "STOPWATCH">("PRESET_25");
  const [customMinutes, setCustomMinutes] = React.useState<number>(
    preferences ? Math.round(preferences.focusDuration / 60) : 25
  );
  const [selectedCourseId, setSelectedCourseId] = React.useState<string>("none");
  const [selectedTaskId, setSelectedTaskId] = React.useState<string>("none");
  const [note, setNote] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Filter tasks based on selected course if chosen
  const filteredTasks = React.useMemo(() => {
    if (selectedCourseId === "none") return tasks;
    return tasks.filter((t) => t.courseId === selectedCourseId);
  }, [tasks, selectedCourseId]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let focusMode: FocusMode = FocusMode.FOCUS;
      let plannedSec = 1500; // 25 menit

      if (mode === "PRESET_25") {
        plannedSec = 25 * 60;
      } else if (mode === "PRESET_50") {
        plannedSec = 50 * 60;
      } else if (mode === "CUSTOM") {
        plannedSec = Math.min(240, Math.max(1, customMinutes)) * 60;
      } else if (mode === "STOPWATCH") {
        focusMode = FocusMode.STOPWATCH;
        plannedSec = 0;
      }

      const success = await startFocus({
        mode: focusMode,
        plannedSec,
        courseId: selectedCourseId === "none" ? null : selectedCourseId,
        taskId: selectedTaskId === "none" ? null : selectedTaskId,
        note: note.trim() || null,
      });

      if (success) {
        onOpenChange(false);
        setNote("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Timer className="h-5 w-5 text-primary" />
            Konfigurasi Sesi Fokus Baru
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pilih durasi, target mata kuliah, atau kaitkan dengan tugas yang sedang Anda kerjakan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleStart} className="space-y-4 py-2 text-xs">
          {/* Mode Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Pilih Mode Sesi</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button
                type="button"
                variant={mode === "PRESET_25" ? "default" : "outline"}
                onClick={() => setMode("PRESET_25")}
                className="flex flex-col h-auto py-2.5 px-2 text-center"
              >
                <span className="text-xs font-bold">25 Menit</span>
                <span className="text-[10px] text-muted-foreground opacity-80">Pomodoro 25/5</span>
              </Button>

              <Button
                type="button"
                variant={mode === "PRESET_50" ? "default" : "outline"}
                onClick={() => setMode("PRESET_50")}
                className="flex flex-col h-auto py-2.5 px-2 text-center"
              >
                <span className="text-xs font-bold">50 Menit</span>
                <span className="text-[10px] text-muted-foreground opacity-80">Mendalam 50/10</span>
              </Button>

              <Button
                type="button"
                variant={mode === "CUSTOM" ? "default" : "outline"}
                onClick={() => setMode("CUSTOM")}
                className="flex flex-col h-auto py-2.5 px-2 text-center"
              >
                <span className="text-xs font-bold">Kustom</span>
                <span className="text-[10px] text-muted-foreground opacity-80">Atur Menit</span>
              </Button>

              <Button
                type="button"
                variant={mode === "STOPWATCH" ? "default" : "outline"}
                onClick={() => setMode("STOPWATCH")}
                className="flex flex-col h-auto py-2.5 px-2 text-center"
              >
                <span className="text-xs font-bold">Stopwatch</span>
                <span className="text-[10px] text-muted-foreground opacity-80">Hitung Maju</span>
              </Button>
            </div>
          </div>

          {/* Custom Duration Input */}
          {mode === "CUSTOM" && (
            <div className="space-y-1.5 p-3 bg-muted/40 rounded-lg border">
              <Label htmlFor="custom-min" className="text-xs font-medium">
                Durasi Fokus (Menit) - Maksimal 240 Menit (4 Jam)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="custom-min"
                  type="number"
                  min={1}
                  max={240}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(parseInt(e.target.value, 10) || 1)}
                  className="h-8 text-xs font-mono"
                />
                <span className="text-xs text-muted-foreground">menit</span>
              </div>
            </div>
          )}

          {/* Optional Course Association */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              Mata Kuliah (Opsional)
            </Label>
            <Select value={selectedCourseId} onValueChange={(val) => { if (val) setSelectedCourseId(val); }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Pilih mata kuliah..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">
                  -- Tanpa Mata Kuliah (Umum) --
                </SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.name} {c.code ? `(${c.code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional Task Association */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
              Tugas Terkait (Opsional)
            </Label>
            <Select value={selectedTaskId} onValueChange={(val) => { if (val) setSelectedTaskId(val); }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Pilih tugas..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">
                  -- Tanpa Tugas --
                </SelectItem>
                {filteredTasks.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Session Note */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="session-note" className="text-xs font-medium">
                Catatan Singkat (Opsional)
              </Label>
              <span className="text-[10px] text-muted-foreground">{note.length}/500</span>
            </div>
            <Textarea
              id="session-note"
              placeholder="Contoh: Menyelesaikan bab 3 atau resume modul praktikum..."
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              className="text-xs min-h-[64px]"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="text-xs gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Mulai Sesi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
