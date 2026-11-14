import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { siteConfig } from "@/lib/config";
import { getWibDayOfWeek } from "@/lib/datetime";
import { dayOfWeekToIndo } from "@/lib/date";
import { Navbar } from "@/components/layout/Navbar";
import { PublicDashboard } from "@/components/dashboard/PublicDashboard";

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.title}`,
  description: siteConfig.description,
};

export const revalidate = 60;

/**
 * Server-side cached data fetcher untuk landing page publik.
 * Agregasi terbatas: 1 pengumuman publik, 5 deadline terdekat, jadwal hari ini, 3 materi publik terbaru.
 */
const getCachedPublicData = unstable_cache(
  async (classCode: string, dayOfWeek: number) => {
    try {
      const classRecord =
        (await prisma.class.findUnique({ where: { code: classCode } })) ||
        (await prisma.class.findFirst());

      if (!classRecord) {
        return {
          announcement: null,
          tasks: [],
          schedules: [],
          materials: [],
        };
      }

      const [announcement, tasks, schedules, materials] = await Promise.all([
        // 1. Pengumuman terpilih (Hanya yang berstatus PUBLIC, prioritaskan isPinned)
        prisma.announcement.findFirst({
          where: {
            classId: classRecord.id,
            visibility: "PUBLIC",
          },
          select: {
            id: true,
            title: true,
            content: true,
            isPinned: true,
            publishedAt: true,
          },
          orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
        }),

        // 2. Maksimal 5 deadline terdekat
        prisma.task.findMany({
          where: {
            classId: classRecord.id,
            OR: [{ courseId: null }, { course: { kind: "REGULAR", archivedAt: null } }],
            deadline: { not: null },
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            deadline: true,
            course: { select: { name: true, code: true } },
          },
          orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
          take: 5,
        }),

        // 3. Jadwal kuliah hari ini
        prisma.courseSchedule.findMany({
          where: {
            course: { classId: classRecord.id, kind: "REGULAR", archivedAt: null },
            dayOfWeek,
          },
          select: {
            id: true,
            dayOfWeek: true,
            startMinute: true,
            endMinute: true,
            room: true,
            course: {
              select: {
                id: true,
                name: true,
                code: true,
                lecturer: true,
              },
            },
          },
          orderBy: { startMinute: "asc" },
        }),

        // 4. Maksimal 3 materi terbaru (Eksplisit PUBLIC)
        prisma.material.findMany({
          where: {
            course: {
              classId: classRecord.id,
              kind: "REGULAR",
              archivedAt: null,
            },
            visibility: "PUBLIC",
          },
          select: {
            id: true,
            title: true,
            materialType: true,
            fileUrl: true,
            externalUrl: true,
            createdAt: true,
            course: { select: { name: true } },
            topic: { select: { title: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        }),
      ]);

      return {
        announcement,
        tasks,
        schedules,
        materials,
      };
    } catch (error) {
      console.error("Gagal memuat data publik landing page:", error);
      return {
        announcement: null,
        tasks: [],
        schedules: [],
        materials: [],
      };
    }
  },
  ["public-landing-data"],
  { revalidate: 60, tags: ["public-landing", "tasks", "materials", "announcements"] }
);

export default async function HomePage() {
  const session = await getCurrentSession();

  // Jika sudah login dan bukan mode View-As Guest, arahkan ke dashboard privat /home
  if (session.user && !session.isViewAs) {
    if (session.profile?.mustChangePassword) {
      redirect("/change-password");
    }
    redirect("/home");
  }

  const currentDayOfWeek = getWibDayOfWeek();
  const todayDayName = dayOfWeekToIndo(currentDayOfWeek);

  const data = await getCachedPublicData(siteConfig.code, currentDayOfWeek);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar session={session} />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <PublicDashboard
          announcement={data.announcement}
          tasks={data.tasks}
          schedules={data.schedules}
          materials={data.materials}
          todayDayName={todayDayName}
        />
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground bg-muted/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            {siteConfig.name} • {siteConfig.footerText}
          </span>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/tasks" className="hover:underline">
              Tugas
            </Link>
            <Link href="/schedule" className="hover:underline">
              Jadwal
            </Link>
            <Link href="/materials" className="hover:underline">
              Materi
            </Link>
            <Link href="/announcements" className="hover:underline">
              Pengumuman
            </Link>
            <Link href="/login" className="hover:underline font-medium text-foreground">
              Masuk
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
