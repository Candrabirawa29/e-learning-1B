"use client";

import * as React from "react";
import { CurrentUserSession } from "@/lib/auth/session";
import { canManageCourse } from "@/lib/auth/rbac";
import { deleteCourseScheduleAction } from "@/actions/courses";
import { minutesToTimeString, DAYS_OF_WEEK_INDO } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, User, Trash2, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { CourseScheduleDialog } from "./CourseScheduleDialog";

export interface ScheduleItem {
  id: string;
  courseId: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  room: string | null;
  course: {
    id: string;
    name: string;
    code: string | null;
    lecturer: string | null;
  };
}

interface WeeklyScheduleProps {
  schedules: ScheduleItem[];
  courses: { id: string; name: string }[];
  session: CurrentUserSession;
}

export function WeeklySchedule({ schedules, courses, session }: WeeklyScheduleProps) {
  const [addScheduleOpen, setAddScheduleOpen] = React.useState(false);

  // Hari hari ini (1 = Senin ... 7 = Minggu)
  const currentDayOfWeek = React.useMemo(() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  }, []);

  const [activeMobileDay, setActiveMobileDay] = React.useState<number>(currentDayOfWeek);

  // Filter 5 hari aktif (Senin - Jumat) atau jika ada jadwal Sabtu/Minggu sertakan
  const daysToShow = React.useMemo(() => {
    const hasWeekend = schedules.some((s) => s.dayOfWeek >= 6);
    return hasWeekend ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5];
  }, [schedules]);

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("Hapus jadwal perkuliahan ini?")) return;
    try {
      await deleteCourseScheduleAction(scheduleId);
      toast.success("Jadwal berhasil dihapus.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus jadwal");
    }
  };

  const canAddAnySchedule =
    session.realRole === "ADMIN" ||
    (session.realRole === "PJ" && (session.assignedCourseIds?.length || 0) > 0);

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">Jadwal Kuliah Mingguan Kelas 1-B</h2>
        </div>

        <div className="flex items-center gap-2">
          {canAddAnySchedule && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddScheduleOpen(true)}
              className="h-7 text-xs gap-1"
            >
              <Plus className="h-3 w-3" />
              Tambah Jadwal
            </Button>
          )}
        </div>
      </div>

      {/* Tampilan Desktop: Kolom Per Hari */}
      <div className="hidden md:grid grid-cols-5 lg:grid-cols-5 gap-3 items-start">
        {daysToShow.map((day) => {
          const isToday = day === currentDayOfWeek;
          const daySchedules = schedules
            .filter((s) => s.dayOfWeek === day)
            .sort((a, b) => a.startMinute - b.startMinute);

          return (
            <div
              key={day}
              className={`rounded-lg border p-2.5 flex flex-col min-h-[160px] transition-all ${
                isToday
                  ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20"
                  : "bg-muted/20"
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b mb-2">
                <span className="font-semibold text-xs text-foreground">
                  {DAYS_OF_WEEK_INDO[day]}
                </span>
                {isToday && (
                  <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4">
                    Hari Ini
                  </Badge>
                )}
              </div>

              <div className="space-y-2 flex-1">
                {daySchedules.length === 0 ? (
                  <div className="h-20 flex items-center justify-center text-[11px] text-muted-foreground/60 italic text-center">
                    Tidak ada jadwal
                  </div>
                ) : (
                  daySchedules.map((item) => {
                    const canManage = canManageCourse(session, item.courseId);
                    return (
                      <div
                        key={item.id}
                        className="bg-card border rounded p-2 text-xs space-y-1 relative group hover:border-primary/50 transition-all shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <Link
                            href={`/home/materials/${item.courseId}`}
                            className="font-semibold text-foreground hover:text-primary hover:underline line-clamp-1 text-xs"
                          >
                            {item.course.name}
                          </Link>
                          {canManage && (
                            <button
                              onClick={() => handleDeleteSchedule(item.id)}
                              title="Hapus jadwal"
                              className="text-muted-foreground hover:text-red-500 transition-colors p-0.5"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-primary font-medium">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>
                            {minutesToTimeString(item.startMinute)} -{" "}
                            {minutesToTimeString(item.endMinute)}
                          </span>
                        </div>

                        {item.room && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span>Ruang: {item.room}</span>
                          </div>
                        )}

                        {item.course.lecturer && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate">{item.course.lecturer}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tampilan Mobile: List Hari dengan Tab Selector */}
      <div className="md:hidden space-y-3">
        <div className="flex overflow-x-auto gap-1 pb-1 scrollbar-none">
          {daysToShow.map((day) => {
            const isToday = day === currentDayOfWeek;
            const isSelected = day === activeMobileDay;
            return (
              <Button
                key={day}
                size="sm"
                variant={isSelected ? "default" : "outline"}
                onClick={() => setActiveMobileDay(day)}
                className="text-xs h-7 px-2.5 shrink-0 gap-1"
              >
                <span>{DAYS_OF_WEEK_INDO[day]}</span>
                {isToday && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
              </Button>
            );
          })}
        </div>

        <div className="space-y-2">
          {schedules
            .filter((s) => s.dayOfWeek === activeMobileDay)
            .sort((a, b) => a.startMinute - b.startMinute)
            .map((item) => {
              const canManage = canManageCourse(session, item.courseId);
              return (
                <div
                  key={item.id}
                  className="bg-card border rounded-lg p-3 text-xs space-y-1.5 relative shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/home/materials/${item.courseId}`}
                      className="font-semibold text-sm hover:underline text-primary"
                    >
                      {item.course.name}
                    </Link>
                    {canManage && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteSchedule(item.id)}
                        className="h-6 w-6 text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Clock className="h-3 w-3 text-primary" />
                      {minutesToTimeString(item.startMinute)} - {minutesToTimeString(item.endMinute)}
                    </span>
                    {item.room && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {item.room}
                      </span>
                    )}
                  </div>

                  {item.course.lecturer && (
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {item.course.lecturer}
                    </div>
                  )}
                </div>
              );
            })}

          {schedules.filter((s) => s.dayOfWeek === activeMobileDay).length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground italic border rounded-lg">
              Tidak ada jadwal kuliah untuk hari {DAYS_OF_WEEK_INDO[activeMobileDay]}.
            </div>
          )}
        </div>
      </div>

      {/* Dialog Tambah Jadwal */}
      <CourseScheduleDialog
        courses={courses}
        open={addScheduleOpen}
        onOpenChange={setAddScheduleOpen}
      />
    </div>
  );
}
