import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { visibleCoursesWhere } from "@/lib/courses/course-filter";
import { WeeklySchedule } from "@/components/courses/WeeklySchedule";
import { CourseCardGrid } from "@/components/courses/CourseCardGrid";

export const dynamic = "force-dynamic";

export default async function HomeMaterialsPage() {
  const [session, class1B] = await Promise.all([
    getCurrentSession(),
    prisma.class.findUnique({ where: { code: "1-B" } }),
  ]);
  if (!class1B) return null;

  const [schedules, courses, archivedCourses, members] = await Promise.all([
    prisma.courseSchedule.findMany({
      where: {
        course: {
          classId: class1B.id,
          kind: "REGULAR",
          archivedAt: null,
        },
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            code: true,
            lecturer: true,
          },
        },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
    }),
    prisma.course.findMany({
      where: visibleCoursesWhere(session, { classId: class1B.id }),
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        pjs: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            materials: true,
            tasks: true,
            topics: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({
      where: visibleCoursesWhere(session, {
        classId: class1B.id,
        onlyArchived: true,
      }),
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        pjs: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            materials: true,
            tasks: true,
            topics: true,
          },
        },
      },
      orderBy: { archivedAt: "desc" },
    }),
    prisma.profile.findMany({
      where: {
        memberships: {
          some: { classId: class1B.id },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Top: Weekly Schedule (Mata Kuliah Resmi REGULAR) */}
      <WeeklySchedule
        schedules={schedules}
        courses={courses
          .filter((c) => c.kind === "REGULAR")
          .map((c) => ({ id: c.id, name: c.name, code: c.code }))}
        session={session}
      />

      {/* Bottom: Course Cards & Belajar Tambahan */}
      <CourseCardGrid
        courses={courses}
        archivedCourses={archivedCourses}
        members={members}
        session={session}
      />
    </div>
  );
}
