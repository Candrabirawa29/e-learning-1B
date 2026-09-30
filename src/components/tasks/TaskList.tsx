"use client";

import * as React from "react";
import { CurrentUserSession } from "@/lib/auth/session";
import { formatDateIndo, formatRelativeDeadline } from "@/lib/date";
import { TaskDetailData, TaskDetailModal } from "./TaskDetailModal";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TaskPriority, TaskStatus, TaskTargetType } from "@prisma/client";
import { Search } from "lucide-react";

interface TaskListProps {
  tasks: TaskDetailData[];
  session: CurrentUserSession;
  courses: { id: string; name: string }[];
}

export function TaskList({ tasks, session, courses }: TaskListProps) {
  const [search, setSearch] = React.useState("");
  const [selectedCourse, setSelectedCourse] = React.useState<string>("all");
  const [selectedPriority, setSelectedPriority] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");

  const [selectedTask, setSelectedTask] = React.useState<TaskDetailData | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(query);
        const matchDesc = t.description?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc) return false;
      }
      if (selectedCourse !== "all" && t.course?.id !== selectedCourse) return false;
      if (selectedPriority !== "all" && t.priority !== selectedPriority) return false;
      if (selectedStatus !== "all" && t.status !== selectedStatus) return false;
      return true;
    });
  }, [tasks, search, selectedCourse, selectedPriority, selectedStatus]);

  const priorityColor = {
    LOW: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    MEDIUM: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    HIGH: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    URGENT: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  };

  const statusColor = {
    TODO: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
    IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    REVIEW: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
    DONE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-card p-3 border rounded-lg">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari judul tugas atau instruksi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Mata Kuliah */}
          <Select value={selectedCourse} onValueChange={(val) => { if (val) setSelectedCourse(val); }}>
            <SelectTrigger className="h-8 text-xs w-[150px]">
              <SelectValue placeholder="Mata Kuliah" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Semua Matkul
              </SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filter Prioritas */}
          <Select value={selectedPriority} onValueChange={(val) => { if (val) setSelectedPriority(val); }}>
            <SelectTrigger className="h-8 text-xs w-[120px]">
              <SelectValue placeholder="Prioritas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Semua Prioritas
              </SelectItem>
              <SelectItem value={TaskPriority.LOW} className="text-xs">
                Rendah
              </SelectItem>
              <SelectItem value={TaskPriority.MEDIUM} className="text-xs">
                Sedang
              </SelectItem>
              <SelectItem value={TaskPriority.HIGH} className="text-xs">
                Tinggi
              </SelectItem>
              <SelectItem value={TaskPriority.URGENT} className="text-xs">
                Mendesak
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Filter Status */}
          <Select value={selectedStatus} onValueChange={(val) => { if (val) setSelectedStatus(val); }}>
            <SelectTrigger className="h-8 text-xs w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Semua Status
              </SelectItem>
              <SelectItem value={TaskStatus.TODO} className="text-xs">
                TODO
              </SelectItem>
              <SelectItem value={TaskStatus.IN_PROGRESS} className="text-xs">
                IN PROGRESS
              </SelectItem>
              <SelectItem value={TaskStatus.REVIEW} className="text-xs">
                REVIEW
              </SelectItem>
              <SelectItem value={TaskStatus.DONE} className="text-xs">
                DONE
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Task Table */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 text-[11px]">
              <TableHead className="w-[35%]">Tugas & Mata Kuliah</TableHead>
              <TableHead className="w-[15%]">Prioritas</TableHead>
              <TableHead className="w-[15%]">Status</TableHead>
              <TableHead className="w-[20%]">Batas Waktu</TableHead>
              <TableHead className="w-[15%] text-right">Target</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">
                  Belum ada tugas yang cocok dengan filter atau pencarian.
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task) => {
                const deadline = formatRelativeDeadline(task.deadline);
                // Cek progress personal jika login
                const myProg = session.profile
                  ? task.progresses.find((p) => p.profileId === session.profile?.id)
                  : null;
                const effectiveStatus = myProg ? myProg.status : task.status;

                return (
                  <TableRow
                    key={task.id}
                    onClick={() => {
                      setSelectedTask(task);
                      setDetailOpen(true);
                    }}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="py-3">
                      <div className="font-medium text-xs text-foreground leading-tight">
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        {task.course ? (
                          <span>{task.course.name}</span>
                        ) : (
                          <span>Umum</span>
                        )}
                        {myProg && (
                          <span className="font-semibold text-primary">
                            • Progress Anda: {myProg.progress}%
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 ${
                          priorityColor[task.priority]
                        }`}
                      >
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-medium px-1.5 py-0.5 ${
                          statusColor[effectiveStatus]
                        }`}
                      >
                        {effectiveStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.deadline ? (
                        <div className="text-xs">
                          <div>{formatDateIndo(task.deadline)}</div>
                          <div
                            className={`text-[10px] font-medium ${
                              deadline.isOverdue
                                ? "text-red-600 dark:text-red-400 font-semibold"
                                : deadline.isUrgent
                                ? "text-amber-600 dark:text-amber-400 font-semibold"
                                : "text-muted-foreground"
                            }`}
                          >
                            {deadline.text}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {task.targetType === TaskTargetType.ALL ? (
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          Semua Mahasiswa
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-normal border-dashed">
                          {task.assignments.length} Mahasiswa
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        session={session}
      />
    </div>
  );
}
