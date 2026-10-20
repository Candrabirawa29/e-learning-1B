"use client";

import * as React from "react";
import { CurrentUserSession } from "@/lib/auth/session";
import { canManageCourse, canArchiveCourse } from "@/lib/auth/rbac";
import {
  deleteCourseAction,
  archiveCourseAction,
  unarchiveCourseAction,
  updateCourseVisibilityAction,
  createExtraCourseAction,
} from "@/actions/courses";
import { MemberOption } from "@/components/tasks/MemberSelector";
import { CourseDialog } from "./CourseDialog";
import { CoursePJDialog } from "./CoursePJDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  User,
  ShieldCheck,
  FileText,
  CheckSquare,
  ArrowRight,
  MoreVertical,
  Edit,
  Trash2,
  Plus,
  Archive,
  RotateCcw,
  Sparkles,
  Lock,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { toast } from "sonner";
import { formatDateIndo } from "@/lib/date";

export interface CourseWithDetails {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  lecturer: string | null;
  kind?: "REGULAR" | "EXTRA";
  visibility?: "CLASS" | "PRIVATE";
  ownerId?: string | null;
  owner?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  archivedAt?: Date | string | null;
  pjs: {
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }[];
  _count: {
    materials: number;
    tasks: number;
    topics: number;
  };
}

interface CourseCardGridProps {
  courses: CourseWithDetails[];
  archivedCourses?: CourseWithDetails[];
  members: MemberOption[];
  session: CurrentUserSession;
}

