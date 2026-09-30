"use client";

import * as React from "react";
import { submitAssignmentAction } from "@/actions/assignments";
import { formatDateTimeIndo } from "@/lib/date";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileUp, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface SubmitAssignmentModalProps {
  assignment: {
    id: string;
    title: string;
    deadline: Date | string;
    course: { name: string };
  } | null;
  existingSubmission?: {
    id: string;
    submittedAt: Date | string;
    fileName: string | null;
    linkUrl: string | null;
    notes: string | null;
    grade: string | null;
    feedback: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmitAssignmentModal({
  assignment,
  existingSubmission,
  open,
  onOpenChange,
}: SubmitAssignmentModalProps) {
  if (!assignment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <SubmitAssignmentContent
          key={assignment.id}
          assignment={assignment}
          existingSubmission={existingSubmission}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}

function SubmitAssignmentContent({
  assignment,
  existingSubmission,
  onOpenChange,
}: {
  assignment: {
    id: string;
    title: string;
    deadline: Date | string;
    course: { name: string };
  };
  existingSubmission?: {
    id: string;
    submittedAt: Date | string;
    fileName: string | null;
    linkUrl: string | null;
    notes: string | null;
    grade: string | null;
    feedback: string | null;
  } | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState(existingSubmission?.linkUrl || "");
  const [notes, setNotes] = React.useState(existingSubmission?.notes || "");
  const [file, setFile] = React.useState<File | null>(null);

  const isLate = existingSubmission
    ? new Date(existingSubmission.submittedAt) > new Date(assignment.deadline)
    : new Date() > new Date(assignment.deadline);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !linkUrl.trim()) {
      toast.error("Harap unggah berkas tugas atau sertakan tautan pengerjaan.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (linkUrl.trim()) formData.set("linkUrl", linkUrl.trim());
      if (notes.trim()) formData.set("notes", notes.trim());
      if (file) formData.set("file", file);

      await submitAssignmentAction(assignment.id, formData);
      toast.success("Tugas Anda berhasil dikumpulkan!");
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal mengumpulkan tugas");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DialogHeader className="space-y-1.5">
        <Badge variant="secondary" className="w-fit text-[10px]">
          {assignment.course.name}
        </Badge>
        <DialogTitle className="text-base font-semibold leading-snug">
          {assignment.title}
        </DialogTitle>
        <DialogDescription className="text-xs">
          Batas Pengumpulan: {formatDateTimeIndo(assignment.deadline)}
        </DialogDescription>
      </DialogHeader>

      {existingSubmission && (
        <div className="p-3 border rounded-md bg-muted/30 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Sudah Dikumpulkan
            </span>
            <span className="text-[11px] text-muted-foreground">
              {formatDateTimeIndo(existingSubmission.submittedAt)}
            </span>
          </div>

          {isLate && (
            <Badge variant="outline" className="text-[10px] text-red-600 border-red-300">
              Pengumpulan Terlambat (Melewati Deadline)
            </Badge>
          )}

          {existingSubmission.fileName && (
            <div className="text-[11px] text-muted-foreground">
              Berkas Terkumpul: <span className="font-medium text-foreground">{existingSubmission.fileName}</span>
            </div>
          )}

          {existingSubmission.grade && (
            <div className="pt-2 border-t flex items-center justify-between">
              <span className="font-semibold text-xs">Nilai: {existingSubmission.grade}</span>
              {existingSubmission.feedback && (
                <span className="text-muted-foreground text-[11px] italic">
                  &ldquo;{existingSubmission.feedback}&rdquo;
                </span>
              )}
            </div>
          )}
        </div>
      )}

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2 text-xs">
          <div className="space-y-1.5 p-3 border rounded-md bg-muted/20">
            <Label htmlFor="sub-file" className="text-xs font-medium flex items-center gap-1.5">
              <FileUp className="h-3.5 w-3.5" />
              Unggah File Laporan / Kode (PDF, ZIP, DOCX, maks. 10 MB)
            </Label>
            <Input
              id="sub-file"
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-xs h-9 cursor-pointer file:cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sub-link" className="text-xs font-medium">
              Tautan Pengerjaan (GitHub / Google Drive / Figma / dsb.)
            </Label>
            <Input
              id="sub-link"
              type="url"
              placeholder="https://github.com/..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sub-notes" className="text-xs font-medium">
              Catatan untuk Dosen / PJ (Opsional)
            </Label>
            <Textarea
              id="sub-notes"
              placeholder="Tambahkan catatan khusus terkait pengerjaan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs h-8"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs h-8 gap-1.5"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {existingSubmission ? "Perbarui Pengumpulan" : "Kirim Pengumpulan"}
            </Button>
          </DialogFooter>
        </form>
    </>
  );
}
