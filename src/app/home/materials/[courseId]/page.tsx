import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { visibleCoursesWhere } from "@/lib/courses/course-filter";
import { CourseDetailTabs } from "@/components/courses/CourseDetailTabs";
import { Badge } from "@/components/ui/badge";
import { minutesToTimeString, DAYS_OF_WEEK_INDO } from "@/lib/date";
import { ArrowLeft, BookOpen, Clock, User, ShieldCheck, Sparkles, Archive, Lock, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const [session, class1B] = await Promise.all([
    getCurrentSession(),
    prisma.class.findUnique({ where: { code: "1-B" } }),
  ]);

  if (!class1B) return notFound();

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      classId: class1B.id,
      ...visibleCoursesWhere(session, { includeArchived: true }),
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      schedules: {
        orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
      },
      pjs: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      topics: {
        orderBy: { order: "asc" },
      },
      materials: {
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      tasks: {
        include: {
          course: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          assignments: {
            include: {
              profile: { select: { id: true, name: true, email: true } },
            },
          },
          progresses: {
            include: {
              profile: { select: { name: true, email: true } },
            },
          },
        },
        orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!course) {
    return notFound();
  }

  const members = await prisma.profile.findMany({
    where: {
      memberships: {
        some: { classId: class1B.id },
      },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const isExtra = course.kind === "EXTRA";
  const isOwner = session?.user?.id === course.ownerId;
  const isArchived = Boolean(course.archivedAt);

  return (
    <div className="space-y-6">
      {/* Back Button & Course Header */}
      <div className="space-y-3">
        <Link
          href="/home/materials"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Katalog Mata Kuliah
        </Link>

        {/* Warning banner jika topik diarsipkan */}
        {isArchived && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200">
            <Archive className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold">Topik ini sedang diarsipkan</p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                Topik ini disembunyikan dari katalog aktif dan pemilih sesi fokus. Anda dapat memulihkannya kapan saja melalui tombol &quot;Pulihkan Topik&quot;.
              </p>
            </div>
          </div>
        )}

        <div className="p-4 bg-card border rounded-lg shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                  <BookOpen className="h-4 w-4" />
                </div>
                {isExtra ? (
                  <>
                    <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 gap-1">
                      <Sparkles className="h-3 w-3" />
                      Belajar Mandiri
                    </Badge>
                    {course.visibility === "CLASS" ? (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 gap-1">
                        <Users className="h-3 w-3" />
                        Publik Kelas 1-B
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border gap-1">
                        <Lock className="h-3 w-3" />
                        Pribadi (Hanya Saya)
                      </Badge>
                    )}
                    {isArchived && (
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 gap-1">
                        <Archive className="h-3 w-3" />
                        Diarsipkan
                      </Badge>
                    )}
                  </>
                ) : course.code ? (
                  <Badge variant="outline" className="text-xs font-mono font-semibold">
                    {course.code}
                  </Badge>
                ) : null}
                <h1 className="text-lg font-bold tracking-tight text-foreground">
                  {course.name}
                </h1>
              </div>
              {course.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {course.description}
                </p>
              )}
            </div>

            {/* Jadwal Kuliah Pill (hanya untuk REGULAR) */}
            {!isExtra && course.schedules.length > 0 && (
              <div className="flex flex-col gap-1 sm:items-end text-xs">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Jadwal Kuliah
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {course.schedules.map((s) => (
                    <Badge
                      key={s.id}
                      variant="secondary"
                      className="text-[11px] font-normal gap-1 bg-muted text-foreground"
                    >
                      <Clock className="h-3 w-3 text-primary" />
                      {DAYS_OF_WEEK_INDO[s.dayOfWeek]}, {minutesToTimeString(s.startMinute)} -{" "}
                      {minutesToTimeString(s.endMinute)}
                      {s.room && ` (${s.room})`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
            {isExtra ? (
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                <span>
                  {isOwner
                    ? "Topik Belajar Mandiri Anda"
                    : `Topik dibagikan oleh: ${course.owner?.name || course.owner?.email?.split("@")[0] || "Teman Sekelas"}`}
                  {" "}&bull;{" "}
                  {course.visibility === "CLASS"
                    ? "Dapat diakses seluruh anggota Kelas 1-B"
                    : "Hanya dapat diakses oleh Anda"}
                </span>
              </div>
            ) : (
              <>
                {course.lecturer && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-foreground" />
                    <span>
                      Dosen: <strong>{course.lecturer}</strong>
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <span>
                    PJ Mata Kuliah:{" "}
                    {course.pjs.length === 0 ? (
                      <span className="italic">Belum ada PJ</span>
                    ) : (
                      course.pjs.map((p) => p.user.name || p.user.email.split("@")[0]).join(", ")
                    )}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Course Detail Tabs: Materi & Tugas */}
      <CourseDetailTabs
        course={{
          id: course.id,
          name: course.name,
          code: course.code,
          description: course.description,
          lecturer: course.lecturer,
          kind: course.kind,
          visibility: course.visibility,
          ownerId: course.ownerId,
          archivedAt: course.archivedAt,
        }}
        topics={course.topics}
        materials={course.materials}
        tasks={course.tasks}
        members={members}
        session={session}
      />
    </div>
  );
}
