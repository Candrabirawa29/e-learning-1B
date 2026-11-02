"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { SafeMarkdown } from "./SafeMarkdown";
import { createGlossaryTerm, updateGlossaryTerm } from "@/actions/glossary";
import { GlossaryTermDto } from "@/types/glossary";
import { toast } from "sonner";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Tag as TagIcon,
  X,
} from "lucide-react";

interface GlossaryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  termToEdit?: GlossaryTermDto | null;
  courses: Array<{ id: string; name: string; code: string | null }>;
  onSuccess: (savedTerm: GlossaryTermDto) => void;
  onSelectExisting?: (existingId: string) => void;
}

export function GlossaryFormDialog({
  open,
  onOpenChange,
  termToEdit,
  courses,
  onSuccess,
  onSelectExisting,
}: GlossaryFormDialogProps) {
  const isEditing = Boolean(termToEdit);

  const [term, setTerm] = useState("");
  const [body, setBody] = useState("");
  const [shortDefinition, setShortDefinition] = useState("");
  const [courseId, setCourseId] = useState<string>("none");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [source, setSource] = useState("");
  const [verified, setVerified] = useState(false);

  const [activeTab, setActiveTab] = useState<string>("write");
  const [showDetails, setShowDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateError, setDuplicateError] = useState<{
    message: string;
    existingId?: string;
  } | null>(null);

  // Inisialisasi form saat dialog dibuka / termToEdit berganti
  useEffect(() => {
    if (open) {
      if (termToEdit) {
        setTerm(termToEdit.term);
        setBody(termToEdit.body);
        setShortDefinition(termToEdit.shortDefinition || "");
        setCourseId(termToEdit.courseId || "none");
        setTags(termToEdit.tags || []);
        setSource(termToEdit.source || "");
        setVerified(termToEdit.verified);
        setShowDetails(
          Boolean(
            termToEdit.shortDefinition ||
              termToEdit.courseId ||
              (termToEdit.tags && termToEdit.tags.length > 0) ||
              termToEdit.source ||
              termToEdit.verified
          )
        );
      } else {
        setTerm("");
        setBody("");
        setShortDefinition("");
        setCourseId("none");
        setTagInput("");
        setTags([]);
        setSource("");
        setVerified(false);
        setShowDetails(false);
      }
      setActiveTab("write");
      setDuplicateError(null);
    }
  }, [open, termToEdit]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const trimmed = tagInput.trim().replace(/^,+|,+$/g, "");
      if (!trimmed) return;
      if (tags.length >= 10) {
        toast.error("Maksimal 10 tag.");
        return;
      }
      if (trimmed.length > 30) {
        toast.error("Setiap tag maksimal 30 karakter.");
        return;
      }
      if (!tags.includes(trimmed)) {
        setTags((prev) => [...prev, trimmed]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateError(null);

    const trimmedTerm = term.trim();
    const trimmedBody = body.trim();

    if (!trimmedTerm) {
      toast.error("Istilah wajib diisi.");
      return;
    }
    if (trimmedTerm.length > 120) {
      toast.error("Istilah maksimal 120 karakter.");
      return;
    }
    if (!trimmedBody) {
      toast.error("Catatan wajib diisi.");
      return;
    }
    if (trimmedBody.length > 20000) {
      toast.error("Catatan maksimal 20.000 karakter.");
      return;
    }
    if (shortDefinition.trim().length > 300) {
      toast.error("Ringkasan maksimal 300 karakter.");
      return;
    }
    if (source.trim().length > 200) {
      toast.error("Sumber maksimal 200 karakter.");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCourseId = courseId === "none" ? null : courseId;

      if (isEditing && termToEdit) {
        const res = await updateGlossaryTerm({
          id: termToEdit.id,
          term: trimmedTerm,
          body: trimmedBody,
          shortDefinition: shortDefinition.trim() || null,
          courseId: selectedCourseId,
          tags,
          source: source.trim() || null,
          verified,
        });

        if (res.success && res.data) {
          toast.success("Istilah berhasil diperbarui.");
          onSuccess(res.data);
          onOpenChange(false);
        } else {
          toast.error(res.error || "Gagal memperbarui istilah.");
        }
      } else {
        const res = await createGlossaryTerm({
          term: trimmedTerm,
          body: trimmedBody,
          shortDefinition: shortDefinition.trim() || undefined,
          courseId: selectedCourseId,
          tags,
          source: source.trim() || undefined,
          verified,
        });

        if (res.success && res.data) {
          toast.success("Istilah baru berhasil disimpan.");
          onSuccess(res.data);
          onOpenChange(false);
        } else {
          if (res.error?.includes("sudah ada")) {
            setDuplicateError({
              message: res.error,
              existingId: res.existingId,
            });
          }
          toast.error(res.error || "Gagal menambahkan istilah.");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCourseName =
    courseId === "none"
      ? "-- Tanpa Mata Kuliah --"
      : courses.find((c) => c.id === courseId)?.name || "Pilih Mata Kuliah";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Ubah Istilah Kosakata" : "Tambah Istilah Baru"}
          </DialogTitle>
          <DialogDescription>
            Catat dan kuasai konsep atau istilah perkuliahan dengan penjelasan pribadi Anda.
          </DialogDescription>
        </DialogHeader>

        {duplicateError && (
          <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-semibold">{duplicateError.message}</p>
              {duplicateError.existingId && onSelectExisting && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onSelectExisting(duplicateError.existingId!);
                  }}
                  className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:opacity-80 font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Lihat istilah yang sudah ada
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Wajib 1: Istilah */}
          <div className="space-y-1.5">
            <Label htmlFor="glossary-term" className="text-xs font-semibold">
              Istilah / Konsep <span className="text-destructive">*</span>
            </Label>
            <Input
              id="glossary-term"
              placeholder="Contoh: Idempotensi, Polymorphism, ACID..."
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              maxLength={120}
              required
              disabled={isSubmitting}
              className="text-sm"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Maksimal 120 karakter</span>
              <span>{term.length}/120</span>
            </div>
          </div>

          {/* Wajib 2: Catatan dengan Pratinjau Markdown */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">
                Catatan Penjelasan <span className="text-destructive">*</span>
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Mendukung format Markdown
              </span>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 h-7 w-48 text-xs">
                <TabsTrigger value="write" className="text-xs">
                  Tulis Catatan
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">
                  Pratinjau
                </TabsTrigger>
              </TabsList>

              <TabsContent value="write" className="mt-2 space-y-1">
                <Textarea
                  placeholder="Tuliskan pengertian istilah ini dengan bahasa sendiri. Gunakan tanda *tebal*, _miring_, - daftar, atau `kode`..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  maxLength={20000}
                  required
                  disabled={isSubmitting}
                  className="font-mono text-xs leading-relaxed min-h-[160px]"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>
                    Tip: Baris pertama akan otomatis jadi ringkasan jika kolom ringkasan kosong.
                  </span>
                  <span>{body.length}/20000</span>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-2">
                <div className="min-h-[160px] max-h-[300px] overflow-y-auto rounded-lg border border-border bg-muted/20 p-3.5">
                  {body.trim() ? (
                    <SafeMarkdown content={body} />
                  ) : (
                    <p className="text-xs italic text-muted-foreground text-center py-8">
                      Belum ada catatan untuk dipratinjau.
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Bagian Detail (Expandable) */}
          <div className="rounded-lg border border-border bg-card/60 p-3 space-y-3">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex w-full items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Detail Tambahan (Ringkasan, Matkul, Tag, Sumber, Verifikasi)</span>
              {showDetails ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showDetails && (
              <div className="pt-2 border-t border-border/60 space-y-3.5">
                {/* Ringkasan Singkat (Opsional) */}
                <div className="space-y-1">
                  <Label htmlFor="short-definition" className="text-xs font-medium">
                    Ringkasan Singkat (Opsional)
                  </Label>
                  <Input
                    id="short-definition"
                    placeholder="Kosongkan untuk otomatis mengambil kalimat pertama dari catatan"
                    value={shortDefinition}
                    onChange={(e) => setShortDefinition(e.target.value)}
                    maxLength={300}
                    disabled={isSubmitting}
                    className="text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Muncul di cuplikan kartu istilah. Maksimal 300 karakter.
                  </p>
                </div>

                {/* Mata Kuliah */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Mata Kuliah Terkait</Label>
                  <Select
                    value={courseId}
                    onValueChange={(val) => {
                      if (val) setCourseId(val);
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder="Pilih Mata Kuliah">
                        {selectedCourseName}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">
                        -- Tanpa Mata Kuliah --
                      </SelectItem>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.name} {c.code ? `(${c.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <Label htmlFor="tag-input" className="text-xs font-medium">
                    Tag / Topik (Maks 10 tag)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="tag-input"
                      placeholder="Ketik tag lalu tekan Enter atau koma (contoh: database, penting)..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      disabled={isSubmitting || tags.length >= 10}
                      className="text-xs"
                    />
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 rounded-md bg-secondary text-secondary-foreground px-2 py-0.5 text-[11px] font-medium"
                        >
                          <TagIcon className="w-2.5 h-2.5" />
                          {t}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(t)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sumber */}
                <div className="space-y-1">
                  <Label htmlFor="glossary-source" className="text-xs font-medium">
                    Sumber Referensi
                  </Label>
                  <Input
                    id="glossary-source"
                    placeholder="Contoh: Modul Pertemuan 4 Slide 12, Buku Silberschatz Hal. 88"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    maxLength={200}
                    disabled={isSubmitting}
                    className="text-xs"
                  />
                </div>

                {/* Checkbox Verifikasi Dosen */}
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="verified-check"
                    checked={verified}
                    onCheckedChange={(checked) => setVerified(Boolean(checked))}
                    disabled={isSubmitting}
                  />
                  <Label
                    htmlFor="verified-check"
                    className="text-xs font-medium cursor-pointer leading-tight select-none"
                  >
                    Sudah dicek ke materi dosen / buku rujukan resmi
                  </Label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {isEditing ? "Simpan Perubahan" : "Tambah Istilah"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
