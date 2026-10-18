"use client";

import * as React from "react";
import { getFocusHistoryAction, updateSessionNoteAction } from "@/actions/focus";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  History,
  ChevronLeft,
  ChevronRight,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";

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
  accumulatedSec: number;
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
}

interface FocusHistoryTableProps {
  courses: CourseOption[];
}

export function FocusHistoryTable({ courses }: FocusHistoryTableProps) {
  const [items, setItems] = React.useState<FocusHistoryItem[]>([]);
  const [page, setPage] = React.useState<number>(1);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [totalCount, setTotalCount] = React.useState<number>(0);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [courseFilter, setCourseFilter] = React.useState<string>("all");
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // Note edit dialog state
  const [editingSession, setEditingSession] = React.useState<FocusHistoryItem | null>(null);
  const [editNote, setEditNote] = React.useState<string>("");
  const [isSavingNote, setIsSavingNote] = React.useState<boolean>(false);

  const fetchHistory = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getFocusHistoryAction({
        page,
        pageSize: 10,
        status: statusFilter === "all" ? undefined : (statusFilter as FocusSessionStatus),
        courseId: courseFilter === "all" ? undefined : courseFilter,
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
  }, [fetchHistory]);

  const handleOpenEditNote = (item: FocusHistoryItem) => {
    setEditingSession(item);
    setEditNote(item.note || "");
  };

  const handleSaveNote = async () => {
    if (!editingSession) return;
    setIsSavingNote(true);
    try {
      await updateSessionNoteAction(editingSession.id, editNote);
      toast.success("Catatan berhasil diperbarui!");
      setEditingSession(null);
      fetchHistory();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui catatan");
    } finally {
      setIsSavingNote(false);
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
            Selesai Penuh
          </Badge>
        );
      case FocusSessionStatus.STOPPED_EARLY:
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300"
          >
            Selesai Awal
          </Badge>
        );
      case FocusSessionStatus.CANCELLED:
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
          >
            Dibatalkan
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
          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              if (val) {
                setStatusFilter(val);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs w-[130px]">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Semua Status</SelectItem>
              <SelectItem value={FocusSessionStatus.COMPLETED} className="text-xs">Selesai Penuh</SelectItem>
              <SelectItem value={FocusSessionStatus.STOPPED_EARLY} className="text-xs">Selesai Awal</SelectItem>
              <SelectItem value={FocusSessionStatus.CANCELLED} className="text-xs">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>

          {/* Course Filter */}
          <Select
            value={courseFilter}
            onValueChange={(val) => {
              if (val) {
                setCourseFilter(val);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs w-[150px]">
              <SelectValue placeholder="Semua Matkul" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Semua Mata Kuliah</SelectItem>
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
              <TableHead className="w-[28%]">Mata Kuliah / Tugas</TableHead>
              <TableHead className="w-[18%]">Waktu Mulai</TableHead>
              <TableHead className="w-[14%]">Durasi Fokus</TableHead>
              <TableHead className="w-[14%]">Status</TableHead>
              <TableHead className="w-[26%] text-right">Catatan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">
                  Memuat riwayat sesi...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">
                  Belum ada sesi fokus yang tercatat pada filter ini.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="text-xs">
                  <TableCell className="py-2.5">
                    <div className="font-semibold text-foreground">
                      {item.course?.name || "Umum / Mandiri"}
                    </div>
                    {item.task && (
                      <div className="text-[11px] text-muted-foreground line-clamp-1">
                        Tugas: {item.task.title}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[11px]">
                    {formatWib(item.startedAt, "datetime-short")}
                  </TableCell>
                  <TableCell className="font-mono font-medium">
                    {formatDuration(item.accumulatedSec)}
                  </TableCell>
                  <TableCell>{statusBadge(item.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-[11px] text-muted-foreground line-clamp-1 max-w-[160px] text-right italic">
                        {item.note || "—"}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditNote(item)}
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        title="Edit catatan"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 text-xs gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 text-xs gap-1"
            >
              Berikutnya
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      <Dialog open={Boolean(editingSession)} onOpenChange={(open) => !open && setEditingSession(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Edit Catatan Sesi Fokus
            </DialogTitle>
            <DialogDescription className="text-xs">
              Perbarui catatan untuk sesi pada {editingSession ? formatWib(editingSession.startedAt, "datetime-short") : ""}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between">
                <Label htmlFor="edit-note" className="text-xs">Catatan</Label>
                <span className="text-[10px] text-muted-foreground">{editNote.length}/500</span>
              </div>
              <Textarea
                id="edit-note"
                value={editNote}
                maxLength={500}
                onChange={(e) => setEditNote(e.target.value)}
                className="text-xs min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingSession(null)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSaveNote}
              disabled={isSavingNote}
              className="text-xs"
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
