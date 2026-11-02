"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { GlossaryTermDto } from "@/types/glossary";
import { BookOpen, CheckCircle2, Clock, Tag as TagIcon } from "lucide-react";

interface GlossaryCardProps {
  term: GlossaryTermDto;
  onClick: () => void;
}

export function GlossaryCard({ term, onClick }: GlossaryCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-xs transition-all duration-200 hover:border-primary/50 hover:shadow-md cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring select-none text-left"
    >
      <div className="space-y-2">
        {/* Header Kartu: Status Verifikasi & Badge Mata Kuliah */}
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          {term.course ? (
            <Badge
              variant="secondary"
              className="text-[11px] truncate max-w-[170px] font-normal"
            >
              <BookOpen className="w-3 h-3 mr-1 shrink-0 text-muted-foreground" />
              <span className="truncate">{term.course.name}</span>
            </Badge>
          ) : (
            <span />
          )}

          {term.verified ? (
            <Badge
              variant="outline"
              className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 text-[10px] py-0"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Terverifikasi
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 text-[10px] py-0"
            >
              <Clock className="w-3 h-3 mr-1" />
              Belum dicek
            </Badge>
          )}
        </div>

        {/* Judul Istilah */}
        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {term.term}
        </h3>

        {/* Ringkasan Istilah */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {term.shortDefinition || "Klik untuk membaca catatan lengkap..."}
        </p>
      </div>

      {/* Footer Kartu: Tag & Spaced Repetition Box */}
      <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1 overflow-hidden">
          {term.tags && term.tags.length > 0 ? (
            <>
              <TagIcon className="w-3 h-3 shrink-0 text-muted-foreground/70" />
              <span className="truncate">
                {term.tags.slice(0, 2).join(", ")}
                {term.tags.length > 2 && ` +${term.tags.length - 2}`}
              </span>
            </>
          ) : (
            <span className="text-[10px] italic text-muted-foreground/60">Tanpa tag</span>
          )}
        </div>

        <span className="shrink-0 text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-foreground/70">
          Box #{term.box}
        </span>
      </div>
    </div>
  );
}
