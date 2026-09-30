"use client";

import * as React from "react";
import { CurrentUserSession } from "@/lib/auth/session";
import { formatDateTimeIndo } from "@/lib/date";
import { deleteAnnouncementAction } from "@/actions/announcements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pin, Trash2, Megaphone, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  publishedAt: Date | string;
  createdById: string;
  createdBy: { id: string; name: string | null; email: string };
}

interface AnnouncementListProps {
  announcements: AnnouncementItem[];
  session: CurrentUserSession;
}

export function AnnouncementList({ announcements, session }: AnnouncementListProps) {
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Hapus pengumuman "${title}"?`)) return;
    setDeletingId(id);
    try {
      await deleteAnnouncementAction(id);
      toast.success("Pengumuman berhasil dihapus.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus pengumuman");
    } finally {
      setDeletingId(null);
    }
  };

  if (announcements.length === 0) {
    return (
      <div className="p-8 text-center border rounded-lg bg-card text-muted-foreground text-xs">
        Belum ada pengumuman yang dipublikasikan untuk kelas ini.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.map((ann) => {
        const canManage =
          !session.isViewAs &&
          (session.realRole === "ADMIN" ||
            (session.realRole === "PJ" && session.user?.id === ann.createdById));

        return (
          <Card
            key={ann.id}
            className={`transition-colors bg-card ${
              ann.isPinned
                ? "border-amber-400/60 dark:border-amber-600/40 bg-amber-50/20 dark:bg-amber-950/10"
                : "hover:border-foreground/30"
            }`}
          >
            <CardContent className="p-4 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 flex-1">
                  <div className="p-2 rounded bg-muted shrink-0 mt-0.5">
                    <Megaphone className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-foreground leading-snug">
                        {ann.title}
                      </span>
                      {ann.isPinned && (
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] gap-1 h-4 px-1.5"
                        >
                          <Pin className="h-2.5 w-2.5 fill-current" />
                          Disematkan
                        </Badge>
                      )}
                    </div>

                    <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <span>Oleh: {ann.createdBy.name || ann.createdBy.email.split("@")[0]}</span>
                      <span>•</span>
                      <span>{formatDateTimeIndo(ann.publishedAt)}</span>
                    </div>
                  </div>
                </div>

                {canManage && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(ann.id, ann.title)}
                    disabled={deletingId === ann.id}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  >
                    {deletingId === ann.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    <span className="sr-only">Hapus pengumuman</span>
                  </Button>
                )}
              </div>

              <div className="pl-10 text-foreground/90 whitespace-pre-line leading-relaxed text-xs">
                {ann.content}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