export function CourseCardGrid({ courses, archivedCourses = [], members, session }: CourseCardGridProps) {
  const [createCourseOpen, setCreateCourseOpen] = React.useState(false);
  const [selectedCourseForEdit, setSelectedCourseForEdit] = React.useState<CourseWithDetails | null>(null);
  const [editCourseOpen, setEditCourseOpen] = React.useState(false);
  const [selectedCourseForPJ, setSelectedCourseForPJ] = React.useState<CourseWithDetails | null>(null);
  const [pjDialogOpen, setPjDialogOpen] = React.useState(false);

  // Belajar Tambahan (Extra Course) state
  const [extraSubTab, setExtraSubTab] = React.useState<"active" | "archived">("active");
  const [createExtraOpen, setCreateExtraOpen] = React.useState(false);
  const [extraName, setExtraName] = React.useState("");
  const [extraDesc, setExtraDesc] = React.useState("");
  const [extraVisibility, setExtraVisibility] = React.useState<"PRIVATE" | "CLASS">("PRIVATE");
  const [isCreatingExtra, setIsCreatingExtra] = React.useState(false);

  const isAdmin = session.effectiveRole === "ADMIN";
  const canCreateCourse = session.effectiveRole === "ADMIN" || session.effectiveRole === "PJ";

  const regularCourses = courses.filter((c) => c.kind !== "EXTRA");
  const myActiveExtraCourses = courses.filter(
    (c) => c.kind === "EXTRA" && (!c.ownerId || c.ownerId === session.user?.id)
  );
  const sharedActiveExtraCourses = courses.filter(
    (c) => c.kind === "EXTRA" && c.ownerId && c.ownerId !== session.user?.id && c.visibility === "CLASS"
  );
  const myArchivedExtraCourses = archivedCourses.filter(
    (c) => c.kind === "EXTRA" && (!c.ownerId || c.ownerId === session.user?.id)
  );

  const handleDeleteCourse = async (courseId: string, courseName: string) => {
    if (!confirm(`Hapus mata kuliah "${courseName}" beserta semua materi, topik, dan jadwal terkait?`)) {
      return;
    }
    try {
      await deleteCourseAction(courseId);
      toast.success("Mata kuliah berhasil dihapus.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus mata kuliah.");
    }
  };

  const handleArchiveCourse = async (courseId: string, courseName: string) => {
    if (!confirm(`Arsipkan topik "${courseName}"? Topik yang diarsipkan akan dipindahkan ke tab Arsip.`)) {
      return;
    }
    try {
      await archiveCourseAction(courseId);
      toast.success(`Topik "${courseName}" berhasil diarsipkan.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal mengarsipkan topik.");
    }
  };

  const handleUnarchiveCourse = async (courseId: string, courseName: string) => {
    try {
      await unarchiveCourseAction(courseId);
      toast.success(`Topik "${courseName}" berhasil dipulihkan ke daftar aktif.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memulihkan topik.");
    }
  };

  const handleToggleVisibility = async (
    courseId: string,
    currentVisibility: "CLASS" | "PRIVATE" = "PRIVATE",
    courseName: string
  ) => {
    const nextVisibility = currentVisibility === "CLASS" ? "PRIVATE" : "CLASS";
    try {
      await updateCourseVisibilityAction(courseId, nextVisibility);
      toast.success(
        nextVisibility === "CLASS"
          ? `Topik "${courseName}" sekarang dibagikan ke seluruh Kelas 1-B.`
          : `Topik "${courseName}" sekarang bersifat pribadi (hanya Anda).`
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah visibilitas topik.");
    }
  };

  const handleCreateExtra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraName.trim()) return;
    setIsCreatingExtra(true);
    try {
      await createExtraCourseAction({
        name: extraName.trim(),
        description: extraDesc.trim() || null,
        visibility: extraVisibility,
      });
      toast.success(
        extraVisibility === "CLASS"
          ? "Topik mandiri berhasil dibuat dan dibagikan ke Kelas 1-B."
          : "Topik belajar mandiri pribadi berhasil dibuat."
      );
      setExtraName("");
      setExtraDesc("");
      setExtraVisibility("PRIVATE");
      setCreateExtraOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat topik.");
    } finally {
      setIsCreatingExtra(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* 1. SEKSI MATA KULIAH RESMI KELAS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-base text-foreground">Daftar Mata Kuliah Kelas 1-B</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pilih mata kuliah untuk melihat materi per bab, berkas unduhan, dan penugasan spesifik.
            </p>
          </div>

          {canCreateCourse && (
            <Button
              size="sm"
              onClick={() => setCreateCourseOpen(true)}
              className="h-8 text-xs gap-1.5 font-medium cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Mata Kuliah
            </Button>
          )}
        </div>

        {regularCourses.length === 0 ? (
          <div className="p-12 text-center border rounded-lg bg-card text-muted-foreground text-xs">
            Belum ada mata kuliah yang terdaftar di Kelas 1-B.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularCourses.map((course) => {
              const canManage = canManageCourse(session, course);

              return (
                <Card
                  key={course.id}
                  className="flex flex-col justify-between hover:shadow-md transition-all border group bg-card"
                >
                  <CardHeader className="p-4 pb-2 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        {course.code && (
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {course.code}
                          </Badge>
                        )}
                      </div>

                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground cursor-pointer">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedCourseForEdit(course);
                                setEditCourseOpen(true);
                              }}
                              className="gap-2 text-xs"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              Edit Mata Kuliah
                            </DropdownMenuItem>

                            {isAdmin && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedCourseForPJ(course);
                                    setPjDialogOpen(true);
                                  }}
                                  className="gap-2 text-xs"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                  Atur PJ Mata Kuliah
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteCourse(course.id, course.name)}
                                  className="gap-2 text-xs text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Hapus Mata Kuliah
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    <CardTitle className="text-sm font-bold leading-snug group-hover:text-primary transition-colors line-clamp-1">
                      {course.name}
                    </CardTitle>

                    {course.lecturer && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{course.lecturer}</span>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="p-4 pt-1 pb-3 space-y-3 text-xs flex-1">
                    {course.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    )}

                    {/* PJ List */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                        Penanggung Jawab (PJ)
                      </span>
                      {course.pjs.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground italic">
                          Belum ditetapkan
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {course.pjs.map((pj) => (
                            <Badge
                              key={pj.user.id}
                              variant="secondary"
                              className="text-[10px] font-normal py-0 h-4 bg-muted text-foreground"
                            >
                              {pj.user.name || pj.user.email.split("@")[0]}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 pt-2 border-t flex items-center justify-between bg-muted/10 text-xs">
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1" title="Jumlah Materi">
                        <FileText className="h-3.5 w-3.5" />
                        {course._count.materials} Materi
                      </span>
                      <span className="flex items-center gap-1" title="Jumlah Tugas">
                        <CheckSquare className="h-3.5 w-3.5" />
                        {course._count.tasks} Tugas
                      </span>
                    </div>

                    <Link
                      href={`/home/materials/${course.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      Buka Matkul
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. SEKSI BELAJAR TAMBAHAN (MANDIRI) */}
      <div className="space-y-4 pt-6 border-t">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-base text-foreground">Belajar Tambahan (Mandiri)</h2>
              <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                Mandiri
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ruang belajar mandiri Anda. Catat topik riset, persiapan sertifikasi, atau bagikan silabus belajar ke teman sekelas.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Filter Sub-tab: Aktif vs Arsip */}
            <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border text-xs">
              <button
                type="button"
                onClick={() => setExtraSubTab("active")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all text-xs cursor-pointer ${
                  extraSubTab === "active"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Topik Aktif ({myActiveExtraCourses.length + sharedActiveExtraCourses.length})
              </button>
              <button
                type="button"
                onClick={() => setExtraSubTab("archived")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all text-xs cursor-pointer flex items-center gap-1.5 ${
                  extraSubTab === "archived"
                    ? "bg-card text-amber-700 dark:text-amber-400 shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Archive className="h-3 w-3" />
                Arsip ({myArchivedExtraCourses.length})
              </button>
            </div>

            {session.user && (
              <Button
                size="sm"
                onClick={() => setCreateExtraOpen(true)}
                className="h-8 text-xs gap-1.5 font-medium cursor-pointer shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Topik Mandiri
              </Button>
            )}
          </div>
        </div>

        {/* TAB 1: TOPIK AKTIF */}
        {extraSubTab === "active" && (
          <div className="space-y-6">
            {myActiveExtraCourses.length === 0 && sharedActiveExtraCourses.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-xl bg-card/50 text-muted-foreground text-xs space-y-2">
                <Sparkles className="h-6 w-6 text-primary/60 mx-auto" />
                <p className="font-medium text-foreground">Belum ada topik belajar tambahan</p>
                <p className="text-[11px] max-w-md mx-auto text-muted-foreground">
                  Gunakan topik mandiri untuk mendokumentasikan riset pribadi, persiapan sertifikasi, atau materi di luar kurikulum kelas.
                </p>
                {session.user && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setCreateExtraOpen(true)}
                    className="text-xs gap-1.5 mt-2 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Buat Topik Pertama
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* 1.A Topik Mandiri Milik Saya */}
                {myActiveExtraCourses.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myActiveExtraCourses.map((course) => {
                      const canManage = canManageCourse(session, course);
                      const canArchive = canArchiveCourse(session, course);
                      const isPublic = course.visibility === "CLASS";

                      return (
                        <Card
                          key={course.id}
                          className="flex flex-col justify-between hover:shadow-md transition-all border group bg-card"
                        >
                          <CardHeader className="p-4 pb-2 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                  <Sparkles className="h-4 w-4" />
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] text-emerald-700 dark:text-emerald-300 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30"
                                >
                                  Mandiri
                                </Badge>
                                {isPublic ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 gap-1"
                                    title="Dapat dilihat oleh semua anggota Kelas 1-B"
                                  >
                                    <Users className="h-2.5 w-2.5" />
                                    Publik Kelas
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] text-muted-foreground border-border gap-1"
                                    title="Hanya dapat dilihat oleh Anda"
                                  >
                                    <Lock className="h-2.5 w-2.5" />
                                    Pribadi
                                  </Badge>
                                )}
                              </div>

                              {(canManage || canArchive) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    render={
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground cursor-pointer"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    }
                                  />
                                  <DropdownMenuContent align="end" className="text-xs">
                                    {canManage && (
                                      <>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSelectedCourseForEdit(course);
                                            setEditCourseOpen(true);
                                          }}
                                          className="gap-2 text-xs"
                                        >
                                          <Edit className="h-3.5 w-3.5" />
                                          Edit Topik
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleToggleVisibility(
                                              course.id,
                                              course.visibility,
                                              course.name
                                            )
                                          }
                                          className="gap-2 text-xs"
                                        >
                                          {isPublic ? (
                                            <>
                                              <Lock className="h-3.5 w-3.5 text-amber-600" />
                                              Jadikan Pribadi (Hanya Saya)
                                            </>
                                          ) : (
                                            <>
                                              <Users className="h-3.5 w-3.5 text-blue-600" />
                                              Bagikan ke Kelas (Publik 1-B)
                                            </>
                                          )}
                                        </DropdownMenuItem>
                                      </>
                                    )}

                                    {canArchive && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => handleArchiveCourse(course.id, course.name)}
                                          className="gap-2 text-xs text-amber-600 focus:text-amber-600"
                                        >
                                          <Archive className="h-3.5 w-3.5" />
                                          Arsipkan Topik
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>

                            <CardTitle className="text-sm font-bold leading-snug group-hover:text-primary transition-colors line-clamp-1">
                              {course.name}
                            </CardTitle>
                          </CardHeader>

                          <CardContent className="p-4 pt-1 pb-3 space-y-3 text-xs flex-1">
                            {course.description ? (
                              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                {course.description}
                              </p>
                            ) : (
                              <p className="text-[11px] text-muted-foreground/60 italic">
                                Tidak ada deskripsi.
                              </p>
                            )}
                          </CardContent>

                          <CardFooter className="p-4 pt-2 border-t flex items-center justify-between bg-muted/10 text-xs">
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1" title="Jumlah Sub-bab">
                                <BookOpen className="h-3.5 w-3.5" />
                                {course._count.topics} Sub-bab
                              </span>
                              <span className="flex items-center gap-1" title="Jumlah Materi/Link">
                                <FileText className="h-3.5 w-3.5" />
                                {course._count.materials} Materi
                              </span>
                            </div>

                            <Link
                              href={`/home/materials/${course.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              Buka Topik
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* 1.B Topik Mandiri yang Dibagikan oleh Teman Sekelas */}
                {sharedActiveExtraCourses.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-semibold text-sm text-foreground">
                        Topik Dibagikan oleh Rekan Sekelas
                      </h3>
                      <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200">
                        {sharedActiveExtraCourses.length} Topik
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sharedActiveExtraCourses.map((course) => (
                        <Card
                          key={course.id}
                          className="flex flex-col justify-between hover:shadow-md transition-all border group bg-card"
                        >
                          <CardHeader className="p-4 pb-2 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                  <Users className="h-4 w-4" />
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] text-blue-700 dark:text-blue-300 border-blue-300 bg-blue-50/50 dark:bg-blue-950/30"
                                >
                                  Publik Kelas
                                </Badge>
                              </div>
                            </div>

                            <CardTitle className="text-sm font-bold leading-snug group-hover:text-primary transition-colors line-clamp-1">
                              {course.name}
                            </CardTitle>

                            {course.owner && (
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" />
                                Dibagikan oleh:{" "}
                                <span className="font-medium text-foreground">
                                  {course.owner.name || course.owner.email.split("@")[0]}
                                </span>
                              </p>
                            )}
                          </CardHeader>

                          <CardContent className="p-4 pt-1 pb-3 space-y-3 text-xs flex-1">
                            {course.description ? (
                              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                {course.description}
                              </p>
                            ) : (
                              <p className="text-[11px] text-muted-foreground/60 italic">
                                Tidak ada deskripsi.
                              </p>
                            )}
                          </CardContent>

                          <CardFooter className="p-4 pt-2 border-t flex items-center justify-between bg-muted/10 text-xs">
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1" title="Jumlah Sub-bab">
                                <BookOpen className="h-3.5 w-3.5" />
                                {course._count.topics} Sub-bab
                              </span>
                              <span className="flex items-center gap-1" title="Jumlah Materi/Link">
                                <FileText className="h-3.5 w-3.5" />
                                {course._count.materials} Materi
                              </span>
                            </div>

                            <Link
                              href={`/home/materials/${course.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              Lihat Materi
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: TOPIK ARSIP */}
        {extraSubTab === "archived" && (
          <div className="space-y-4">
            {myArchivedExtraCourses.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-xl bg-card/50 text-muted-foreground text-xs space-y-2">
                <Archive className="h-6 w-6 text-muted-foreground/50 mx-auto" />
                <p className="font-medium text-foreground">Belum ada topik yang diarsipkan</p>
                <p className="text-[11px] max-w-md mx-auto text-muted-foreground">
                  Topik belajar mandiri yang diarsipkan akan disimpan di sini tanpa menghapus riwayat belajar dan analitik Anda.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myArchivedExtraCourses.map((course) => (
                  <Card
                    key={course.id}
                    className="flex flex-col justify-between border group bg-card/80 opacity-90 hover:opacity-100 transition-opacity"
                  >
                    <CardHeader className="p-4 pb-2 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Archive className="h-4 w-4" />
                          </div>
                          <Badge
                            variant="secondary"
                            className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800"
                          >
                            Diarsipkan
                          </Badge>
                          {course.archivedAt && (
                            <span className="text-[10px] text-muted-foreground">
                              {formatDateIndo(course.archivedAt)}
                            </span>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnarchiveCourse(course.id, course.name)}
                          className="h-7 text-xs gap-1 text-primary hover:text-primary cursor-pointer"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Pulihkan
                        </Button>
                      </div>

                      <CardTitle className="text-sm font-bold leading-snug line-clamp-1">
                        {course.name}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="p-4 pt-1 pb-3 space-y-3 text-xs flex-1">
                      {course.description ? (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {course.description}
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground/60 italic">
                          Tidak ada deskripsi.
                        </p>
                      )}
                    </CardContent>

                    <CardFooter className="p-4 pt-2 border-t flex items-center justify-between bg-muted/10 text-xs">
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {course._count.topics} Sub-bab
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          {course._count.materials} Materi
                        </span>
                      </div>

                      <Link
                        href={`/home/materials/${course.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                      >
                        Buka Topik
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {isAdmin && (
        <CourseDialog
          mode="create"
          open={createCourseOpen}
          onOpenChange={setCreateCourseOpen}
        />
      )}

      {selectedCourseForEdit && (
        <CourseDialog
          mode="edit"
          course={selectedCourseForEdit}
          open={editCourseOpen}
          onOpenChange={setEditCourseOpen}
        />
      )}

      {selectedCourseForPJ && (
        <CoursePJDialog
          course={{
            id: selectedCourseForPJ.id,
            name: selectedCourseForPJ.name,
            pjs: selectedCourseForPJ.pjs.map((p) => ({ userId: p.user.id })),
          }}
          members={members}
          open={pjDialogOpen}
          onOpenChange={setPjDialogOpen}
        />
      )}

      {/* Modal Tambah Topik Mandiri */}
      <Dialog open={createExtraOpen} onOpenChange={setCreateExtraOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Tambah Topik Belajar Mandiri
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateExtra} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="extra-course-name" className="text-xs font-medium text-foreground">
                Nama Topik / Mata Kuliah Mandiri
              </label>
              <Input
                id="extra-course-name"
                value={extraName}
                onChange={(e) => setExtraName(e.target.value)}
                placeholder="Contoh: Belajar Rust, Persiapan AWS Certified..."
                className="text-xs h-9"
                autoFocus
                disabled={isCreatingExtra}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="extra-course-desc" className="text-xs font-medium text-foreground">
                Deskripsi (Opsional)
              </label>
              <Textarea
                id="extra-course-desc"
                value={extraDesc}
                onChange={(e) => setExtraDesc(e.target.value)}
                placeholder="Target belajar, referensi silabus, atau catatan ringkas..."
                className="text-xs min-h-[80px]"
                disabled={isCreatingExtra}
              />
            </div>

            {/* Pilihan Visibilitas: Pribadi vs Publik Kelas */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Visibilitas Topik
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExtraVisibility("PRIVATE")}
                  className={`flex items-start gap-2 p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                    extraVisibility === "PRIVATE"
                      ? "border-primary bg-primary/5 text-foreground font-medium ring-1 ring-primary/30"
                      : "border-border text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <Lock className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold text-xs">Pribadi</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                      Hanya Anda yang dapat melihat topik ini
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setExtraVisibility("CLASS")}
                  className={`flex items-start gap-2 p-2.5 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                    extraVisibility === "CLASS"
                      ? "border-primary bg-primary/5 text-foreground font-medium ring-1 ring-primary/30"
                      : "border-border text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <Users className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold text-xs">Publik Kelas</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                      Dibagikan ke seluruh anggota Kelas 1-B
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateExtraOpen(false)}
                disabled={isCreatingExtra}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!extraName.trim() || isCreatingExtra}
                className="text-xs"
              >
                {isCreatingExtra ? "Membuat..." : "Simpan Topik"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
