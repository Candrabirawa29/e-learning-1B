import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { Navbar } from "@/components/layout/Navbar";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskDetailData } from "@/components/tasks/TaskDetailModal";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function PublicTasksPage() {
  const session = await getCurrentSession();

  let tasks: TaskDetailData[] = [];
  let courses: { id: string; name: string }[] = [];

  try {
    const class1B = await prisma.class.findUnique({ where: { code: "1-B" } });
    if (class1B) {
      [tasks, courses] = await Promise.all([
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
        prisma.course.findMany({
          where: { classId: class1B.id },
          orderBy: { name: "asc" },
        }),
      ]);
    }
  } catch (error) {
    console.error("Gagal memuat tugas publik:", error);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar session={session} />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Daftar Tugas Kelas 1-B</h1>
              <Badge variant="outline" className="text-[10px]">Publik</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pantau jadwal tenggat waktu dan agenda tugas perkuliahan seluruh mahasiswa kelas 1-B.
            </p>
          </div>
        </div>

        <TaskList tasks={tasks} courses={courses} session={session} />
      </main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground bg-muted/20">
        Class 1-B Task Management & E-Learning Platform • Dikembangkan untuk satu kelas internal: 1-B
      </footer>
    </div>
  );
}
