"use client";

import * as React from "react";
import { CurrentUserSession } from "@/lib/auth/session";
import { formatDateTimeIndo, formatRelativeDeadline } from "@/lib/date";
import { deleteAssignmentAction } from "@/actions/assignments";
import { SubmitAssignmentModal } from "./SubmitAssignmentModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileCheck2,
  Clock,
  Search,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Users,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export interface AssignmentItem {
  id: string;
  classId: string;
  courseId: string;
  title: string;
  description: string | null;
  deadline: Date | string;
  attachmentUrl: string | null;
  allowSubmissions: boolean;
  createdById: string;
  createdAt: Date | string;
  course: { id: string; name: string; code: string | null; lecturer: string | null };
  createdBy: { id: string; name: string | null; email: string };
  submissions: {
    id: string;
    profileId: string;
    fileName: string | null;
    storagePath: string | null;
    linkUrl: string | null;
    notes: string | null;
    submittedAt: Date | string;
    grade: string | null;
    feedback: string | null;
    profile: { id: string; name: string | null; email: string };
  }[];
}

interface AssignmentListProps {
  assignments: AssignmentItem[];
  courses: { id: string; name: string }[];
  session: CurrentUserSession;
}

export function AssignmentList({ assignments, courses, session }: AssignmentListProps) {
  const [search, setSearch] = React.useState("");
  const [selectedCourse, setSelectedCourse] = React.useState<string>("all");
  const [selectedAssignment, setSelectedAssignment] = React.useState<AssignmentItem | null>(null);
  const [submitModalOpen, setSubmitModalOpen] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const filteredAssignments = React.useMemo(() => {
    return assignments.filter((a) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchTitle = a.title.toLowerCase().includes(query);
        const matchDesc = a.description?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc) return false;
      }
      if (selectedCourse !== "all" && a.courseId !== selectedCourse) return false;
      return true;
    });
  }, [assignments, search, selectedCourse]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Hapus penugasan "${title}" beserta seluruh pengumpulannya?`)) return;
    setDeletingId(id);
    try {
      await deleteAssignmentAction(id);
      toast.success("Penugasan berhasil dihapus.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus penugasan");
    } finally {
      setDeletingId(null);
    }
  };

  const isGuest = session.effectiveRole === "GUEST" || !session.user;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-card p-3 border rounded-lg">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari penugasan kelas atau praktikum..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        <Select value={selectedCourse} onValueChange={(val) => { if (val) setSelectedCourse(val); }}>
          <SelectTrigger className="h-8 text-xs w-[180px]">
            <SelectValue placeholder="Semua Mata Kuliah" />
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

      {/* Cards List */}
      <div className="space-y-3">
        {filteredAssignments.length === 0 ? (
          <div className="p-8 text-center border rounded-lg bg-card text-muted-foreground text-xs">
            Belum ada penugasan kelas yang sesuai dengan filter atau pencarian.
          </div>
        ) : (
          filteredAssignments.map((asg) => {
            const deadline = formatRelativeDeadline(asg.deadline);
            const mySubmission = session.profile
              ? asg.submissions.find((s) => s.profileId === session.profile?.id)
              : null;

            const isLate = mySubmission
              ? new Date(mySubmission.submittedAt) > new Date(asg.deadline)
              : false;

            const canManage =
              !session.isViewAs &&
              (session.realRole === "ADMIN" ||
                (session.realRole === "PJ" && session.user?.id === asg.createdById));

            return (
              <Card key={asg.id} className="bg-card hover:border-foreground/30 transition-colors">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2.5 bg-muted rounded-md shrink-0">
                      <FileCheck2 className="h-5 w-5 text-primary shrink-0" />
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-sm text-foreground leading-snug">
                          {asg.title}
                        </span>
                        <Badge variant="secondary" className="text-[10px] font-normal py-0 h-4">
                          {asg.course.name}
                        </Badge>
                      </div>

                      {asg.description && (
                        <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed whitespace-pre-line">
                          {asg.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Deadline: {formatDateTimeIndo(asg.deadline)}
                        </span>
                        <span
                          className={`font-medium ${
                            deadline.isOverdue
                              ? "text-red-600 dark:text-red-400 font-semibold"
                              : deadline.isUrgent
                              ? "text-amber-600 dark:text-amber-400 font-semibold"
                              : "text-muted-foreground"
                          }`}
                        >
                          ({deadline.text})
                        </span>

                        {(session.realRole === "ADMIN" || session.realRole === "PJ") && (
                          <span className="flex items-center gap-1 font-medium text-foreground">
                            <Users className="h-3 w-3" />
                            {asg.submissions.length} mahasiswa mengumpulkan
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
                    {/* Submission status for Member */}
                    {!isGuest && (
                      <div className="mr-1">
                        {mySubmission ? (
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-semibold gap-1 ${
                              isLate
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                            }`}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {isLate ? "Terkumpul (Terlambat)" : "Terkumpul"}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-semibold gap-1 ${
                              deadline.isOverdue
                                ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300"
                                : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            <AlertCircle className="h-3 w-3" />
                            {deadline.isOverdue ? "Terlambat Belum Dikumpulkan" : "Belum Dikumpulkan"}
                          </Badge>
                        )}
                      </div>
                    )}

                    {!isGuest && asg.allowSubmissions && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedAssignment(asg);
                          setSubmitModalOpen(true);
                        }}
                        disabled={session.isViewAs}
                        className="h-8 text-xs font-medium"
                      >
                        {mySubmission ? "Edit Pengumpulan" : "Kumpulkan Tugas"}
                      </Button>
                    )}

                    {canManage && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(asg.id, asg.title)}
                        disabled={deletingId === asg.id}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        {deletingId === asg.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        <span className="sr-only">Hapus penugasan</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Submission Modal */}
      {selectedAssignment && (
        <SubmitAssignmentModal
          assignment={selectedAssignment}
          existingSubmission={
            session.profile
              ? selectedAssignment.submissions.find((s) => s.profileId === session.profile?.id)
              : null
          }
          open={submitModalOpen}
          onOpenChange={setSubmitModalOpen}
        />
      )}
    </div>
  );
}
