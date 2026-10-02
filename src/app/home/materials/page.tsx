import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { WeeklySchedule } from "@/components/courses/WeeklySchedule";
import { CourseCardGrid } from "@/components/courses/CourseCardGrid";

export const dynamic = "force-dynamic";

export default async function HomeMaterialsPage() {
  const [session, class1B] = await Promise.all([
    getCurrentSession(),
    prisma.class.findUnique({ where: { code: "1-B" } }),
  ]);
  if (!class1B) return null;

  const [schedules, courses, members] = await Promise.all([
    prisma.courseSchedule.findMany({
      where: { course: { classId: class1B.id } },
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
      where: { classId: class1B.id },
      include: {
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
      {/* Top: Weekly Schedule */}
      <WeeklySchedule
        schedules={schedules}
        courses={courses.map((c) => ({ id: c.id, name: c.name, code: c.code }))}
        session={session}
      />

      {/* Bottom: Course Cards */}
      <CourseCardGrid
        courses={courses}
        members={members}
        session={session}
      />
    </div>
  );
}
