"use client";

import * as React from "react";
import { updateTaskProgressAction, deleteTaskAction } from "@/actions/tasks";
import { CurrentUserSession } from "@/lib/auth/session";
import { formatDateTimeIndo, formatRelativeDeadline } from "@/lib/date";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { TaskPriority, TaskStatus, TaskTargetType } from "@prisma/client";
import {
  Clock,
  ExternalLink,
  Users,
  CheckCircle2,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export interface TaskDetailData {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: Date | string | null;
  targetType: TaskTargetType;
  attachmentUrl: string | null;
  createdById: string;
  course: { id: string; name: string; code: string | null } | null;
  createdBy: { id: string; name: string | null; email: string };
  assignments: { profile: { id: string; name: string | null; email: string } }[];
  progresses: {
    profileId: string;
    status: TaskStatus;
    progress: number;
    notes: string | null;
    profile?: { name: string | null; email: string };
  }[];
}

interface TaskDetailModalProps {
  task: TaskDetailData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: CurrentUserSession;
}

export function TaskDetailModal({ task, open, onOpenChange, session }: TaskDetailModalProps) {
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <TaskDetailContent key={task.id} task={task} onOpenChange={onOpenChange} session={session} />
      </DialogContent>
    </Dialog>
  );
}

function TaskDetailContent({
  task,
  onOpenChange,
  session,
}: {
  task: TaskDetailData;
  onOpenChange: (open: boolean) => void;
  session: CurrentUserSession;
}) {
  const [isUpdatingProgress, setIsUpdatingProgress] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Ambil personal progress user saat ini
  const myProgressRecord = React.useMemo(() => {
    if (!session.profile) return null;
    return task.progresses.find((p) => p.profileId === session.profile?.id);
  }, [task, session.profile]);

  const [myStatus, setMyStatus] = React.useState<TaskStatus>(
    myProgressRecord ? myProgressRecord.status : task.status
  );
  const [myProgressVal, setMyProgressVal] = React.useState<number>(
    myProgressRecord
      ? myProgressRecord.progress
      : task.status === TaskStatus.DONE
      ? 100
      : 0
  );

  const deadlineInfo = formatRelativeDeadline(task.deadline);
  const isGuest = session.effectiveRole === "GUEST" || !session.user;
  const canDelete =
    !session.isViewAs &&
    (session.realRole === "ADMIN" ||
      (session.realRole === "PJ" && session.user?.id === task.createdById));

  // Hitung aggregate statistik untuk PJ/Admin
  const totalSubmissions = task.progresses.length;
  const doneCount = task.progresses.filter((p) => p.status === TaskStatus.DONE).length;
  const inProgressCount = task.progresses.filter((p) => p.status === TaskStatus.IN_PROGRESS).length;
  const averageProgress =
    totalSubmissions > 0
      ? Math.round(task.progresses.reduce((acc, curr) => acc + curr.progress, 0) / totalSubmissions)
      : 0;

  const priorityColor = {
    LOW: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    MEDIUM: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    HIGH: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    URGENT: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  }[task.priority];

  const handleSaveProgress = async () => {
    if (isGuest) return;
    setIsUpdatingProgress(true);
    try {
      await updateTaskProgressAction(task.id, {
        status: myStatus,
        progress: myProgressVal,
      });
      toast.success("Progress tugas berhasil diperbarui!");
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui progress");
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus tugas ini?")) return;
    setIsDeleting(true);
    try {
      await deleteTaskAction(task.id);
      toast.success("Tugas berhasil dihapus.");
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus tugas");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DialogHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`text-[10px] font-semibold uppercase ${priorityColor}`}>
              {task.priority}
            </Badge>
            <Badge variant="outline" className="text-[10px] uppercase font-medium">
              {task.status}
            </Badge>
            {task.course && (
              <Badge variant="secondary" className="text-[10px] font-medium">
                {task.course.name}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-base font-semibold leading-snug">{task.title}</DialogTitle>
          <DialogDescription className="text-xs">
            Dibuat oleh {task.createdBy.name || task.createdBy.email.split("@")[0]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Deskripsi */}
          {task.description ? (
            <div className="p-3 bg-muted/40 rounded-md border text-foreground/90 whitespace-pre-line leading-relaxed">
              {task.description}
            </div>
          ) : (
            <div className="text-muted-foreground italic">Tidak ada deskripsi tambahan.</div>
          )}

          {/* Meta Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/20 border rounded-md">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground block text-[11px]">Batas Waktu:</span>
                <span className="font-medium">
                  {task.deadline ? formatDateTimeIndo(task.deadline) : "Tidak ada batas waktu"}
                </span>
                {task.deadline && (
                  <span
                    className={`block text-[10px] font-medium ${
                      deadlineInfo.isOverdue
                        ? "text-red-600 dark:text-red-400"
                        : deadlineInfo.isUrgent
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    ({deadlineInfo.text})
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground block text-[11px]">Target Tugas:</span>
                <span className="font-medium">
                  {task.targetType === TaskTargetType.ALL
                    ? "Semua Mahasiswa (Kelas 1-B)"
                    : `${task.assignments.length} Mahasiswa Terpilih`}
                </span>
              </div>
            </div>
          </div>

          {/* Lampiran URL jika ada */}
          {task.attachmentUrl && (
            <div className="flex items-center justify-between p-2.5 bg-muted/30 border rounded-md">
              <span className="text-muted-foreground text-xs">Tautan Referensi:</span>
              <a
                href={task.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium flex items-center gap-1 text-xs"
              >
                Buka Tautan <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* Section: Personal Progress (untuk Member yang Login) */}
          {!isGuest && (
            <div className="p-3.5 border rounded-md bg-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Status & Progress Saya
                </span>
                <span className="text-xs font-semibold">{myProgressVal}%</span>
              </div>

              <div className="space-y-1.5">
                <Progress value={myProgressVal} className="h-2" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={myProgressVal}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setMyProgressVal(val);
                    if (val === 100) setMyStatus(TaskStatus.DONE);
                    else if (val > 0 && myStatus === TaskStatus.TODO) setMyStatus(TaskStatus.IN_PROGRESS);
                  }}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Status:</Label>
                  <Select
                    value={myStatus}
                    onValueChange={(val) => {
                      const st = val as TaskStatus;
                      setMyStatus(st);
                      if (st === TaskStatus.DONE && myProgressVal < 100) setMyProgressVal(100);
                      if (st === TaskStatus.TODO && myProgressVal > 0) setMyProgressVal(0);
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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

                <Button
                  size="sm"
                  onClick={handleSaveProgress}
                  disabled={isUpdatingProgress || session.isViewAs}
                  className="h-7 text-xs font-medium"
                >
                  {isUpdatingProgress ? "Menyimpan..." : "Update Progress"}
                </Button>
              </div>
            </div>
          )}

          {/* Section: Aggregate Stats untuk PJ/Admin */}
          {(session.realRole === "ADMIN" || session.realRole === "PJ") && (
            <div className="p-3 border rounded-md bg-muted/10 space-y-2">
              <span className="font-semibold text-xs block text-muted-foreground">
                Ringkasan Pengerjaan Kelas (PJ / Admin View)
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-muted/40 rounded border">
                  <div className="text-lg font-bold">{doneCount}</div>
                  <div className="text-[10px] text-muted-foreground">Selesai</div>
                </div>
                <div className="p-2 bg-muted/40 rounded border">
                  <div className="text-lg font-bold">{inProgressCount}</div>
                  <div className="text-[10px] text-muted-foreground">Sedang Dikerjakan</div>
                </div>
                <div className="p-2 bg-muted/40 rounded border">
                  <div className="text-lg font-bold">{averageProgress}%</div>
                  <div className="text-[10px] text-muted-foreground">Rata-rata Progress</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t">
          {canDelete ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteTask}
              disabled={isDeleting}
              className="text-xs h-8 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 border-red-200 dark:border-red-900"
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
              Hapus Tugas
            </Button>
          ) : (
            <div />
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8"
          >
            Tutup
          </Button>
        </DialogFooter>
    </>
  );
}
