"use client";

import * as React from "react";
import { CurrentUserSession } from "@/lib/auth/session";
import { formatDateIndo, formatRelativeDeadline } from "@/lib/date";
import { TaskDetailData, TaskDetailModal } from "./TaskDetailModal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, CheckCircle2 } from "lucide-react";

interface TaskCalendarProps {
  tasks: TaskDetailData[];
  session: CurrentUserSession;
}

export function TaskCalendar({ tasks, session }: TaskCalendarProps) {
  const [selectedTask, setSelectedTask] = React.useState<TaskDetailData | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  // Filter & sort tasks by deadline
  const tasksWithDeadline = React.useMemo(() => {
    return tasks
      .filter((t) => t.deadline !== null)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
  }, [tasks]);

  const tasksWithoutDeadline = React.useMemo(() => {
    return tasks.filter((t) => t.deadline === null);
  }, [tasks]);

  // Kelompokkan berdasarkan tanggal
  const groupedTasks = React.useMemo(() => {
    const groups: { [dateStr: string]: TaskDetailData[] } = {};
    for (const t of tasksWithDeadline) {
      const d = formatDateIndo(t.deadline);
      if (!groups[d]) groups[d] = [];
      groups[d].push(t);
    }
    return groups;
  }, [tasksWithDeadline]);

  const priorityColor = {
    LOW: "border-l-zinc-400",
    MEDIUM: "border-l-blue-500",
    HIGH: "border-l-amber-500",
    URGENT: "border-l-red-500",
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {Object.keys(groupedTasks).length === 0 ? (
          <div className="p-8 text-center border rounded-lg bg-card text-muted-foreground text-xs">
            Belum ada tugas yang memiliki batas waktu (deadline).
          </div>
        ) : (
          Object.entries(groupedTasks).map(([dateStr, items]) => (
            <div key={dateStr} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground px-1">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <span>{dateStr}</span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  ({items.length} tugas)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((task) => {
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
                        <div className="flex items-center justify-between gap-2">
                          {task.course ? (
                            <Badge variant="secondary" className="text-[10px] font-medium py-0 h-4">
                              {task.course.name}
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Umum</span>
                          )}
                          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                            {task.priority}
                          </Badge>
                        </div>

                        <div className="font-semibold text-xs leading-snug line-clamp-2">
                          {task.title}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {deadline.text}
                          </span>
                          {myProg && (
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <CheckCircle2 className="h-3 w-3 text-primary" />
                              {myProg.progress}%
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {tasksWithoutDeadline.length > 0 && (
          <div className="pt-4 border-t space-y-2">
            <div className="text-xs font-semibold text-muted-foreground px-1">
              Tugas Tanpa Batas Waktu ({tasksWithoutDeadline.length})
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tasksWithoutDeadline.map((task) => (
                <Card
                  key={task.id}
                  onClick={() => {
                    setSelectedTask(task);
                    setDetailOpen(true);
                  }}
                  className="cursor-pointer hover:shadow-sm transition-all bg-card"
                >
                  <CardContent className="p-3 space-y-1.5 text-xs">
                    <div className="font-medium text-xs line-clamp-1">{task.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {task.course ? task.course.name : "Umum"}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
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
