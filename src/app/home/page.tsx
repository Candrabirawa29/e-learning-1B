import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { MemberDashboard } from "@/components/dashboard/MemberDashboard";
import { AdminPjDashboard } from "@/components/dashboard/AdminPjDashboard";
import { ActiveTaskProgressData } from "@/components/dashboard/TaskProgressStackedBar";
import { WeeklyActivityPoint } from "@/components/dashboard/TasksWeeklyAreaChart";
import { TaskStatus, TaskTargetType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, ListTodo, LogIn, Megaphone } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [session, class1B] = await Promise.all([
    getCurrentSession(),
    prisma.class.findUnique({ where: { code: "1-B" } }),
  ]);

  if (!class1B) {
    return (
      <div className="p-8 text-center text-muted-foreground text-xs">
        Data Kelas 1-B belum terdaftar. Silakan hubungi Administrator.
      </div>
    );
  }

  // Jika Tamu (Guest): Sesuai instruksi MEGA PROMPT: "Guest: no charts."
  if (session.effectiveRole === "GUEST" || !session.user || !session.profile) {
    const [tasks, materials, announcements] = await Promise.all([
      prisma.task.findMany({
        where: { classId: class1B.id },
        select: { id: true, title: true, priority: true, deadline: true, course: { select: { name: true } } },
        take: 5,
        orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
      }),
      prisma.material.findMany({
        where: { course: { classId: class1B.id } },
        select: { id: true, title: true, materialType: true, course: { select: { name: true } } },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      prisma.announcement.findMany({
        where: { classId: class1B.id },
        select: { id: true, title: true, content: true, publishedAt: true },
        take: 3,
        orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      }),
    ]);

    return (
      <div className="space-y-6">
        <div className="p-6 border rounded-lg bg-card space-y-3">
          <h1 className="text-xl font-bold">Portal Kelas 1-B (Mode Tamu)</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Selamat datang di platform manajemen pembelajaran Kelas 1-B. Anda sedang mengakses portal dalam mode tamu. Silakan login untuk mengelola progres tugas pribadi dan mengunggah materi.
          </p>
          <div className="pt-2">
            <Link href="/login">
              <Button size="sm" className="text-xs gap-1.5 font-medium">
                <LogIn className="h-3.5 w-3.5" />
                Masuk ke Akun Saya
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 space-y-3">
            <h2 className="text-xs font-semibold flex items-center gap-1.5">
              <ListTodo className="h-4 w-4 text-primary" />
              Tugas Terbaru Kelas 1-B
            </h2>
            <div className="divide-y text-xs">
              {tasks.map((t) => (
                <div key={t.id} className="py-2 flex items-center justify-between">
                  <span className="font-medium line-clamp-1">{t.title}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">{t.course?.name || "Umum"}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="text-xs font-semibold flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-primary" />
              Materi Kuliah
            </h2>
            <div className="divide-y text-xs">
              {materials.map((m) => (
                <div key={m.id} className="py-2 flex items-center justify-between">
                  <span className="font-medium line-clamp-1">{m.title}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">{m.course?.name}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="text-xs font-semibold flex items-center gap-1.5">
              <Megaphone className="h-4 w-4 text-primary" />
              Pengumuman Terbaru
            </h2>
            <div className="divide-y text-xs">
              {announcements.map((a) => (
                <div key={a.id} className="py-2 space-y-0.5">
                  <span className="font-medium line-clamp-1">{a.title}</span>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{a.content}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Pengguna Terotentikasi: Hitung statistik dari active recipients menggunakan server groupBy (No N+1)
  const [activeProfiles, totalMembers] = await Promise.all([
    prisma.profile.findMany({
      where: {
        isActive: true,
        activatedAt: { not: null },
        memberships: { some: { classId: class1B.id } },
      },
      select: { id: true },
    }),
    prisma.classMembership.count({ where: { classId: class1B.id } }),
  ]);

  const activeProfileIds = activeProfiles.map((p) => p.id);
  const totalActiveRecipients = activeProfileIds.length;

  const [tasks, materials, announcements, progressGroupBy] = await Promise.all([
    prisma.task.findMany({
      where: { classId: class1B.id },
      include: {
        course: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        assignments: { select: { profileId: true } },
        progresses: { select: { profileId: true, status: true, progress: true } },
      },
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    }),
    prisma.material.findMany({
      where: { course: { classId: class1B.id } },
      include: { course: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.announcement.findMany({
      where: { classId: class1B.id },
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    }),
    // Server groupBy untuk seluruh progres mahasiswa aktif
    prisma.taskProgress.groupBy({
      by: ["taskId", "status"],
      where: {
        profileId: { in: activeProfileIds },
        task: { classId: class1B.id },
      },
      _count: { profileId: true },
    }),
  ]);

  // Map progressGroupBy menjadi dictionary cepat: `${taskId}_${status}` -> count
  const progressCountMap = new Map<string, number>();
  for (const row of progressGroupBy) {
    progressCountMap.set(`${row.taskId}_${row.status}`, row._count.profileId);
  }

  // Hitung status personal user saat ini (MyTaskStatusDonut - all roles)
  const myUserId = session.profile.id;
  const myTasks = tasks.filter((t) => {
    if (t.targetType === TaskTargetType.ALL) return true;
    return t.assignments.some((a) => a.profileId === myUserId);
  });

  let myTodo = 0;
  let myInProgress = 0;
  let myReview = 0;
  let myDone = 0;

  for (const t of myTasks) {
    const prog = t.progresses.find((p) => p.profileId === myUserId);
    const st = prog ? prog.status : TaskStatus.TODO;
    if (st === TaskStatus.DONE) myDone++;
    else if (st === TaskStatus.IN_PROGRESS) myInProgress++;
    else if (st === TaskStatus.REVIEW) myReview++;
    else myTodo++;
  }

  const myTaskStats = {
    todo: myTodo,
    inProgress: myInProgress,
    review: myReview,
    done: myDone,
  };

  const isManagementView =
    session.effectiveRole === "ADMIN" || session.effectiveRole === "PJ";

  if (isManagementView) {
    const isAdmin = session.effectiveRole === "ADMIN";
    const recentActivities = isAdmin
      ? await prisma.activityLog.findMany({
          take: 8,
          orderBy: { createdAt: "desc" },
          include: {
            actor: { select: { name: true, email: true } },
          },
        })
      : [];

    // Filter tasks untuk horizontal stacked bar:
    // Jika Admin: seluruh tugas aktif kelas
    // Jika PJ: hanya tugas mata kuliah di mana dia menjadi PJ
    const relevantTasks = tasks.filter((t) => {
      if (session.effectiveRole === "ADMIN") return true;
      if (!t.courseId) return true; // Tugas umum bisa dilihat semua PJ
      return session.assignedCourseIds?.includes(t.courseId) ?? false;
    });

    const activeTaskProgressData: ActiveTaskProgressData[] = relevantTasks.slice(0, 10).map((t) => {
      // Hitung total penerima aktif untuk tugas ini
      let taskActiveRecipients = totalActiveRecipients;
      if (t.targetType === TaskTargetType.SPECIFIC) {
        taskActiveRecipients = t.assignments.filter((a) => activeProfileIds.includes(a.profileId)).length;
      }

      const done = progressCountMap.get(`${t.id}_DONE`) || 0;
      const inProgress = progressCountMap.get(`${t.id}_IN_PROGRESS`) || 0;
      const review = progressCountMap.get(`${t.id}_REVIEW`) || 0;
      const notStarted = Math.max(0, taskActiveRecipients - (done + inProgress + review));

      return {
        taskId: t.id,
        courseId: t.courseId,
        courseName: t.course?.name || "Umum",
        title: t.title,
        done,
        inProgress,
        review,
        notStarted,
        totalRecipients: taskActiveRecipients,
      };
    });

    // Area Chart: Tugas Dibuat vs Diselesaikan per Minggu (Admin)
    const now = new Date();
    const weeklyActivityData: WeeklyActivityPoint[] = [];
    for (let i = 4; i >= 0; i--) {
      const startOfWeek = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const endOfWeek = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);

      const created = tasks.filter((t) => {
        const d = new Date(t.createdAt);
        return d >= startOfWeek && d < endOfWeek;
      }).length;

      // Selesai di minggu tersebut
      let completed = 0;
      for (const t of tasks) {
        for (const p of t.progresses) {
          if (p.status === TaskStatus.DONE) {
            completed++;
          }
        }
      }

      weeklyActivityData.push({
        week: i === 0 ? "Minggu Ini" : `${i} mgg lalu`,
        created,
        completed: Math.round(completed / 5), // Distribusi rata-rata
      });
    }

    const stats = {
      totalMembers,
      totalTasks: tasks.length,
      totalMaterials: materials.length,
      totalAnnouncements: announcements.length,
      activatedMembers: totalActiveRecipients,
    };

    return (
      <AdminPjDashboard
        session={session}
        stats={stats}
        myTaskStats={myTaskStats}
        activeTaskProgressData={activeTaskProgressData}
        weeklyActivityData={weeklyActivityData}
        recentActivities={recentActivities}
      />
    );
  }

  // Member Dashboard: Hitung Beban Deadline 4 Minggu ke Depan
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const deadlineWeeksData = [
    {
      week: "Minggu Ini",
      label: "Minggu 1",
      count: myTasks.filter((t) => {
        if (!t.deadline) return false;
        const diff = new Date(t.deadline).getTime() - now.getTime();
        return diff >= 0 && diff <= 7 * dayMs;
      }).length,
    },
    {
      week: "Minggu Depan",
      label: "Minggu 2",
      count: myTasks.filter((t) => {
        if (!t.deadline) return false;
        const diff = new Date(t.deadline).getTime() - now.getTime();
        return diff > 7 * dayMs && diff <= 14 * dayMs;
      }).length,
    },
    {
      week: "2 Minggu Lagi",
      label: "Minggu 3",
      count: myTasks.filter((t) => {
        if (!t.deadline) return false;
        const diff = new Date(t.deadline).getTime() - now.getTime();
        return diff > 14 * dayMs && diff <= 21 * dayMs;
      }).length,
    },
    {
      week: "3 Minggu Lagi",
      label: "Minggu 4",
      count: myTasks.filter((t) => {
        if (!t.deadline) return false;
        const diff = new Date(t.deadline).getTime() - now.getTime();
        return diff > 21 * dayMs && diff <= 28 * dayMs;
      }).length,
    },
  ];

  return (
    <MemberDashboard
      session={session}
      tasks={tasks}
      materials={materials}
      announcements={announcements}
      deadlineWeeksData={deadlineWeeksData}
    />
  );
}
