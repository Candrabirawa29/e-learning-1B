"use client";

import * as React from "react";
import { createAssignmentAction } from "@/actions/assignments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CreateAssignmentDialogProps {
  courses: { id: string; name: string }[];
  triggerButton?: React.ReactNode;
}

export function CreateAssignmentDialog({ courses, triggerButton }: CreateAssignmentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [courseId, setCourseId] = React.useState<string>(courses[0]?.id || "");
  const [deadline, setDeadline] = React.useState("");
  const [attachmentUrl, setAttachmentUrl] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !courseId || !deadline) {
      toast.error("Judul, mata kuliah, dan deadline wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("title", title.trim());
      if (description.trim()) formData.set("description", description.trim());
      formData.set("courseId", courseId);
      formData.set("deadline", deadline);
      if (attachmentUrl.trim()) formData.set("attachmentUrl", attachmentUrl.trim());

      await createAssignmentAction(formData);
      toast.success("Penugasan kelas berhasil dibuat!");
      setOpen(false);
      // Reset
      setTitle("");
      setDescription("");
      setDeadline("");
      setAttachmentUrl("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat penugasan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          triggerButton ? (
            (triggerButton as React.ReactElement)
          ) : (
            <Button size="sm" className="h-8 gap-1.5 text-xs font-medium">
              <Plus className="h-3.5 w-3.5" />
              Buat Penugasan
            </Button>
          )
        }
      />
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Buat Penugasan Baru</DialogTitle>
          <DialogDescription className="text-xs">
            Penugasan akademik resmi dengan fasilitas pengumpulan berkas bagi mahasiswa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2 text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="asg-title" className="text-xs font-medium">
              Judul Tugas / Praktikum <span className="text-red-500">*</span>
            </Label>
            <Input
              id="asg-title"
              placeholder="Contoh: Tugas Praktikum 2: Normalisasi Basis Data"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Mata Kuliah <span className="text-red-500">*</span></Label>
              <Select value={courseId} onValueChange={(val) => { if (val) setCourseId(val); }}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Pilih Matkul" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="asg-deadline" className="text-xs font-medium">
                Batas Pengumpulan (Deadline) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="asg-deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="asg-desc" className="text-xs font-medium">
              Deskripsi & Panduan Pengumpulan
            </Label>
            <Textarea
              id="asg-desc"
              placeholder="Instruksi format laporan, nama file, kriteria penilaian..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="asg-attach" className="text-xs font-medium">
              Tautan Dokumen Soal / Template (Opsional)
            </Label>
            <Input
              id="asg-attach"
              type="url"
              placeholder="https://..."
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
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
              {isSubmitting ? "Menyimpan..." : "Publikasikan Penugasan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
