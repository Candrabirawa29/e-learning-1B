"use client";

import * as React from "react";
import { CurrentUserSession } from "@/lib/auth/session";
import {
  calculateTaskProgressSummary,
  TaskDetailDataMinimal,
} from "@/lib/tasks/progress";
import { formatDateTimeIndo, formatRelativeDeadline } from "@/lib/date";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TaskStatus, TaskTargetType } from "@prisma/client";
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  MessageSquare,
  X,
  TrendingUp,
  AlertCircle,
  FileCheck2,
} from "lucide-react";

interface TaskMemberTrackerModalProps {
  task: TaskDetailDataMinimal | null;
  members: { id: string; name: string | null; email: string }[];
  session: CurrentUserSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskMemberTrackerModal({
  task,
  members,
  session,
  open,
  onOpenChange,
}: TaskMemberTrackerModalProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStatusTab, setSelectedStatusTab] = React.useState<"ALL" | TaskStatus>("ALL");

  // Reset filter ketika dialog dibuka dengan task baru
  React.useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSelectedStatusTab("ALL");
    }
  }, [open, task?.id]);

  if (!task) return null;

  const summary = calculateTaskProgressSummary(task, members);
  const deadlineInfo = formatRelativeDeadline(task.deadline);

  // Filter daftar mahasiswa berdasarkan tab dan query pencarian
  const filteredMembers = summary.memberProgresses.filter((m) => {
    if (selectedStatusTab !== "ALL" && m.status !== selectedStatusTab) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = m.name.toLowerCase().includes(q);
      const matchEmail = m.email.toLowerCase().includes(q);
      const matchNotes = m.notes?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchNotes) return false;
    }
    return true;
  });

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DONE:
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-semibold">
            DONE
          </Badge>
        );
      case TaskStatus.REVIEW:
        return (
          <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[10px] font-semibold">
            REVIEW
          </Badge>
        );
      case TaskStatus.IN_PROGRESS:
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-semibold">
            IN PROGRESS
          </Badge>
        );
      case TaskStatus.TODO:
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground text-[10px] font-semibold">
            TODO
          </Badge>
        );
    }
  };

  const getAvatarInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header Modal */}
        <div className="p-5 border-b space-y-2 bg-card">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono uppercase">
              {task.priority}
            </Badge>
            {task.course ? (
              <Badge variant="secondary" className="text-[10px] font-medium">
                {task.course.name}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">
                Umum
              </Badge>
            )}
            <Badge
              variant={task.targetType === TaskTargetType.ALL ? "default" : "secondary"}
              className="text-[10px]"
            >
              {task.targetType === TaskTargetType.ALL
                ? "Semua Anggota Kelas"
                : `${summary.totalRecipients} Mahasiswa Ditugaskan`}
            </Badge>
          </div>

          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary shrink-0" />
              <span>Pelacakan Progres: {task.title}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pantau kemajuan pengerjaan seluruh anggota kelas 1-B untuk tugas perkuliahan ini.
            </DialogDescription>
          </DialogHeader>

          {task.deadline && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>Tenggat: {formatDateTimeIndo(task.deadline)}</span>
              <span
                className={`text-[11px] font-medium ml-1 ${
                  deadlineInfo.isOverdue
                    ? "text-red-600 dark:text-red-400 font-semibold"
                    : deadlineInfo.isUrgent
                    ? "text-amber-600 dark:text-amber-400 font-semibold"
                    : ""
                }`}
              >
                ({deadlineInfo.text})
              </span>
            </div>
          )}
        </div>

        {/* Body Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-muted/30 border rounded-lg flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                <span>Total Target</span>
                <Users className="h-3.5 w-3.5" />
              </div>
              <div className="text-xl font-bold mt-1 text-foreground">
                {summary.totalRecipients}{" "}
                <span className="text-[11px] font-normal text-muted-foreground">Mhs</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-[11px] font-medium">
                <span>Selesai (DONE)</span>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <div className="text-xl font-bold mt-1 text-emerald-700 dark:text-emerald-300">
                {summary.doneCount}{" "}
                <span className="text-xs font-normal opacity-80">
                  ({summary.completionPercentage}%)
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex flex-col justify-between">
              <div className="flex items-center justify-between text-blue-700 dark:text-blue-300 text-[11px] font-medium">
                <span>In Progress</span>
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
              <div className="text-xl font-bold mt-1 text-blue-700 dark:text-blue-300">
                {summary.inProgressCount}{" "}
                <span className="text-xs font-normal opacity-80">
                  (
                  {summary.totalRecipients > 0
                    ? Math.round((summary.inProgressCount / summary.totalRecipients) * 100)
                    : 0}
                  %)
                </span>
              </div>
            </div>

            <div className="p-3 bg-zinc-500/10 border border-zinc-500/20 rounded-lg flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground text-[11px] font-medium">
                <span>Belum Mulai</span>
                <Clock className="h-3.5 w-3.5" />
              </div>
              <div className="text-xl font-bold mt-1 text-foreground">
                {summary.todoCount}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (
                  {summary.totalRecipients > 0
                    ? Math.round((summary.todoCount / summary.totalRecipients) * 100)
                    : 0}
                  %)
                </span>
              </div>
            </div>
          </div>

          {/* Segmented Stacked Visual Bar */}
          <div className="space-y-1.5 p-3.5 bg-card border rounded-lg">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <FileCheck2 className="h-3.5 w-3.5 text-primary" />
                Distribusi Status Pengerjaan Kelas
              </span>
              <span className="font-bold text-primary">{summary.completionPercentage}% Selesai</span>
            </div>

            {/* Custom Segmented Bar */}
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
              {summary.doneCount > 0 && (
                <div
                  style={{
                    width: `${(summary.doneCount / summary.totalRecipients) * 100}%`,
                  }}
                  className="bg-emerald-500 h-full transition-all"
                  title={`DONE: ${summary.doneCount}`}
                />
              )}
              {summary.reviewCount > 0 && (
                <div
                  style={{
                    width: `${(summary.reviewCount / summary.totalRecipients) * 100}%`,
                  }}
                  className="bg-purple-500 h-full transition-all"
                  title={`REVIEW: ${summary.reviewCount}`}
                />
              )}
              {summary.inProgressCount > 0 && (
                <div
                  style={{
                    width: `${(summary.inProgressCount / summary.totalRecipients) * 100}%`,
                  }}
                  className="bg-blue-500 h-full transition-all"
                  title={`IN PROGRESS: ${summary.inProgressCount}`}
                />
              )}
              {summary.todoCount > 0 && (
                <div
                  style={{
                    width: `${(summary.todoCount / summary.totalRecipients) * 100}%`,
                  }}
                  className="bg-zinc-300 dark:bg-zinc-700 h-full transition-all"
                  title={`TODO: ${summary.todoCount}`}
                />
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-1">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Done ({summary.doneCount})
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-purple-500" />
                Review ({summary.reviewCount})
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                In Progress ({summary.inProgressCount})
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                Todo ({summary.todoCount})
              </span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              {/* Tab Filter Status */}
              <div className="flex flex-wrap items-center gap-1 p-0.5 bg-muted rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedStatusTab("ALL")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    selectedStatusTab === "ALL"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Semua ({summary.totalRecipients})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatusTab(TaskStatus.DONE)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    selectedStatusTab === TaskStatus.DONE
                      ? "bg-emerald-500 text-white shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Selesai ({summary.doneCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatusTab(TaskStatus.IN_PROGRESS)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    selectedStatusTab === TaskStatus.IN_PROGRESS
                      ? "bg-blue-500 text-white shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  In Progress ({summary.inProgressCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatusTab(TaskStatus.REVIEW)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    selectedStatusTab === TaskStatus.REVIEW
                      ? "bg-purple-500 text-white shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Review ({summary.reviewCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatusTab(TaskStatus.TODO)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    selectedStatusTab === TaskStatus.TODO
                      ? "bg-zinc-600 text-white shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Belum ({summary.todoCount})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Cari nama mahasiswa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs h-8 pl-8 pr-7"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Member List Roster */}
            <div className="border rounded-lg bg-card overflow-hidden divide-y divide-border">
              {filteredMembers.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
                  <AlertCircle className="h-6 w-6 text-muted-foreground/60 mx-auto" />
                  <p className="font-medium text-foreground">Tidak ada mahasiswa yang cocok</p>
                  <p className="text-[11px]">
                    Coba sesuaikan pencarian atau pilihan tab status di atas.
                  </p>
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const isCurrentUser = session.profile?.id === member.profileId;

                  return (
                    <div
                      key={member.profileId}
                      className={`p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors ${
                        isCurrentUser ? "bg-primary/5 font-medium" : ""
                      }`}
                    >
                      {/* Info Mahasiswa */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            member.status === TaskStatus.DONE
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : member.status === TaskStatus.IN_PROGRESS
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : member.status === TaskStatus.REVIEW
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {getAvatarInitials(member.name)}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-foreground truncate">
                              {member.name}
                            </span>
                            {isCurrentUser && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] py-0 h-4 bg-primary/10 text-primary border-primary/20 font-bold"
                              >
                                Anda
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {member.email}
                          </div>

                          {/* Catatan / Notes pengerjaan jika ada */}
                          {member.notes && (
                            <div className="flex items-start gap-1 text-[11px] text-muted-foreground italic pt-0.5">
                              <MessageSquare className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                              <span className="line-clamp-2">&quot;{member.notes}&quot;</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status & Mini Progress Bar */}
                      <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                        <div className="w-24 sm:w-28 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground">Progres</span>
                            <span className="font-bold text-foreground">{member.progress}%</span>
                          </div>
                          <Progress value={member.progress} className="h-1.5" />
                        </div>

                        <div className="w-24 text-right">{getStatusBadge(member.status)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="p-3 border-t bg-muted/20 flex items-center justify-between text-xs">
          <span className="text-muted-foreground text-[11px]">
            Menampilkan {filteredMembers.length} dari {summary.totalRecipients} mahasiswa
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-7"
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
