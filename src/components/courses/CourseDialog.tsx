"use client";

import * as React from "react";
import { createCourseAction, updateCourseAction } from "@/actions/courses";
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
import { Loader2, Plus, Edit } from "lucide-react";
import { toast } from "sonner";

interface CourseData {
  id?: string;
  name: string;
  code?: string | null;
  description?: string | null;
  lecturer?: string | null;
}

interface CourseDialogProps {
  mode?: "create" | "edit";
  course?: CourseData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CourseDialog({
  mode = "create",
  course,
  open,
  onOpenChange,
  onSuccess,
}: CourseDialogProps) {
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [lecturer, setLecturer] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (mode === "edit" && course) {
        setName(course.name || "");
        setCode(course.code || "");
        setLecturer(course.lecturer || "");
        setDescription(course.description || "");
      } else {
        setName("");
        setCode("");
        setLecturer("");
        setDescription("");
      }
    }
  }, [open, mode, course]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama mata kuliah wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "edit" && course?.id) {
        await updateCourseAction(course.id, {
          name: name.trim(),
          code: code.trim() || null,
          lecturer: lecturer.trim() || null,
          description: description.trim() || null,
        });
        toast.success("Mata kuliah berhasil diperbarui!");
      } else {
        await createCourseAction({
          name: name.trim(),
          code: code.trim() || null,
          lecturer: lecturer.trim() || null,
          description: description.trim() || null,
        });
        toast.success("Mata kuliah baru berhasil ditambahkan!");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan data mata kuliah.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {mode === "edit" ? "Edit Data Mata Kuliah" : "Tambah Mata Kuliah Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {mode === "edit"
                ? "Perbarui informasi mata kuliah, kode, atau dosen pengampu."
                : "Tambahkan mata kuliah baru untuk kurikulum dan perkuliahan Kelas 1-B."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs py-1">
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Nama Mata Kuliah <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Contoh: Basis Data Lanjut"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Kode Kelas</Label>
                <Input
                  placeholder="Contoh: TIF204"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Dosen Pengampu</Label>
                <Input
                  placeholder="Contoh: Dr. Budi, M.Kom"
                  value={lecturer}
                  onChange={(e) => setLecturer(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Deskripsi Mata Kuliah (Opsional)</Label>
              <Textarea
                placeholder="Deskripsi singkat materi perkuliahan..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>
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
              ) : mode === "edit" ? (
                <>
                  <Edit className="h-3.5 w-3.5" />
                  Simpan Perubahan
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Matkul
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
