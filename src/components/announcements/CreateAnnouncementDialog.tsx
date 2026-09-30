"use client";

import * as React from "react";
import { createAnnouncementAction } from "@/actions/announcements";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Megaphone, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CreateAnnouncementDialogProps {
  triggerButton?: React.ReactNode;
}

export function CreateAnnouncementDialog({ triggerButton }: CreateAnnouncementDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [isPinned, setIsPinned] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Judul dan isi pengumuman wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createAnnouncementAction({
        title: title.trim(),
        content: content.trim(),
        isPinned,
      });

      toast.success("Pengumuman berhasil dipublikasikan!");
      setOpen(false);
      setTitle("");
      setContent("");
      setIsPinned(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat pengumuman");
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
              <Megaphone className="h-3.5 w-3.5" />
              Buat Pengumuman
            </Button>
          )
        }
      />
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Buat Pengumuman Kelas</DialogTitle>
          <DialogDescription className="text-xs">
            Pengumuman ini dapat dibaca oleh seluruh mahasiswa kelas 1-B dan tamu publik.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2 text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="ann-title" className="text-xs font-medium">
              Judul Pengumuman <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ann-title"
              placeholder="Contoh: Perubahan Jadwal Kuliah Pemrograman Web"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ann-content" className="text-xs font-medium">
              Isi Pengumuman <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="ann-content"
              placeholder="Tuliskan isi pengumuman secara jelas..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="text-xs resize-none"
              required
            />
          </div>

          <div className="flex items-center space-x-2 pt-2 border-t">
            <Checkbox
              id="ann-pin"
              checked={isPinned}
              onCheckedChange={(checked) => setIsPinned(!!checked)}
            />
            <Label htmlFor="ann-pin" className="text-xs font-normal cursor-pointer">
              Sematkan pengumuman ini di bagian paling atas (Pin)
            </Label>
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
              {isSubmitting ? "Mempublikasikan..." : "Publikasikan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
