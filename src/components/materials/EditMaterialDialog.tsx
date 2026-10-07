"use client";

import * as React from "react";
import { updateMaterialAction } from "@/actions/materials";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MaterialType, MaterialVisibility } from "@prisma/client";
import { Loader2, Edit3, Link2, BookOpen } from "lucide-react";
import { toast } from "sonner";
export interface EditMaterialTarget {
  id: string;
  courseId: string;
  topicId: string | null;
  title: string;
  description: string | null;
  materialType: MaterialType | string;
  externalUrl: string | null;
  visibility?: MaterialVisibility;
  course?: { name: string } | null;
}

interface EditMaterialDialogProps {
  material: EditMaterialTarget | null;
  topics?: { id: string; title: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditMaterialDialog({
  material,
  topics = [],
  open,
  onOpenChange,
  onSuccess,
}: EditMaterialDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [topicId, setTopicId] = React.useState<string>("none");
  const [materialType, setMaterialType] = React.useState<MaterialType>(MaterialType.PDF);
  const [externalUrl, setExternalUrl] = React.useState("");
  const [visibility, setVisibility] = React.useState<MaterialVisibility>(MaterialVisibility.PUBLIC);

  React.useEffect(() => {
    if (material && open) {
      setTitle(material.title || "");
      setDescription(material.description || "");
      setTopicId(material.topicId || "none");
      setMaterialType((material.materialType as MaterialType) || MaterialType.PDF);
      setExternalUrl(material.externalUrl || "");
      setVisibility(material.visibility || MaterialVisibility.PUBLIC);
    }
  }, [material, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!material) return;

    if (!title.trim()) {
      toast.error("Judul materi wajib diisi.");
      return;
    }

    if (materialType === MaterialType.LINK && !externalUrl.trim()) {
      toast.error("Tautan URL eksternal wajib diisi untuk tipe tautan web.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateMaterialAction(material.id, {
        title: title.trim(),
        description: description.trim() || null,
        topicId: topicId === "none" ? null : topicId,
        materialType,
        externalUrl: externalUrl.trim() || null,
        visibility,
      });

      toast.success("Materi berhasil diperbarui.");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui materi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!material) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-primary" />
              Edit Informasi Materi
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ubah judul, sub-topik penempatan, atau deskripsi materi perkuliahan
              {material.course?.name ? ` ${material.course.name}` : ""}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            {/* Judul */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Judul Materi *</Label>
              <Input
                placeholder="Contoh: Modul 01 - Pengantar Algoritma"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xs h-8"
                required
              />
            </div>

            {/* Sub-Topik */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Sub-Topik / Bab</Label>
              <Select
                value={topicId}
                onValueChange={(val) => {
                  if (val) setTopicId(val);
                }}
              >
                <SelectTrigger className="text-xs h-8">
                  <div className="flex items-center gap-1.5 truncate">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Pilih sub-topik" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">
                    Materi Umum (Tanpa Sub-Topik)
                  </SelectItem>
                  {topics.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipe Materi */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Tipe Materi</Label>
              <Select
                value={materialType}
                onValueChange={(val) => {
                  if (val) setMaterialType(val as MaterialType);
                }}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MaterialType.PDF} className="text-xs">
                    PDF (Dokumen / E-Book)
                  </SelectItem>
                  <SelectItem value={MaterialType.DOC} className="text-xs">
                    DOC / Word
                  </SelectItem>
                  <SelectItem value={MaterialType.PPT} className="text-xs">
                    PPT / Slide Presentasi
                  </SelectItem>
                  <SelectItem value={MaterialType.LINK} className="text-xs">
                    Tautan Web Eksternal
                  </SelectItem>
                  <SelectItem value={MaterialType.NOTES} className="text-xs">
                    Catatan / Teks
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* URL Eksternal jika tipe LINK atau punya externalUrl */}
            {(materialType === MaterialType.LINK || externalUrl) && (
              <div className="space-y-1">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  Tautan Eksternal URL
                </Label>
                <Input
                  type="url"
                  placeholder="https://drive.google.com/... atau https://youtube.com/..."
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            )}

            {/* Visibilitas */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Hak Akses Visibilitas</Label>
              <Select
                value={visibility}
                onValueChange={(val) => {
                  if (val) setVisibility(val as MaterialVisibility);
                }}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MaterialVisibility.PUBLIC} className="text-xs">
                    Publik (Dapat diakses oleh siapa saja & Tamu)
                  </SelectItem>
                  <SelectItem value={MaterialVisibility.AUTHENTICATED} className="text-xs">
                    Internal Kelas (Wajib Login)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Deskripsi */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Deskripsi / Catatan Tambahan</Label>
              <Textarea
                placeholder="Petunjuk atau deskripsi singkat berkas..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs min-h-[70px] resize-none"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs h-8 font-medium gap-1.5"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
