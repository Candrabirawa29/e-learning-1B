"use client";

import * as React from "react";
import { assignCoursePJAction } from "@/actions/courses";
import { MemberOption, MemberSelector } from "@/components/tasks/MemberSelector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface CoursePJDialogProps {
  course: {
    id: string;
    name: string;
    pjs?: { userId: string }[];
  } | null;
  members: MemberOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CoursePJDialog({
  course,
  members,
  open,
  onOpenChange,
  onSuccess,
}: CoursePJDialogProps) {
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open && course) {
      const currentPjIds = course.pjs?.map((p) => p.userId) || [];
      setSelectedUserIds(currentPjIds);
    }
  }, [open, course]);

  if (!course) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await assignCoursePJAction(course.id, selectedUserIds);
      toast.success(`Penanggung Jawab (PJ) untuk ${course.name} berhasil diperbarui!`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menetapkan PJ mata kuliah.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Tetapkan Penanggung Jawab (PJ) Mata Kuliah
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pilih mahasiswa yang bertanggung jawab mengelola materi, sub-topik, dan tugas untuk mata kuliah{" "}
              <strong>{course.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-1">
            <MemberSelector
              members={members}
              selectedIds={selectedUserIds}
              onChange={setSelectedUserIds}
              label="Pilih Mahasiswa Penanggung Jawab (PJ):"
            />
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs h-8 gap-1.5 font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <UserCheck className="h-3.5 w-3.5" />
                  Simpan PJ
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
