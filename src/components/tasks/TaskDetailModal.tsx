"use client";

import * as React from "react";
import { updateTaskProgressAction, deleteTaskAction } from "@/actions/tasks";
import { CurrentUserSession } from "@/lib/auth/session";
import { canEditTask, canDeleteTask } from "@/lib/auth/rbac";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Edit,
  Send,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { TaskFormDialog } from "./TaskFormDialog";
import { TaskMemberTrackerModal } from "./TaskMemberTrackerModal";
import { calculateTaskProgressSummary } from "@/lib/tasks/progress";

export interface TaskDetailData {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: Date | string | null;
  targetType: TaskTargetType;
  attachmentUrl: string | null;
  submissionUrl?: string | null;
  courseId?: string | null;
  createdById: string;
  course: { id: string; name: string; code: string | null } | null;
  createdBy: { id: string; name: string | null; email: string };
  assignments: { profile: { id: string; name: string | null; email: string } }[];
  progresses: {
    profileId: string;
    status: TaskStatus;
    progress: number;
    notes: string | null;
    updatedAt?: Date | string | null;
    profile?: { name: string | null; email: string };
  }[];
}

interface TaskDetailModalProps {
  task: TaskDetailData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: CurrentUserSession;
  courses?: { id: string; name: string; code?: string | null }[];
  members?: { id: string; name: string | null; email: string }[];
}

export function TaskDetailModal({
  task,
  open,
  onOpenChange,
  session,
  courses = [],
  members = [],
}: TaskDetailModalProps) {
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <TaskDetailContent
          key={task.id}
          task={task}
          onOpenChange={onOpenChange}
          session={session}
          courses={courses}
          members={members}
        />
      </DialogContent>
    </Dialog>
  );
}

