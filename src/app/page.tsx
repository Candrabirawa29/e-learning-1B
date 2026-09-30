import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { Navbar } from "@/components/layout/Navbar";
import {
  PublicDashboard,
  PublicTaskItem,
  PublicMaterialItem,
  PublicAnnouncementItem,
  PublicCourseItem,
} from "@/components/dashboard/PublicDashboard";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getCurrentSession();

  // Jika sudah login dan bukan mode View-As Guest, arahkan ke dashboard privat /home
  if (session.user && !session.isViewAs) {
    if (session.profile?.mustChangePassword) {
      redirect("/change-password");
    }
    redirect("/home");
  }

  // Ambil data publik kelas 1-B
  let tasks: PublicTaskItem[] = [];
  let materials: PublicMaterialItem[] = [];
  let announcements: PublicAnnouncementItem[] = [];
  let courses: PublicCourseItem[] = [];

  try {
    const class1B = await prisma.class.findUnique({ where: { code: "1-B" } });
    if (class1B) {
      [tasks, materials, announcements, courses] = await Promise.all([
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
        prisma.material.findMany({
          where: {
            course: { classId: class1B.id },
            visibility: "PUBLIC",
          },
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
        prisma.course.findMany({
          where: { classId: class1B.id },
          orderBy: { name: "asc" },
        }),
      ]);
    }
  } catch (error) {
    console.error("Gagal memuat data publik (database belum terhubung):", error);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar session={session} />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <PublicDashboard
          tasks={tasks}
          materials={materials}
          announcements={announcements}
          courses={courses}
        />
      </main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground bg-muted/20">
        Class 1-B Task Management & E-Learning Platform • Dikembangkan untuk satu kelas internal: 1-B
      </footer>
    </div>
  );
}
