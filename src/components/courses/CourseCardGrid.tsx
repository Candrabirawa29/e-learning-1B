"use client";

import * as React from "react";
import { CurrentUserSession } from "@/lib/auth/session";
import { canManageCourse } from "@/lib/auth/rbac";
import { deleteCourseAction } from "@/actions/courses";
import { MemberOption } from "@/components/tasks/MemberSelector";
import { CourseDialog } from "./CourseDialog";
import { CoursePJDialog } from "./CoursePJDialog";
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

export interface CourseWithDetails {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  lecturer: string | null;
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
  members: MemberOption[];
  session: CurrentUserSession;
}

export function CourseCardGrid({ courses, members, session }: CourseCardGridProps) {
  const [createCourseOpen, setCreateCourseOpen] = React.useState(false);
  const [selectedCourseForEdit, setSelectedCourseForEdit] = React.useState<CourseWithDetails | null>(null);
  const [editCourseOpen, setEditCourseOpen] = React.useState(false);
  const [selectedCourseForPJ, setSelectedCourseForPJ] = React.useState<CourseWithDetails | null>(null);
  const [pjDialogOpen, setPjDialogOpen] = React.useState(false);

  const isAdmin = session.effectiveRole === "ADMIN";
  const canCreateCourse = session.effectiveRole === "ADMIN" || session.effectiveRole === "PJ";

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

  return (
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
            className="h-8 text-xs gap-1.5 font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Mata Kuliah
          </Button>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="p-12 text-center border rounded-lg bg-card text-muted-foreground text-xs">
          Belum ada mata kuliah yang terdaftar di Kelas 1-B.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => {
            const canManage = canManageCourse(session, course.id);

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
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
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
    </div>
  );
}