function TaskDetailContent({
  task,
  onOpenChange,
  session,
  courses,
  members,
}: {
  task: TaskDetailData;
  onOpenChange: (open: boolean) => void;
  session: CurrentUserSession;
  courses: { id: string; name: string; code?: string | null }[];
  members: { id: string; name: string | null; email: string }[];
}) {
  const [isUpdatingProgress, setIsUpdatingProgress] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [trackerOpen, setTrackerOpen] = React.useState(false);

  // Ambil personal progress user saat ini
  const myProgressRecord = React.useMemo(() => {
    if (!session.profile) return null;
    return task.progresses.find((p) => p.profileId === session.profile?.id);
  }, [task, session.profile]);

  const [myStatus, setMyStatus] = React.useState<TaskStatus>(
    myProgressRecord ? myProgressRecord.status : TaskStatus.TODO
  );
  const [myProgressVal, setMyProgressVal] = React.useState<number>(
    myProgressRecord
      ? myProgressRecord.progress
      : 0
  );

  const deadlineInfo = formatRelativeDeadline(task.deadline);
  const isGuest = session.effectiveRole === "GUEST" || !session.user;

  // Izin kelola tugas (Edit & Hapus) untuk Member, PJ, dan Admin
  const canManage = canEditTask(task, session);
  const canDelete = canDeleteTask(task, session);

  // Seluruh anggota kelas (bukan Guest) dapat melihat mahasiswa yang ditugaskan
  const canSeeSpecificRecipientNames = !isGuest;

  // Ringkasan progres seluruh anggota kelas untuk tugas ini
  const summary = calculateTaskProgressSummary(task, members);

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
        {/* Tombol Kumpulkan Tugas jika submissionUrl tersedia */}
        {task.submissionUrl && (
          <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-xs text-foreground block">
                Formulir Pengumpulan Tugas Aktif
              </span>
              <span className="text-[11px] text-muted-foreground">
                Kumpulkan hasil pengerjaan Anda melalui tautan resmi berikut.
              </span>
            </div>
            <a
              href={task.submissionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground font-medium text-xs rounded-md hover:bg-primary/90 transition-colors shadow-sm shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              Kumpulkan Tugas
            </a>
          </div>
        )}

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
                  ? "Seluruh Kelas 1-B"
                  : `Ditugaskan ke ${task.assignments.length} mahasiswa`}
              </span>
              {task.targetType === TaskTargetType.SPECIFIC && canSeeSpecificRecipientNames && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {task.assignments.map((a) => (
                    <Badge key={a.profile.id} variant="secondary" className="text-[10px] py-0">
                      {a.profile.name || a.profile.email.split("@")[0]}
                    </Badge>
                  ))}
                </div>
              )}
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

        {/* Section: Personal Progress (untuk Member/User yang Login) */}
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
                  else if (val > 0 && myStatus === TaskStatus.TODO)
                    setMyStatus(TaskStatus.IN_PROGRESS);
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

        {/* Section: Aggregate Stats untuk Seluruh Kelas */}
        {!isGuest && (
          <div className="p-3.5 border rounded-lg bg-card space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold flex items-center gap-1.5 text-foreground">
                <Users className="h-4 w-4 text-primary" />
                Ringkasan Pengerjaan Kelas ({summary.totalRecipients} Mahasiswa)
              </span>
              <span className="font-bold text-primary">{summary.completionPercentage}% Selesai</span>
            </div>

            {/* Segmented bar */}
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
              {summary.doneCount > 0 && (
                <div
                  style={{ width: `${(summary.doneCount / summary.totalRecipients) * 100}%` }}
                  className="bg-emerald-500 h-full"
                />
              )}
              {summary.reviewCount > 0 && (
                <div
                  style={{ width: `${(summary.reviewCount / summary.totalRecipients) * 100}%` }}
                  className="bg-purple-500 h-full"
                />
              )}
              {summary.inProgressCount > 0 && (
                <div
                  style={{ width: `${(summary.inProgressCount / summary.totalRecipients) * 100}%` }}
                  className="bg-blue-500 h-full"
                />
              )}
              {summary.todoCount > 0 && (
                <div
                  style={{ width: `${(summary.todoCount / summary.totalRecipients) * 100}%` }}
                  className="bg-zinc-300 dark:bg-zinc-700 h-full"
                />
              )}
            </div>

            <div className="grid grid-cols-4 gap-2 text-center pt-1">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded">
                <div className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                  {summary.doneCount}
                </div>
                <div className="text-[10px] text-muted-foreground">Selesai</div>
              </div>
              <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded">
                <div className="text-base font-bold text-blue-700 dark:text-blue-300">
                  {summary.inProgressCount}
                </div>
                <div className="text-[10px] text-muted-foreground">In Progress</div>
              </div>
              <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded">
                <div className="text-base font-bold text-purple-700 dark:text-purple-300">
                  {summary.reviewCount}
                </div>
                <div className="text-[10px] text-muted-foreground">Review</div>
              </div>
              <div className="p-2 bg-zinc-500/10 border border-zinc-500/20 rounded">
                <div className="text-base font-bold text-foreground">
                  {summary.todoCount}
                </div>
                <div className="text-[10px] text-muted-foreground">Belum Mulai</div>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTrackerOpen(true)}
              className="w-full h-8 text-xs gap-1.5 font-medium border-primary/20 hover:bg-primary/5 hover:text-primary"
            >
              <Users className="h-3.5 w-3.5 text-primary" />
              Lihat Roster & Status Progres Seluruh Anggota
            </Button>
          </div>
        )}
      </div>

      <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t">
        <div className="flex items-center gap-2">
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
              className="text-xs h-8 gap-1.5"
            >
              <Edit className="h-3.5 w-3.5" />
              Edit Tugas
            </Button>
          )}

          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isDeleting}
                    className="text-xs h-8 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 border-red-200 dark:border-red-900 gap-1.5"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Hapus
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                    Hapus Tugas Secara Permanen?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
                    Menghapus tugas <strong>&quot;{task.title}&quot;</strong> akan menghapus seluruh data
                    riwayat progres pengerjaan mahasiswa dan penugasan terkait secara permanen.
                    Tindakan ini tidak dapat dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="text-xs h-8">Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteTask}
                    className="text-xs h-8 bg-red-600 hover:bg-red-700 text-white"
                  >
                    Hapus Tugas
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
          className="text-xs h-8"
        >
          Tutup
        </Button>
      </DialogFooter>

      {/* Edit Form Dialog */}
      {canManage && (
        <TaskFormDialog
          mode="edit"
          task={task}
          courses={courses}
          members={members}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={() => {
            setEditDialogOpen(false);
            onOpenChange(false);
          }}
        />
      )}

      {/* Tracker Progres Anggota Kelas Modal */}
      <TaskMemberTrackerModal
        task={task}
        members={members}
        session={session}
        open={trackerOpen}
        onOpenChange={setTrackerOpen}
      />
    </>
  );
}
