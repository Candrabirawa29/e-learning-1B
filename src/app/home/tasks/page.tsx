import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { canCreateTask } from "@/lib/auth/rbac";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskKanban } from "@/components/tasks/TaskKanban";
import { TaskCalendar } from "@/components/tasks/TaskCalendar";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutList, Columns, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomeTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await requireUser();
  const { view = "table" } = await searchParams;

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

  const showCreateButton = canCreateTask(session);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Semua Tugas Kelas 1-B</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Daftar lengkap tugas akademik, progres kelas, dan jadwal tenggat waktu.
          </p>
        </div>

        {showCreateButton && (
          <CreateTaskDialog courses={courses} members={members} />
        )}
      </div>

      <Tabs defaultValue={view} className="space-y-4">
        <TabsList className="h-8 p-0.5 bg-muted">
          <TabsTrigger value="table" className="text-xs h-7 px-3 gap-1.5">
            <LayoutList className="h-3.5 w-3.5" />
            Tabel
          </TabsTrigger>
          <TabsTrigger value="kanban" className="text-xs h-7 px-3 gap-1.5">
            <Columns className="h-3.5 w-3.5" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="calendar" className="text-xs h-7 px-3 gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Kalender
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="m-0">
          <TaskList tasks={tasks} courses={courses} session={session} />
        </TabsContent>

        <TabsContent value="kanban" className="m-0">
          <TaskKanban tasks={tasks} session={session} />
        </TabsContent>

        <TabsContent value="calendar" className="m-0">
          <TaskCalendar tasks={tasks} session={session} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
