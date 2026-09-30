"use client";

import * as React from "react";
import { CurrentUserSession } from "@/lib/auth/session";
import { formatRelativeDeadline } from "@/lib/date";
import { TaskDetailData, TaskDetailModal } from "./TaskDetailModal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TaskStatus } from "@prisma/client";
import { Clock, CheckCircle2 } from "lucide-react";

interface TaskKanbanProps {
  tasks: TaskDetailData[];
  session: CurrentUserSession;
}

const COLUMNS: { id: TaskStatus; title: string; countColor: string }[] = [
  { id: TaskStatus.TODO, title: "TODO", countColor: "bg-zinc-200 dark:bg-zinc-700" },
  { id: TaskStatus.IN_PROGRESS, title: "IN PROGRESS", countColor: "bg-blue-100 text-blue-800 dark:bg-blue-900" },
  { id: TaskStatus.REVIEW, title: "REVIEW", countColor: "bg-purple-100 text-purple-800 dark:bg-purple-900" },
  { id: TaskStatus.DONE, title: "DONE", countColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900" },
];

export function TaskKanban({ tasks, session }: TaskKanbanProps) {
  const [selectedTask, setSelectedTask] = React.useState<TaskDetailData | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  const priorityColor = {
    LOW: "border-zinc-300 dark:border-zinc-700",
    MEDIUM: "border-blue-400 dark:border-blue-700",
    HIGH: "border-amber-400 dark:border-amber-600",
    URGENT: "border-red-500 dark:border-red-600",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col) => {
          // Kelompokkan task berdasarkan status efektif user (atau status task jika guest)
          const columnTasks = tasks.filter((t) => {
            const myProg = session.profile
              ? t.progresses.find((p) => p.profileId === session.profile?.id)
              : null;
            const effectiveStatus = myProg ? myProg.status : t.status;
            return effectiveStatus === col.id;
          });

          return (
            <div
              key={col.id}
              className="bg-muted/30 border rounded-lg p-3 flex flex-col min-h-[450px]"
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
                    Tidak ada tugas di status ini.
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
                        onClick={() => {
                          setSelectedTask(task);
                          setDetailOpen(true);
                        }}
                        className={`cursor-pointer hover:shadow-sm transition-all border-l-4 ${
                          priorityColor[task.priority]
                        } bg-card`}
                      >
                        <CardContent className="p-3 space-y-2 text-xs">
                          {task.course && (
                            <Badge variant="secondary" className="text-[10px] font-medium py-0 h-4">
                              {task.course.name}
                            </Badge>
                          )}

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
      />
    </div>
  );
}
