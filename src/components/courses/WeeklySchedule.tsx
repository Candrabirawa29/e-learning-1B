"use client";

import * as React from "react";
import { CurrentUserSession } from "@/lib/auth/session";
import { canManageCourse } from "@/lib/auth/rbac";
import { deleteCourseScheduleAction } from "@/actions/courses";
import { minutesToTimeString, DAYS_OF_WEEK_INDO } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Trash2,
  Plus,
  MoreVertical,
  Edit3,
} from "lucide-react";
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
  courses: { id: string; name: string; code?: string | null }[];
  session: CurrentUserSession;
}

export function WeeklySchedule({ schedules, courses, session }: WeeklyScheduleProps) {
  const [addScheduleOpen, setAddScheduleOpen] = React.useState(false);
  const [scheduleForEdit, setScheduleForEdit] = React.useState<ScheduleItem | null>(null);
  const [editScheduleOpen, setEditScheduleOpen] = React.useState(false);

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

  const handleDeleteSchedule = async (scheduleId: string, courseName?: string) => {
    const label = courseName ? `jadwal mata kuliah "${courseName}"` : "jadwal ini";
    if (!confirm(`Hapus ${label}? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await deleteCourseScheduleAction(scheduleId);
      toast.success("Jadwal berhasil dihapus.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus jadwal");
    }
  };

  const canAddAnySchedule =
    session.effectiveRole === "ADMIN" ||
    (session.effectiveRole === "PJ" && (session.assignedCourseIds?.length ?? 0) > 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-base text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Jadwal Kuliah Mingguan Kelas 1-B
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Daftar waktu dan ruang perkuliahan reguler tiap hari.
          </p>
        </div>

        {canAddAnySchedule && (
          <Button
            size="sm"
            onClick={() => setAddScheduleOpen(true)}
            className="h-8 text-xs gap-1.5 font-medium self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Jadwal
          </Button>
        )}
      </div>

      {/* Tampilan Desktop: 5 Kolom Grid Hari */}
      <div className="hidden md:grid md:grid-cols-5 gap-3">
        {daysToShow.map((day) => {
          const daySchedules = schedules
            .filter((s) => s.dayOfWeek === day)
            .sort((a, b) => a.startMinute - b.startMinute);
          const isToday = day === currentDayOfWeek;

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
                            className="font-semibold text-foreground hover:text-primary hover:underline line-clamp-1 text-xs flex-1"
                          >
                            {item.course.name}
                          </Link>
                          {canManage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground p-0 shrink-0"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                }
                              />
                              <DropdownMenuContent align="end" className="text-xs">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setScheduleForEdit(item);
                                    setEditScheduleOpen(true);
                                  }}
                                  className="gap-2 text-xs"
                                >
                                  <Edit3 className="h-3.5 w-3.5 text-primary" />
                                  Edit Jadwal
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteSchedule(item.id, item.course.name)}
                                  className="gap-2 text-xs text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Hapus Jadwal
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                  <div className="flex items-center justify-between gap-1">
                    <Link
                      href={`/home/materials/${item.courseId}`}
                      className="font-semibold text-sm hover:underline text-primary flex-1"
                    >
                      {item.course.name}
                    </Link>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground p-0 shrink-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="text-xs">
                          <DropdownMenuItem
                            onClick={() => {
                              setScheduleForEdit(item);
                              setEditScheduleOpen(true);
                            }}
                            className="gap-2 text-xs"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-primary" />
                            Edit Jadwal
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteSchedule(item.id, item.course.name)}
                            className="gap-2 text-xs text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Hapus Jadwal
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
        mode="create"
        open={addScheduleOpen}
        onOpenChange={setAddScheduleOpen}
      />

      {/* Dialog Edit Jadwal */}
      <CourseScheduleDialog
        courses={courses}
        mode="edit"
        schedule={scheduleForEdit}
        open={editScheduleOpen}
        onOpenChange={setEditScheduleOpen}
      />
    </div>
  );
}
