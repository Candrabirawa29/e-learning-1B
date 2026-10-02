"use client";

import * as React from "react";
import { CurrentUserSession } from "@/lib/auth/session";
import { formatDateIndo, formatRelativeDeadline } from "@/lib/date";
import { TaskDetailData, TaskDetailModal } from "./TaskDetailModal";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TaskPriority, TaskStatus, TaskTargetType } from "@prisma/client";
import { Search, RotateCcw, Send } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface TaskListProps {
  tasks: TaskDetailData[];
  session: CurrentUserSession;
  courses: { id: string; name: string; code?: string | null }[];
  members?: { id: string; name: string | null; email: string }[];
}

export function TaskList({ tasks, session, courses, members = [] }: TaskListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Ambil state filter dari URL searchParams
  const search = searchParams.get("q") || "";
  const selectedCourse = searchParams.get("course") || "all";
  const selectedPriority = searchParams.get("priority") || "all";
  const selectedStatus = searchParams.get("status") || "all";
  const selectedSort = searchParams.get("sort") || "deadline_asc";

  const [selectedTask, setSelectedTask] = React.useState<TaskDetailData | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  // Helper untuk update query URL
  const updateQuery = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleResetFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("course");
    params.delete("priority");
    params.delete("status");
    params.delete("sort");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const filteredAndSortedTasks = React.useMemo(() => {
    const result = tasks.filter((t) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(query);
        const matchDesc = t.description?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc) return false;
      }
      if (selectedCourse !== "all" && t.course?.id !== selectedCourse) return false;
      if (selectedPriority !== "all" && t.priority !== selectedPriority) return false;

      // Status personal
      const myProg = session.profile
        ? t.progresses.find((p) => p.profileId === session.profile?.id)
        : null;
      const personalStatus = myProg ? myProg.status : TaskStatus.TODO;

      if (selectedStatus !== "all" && personalStatus !== selectedStatus) return false;
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (selectedSort === "deadline_asc") {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (selectedSort === "deadline_desc") {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
      }
      if (selectedSort === "created_desc") {
        return b.id.localeCompare(a.id);
      }
      if (selectedSort === "priority_desc") {
        const pOrder: Record<TaskPriority, number> = {
          URGENT: 4,
          HIGH: 3,
          MEDIUM: 2,
          LOW: 1,
        };
        return pOrder[b.priority] - pOrder[a.priority];
      }
      return 0;
    });

    return result;
  }, [tasks, search, selectedCourse, selectedPriority, selectedStatus, selectedSort, session.profile]);

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedCourse !== "all" ||
    selectedPriority !== "all" ||
    selectedStatus !== "all" ||
    selectedSort !== "deadline_asc";

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
      {/* Filter Bar with Labels */}
      <div className="bg-card p-3.5 border rounded-lg space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari judul tugas atau instruksi..."
              value={search}
              onChange={(e) => updateQuery("q", e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Menampilkan <strong>{filteredAndSortedTasks.length}</strong> dari {tasks.length} tugas
            </span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
              >
                <RotateCcw className="h-3 w-3" />
                Reset Filter
              </Button>
            )}
          </div>
        </div>

        {/* Labeled Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t text-xs">
          {/* Filter Mata Kuliah */}
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground font-medium">Mata Kuliah</Label>
            <Select
              value={selectedCourse}
              onValueChange={(val) => { if (val) updateQuery("course", val); }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Semua Matkul">
                  {selectedCourse === "all"
                    ? "Semua Matkul"
                    : courses.find((c) => c.id === selectedCourse)?.name || "Semua Matkul"}
                </SelectValue>
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
          </div>

          {/* Filter Status */}
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground font-medium">Status Tugas</Label>
            <Select
              value={selectedStatus}
              onValueChange={(val) => { if (val) updateQuery("status", val); }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Semua Status">
                  {selectedStatus === "all" ? "Semua Status" : selectedStatus.replace(/_/g, " ")}
                </SelectValue>
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

          {/* Filter Prioritas */}
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground font-medium">Prioritas</Label>
            <Select
              value={selectedPriority}
              onValueChange={(val) => { if (val) updateQuery("priority", val); }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Semua Prioritas">
                  {selectedPriority === "all"
                    ? "Semua Prioritas"
                    : selectedPriority === TaskPriority.LOW
                    ? "Rendah"
                    : selectedPriority === TaskPriority.MEDIUM
                    ? "Sedang"
                    : selectedPriority === TaskPriority.HIGH
                    ? "Tinggi"
                    : "Mendesak"}
                </SelectValue>
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
          </div>

          {/* Urutkan */}
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground font-medium">Urutkan</Label>
            <Select
              value={selectedSort}
              onValueChange={(val) => { if (val) updateQuery("sort", val); }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Urutkan">
                  {selectedSort === "deadline_asc"
                    ? "Tenggat Terdekat"
                    : selectedSort === "deadline_desc"
                    ? "Tenggat Terjauh"
                    : "Terbaru Dibuat"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deadline_asc" className="text-xs">
                  Tenggat Terdekat
                </SelectItem>
                <SelectItem value="deadline_desc" className="text-xs">
                  Tenggat Terjauh
                </SelectItem>
                <SelectItem value="created_desc" className="text-xs">
                  Terbaru Dibuat
                </SelectItem>
                <SelectItem value="priority_desc" className="text-xs">
                  Prioritas Tertinggi
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Task Table */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 text-[11px]">
              <TableHead className="w-[35%]">Tugas & Mata Kuliah</TableHead>
              <TableHead className="w-[12%]">Prioritas</TableHead>
              <TableHead className="w-[12%]">Status Saya</TableHead>
              <TableHead className="w-[21%]">Batas Waktu</TableHead>
              <TableHead className="w-[20%] text-right">Pengumpulan & Target</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">
                  Belum ada tugas yang cocok dengan filter atau pencarian.
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedTasks.map((task) => {
                const deadline = formatRelativeDeadline(task.deadline);
                const myProg = session.profile
                  ? task.progresses.find((p) => p.profileId === session.profile?.id)
                  : null;
                const personalStatus = myProg ? myProg.status : TaskStatus.TODO;

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
                            • Progress: {myProg.progress}%
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
                          statusColor[personalStatus]
                        }`}
                      >
                        {personalStatus}
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
                      <div className="flex items-center justify-end gap-2">
                        {task.submissionUrl && (
                          <a
                            href={task.submissionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded transition-colors"
                          >
                            <Send className="h-2.5 w-2.5" />
                            Kumpulkan
                          </a>
                        )}

                        {task.targetType === TaskTargetType.ALL ? (
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            Semua Kelas
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-normal border-dashed">
                            {task.assignments.length} Mhs
                          </Badge>
                        )}
                      </div>
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
        courses={courses}
        members={members}
      />
    </div>
  );
}
