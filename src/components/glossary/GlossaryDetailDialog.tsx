"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SafeMarkdown } from "./SafeMarkdown";
import { GlossaryTermDto } from "@/types/glossary";
import { archiveGlossaryTerm, restoreGlossaryTerm, deleteGlossaryTerm } from "@/actions/glossary";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Loader2,
  Tag as TagIcon,
  Trash2,
} from "lucide-react";

interface GlossaryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  term: GlossaryTermDto | null;
  onEdit: (term: GlossaryTermDto) => void;
  onTermUpdated: (updated: GlossaryTermDto | null) => void;
}

export function GlossaryDetailDialog({
  open,
  onOpenChange,
  term,
  onEdit,
  onTermUpdated,
}: GlossaryDetailDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!term) return null;

  const isArchived = Boolean(term.archivedAt);

  const handleToggleArchive = async () => {
    setIsProcessing(true);
    try {
      if (isArchived) {
        const res = await restoreGlossaryTerm(term.id);
        if (res.success && res.data) {
          toast.success("Istilah berhasil dipulihkan dari arsip.");
          onTermUpdated(res.data);
        } else {
          toast.error(res.error || "Gagal memulihkan istilah.");
        }
      } else {
        const res = await archiveGlossaryTerm(term.id);
        if (res.success && res.data) {
          toast.success("Istilah berhasil diarsipkan.");
          onTermUpdated(res.data);
        } else {
          toast.error(res.error || "Gagal mengarsipkan istilah.");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    setIsProcessing(true);
    try {
      const res = await deleteGlossaryTerm(term.id);
      if (res.success) {
        toast.success("Istilah berhasil dihapus secara permanen.");
        onTermUpdated(null);
        onOpenChange(false);
      } else {
        toast.error(res.error || "Gagal menghapus istilah.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsProcessing(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {term.verified ? (
              <Badge
                variant="outline"
                className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 text-[11px]"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Terverifikasi Dosen
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 text-[11px]"
              >
                <Clock className="w-3 h-3 mr-1" />
                Belum Dicek ke Dosen
              </Badge>
            )}

            {term.course && (
              <Badge variant="secondary" className="text-[11px]">
                <BookOpen className="w-3 h-3 mr-1" />
                {term.course.name}
              </Badge>
            )}

            {isArchived && (
              <Badge variant="outline" className="text-muted-foreground text-[11px]">
                <Archive className="w-3 h-3 mr-1" />
                Diarsipkan
              </Badge>
            )}

            <span className="text-[11px] text-muted-foreground ml-auto">
              Kotak Leitner #{term.box}
            </span>
          </div>

          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            {term.term}
          </DialogTitle>

          {term.shortDefinition && (
            <DialogDescription className="text-sm font-normal text-foreground/80 italic border-l-2 border-primary/50 pl-2.5 py-0.5">
              {term.shortDefinition}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Isi Catatan Markdown Terender */}
        <div className="rounded-lg border border-border/80 bg-card p-4 my-2">
          <SafeMarkdown content={term.body} />
        </div>

        {/* Metadata Tambahan (Tags, Sumber, Tanggal) */}
        <div className="space-y-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
          {term.tags && term.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-foreground">Tag:</span>
              {term.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/90"
                >
                  <TagIcon className="w-2.5 h-2.5 text-muted-foreground" />
                  {t}
                </span>
              ))}
            </div>
          )}

          {term.source && (
            <p>
              <span className="font-semibold text-foreground">Sumber Referensi:</span>{" "}
              {term.source}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Dibuat: {new Date(term.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
            </span>
            <span>
              Diperbarui: {new Date(term.updatedAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
            </span>
          </div>
        </div>

        {/* Konfirmasi Hapus */}
        {showDeleteConfirm && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs space-y-2">
            <p className="font-semibold text-destructive">
              Apakah Anda yakin ingin menghapus istilah &quot;{term.term}&quot; secara permanen? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="xs"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isProcessing}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="xs"
                onClick={handleDelete}
                disabled={isProcessing}
              >
                {isProcessing && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                Ya, Hapus Permanen
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4 pt-2 border-t justify-between items-center">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!showDeleteConfirm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isProcessing}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Hapus
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleArchive}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : isArchived ? (
                <ArchiveRestore className="w-3.5 h-3.5 mr-1.5" />
              ) : (
                <Archive className="w-3.5 h-3.5 mr-1.5" />
              )}
              {isArchived ? "Pulihkan dari Arsip" : "Arsipkan"}
            </Button>

            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onEdit(term);
              }}
              disabled={isProcessing}
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              Ubah Istilah
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
