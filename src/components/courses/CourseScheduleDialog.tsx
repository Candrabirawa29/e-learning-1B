"use client";

import * as React from "react";
import { addCourseScheduleAction, updateCourseScheduleAction } from "@/actions/courses";
import { minutesToTimeString, timeStringToMinutes, DAYS_OF_WEEK_INDO } from "@/lib/date";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Calendar, Edit3 } from "lucide-react";
import { toast } from "sonner";

export interface ScheduleItemData {
  id: string;
  courseId: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  room: string | null;
  course: {
    id: string;
    name: string;
    code?: string | null;
    lecturer?: string | null;
  };
}

interface CourseScheduleDialogProps {
  courses: { id: string; name: string; code?: string | null }[];
  defaultCourseId?: string;
  mode?: "create" | "edit";
  schedule?: ScheduleItemData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CourseScheduleDialog({
  courses,
  defaultCourseId,
  mode = "create",
  schedule,
  open,
  onOpenChange,
  onSuccess,
}: CourseScheduleDialogProps) {
  const isEdit = mode === "edit" && !!schedule;
  const [courseId, setCourseId] = React.useState(defaultCourseId || courses[0]?.id || "");
  const [dayOfWeek, setDayOfWeek] = React.useState<number>(1);
  const [startTime, setStartTime] = React.useState("08:00");
  const [endTime, setEndTime] = React.useState("09:40");
  const [room, setRoom] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (isEdit && schedule) {
        setCourseId(schedule.courseId);
        setDayOfWeek(schedule.dayOfWeek);
        setStartTime(minutesToTimeString(schedule.startMinute));
        setEndTime(minutesToTimeString(schedule.endMinute));
        setRoom(schedule.room || "");
      } else {
        const initialCourseId = defaultCourseId || courses[0]?.id || "";
        setCourseId(initialCourseId);
        setDayOfWeek(1);
        setStartTime("08:00");
        setEndTime("09:40");
        const selected = courses.find((c) => c.id === initialCourseId);
        setRoom(selected?.code || "");
      }
    }
  }, [open, isEdit, schedule, defaultCourseId, courses]);

  const handleCourseChange = (selectedId: string) => {
    setCourseId(selectedId);
    // Auto-fill room based on course code
    if (!isEdit) {
      const selected = courses.find((c) => c.id === selectedId);
      setRoom(selected?.code || "");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) {
      toast.error("Pilih mata kuliah terlebih dahulu.");
      return;
    }

    const startMinute = timeStringToMinutes(startTime);
    const endMinute = timeStringToMinutes(endTime);

    if (startMinute >= endMinute) {
      toast.error("Waktu mulai harus lebih awal daripada waktu selesai.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit && schedule) {
        await updateCourseScheduleAction(schedule.id, {
          dayOfWeek,
          startMinute,
          endMinute,
          room: room.trim() || undefined,
        });
        toast.success("Jadwal perkuliahan berhasil diperbarui!");
      } else {
        await addCourseScheduleAction({
          courseId,
          dayOfWeek,
          startMinute,
          endMinute,
          room: room.trim() || undefined,
        });
        toast.success("Jadwal perkuliahan berhasil ditambahkan!");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan jadwal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCourse = courses.find((c) => c.id === courseId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              {isEdit ? (
                <>
                  <Edit3 className="h-4 w-4 text-primary" />
                  Edit Jadwal Perkuliahan
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 text-primary" />
                  Tambah Jadwal Perkuliahan
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {isEdit
                ? `Perbarui jadwal perkuliahan untuk ${schedule?.course.name || "mata kuliah"}.`
                : "Atur hari, jam pelaksanaan, dan ruang kelas untuk perkuliahan mingguan."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs py-1">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Mata Kuliah</Label>
              <Select
                value={courseId}
                onValueChange={(val) => {
                  if (val) handleCourseChange(val);
                }}
                disabled={isEdit}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Pilih Mata Kuliah">
                    {selectedCourse?.name || "Pilih Mata Kuliah"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name} {c.code ? `(${c.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Hari Perkuliahan</Label>
              <Select
                value={String(dayOfWeek)}
                onValueChange={(val) => {
                  if (val) setDayOfWeek(Number(val));
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Pilih Hari">
                    {DAYS_OF_WEEK_INDO[dayOfWeek]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <SelectItem key={d} value={String(d)} className="text-xs">
                      {DAYS_OF_WEEK_INDO[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Jam Mulai</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Jam Selesai</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Ruang Kelas (Otomatis Terisi)</Label>
                {selectedCourse?.code && !isEdit && (
                  <span className="text-[10px] text-muted-foreground">
                    Dari kode kelas: <span className="font-mono text-primary font-medium">{selectedCourse.code}</span>
                  </span>
                )}
              </div>
              <Input
                placeholder="Contoh: R. 402 / Lab Komputer 2"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs h-8 gap-1.5 font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : isEdit ? (
                <>
                  <Edit3 className="h-3.5 w-3.5" />
                  Perbarui Jadwal
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Simpan Jadwal
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
