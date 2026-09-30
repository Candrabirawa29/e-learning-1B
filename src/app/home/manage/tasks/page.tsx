import { prisma } from "@/lib/prisma";
import { requirePJOrAdmin } from "@/lib/auth/session";
import { TaskList } from "@/components/tasks/TaskList";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";

export const dynamic = "force-dynamic";

export default async function ManageTasksPage() {
  const session = await requirePJOrAdmin();

  const class1B = await prisma.class.findUnique({ where: { code: "1-B" } });
  if (!class1B) return null;

  const [tasks, courses, members] = await Promise.all([
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
    prisma.profile.findMany({
      where: {
        memberships: {
          some: { classId: class1B.id },
        },
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Manajemen Tugas Kelas 1-B</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Buat, kelola penugasan target kelas atau kelompok mahasiswa tertentu, dan pantau progres pengerjaan.
          </p>
        </div>

        <CreateTaskDialog courses={courses} members={members} />
      </div>

      <TaskList tasks={tasks} courses={courses} session={session} />
    </div>
  );
}
