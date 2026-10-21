"use client";

import * as React from "react";
import {
  getFocusHistoryAction,
  updateFocusSessionHistoryAction,
  deleteFocusSessionAction,
} from "@/actions/focus";
import { formatWib } from "@/lib/datetime";
import { FocusMode, FocusSessionStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  History,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { getFocusClock } from "@/lib/focus/session-logic";
import { useOptionalFocusTimer } from "./FocusTimerContext";

function formatDuration(sec: number): string {
  if (sec <= 0) return "0 detik";
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  if (hours > 0) {
    return `${hours}j ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds} detik`;
}

interface FocusHistoryItem {
  id: string;
  mode: FocusMode;
  plannedSec: number;
  startedAt: string;
  lastResumedAt: string | null;
  accumulatedSec: number;
  lastSeenAt: string | null;
  isCorrected?: boolean;
  endedAt: string | null;
  status: FocusSessionStatus;
  note: string | null;
  courseId: string | null;
  taskId: string | null;
  course?: { id: string; name: string; code: string | null } | null;
  task?: { id: string; title: string } | null;
}


interface CourseOption {
  id: string;
  name: string;
  code?: string | null;
}

interface TaskOption {
  id: string;
  title: string;
  courseId: string | null;
}

interface FocusHistoryTableProps {
  courses: CourseOption[];
  tasks?: TaskOption[];
}

export function FocusHistoryTable({ courses, tasks = [] }: FocusHistoryTableProps) {
  const optionalTimer = useOptionalFocusTimer();
  const activeSession = optionalTimer?.activeSession ?? null;

  const [items, setItems] = React.useState<FocusHistoryItem[]>([]);
  const [page, setPage] = React.useState<number>(1);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [totalCount, setTotalCount] = React.useState<number>(0);
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [courseFilter, setCourseFilter] = React.useState<string>("ALL");
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [nowMs, setNowMs] = React.useState<number>(0);

  // Live timer interval ticker for RUNNING rows
  React.useEffect(() => {
    setNowMs(Date.now());
    const hasRunning =
      activeSession?.status === FocusSessionStatus.RUNNING ||
      items.some((i) => i.status === FocusSessionStatus.RUNNING);
    if (!hasRunning) return;

    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [items, activeSession?.status]);

  // Edit dialog state
  const [editingItem, setEditingItem] = React.useState<FocusHistoryItem | null>(null);
  const [editCourseId, setEditCourseId] = React.useState<string>("NONE");
  const [editTaskId, setEditTaskId] = React.useState<string>("NONE");
  const [editNote, setEditNote] = React.useState<string>("");
  const [editMinutes, setEditMinutes] = React.useState<string>("");
  const [isSaving, setIsSaving] = React.useState<boolean>(false);

  const fetchHistory = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getFocusHistoryAction({
        page,
        pageSize: 10,
        status: statusFilter === "ALL" ? undefined : (statusFilter as FocusSessionStatus),
        courseId: courseFilter === "ALL" ? undefined : courseFilter,
      });
      setItems(res.items);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat riwayat sesi fokus.");
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, courseFilter]);

  React.useEffect(() => {
    fetchHistory();
  }, [fetchHistory, activeSession?.id, activeSession?.status]);

  const handleOpenEdit = (item: FocusHistoryItem) => {
    setEditingItem(item);
    setEditCourseId(item.courseId || "NONE");
    setEditTaskId(item.taskId || "NONE");
    setEditNote(item.note || "");
    setEditMinutes(String(Math.floor(item.accumulatedSec / 60)));
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSaving(true);
    try {
      const courseIdVal = editCourseId === "NONE" ? null : editCourseId;
      const taskIdVal = editTaskId === "NONE" ? null : editTaskId;

      const payload: {
        courseId?: string | null;
        taskId?: string | null;
        note?: string | null;
        correctedSec?: number;
      } = {
        courseId: courseIdVal,
        taskId: taskIdVal,
        note: editNote.trim() || null,
      };

      const parsedMinutes = parseInt(editMinutes, 10);
      if (!isNaN(parsedMinutes)) {
        const parsedSec = parsedMinutes * 60;
        if (parsedSec < editingItem.accumulatedSec) {
          if (parsedSec < 60) {
            toast.error("Durasi minimal hasil koreksi adalah 1 menit.");
            setIsSaving(false);
            return;
          }
          payload.correctedSec = parsedSec;
        } else if (parsedSec > editingItem.accumulatedSec) {
          toast.error("Koreksi durasi hanya boleh mengurangi durasi yang ada.");
          setIsSaving(false);
          return;
        }
      }

      await updateFocusSessionHistoryAction(editingItem.id, payload);
      toast.success("Riwayat sesi berhasil diperbarui!");
      setEditingItem(null);
      fetchHistory();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui sesi");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFocusSessionAction(id);
      toast.success("Sesi berhasil dihapus dari riwayat");
      fetchHistory();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus sesi");
    }
  };

  const statusBadge = (status: FocusSessionStatus) => {
    switch (status) {
      case FocusSessionStatus.COMPLETED:
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300"
          >
            Target tercapai
          </Badge>
        );
      case FocusSessionStatus.STOPPED_EARLY:
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300"
          >
            Berhenti lebih awal
          </Badge>
        );
      case FocusSessionStatus.RUNNING:
        return (
          <Badge className="text-[10px] bg-blue-600 text-white animate-pulse">
            Sedang Berjalan
          </Badge>
        );
      case FocusSessionStatus.PAUSED:
        return (
          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-400">
            Dijeda
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 border rounded-xl">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-bold text-foreground">
            Riwayat Sesi Fokus ({totalCount})
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter: Base UI compliant with proper labels and placeholders */}
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              if (val) {
                setStatusFilter(val);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs w-[140px] cursor-pointer">
              <SelectValue placeholder="Semua status">
                {statusFilter === "ALL"
                  ? "Semua status"
                  : statusFilter === FocusSessionStatus.COMPLETED
                  ? "Target tercapai"
                  : statusFilter === FocusSessionStatus.STOPPED_EARLY
                  ? "Berhenti lebih awal"
                  : statusFilter}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                Semua status
              </SelectItem>
              <SelectItem value={FocusSessionStatus.COMPLETED} className="text-xs">
                Target tercapai
              </SelectItem>
              <SelectItem value={FocusSessionStatus.STOPPED_EARLY} className="text-xs">
                Berhenti lebih awal
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Course Filter: Base UI compliant with proper labels and placeholders */}
          <Select
            value={courseFilter}
            onValueChange={(val) => {
              if (val) {
                setCourseFilter(val);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs w-[160px] cursor-pointer">
              <SelectValue placeholder="Semua mata kuliah">
                {courseFilter === "ALL"
                  ? "Semua mata kuliah"
                  : courses.find((c) => c.id === courseFilter)?.name || "Semua mata kuliah"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                Semua mata kuliah
              </SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-xl bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 text-[11px]">
              <TableHead className="w-[26%]">Mata Kuliah / Tugas</TableHead>
              <TableHead className="w-[18%]">Waktu Mulai</TableHead>
              <TableHead className="w-[16%]">Durasi Fokus</TableHead>
              <TableHead className="w-[14%]">Status</TableHead>
              <TableHead className="w-[16%]">Catatan</TableHead>
              <TableHead className="w-[10%] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                  Memuat riwayat sesi...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                  Belum ada riwayat sesi fokus yang tercatat.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const isActiveRow = Boolean(activeSession && activeSession.id === item.id);
                const effectiveSession = isActiveRow ? activeSession! : item;
                const effectiveStatus = effectiveSession.status as FocusSessionStatus;
                const clock = getFocusClock(effectiveSession, nowMs > 0 ? nowMs : Date.now());

                return (
                  <TableRow key={item.id} className="text-xs hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-0.5">
                        <span className="truncate max-w-[200px] font-semibold text-foreground">
                          {item.course?.name || "Tanpa Mata Kuliah"}
                        </span>
                        {item.task && (
                          <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                            Tugas: {item.task.title}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {formatWib(item.startedAt, "datetime-short")}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span>{formatDuration(clock.focusSec)}</span>
                        {effectiveStatus === FocusSessionStatus.RUNNING && (
                          <span className="relative flex h-2 w-2" title="Sesi sedang berjalan">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                          </span>
                        )}
                        {item.isCorrected && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1 py-0 h-4 bg-muted text-muted-foreground font-sans font-normal"
                          >
                            dikoreksi
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>{statusBadge(effectiveStatus)}</TableCell>

                    <TableCell>
                      {item.note ? (
                        <span className="text-muted-foreground line-clamp-1 italic max-w-[140px]">
                          &quot;{item.note}&quot;
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 italic">-</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(item)}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Edit sesi atau koreksi durasi"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-rose-600 cursor-pointer"
                              title="Hapus sesi"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          }
                        />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus sesi fokus ini?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tindakan ini akan menghapus sesi fokus ini secara permanen dari riwayat Anda.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(item.id)}
                              className="bg-rose-600 hover:bg-rose-700 text-white"
                            >
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
          <span>
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 text-xs gap-1 cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Sebelumnya</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 text-xs gap-1 cursor-pointer"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Session Dialog */}
      <Dialog open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Edit Riwayat Sesi</DialogTitle>
            <DialogDescription className="text-xs">
              Ubah mata kuliah, tugas, catatan, atau lakukan koreksi durasi (hanya boleh mengurangi).
            </DialogDescription>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-3.5 py-2 text-xs">
              {/* Course Selection */}
              <div className="space-y-1">
                <Label htmlFor="edit-course" className="text-xs font-medium">
                  Mata Kuliah
                </Label>
                <Select value={editCourseId} onValueChange={(val) => setEditCourseId(val || "NONE")}>
                  <SelectTrigger id="edit-course" className="h-8 text-xs cursor-pointer">
                    <SelectValue placeholder="Pilih mata kuliah" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE" className="text-xs">
                      Tanpa Mata Kuliah
                    </SelectItem>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Task Selection */}
              <div className="space-y-1">
                <Label htmlFor="edit-task" className="text-xs font-medium">
                  Tugas Terkait
                </Label>
                <Select value={editTaskId} onValueChange={(val) => setEditTaskId(val || "NONE")}>
                  <SelectTrigger id="edit-task" className="h-8 text-xs cursor-pointer">
                    <SelectValue placeholder="Pilih tugas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE" className="text-xs">
                      Tanpa Tugas
                    </SelectItem>
                    {tasks.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Duration Correction */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-minutes" className="text-xs font-medium">
                    Koreksi Durasi (Menit)
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    Durasi saat ini: {Math.floor(editingItem.accumulatedSec / 60)} menit
                  </span>
                </div>
                <Input
                  id="edit-minutes"
                  type="number"
                  min="1"
                  max={Math.floor(editingItem.accumulatedSec / 60)}
                  value={editMinutes}
                  onChange={(e) => setEditMinutes(e.target.value)}
                  className="h-8 text-xs"
                />
                <span className="text-[10px] text-muted-foreground">
                  *Hanya boleh mengurangi durasi yang ada.
                </span>
              </div>

              {/* Note */}
              <div className="space-y-1">
                <Label htmlFor="edit-note" className="text-xs font-medium">
                  Catatan Sesi
                </Label>
                <Textarea
                  id="edit-note"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Tulis catatan sesi..."
                  className="text-xs min-h-[64px]"
                  maxLength={500}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingItem(null)}
                  disabled={isSaving}
                  className="h-8 text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="h-8 text-xs"
                >
                  {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
