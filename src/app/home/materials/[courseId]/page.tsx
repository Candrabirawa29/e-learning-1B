import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { CourseDetailTabs } from "@/components/courses/CourseDetailTabs";
import { Badge } from "@/components/ui/badge";
import { minutesToTimeString, DAYS_OF_WEEK_INDO } from "@/lib/date";
import { ArrowLeft, BookOpen, Clock, User, ShieldCheck } from "lucide-react";
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

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
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

  if (!course || course.classId !== class1B.id) {
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

        <div className="p-4 bg-card border rounded-lg shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                  <BookOpen className="h-4 w-4" />
                </div>
                {course.code && (
                  <Badge variant="outline" className="text-xs font-mono font-semibold">
                    {course.code}
                  </Badge>
                )}
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

            {/* Jadwal Kuliah Pill */}
            {course.schedules.length > 0 && (
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
