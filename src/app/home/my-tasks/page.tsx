import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskKanban } from "@/components/tasks/TaskKanban";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutList, Columns } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MyTasksPage() {
  const session = await requireUser();
  const profileId = session.profile!.id;

  const class1B = await prisma.class.findUnique({ where: { code: "1-B" } });
  if (!class1B) return null;

  // Filter tugas yang ditujukan ke ALL atau secara spesifik ditugaskan ke profileId
  const [tasks, courses] = await Promise.all([
    prisma.task.findMany({
      where: {
        classId: class1B.id,
        OR: [
          { targetType: "ALL" },
          { assignments: { some: { profileId } } },
        ],
      },
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

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-xl font-bold tracking-tight">Tugas Saya</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tugas kelas dan penugasan khusus yang ditujukan untuk Anda. Klik tugas untuk memperbarui status dan progress pengerjaan.
        </p>
      </div>

      <Tabs defaultValue="table" className="space-y-4">
        <TabsList className="h-8 p-0.5 bg-muted">
          <TabsTrigger value="table" className="text-xs h-7 px-3 gap-1.5">
            <LayoutList className="h-3.5 w-3.5" />
            Tabel Daftar
          </TabsTrigger>
          <TabsTrigger value="kanban" className="text-xs h-7 px-3 gap-1.5">
            <Columns className="h-3.5 w-3.5" />
            Kanban Board
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="m-0">
          <TaskList tasks={tasks} courses={courses} session={session} />
        </TabsContent>

        <TabsContent value="kanban" className="m-0">
          <TaskKanban tasks={tasks} session={session} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
