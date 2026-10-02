"use client";

import * as React from "react";
import { CurrentUserSession } from "@/lib/auth/session";
import { formatRelativeDeadline } from "@/lib/date";
import { TaskDetailData, TaskDetailModal } from "./TaskDetailModal";
import { updateTaskProgressAction } from "@/actions/tasks";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TaskStatus } from "@prisma/client";
import { Clock, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";

interface TaskKanbanProps {
  tasks: TaskDetailData[];
  session: CurrentUserSession;
  courses?: { id: string; name: string; code?: string | null }[];
  members?: { id: string; name: string | null; email: string }[];
}

const COLUMNS: { id: TaskStatus; title: string; countColor: string }[] = [
  { id: TaskStatus.TODO, title: "TODO", countColor: "bg-zinc-200 dark:bg-zinc-700" },
  { id: TaskStatus.IN_PROGRESS, title: "IN PROGRESS", countColor: "bg-blue-100 text-blue-800 dark:bg-blue-900" },
  { id: TaskStatus.REVIEW, title: "REVIEW", countColor: "bg-purple-100 text-purple-800 dark:bg-purple-900" },
  { id: TaskStatus.DONE, title: "DONE", countColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900" },
];

export function TaskKanban({ tasks, session, courses = [], members = [] }: TaskKanbanProps) {
  const [selectedTask, setSelectedTask] = React.useState<TaskDetailData | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [draggedTaskId, setDraggedTaskId] = React.useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = React.useState<TaskStatus | null>(null);

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

  return (
    <div className="space-y-4">
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
              className={`bg-muted/30 border rounded-lg p-3 flex flex-col min-h-[480px] transition-colors ${
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
              <div className="space-y-2.5 flex-1">
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

                    return (
                      <Card
                        key={task.id}
                        draggable={!isGuest && !session.isViewAs}
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => {
                          setSelectedTask(task);
                          setDetailOpen(true);
                        }}
                        className={`cursor-grab active:cursor-grabbing hover:shadow-sm transition-all border-l-4 ${
                          priorityColor[task.priority]
                        } bg-card`}
                      >
                        <CardContent className="p-3 space-y-2 text-xs">
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

                          <div className="font-semibold text-xs leading-snug line-clamp-2">
                            {task.title}
                          </div>

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

                          {myProg && (
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-primary" />
                                Progress
                              </span>
                              <span className="font-semibold text-foreground">{myProg.progress}%</span>
                            </div>
                          )}
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

      <TaskDetailModal
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        session={session}
        courses={courses}
        members={members}
      />
    </div>
  );
}
