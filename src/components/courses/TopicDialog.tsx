"use client";

import * as React from "react";
import { createTopicAction, updateTopicAction } from "@/actions/courses";
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

interface TopicDialogProps {
  courseId: string;
  mode?: "create" | "edit";
  topic?: { id: string; title: string; description?: string | null } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TopicDialog({
  courseId,
  mode = "create",
  topic,
  open,
  onOpenChange,
  onSuccess,
}: TopicDialogProps) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (mode === "edit" && topic) {
        setTitle(topic.title || "");
        setDescription(topic.description || "");
      } else {
        setTitle("");
        setDescription("");
      }
    }
  }, [open, mode, topic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Judul sub-topik / bab wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "edit" && topic) {
        await updateTopicAction(topic.id, {
          title: title.trim(),
          description: description.trim() || null,
        });
        toast.success("Sub-topik berhasil diperbarui!");
      } else {
        await createTopicAction({
          courseId,
          title: title.trim(),
          description: description.trim() || null,
        });
        toast.success("Sub-topik baru berhasil ditambahkan!");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan sub-topik.");
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
              {mode === "edit" ? "Edit Sub-Topik / Bab" : "Tambah Sub-Topik Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Kelompokkan materi perkuliahan ke dalam bab atau topik pertemuan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs py-1">
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Judul Sub-Topik <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Contoh: Bab 2 - Dependency Injection & Singleton"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Keterangan Singkat (Opsional)</Label>
              <Textarea
                placeholder="Catatan mengenai silabus bab ini..."
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
                  Tambah Sub-Topik
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
