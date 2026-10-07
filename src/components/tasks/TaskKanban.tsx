"use client";

import * as React from "react";
import { CurrentUserSession } from "@/lib/auth/session";
import { formatRelativeDeadline } from "@/lib/date";
import { TaskDetailData, TaskDetailModal } from "./TaskDetailModal";
import { TaskMemberTrackerModal } from "./TaskMemberTrackerModal";
import { calculateTaskProgressSummary } from "@/lib/tasks/progress";
import { updateTaskProgressAction } from "@/actions/tasks";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskStatus } from "@prisma/client";
import {
  Clock,
  CheckCircle2,
  Send,
  Users,
  Kanban as KanbanIcon,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface TaskKanbanProps {
  tasks: TaskDetailData[];
  session: CurrentUserSession;
  courses?: { id: string; name: string; code?: string | null }[];
  members?: { id: string; name: string | null; email: string }[];
}

const COLUMNS: { id: TaskStatus; title: string; countColor: string }[] = [
  { id: TaskStatus.TODO, title: "TODO", countColor: "bg-zinc-200 dark:bg-zinc-700 text-foreground" },
  { id: TaskStatus.IN_PROGRESS, title: "IN PROGRESS", countColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { id: TaskStatus.REVIEW, title: "REVIEW", countColor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  { id: TaskStatus.DONE, title: "DONE", countColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
];

export function TaskKanban({ tasks, session, courses = [], members = [] }: TaskKanbanProps) {
  const [selectedTask, setSelectedTask] = React.useState<TaskDetailData | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [trackerTask, setTrackerTask] = React.useState<TaskDetailData | null>(null);
  const [draggedTaskId, setDraggedTaskId] = React.useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = React.useState<TaskStatus | null>(null);
  const [movingTaskId, setMovingTaskId] = React.useState<string | null>(null);

  const isGuest = session.effectiveRole === "GUEST" || !session.user;

  const priorityColor = {
    LOW: "border-zinc-300 dark:border-zinc-700",
    MEDIUM: "border-blue-400 dark:border-blue-700",
    HIGH: "border-amber-400 dark:border-amber-600",
    URGENT: "border-red-500 dark:border-red-600",
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    if (isGuest || session.isViewAs) return;
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleQuickMove = async (taskId: string, newStatus: TaskStatus) => {
    if (isGuest || session.isViewAs) return;
    setMovingTaskId(taskId);
    try {
      await updateTaskProgressAction(taskId, {
        status: newStatus,
        progress: newStatus === TaskStatus.DONE ? 100 : newStatus === TaskStatus.IN_PROGRESS ? 50 : 0,
      });
      toast.success(`Status tugas dipindahkan ke ${newStatus}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memindahkan status tugas.");
    } finally {
      setMovingTaskId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    setDraggedTaskId(null);

    if (!taskId || isGuest || session.isViewAs) return;

    // Cari task
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const myProg = session.profile
      ? task.progresses.find((p) => p.profileId === session.profile?.id)
      : null;
    const currentStatus = myProg ? myProg.status : TaskStatus.TODO;

    if (currentStatus === newStatus) return;

    try {
      await updateTaskProgressAction(taskId, {
        status: newStatus,
        progress: newStatus === TaskStatus.DONE ? 100 : newStatus === TaskStatus.IN_PROGRESS ? 50 : 0,
      });
      toast.success(`Status tugas dipindahkan ke ${newStatus}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memindahkan status tugas.");
    }
  };

  // Status berikutnya yang lazim
  const getNextStatusAction = (currentStatus: TaskStatus): { label: string; nextStatus: TaskStatus } | null => {
    switch (currentStatus) {
      case TaskStatus.TODO:
        return { label: "Mulai Kerjakan", nextStatus: TaskStatus.IN_PROGRESS };
      case TaskStatus.IN_PROGRESS:
        return { label: "Ajukan Review", nextStatus: TaskStatus.REVIEW };
      case TaskStatus.REVIEW:
        return { label: "Tandai Selesai", nextStatus: TaskStatus.DONE };
      case TaskStatus.DONE:
        return { label: "Kembalikan ke Todo", nextStatus: TaskStatus.TODO };
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Banner Panduan Kanban Personal */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3.5 bg-card border rounded-lg shadow-xs text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 text-primary rounded-md shrink-0">
            <KanbanIcon className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-foreground">Kanban Tugas Mandiri:</span>{" "}
            <span className="text-muted-foreground">
              Kolom di bawah ini menampilkan status personal pengerjaan tugas Anda. Tarik kartu atau gunakan tombol aksi cepat untuk memperbarui progres Anda.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0 pl-9 sm:pl-0">
          <Sparkles className="h-3 w-3 text-amber-500" />
          <span>Klik <strong>Tracker Anggota</strong> di kartu untuk memantau progres rekan sekelas.</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col) => {
          // Kelompokkan task berdasarkan status personal user (no row = TODO)
          const columnTasks = tasks.filter((t) => {
            const myProg = session.profile
              ? t.progresses.find((p) => p.profileId === session.profile?.id)
              : null;
            const personalStatus = myProg ? myProg.status : TaskStatus.TODO;
            return personalStatus === col.id;
          });

          const isOver = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`bg-muted/30 border rounded-lg p-3 flex flex-col min-h-[500px] transition-colors ${
                isOver ? "border-primary bg-primary/5 ring-1 ring-primary/30" : ""
              }`}
            >
              {/* Header Kolom */}
              <div className="flex items-center justify-between pb-3 border-b mb-3">
                <span className="font-semibold text-xs text-foreground tracking-wide">
                  {col.title}
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${col.countColor}`}
                >
                  {columnTasks.length}
                </span>
              </div>

              {/* Task Items */}
              <div className="space-y-3 flex-1">
                {columnTasks.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-center text-xs text-muted-foreground/60 border border-dashed rounded p-4">
                    Tarik tugas ke sini untuk memindahkan ke {col.title}
                  </div>
                ) : (
                  columnTasks.map((task) => {
                    const deadline = formatRelativeDeadline(task.deadline);
                    const myProg = session.profile
                      ? task.progresses.find((p) => p.profileId === session.profile?.id)
                      : null;
                    const personalStatus = myProg ? myProg.status : TaskStatus.TODO;
                    const nextAction = getNextStatusAction(personalStatus);
                    const isMoving = movingTaskId === task.id;

                    // Ringkasan progres seluruh anggota kelas untuk tugas ini
                    const summary = calculateTaskProgressSummary(task, members);

                    return (
                      <Card
                        key={task.id}
                        draggable={!isGuest && !session.isViewAs}
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => {
                          setSelectedTask(task);
                          setDetailOpen(true);
                        }}
                        className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-all border-l-4 ${
                          priorityColor[task.priority]
                        } bg-card group`}
                      >
                        <CardContent className="p-3 space-y-2.5 text-xs">
                          {/* Course Badge & Submission URL */}
                          <div className="flex items-center justify-between gap-1">
                            {task.course ? (
                              <Badge variant="secondary" className="text-[10px] font-medium py-0 h-4">
                                {task.course.name}
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Umum</span>
                            )}

                            {task.submissionUrl && (
                              <a
                                href={task.submissionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-1.5 py-0.5 rounded transition-colors"
                              >
                                <Send className="h-2.5 w-2.5" />
                                Kumpulkan
                              </a>
                            )}
                          </div>

                          {/* Judul Tugas */}
                          <div className="font-semibold text-xs leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                            {task.title}
                          </div>

                          {/* Deadline Info */}
                          {task.deadline && (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span
                                className={
                                  deadline.isOverdue
                                    ? "text-red-600 dark:text-red-400 font-medium"
                                    : deadline.isUrgent
                                    ? "text-amber-600 dark:text-amber-400 font-medium"
                                    : ""
                                }
                              >
                                {deadline.text}
                              </span>
                            </div>
                          )}

                          {/* Personal Progress Bar & Quick Move Action */}
                          <div className="pt-2 border-t space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="flex items-center gap-1 text-muted-foreground font-medium">
                                <CheckCircle2 className="h-3 w-3 text-primary" />
                                Progres Saya:
                              </span>
                              <span className="font-bold text-foreground">
                                {myProg ? myProg.progress : 0}%
                              </span>
                            </div>

                            {/* Tombol Aksi Cepat Pindah Status (Mobile & Touch Friendly) */}
                            {!isGuest && !session.isViewAs && nextAction && (
                              <div className="pt-0.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  disabled={isMoving}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickMove(task.id, nextAction.nextStatus);
                                  }}
                                  className="w-full h-6 text-[10px] gap-1 font-medium bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                                >
                                  {isMoving ? (
                                    <>
                                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                      Memproses...
                                    </>
                                  ) : (
                                    <>
                                      <span>{nextAction.label}</span>
                                      <ArrowRight className="h-2.5 w-2.5" />
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Ringkasan Progres Kelas (Tracking Anggota) */}
                          <div className="pt-2 border-t space-y-1.5 bg-muted/10 -mx-3 -mb-3 p-2.5 rounded-b-md">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-muted-foreground flex items-center gap-1 font-medium">
                                <Users className="h-3 w-3 text-primary shrink-0" />
                                Progres Kelas
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTrackerTask(task);
                                }}
                                className="font-semibold text-primary hover:underline transition-colors"
                              >
                                {summary.doneCount}/{summary.totalRecipients} Selesai ({summary.completionPercentage}%)
                              </button>
                            </div>

                            {/* Mini Segmented Bar */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setTrackerTask(task);
                              }}
                              className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex cursor-pointer hover:opacity-85 transition-opacity"
                              title="Klik untuk melihat status seluruh mahasiswa"
                            >
                              {summary.doneCount > 0 && (
                                <div
                                  style={{
                                    width: `${(summary.doneCount / summary.totalRecipients) * 100}%`,
                                  }}
                                  className="bg-emerald-500 h-full"
                                />
                              )}
                              {summary.reviewCount > 0 && (
                                <div
                                  style={{
                                    width: `${(summary.reviewCount / summary.totalRecipients) * 100}%`,
                                  }}
                                  className="bg-purple-500 h-full"
                                />
                              )}
                              {summary.inProgressCount > 0 && (
                                <div
                                  style={{
                                    width: `${(summary.inProgressCount / summary.totalRecipients) * 100}%`,
                                  }}
                                  className="bg-blue-500 h-full"
                                />
                              )}
                              {summary.todoCount > 0 && (
                                <div
                                  style={{
                                    width: `${(summary.todoCount / summary.totalRecipients) * 100}%`,
                                  }}
                                  className="bg-zinc-300 dark:bg-zinc-700 h-full"
                                />
                              )}
                            </div>

                            {/* Trigger Buka Tracker Modal */}
                            <div className="text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTrackerTask(task);
                                }}
                                className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium pt-0.5"
                              >
                                <span>Lihat pelacakan anggota</span>
                                <ArrowRight className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal Tugas */}
      <TaskDetailModal
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        session={session}
        courses={courses}
        members={members}
      />

      {/* Tracker Anggota Modal */}
      <TaskMemberTrackerModal
        task={trackerTask}
        members={members}
        session={session}
        open={!!trackerTask}
        onOpenChange={(open) => !open && setTrackerTask(null)}
      />
    </div>
  );
}
