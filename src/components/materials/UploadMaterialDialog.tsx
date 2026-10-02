"use client";

import * as React from "react";
import { createMaterialAction, getCloudinaryUploadSignatureAction } from "@/actions/materials";
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
import { MaterialType, MaterialVisibility } from "@prisma/client";
import { Upload, Loader2, FileUp, Link2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface CourseTopic {
  id: string;
  name: string;
  topics?: { id: string; title: string }[];
}

interface UploadMaterialDialogProps {
  courses: CourseTopic[];
  defaultCourseId?: string;
  defaultTopicId?: string;
  triggerButton?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UploadMaterialDialog({
  courses,
  defaultCourseId,
  defaultTopicId,
  triggerButton,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSuccess,
}: UploadMaterialDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<string>("");

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [courseId, setCourseId] = React.useState<string>(defaultCourseId || courses[0]?.id || "");
  const [topicId, setTopicId] = React.useState<string>(defaultTopicId || "none");
  const [uploadMode, setUploadMode] = React.useState<"file" | "link">("file");
  const [materialType, setMaterialType] = React.useState<MaterialType>(MaterialType.PDF);
  const [externalUrl, setExternalUrl] = React.useState("");
  const visibility = MaterialVisibility.PUBLIC;
  const [file, setFile] = React.useState<File | null>(null);

  React.useEffect(() => {
    if (defaultCourseId) {
      setCourseId(defaultCourseId);
    } else if (courses.length > 0 && !courseId) {
      setCourseId(courses[0].id);
    }
  }, [defaultCourseId, courses, courseId]);

  const availableTopics = React.useMemo(() => {
    const selected = courses.find((c) => c.id === courseId);
    return selected?.topics || [];
  }, [courses, courseId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      // Validasi batas 10MB di sisi klien
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("Ukuran file melebihi batas maksimal 10 MB. Silakan kompres atau gunakan tautan eksternal.");
        e.target.value = "";
        setFile(null);
        return;
      }
      setFile(selectedFile);

      // Otomatis tentukan materialType berdasarkan ekstensi jika belum dipilih
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();
      if (ext === "pdf") setMaterialType(MaterialType.PDF);
      else if (["doc", "docx"].includes(ext || "")) setMaterialType(MaterialType.DOC);
      else if (["ppt", "pptx"].includes(ext || "")) setMaterialType(MaterialType.PPT);
      else setMaterialType(MaterialType.NOTES);

      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    } else {
      setFile(null);
    }
  };

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

    if (uploadMode === "link" && !externalUrl.trim()) {
      toast.error("Masukkan tautan URL materi.");
      return;
    }

    if (uploadMode === "file" && !file) {
      toast.error("Harap pilih file yang akan diunggah.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (uploadMode === "file" && file) {
        setUploadProgress("Meminta otorisasi upload ke Cloudinary...");
        const sig = await getCloudinaryUploadSignatureAction(courseId);

        setUploadProgress("Mengunggah file langsung ke Cloudinary...");
        const cldData = new FormData();
        cldData.append("file", file);
        cldData.append("api_key", sig.apiKey);
        cldData.append("timestamp", sig.timestamp.toString());
        cldData.append("signature", sig.signature);
        cldData.append("folder", sig.folder);

        const cldRes = await fetch(
          `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`,
          {
            method: "POST",
            body: cldData,
          }
        );

        if (!cldRes.ok) {
          const errData = await cldRes.json().catch(() => ({}));
          throw new Error(errData.error?.message || "Gagal mengunggah file ke Cloudinary.");
        }

        const cldJson = await cldRes.json();

        setUploadProgress("Menyimpan data materi ke sistem...");
        await createMaterialAction({
          title: title.trim(),
          description: description.trim() || undefined,
          courseId,
          topicId: topicId === "none" ? null : topicId,
          materialType,
          provider: "CLOUDINARY",
          fileUrl: cldJson.secure_url,
          publicId: cldJson.public_id,
          fileName: file.name,
          fileSize: file.size,
          visibility,
        });
      } else {
        setUploadProgress("Menyimpan tautan materi...");
        await createMaterialAction({
          title: title.trim(),
          description: description.trim() || undefined,
          courseId,
          topicId: topicId === "none" ? null : topicId,
          materialType: MaterialType.LINK,
          provider: "EXTERNAL",
          externalUrl: externalUrl.trim(),
          visibility,
        });
      }

      toast.success("Materi berhasil ditambahkan!");
      setOpen(false);
      onSuccess?.();

      // Reset
      setTitle("");
      setDescription("");
      setFile(null);
      setExternalUrl("");
      setTopicId("none");
      setUploadProgress("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan saat mengunggah materi.");
    } finally {
      setIsSubmitting(false);
      setUploadProgress("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerButton && <DialogTrigger render={triggerButton as React.ReactElement} />}

      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Unggah Materi Pembelajaran</DialogTitle>
            <DialogDescription className="text-xs">
              Unggah file dokumen (PDF, PPT, DOC) ke Cloudinary atau bagikan tautan eksternal (Google Drive / YouTube).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs py-1">
            {/* Pilihan Metode: File Upload vs Link */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Metode Materi</Label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setUploadMode("file")}
                  className={`flex items-center gap-2 p-2.5 border rounded-md cursor-pointer transition-all ${
                    uploadMode === "file"
                      ? "border-primary bg-primary/5 text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <FileUp className="h-4 w-4 text-primary" />
                  <span>File Langsung (Maks 10MB)</span>
                </div>
                <div
                  onClick={() => setUploadMode("link")}
                  className={`flex items-center gap-2 p-2.5 border rounded-md cursor-pointer transition-all ${
                    uploadMode === "link"
                      ? "border-primary bg-primary/5 text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <Link2 className="h-4 w-4 text-primary" />
                  <span>Tautan Eksternal</span>
                </div>
              </div>
            </div>

            {/* Mata Kuliah & Sub-topik */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  Mata Kuliah <span className="text-red-500">*</span>
                </Label>
                <Select value={courseId} onValueChange={(val) => { if (val) setCourseId(val); }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Pilih Mata Kuliah" />
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

              <div className="space-y-1">
                <Label className="text-xs font-medium">Sub-Topik / Bab</Label>
                <Select value={topicId} onValueChange={(val) => { if (val) setTopicId(val); }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Pilih Sub-Topik (Opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">
                      -- Umum (Tanpa Sub-topik) --
                    </SelectItem>
                    {availableTopics.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Judul Materi */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Judul Materi <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Contoh: Pertemuan 3 - Normalisasi & Functional Dependency"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>

            {/* Upload File atau Input Link */}
            {uploadMode === "file" ? (
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Pilih File Dokumen <span className="text-red-500">*</span> (Maksimal 10 MB)
                  </Label>
                  <Input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip"
                    className="h-9 text-xs file:text-xs file:font-medium file:bg-muted file:border-0 file:rounded-sm file:mr-2"
                    required={uploadMode === "file"}
                  />
                </div>
                {file && (
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-primary" />
                    File terpilih: <strong>{file.name}</strong> ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  URL Tautan Eksternal <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="url"
                  placeholder="https://drive.google.com/... atau https://youtube.com/..."
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="h-8 text-xs"
                  required={uploadMode === "link"}
                />
              </div>
            )}

            {/* Deskripsi */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Deskripsi / Catatan Tambahan (Opsional)</Label>
              <Textarea
                placeholder="Tuliskan catatan penting mengenai materi ini..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            {/* Status Progress Upload */}
            {isSubmitting && uploadProgress && (
              <div className="p-2.5 bg-primary/10 border border-primary/20 rounded text-xs flex items-center gap-2 text-primary font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {uploadProgress}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
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
                  Mengunggah...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  Unggah Materi
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
