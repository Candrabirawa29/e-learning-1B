"use client";

import * as React from "react";
import { CurrentUserSession } from "@/lib/auth/session";
import { formatDateIndo } from "@/lib/date";
import { cn } from "@/lib/utils";
import { deleteMaterialAction } from "@/actions/materials";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { MaterialType, MaterialVisibility } from "@prisma/client";
import {
  FileText,
  Presentation,
  Link as LinkIcon,
  Download,
  Trash2,
  Search,
  ExternalLink,
  BookOpen,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export interface MaterialItem {
  id: string;
  courseId: string;
  topicId: string | null;
  title: string;
  description: string | null;
  materialType: MaterialType;
  storagePath: string | null;
  fileName: string | null;
  fileSize: number | null;
  externalUrl: string | null;
  visibility: MaterialVisibility;
  uploadedById: string;
  createdAt: Date | string;
  course: { id: string; name: string; code: string | null; lecturer: string | null };
  topic: { id: string; title: string } | null;
  uploadedBy: { id: string; name: string | null; email: string };
  downloadUrl?: string;
}

interface MaterialListProps {
  materials: MaterialItem[];
  courses: { id: string; name: string }[];
  session: CurrentUserSession;
}

export function MaterialList({ materials, courses, session }: MaterialListProps) {
  const [search, setSearch] = React.useState("");
  const [selectedCourse, setSelectedCourse] = React.useState<string>("all");
  const [selectedType, setSelectedType] = React.useState<string>("all");
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const filteredMaterials = React.useMemo(() => {
    return materials.filter((m) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(query);
        const matchDesc = m.description?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc) return false;
      }
      if (selectedCourse !== "all" && m.courseId !== selectedCourse) return false;
      if (selectedType !== "all" && m.materialType !== selectedType) return false;
      return true;
    });
  }, [materials, search, selectedCourse, selectedType]);

  const handleDelete = async (materialId: string, title: string) => {
    if (!confirm(`Hapus materi "${title}"?`)) return;
    setDeletingId(materialId);
    try {
      await deleteMaterialAction(materialId);
      toast.success("Materi berhasil dihapus.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus materi");
    } finally {
      setDeletingId(null);
    }
  };

  const getMaterialIcon = (type: MaterialType) => {
    switch (type) {
      case MaterialType.PDF:
        return <FileText className="h-5 w-5 text-red-500 shrink-0" />;
      case MaterialType.DOC:
        return <FileText className="h-5 w-5 text-blue-500 shrink-0" />;
      case MaterialType.PPT:
        return <Presentation className="h-5 w-5 text-amber-500 shrink-0" />;
      case MaterialType.LINK:
        return <LinkIcon className="h-5 w-5 text-emerald-500 shrink-0" />;
      case MaterialType.NOTES:
      default:
        return <BookOpen className="h-5 w-5 text-purple-500 shrink-0" />;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return null;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-card p-3 border rounded-lg">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari materi kuliah..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedCourse} onValueChange={(val) => { if (val) setSelectedCourse(val); }}>
            <SelectTrigger className="h-8 text-xs w-[170px]">
              <SelectValue placeholder="Mata Kuliah" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Semua Matkul</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedType} onValueChange={(val) => { if (val) setSelectedType(val); }}>
            <SelectTrigger className="h-8 text-xs w-[120px]">
              <SelectValue placeholder="Tipe Berkas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Semua Tipe</SelectItem>
              <SelectItem value={MaterialType.PDF} className="text-xs">PDF</SelectItem>
              <SelectItem value={MaterialType.DOC} className="text-xs">DOC / Word</SelectItem>
              <SelectItem value={MaterialType.PPT} className="text-xs">PPT / Slide</SelectItem>
              <SelectItem value={MaterialType.LINK} className="text-xs">Tautan Web</SelectItem>
              <SelectItem value={MaterialType.NOTES} className="text-xs">Catatan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Material Cards */}
      <div className="space-y-3">
        {filteredMaterials.length === 0 ? (
          <div className="p-8 text-center border rounded-lg bg-card text-muted-foreground text-xs">
            Belum ada materi kuliah yang sesuai dengan pencarian Anda.
          </div>
        ) : (
          filteredMaterials.map((mat) => {
            const canManage =
              !session.isViewAs &&
              (session.realRole === "ADMIN" ||
                (session.realRole === "PJ" && session.user?.id === mat.uploadedById));

            const targetUrl = mat.downloadUrl || mat.externalUrl || "#";

            return (
              <Card key={mat.id} className="bg-card hover:border-foreground/30 transition-colors">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-muted rounded-md shrink-0">
                      {getMaterialIcon(mat.materialType)}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-sm text-foreground leading-snug">
                          {mat.title}
                        </span>
                        <Badge variant="secondary" className="text-[10px] font-normal py-0 h-4">
                          {mat.course.name}
                        </Badge>
                        {mat.topic && (
                          <Badge variant="outline" className="text-[10px] font-normal py-0 h-4">
                            {mat.topic.title}
                          </Badge>
                        )}
                        {mat.visibility === MaterialVisibility.AUTHENTICATED && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 py-0 h-4 border-amber-300">
                            Internal
                          </Badge>
                        )}
                      </div>

                      {mat.description && (
                        <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed">
                          {mat.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                        <span>Oleh: {mat.uploadedBy.name || mat.uploadedBy.email.split("@")[0]}</span>
                        <span>•</span>
                        <span>{formatDateIndo(mat.createdAt)}</span>
                        {mat.fileSize && (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(mat.fileSize)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {targetUrl !== "#" ? (
                      <a
                        href={targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(buttonVariants({ size: "sm", variant: "outline" }), "h-8 text-xs gap-1.5")}
                      >
                        {mat.materialType === MaterialType.LINK ? (
                          <>
                            Buka Tautan <ExternalLink className="h-3.5 w-3.5 ml-1" />
                          </>
                        ) : (
                          <>
                            Unduh Materi <Download className="h-3.5 w-3.5 ml-1" />
                          </>
                        )}
                      </a>
                    ) : (
                      <Button size="sm" variant="outline" disabled className="h-8 text-xs">
                        Tautan Belum Siap
                      </Button>
                    )}

                    {canManage && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(mat.id, mat.title)}
                        disabled={deletingId === mat.id}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        {deletingId === mat.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        <span className="sr-only">Hapus materi</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
