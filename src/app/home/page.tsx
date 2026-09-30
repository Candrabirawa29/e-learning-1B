import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { MemberDashboard } from "@/components/dashboard/MemberDashboard";
import { AdminPjDashboard } from "@/components/dashboard/AdminPjDashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [session, class1B] = await Promise.all([
    requireUser(),
    prisma.class.findUnique({ where: { code: "1-B" } }),
  ]);
  if (!class1B) {
    return (
      <div className="p-8 text-center text-muted-foreground text-xs">
        Data Kelas 1-B belum terdaftar. Silakan hubungi Administrator.
      </div>
    );
  }

  const isManagementView =
    session.effectiveRole === "ADMIN" || session.effectiveRole === "PJ";

  // Ambil data-data terkait
  const [tasks, assignments, materials, announcements] = await Promise.all([
    prisma.task.findMany({
      where: { classId: class1B.id },
      include: {
        course: true,
        createdBy: true,
        assignments: { include: { profile: true } },
        progresses: true,
      },
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    }),
    prisma.assignment.findMany({
      where: { classId: class1B.id },
      include: {
        course: true,
        createdBy: true,
        submissions: { include: { profile: true } },
      },
      orderBy: { deadline: "asc" },
    }),
    prisma.material.findMany({
      where: { course: { classId: class1B.id } },
      include: {
        course: true,
        topic: true,
        uploadedBy: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.announcement.findMany({
      where: { classId: class1B.id },
      include: { createdBy: true },
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    }),
  ]);

  if (isManagementView) {
    const [totalMembers, recentActivities] = await Promise.all([
      prisma.classMembership.count({ where: { classId: class1B.id } }),
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { actor: true },
      }),
    ]);

    const stats = {
      totalMembers,
      totalTasks: tasks.length,
      totalMaterials: materials.length,
      totalAssignments: assignments.length,
      totalAnnouncements: announcements.length,
    };

    return (
      <AdminPjDashboard
        session={session}
        stats={stats}
        tasks={tasks}
        assignments={assignments}
        recentActivities={recentActivities}
      />
    );
  }

  return (
    <MemberDashboard
      session={session}
      tasks={tasks}
      assignments={assignments}
      materials={materials}
      announcements={announcements}
    />
  );
}
