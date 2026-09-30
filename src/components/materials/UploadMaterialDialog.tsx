"use client";

import * as React from "react";
import { createMaterialAction } from "@/actions/materials";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MaterialType, MaterialVisibility } from "@prisma/client";
import { Upload, Loader2, FileUp } from "lucide-react";
import { toast } from "sonner";

interface CourseTopic {
  id: string;
  name: string;
  topics: { id: string; title: string }[];
}

interface UploadMaterialDialogProps {
  courses: CourseTopic[];
  triggerButton?: React.ReactNode;
}

export function UploadMaterialDialog({ courses, triggerButton }: UploadMaterialDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [courseId, setCourseId] = React.useState<string>(courses[0]?.id || "");
  const [topicId, setTopicId] = React.useState<string>("none");
  const [materialType, setMaterialType] = React.useState<MaterialType>(MaterialType.PDF);
  const [externalUrl, setExternalUrl] = React.useState("");
  const [visibility, setVisibility] = React.useState<MaterialVisibility>(MaterialVisibility.PUBLIC);
  const [file, setFile] = React.useState<File | null>(null);

  const availableTopics = React.useMemo(() => {
    const selected = courses.find((c) => c.id === courseId);
    return selected ? selected.topics : [];
  }, [courses, courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Judul materi wajib diisi.");
      return;
    }
    if (!courseId) {
      toast.error("Pilih mata kuliah terlebih dahulu.");
      return;
    }

    if (materialType === MaterialType.LINK && !externalUrl.trim()) {
      toast.error("Masukkan URL tautan materi.");
      return;
    }

    if (
      ([MaterialType.PDF, MaterialType.DOC, MaterialType.PPT] as MaterialType[]).includes(materialType) &&
      !file &&
      !externalUrl.trim()
    ) {
      toast.error("Harap pilih file dokumen untuk diunggah.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("title", title.trim());
      if (description.trim()) formData.set("description", description.trim());
      formData.set("courseId", courseId);
      if (topicId !== "none") formData.set("topicId", topicId);
      formData.set("materialType", materialType);
      if (externalUrl.trim()) formData.set("externalUrl", externalUrl.trim());
      formData.set("visibility", visibility);
      if (file) formData.set("file", file);

      await createMaterialAction(formData);
      toast.success("Materi berhasil ditambahkan!");
      setOpen(false);
      // Reset
      setTitle("");
      setDescription("");
      setFile(null);
      setExternalUrl("");
      setTopicId("none");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menambahkan materi");
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
              <Upload className="h-3.5 w-3.5" />
              Upload Materi
            </Button>
          )
        }
      />
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Unggah Materi Pembelajaran</DialogTitle>
          <DialogDescription className="text-xs">
            Materi yang diunggah akan otomatis dibagikan secara terpusat ke seluruh anggota kelas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2 text-xs">
          {/* Judul */}
          <div className="space-y-1.5">
            <Label htmlFor="mat-title" className="text-xs font-medium">
              Judul Materi <span className="text-red-500">*</span>
            </Label>
            <Input
              id="mat-title"
              placeholder="Contoh: Modul Pertemuan 4: Diagram Pohon & Relasi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          {/* Mata Kuliah & Topik */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Mata Kuliah</Label>
              <Select value={courseId} onValueChange={(val) => { if (val) { setCourseId(val); setTopicId("none"); } }}>
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
              <Label className="text-xs font-medium">Topik / Bab</Label>
              <Select value={topicId} onValueChange={(val) => { if (val) setTopicId(val); }}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Pilih Topik" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">-- Umum (Tanpa Topik) --</SelectItem>
                  {availableTopics.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Format / Tipe Materi */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Tipe Materi</Label>
            <Select value={materialType} onValueChange={(val) => { if (val) setMaterialType(val as MaterialType); }}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MaterialType.PDF} className="text-xs">Dokumen PDF (.pdf)</SelectItem>
                <SelectItem value={MaterialType.DOC} className="text-xs">Dokumen Word (.doc, .docx)</SelectItem>
                <SelectItem value={MaterialType.PPT} className="text-xs">Presentasi Slide (.ppt, .pptx)</SelectItem>
                <SelectItem value={MaterialType.LINK} className="text-xs">Tautan Eksternal / Referensi URL</SelectItem>
                <SelectItem value={MaterialType.NOTES} className="text-xs">Catatan Kuliah / Ringkasan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File Upload jika file */}
          {([MaterialType.PDF, MaterialType.DOC, MaterialType.PPT, MaterialType.NOTES] as MaterialType[]).includes(materialType) && (
            <div className="space-y-1.5 p-3 border rounded-md bg-muted/20">
              <Label htmlFor="file-input" className="text-xs font-medium flex items-center gap-1.5">
                <FileUp className="h-3.5 w-3.5" />
                Pilih Berkas Dokumen (Maks. 10 MB)
              </Label>
              <Input
                id="file-input"
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-xs h-9 cursor-pointer file:cursor-pointer"
              />
              <p className="text-[10px] text-muted-foreground">
                Format didukung: PDF, DOC, DOCX, PPT, PPTX, TXT.
              </p>
            </div>
          )}

          {/* URL eksternal */}
          {(materialType === MaterialType.LINK || !file) && (
            <div className="space-y-1.5">
              <Label htmlFor="ext-url" className="text-xs font-medium">
                Tautan URL Dokumen / Website (Opsional jika file diunggah)
              </Label>
              <Input
                id="ext-url"
                type="url"
                placeholder="https://..."
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          )}

          {/* Deskripsi */}
          <div className="space-y-1.5">
            <Label htmlFor="mat-desc" className="text-xs font-medium">Keterangan Tambahan</Label>
            <Textarea
              id="mat-desc"
              placeholder="Catatan mengenai materi, nomor slide, atau rangkuman pokok bahasan..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          {/* Visibility */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs font-medium">Akses Visibilitas</Label>
            <RadioGroup
              value={visibility}
              onValueChange={(val) => setVisibility(val as MaterialVisibility)}
              className="flex items-center gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={MaterialVisibility.PUBLIC} id="vis-public" />
                <Label htmlFor="vis-public" className="text-xs font-normal cursor-pointer">
                  Publik (Dapat diakses Guest & Kelas)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={MaterialVisibility.AUTHENTICATED} id="vis-auth" />
                <Label htmlFor="vis-auth" className="text-xs font-normal cursor-pointer">
                  Internal (Wajib Login)
                </Label>
              </div>
            </RadioGroup>
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
              {isSubmitting ? "Mengunggah..." : "Simpan & Publikasikan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
