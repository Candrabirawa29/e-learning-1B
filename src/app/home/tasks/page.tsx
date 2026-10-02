import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { canCreateTask } from "@/lib/auth/rbac";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskKanban } from "@/components/tasks/TaskKanban";
import { TaskCalendar } from "@/components/tasks/TaskCalendar";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LayoutList, Columns, Calendar, UserCheck, Users, Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomeTasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string;
    view?: string;
    course?: string;
    priority?: string;
    status?: string;
    sort?: string;
    q?: string;
  }>;
}) {
  const [params, session, class1B] = await Promise.all([
    searchParams,
    getCurrentSession(),
    prisma.class.findUnique({ where: { code: "1-B" } }),
  ]);

  if (!class1B) return null;

  const isGuest = session.effectiveRole === "GUEST" || !session.user || !session.profile;

  // Default scope: jika login default "mine", jika guest hanya "all"
  const defaultScope = isGuest ? "all" : "mine";
  const activeScope = isGuest ? "all" : (params.scope === "all" ? "all" : defaultScope);
  const activeView = params.view || "table";

  // Filter tasks berdasarkan scope
  const taskWhereCondition = {
    classId: class1B.id,
    ...(activeScope === "mine" && session.profile
      ? {
        OR: [
          { targetType: "ALL" as const },
          { assignments: { some: { profileId: session.profile.id } } },
        ],
      }
      : {}),
  };

  const [tasks, courses, members] = await Promise.all([
    prisma.task.findMany({
      where: taskWhereCondition,
      include: {
        course: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        assignments: {
          include: {
            profile: { select: { id: true, name: true, email: true } },
          },
        },
        progresses: {
          include: {
            profile: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    }),
    prisma.course.findMany({
      where: { classId: class1B.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
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

  // Helper link helper preserving other query params
  const createScopeUrl = (targetScope: "mine" | "all") => {
    const sp = new URLSearchParams();
    if (params.view) sp.set("view", params.view);
    if (params.course) sp.set("course", params.course);
    if (params.priority) sp.set("priority", params.priority);
    if (params.status) sp.set("status", params.status);
    if (params.sort) sp.set("sort", params.sort);
    if (params.q) sp.set("q", params.q);
    sp.set("scope", targetScope);
    return `/home/tasks?${sp.toString()}`;
  };

  const createViewUrl = (targetView: "table" | "kanban" | "calendar") => {
    const sp = new URLSearchParams();
    sp.set("scope", activeScope);
    if (params.course) sp.set("course", params.course);
    if (params.priority) sp.set("priority", params.priority);
    if (params.status) sp.set("status", params.status);
    if (params.sort) sp.set("sort", params.sort);
    if (params.q) sp.set("q", params.q);
    sp.set("view", targetView);
    return `/home/tasks?${sp.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Manajemen Tugas Kelas 1-B</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kelola penugasan mata kuliah, jadwal tenggat waktu, dan pantau progres pengerjaan personal.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Toggle Tugas Saya vs Semua Tugas */}
          {!isGuest && (
            <div className="inline-flex items-center rounded-lg border bg-muted/40 p-0.5 text-xs">
              <Link
                href={createScopeUrl("mine")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${activeScope === "mine"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                Tugas Saya
              </Link>
              <Link
                href={createScopeUrl("all")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${activeScope === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Users className="h-3.5 w-3.5" />
                Semua Tugas
              </Link>
            </div>
          )}

          {showCreateButton && (
            <TaskFormDialog
              mode="create"
              courses={courses}
              members={members}
              triggerButton={
                <Button size="sm" className="h-8 gap-1.5 text-xs font-medium">
                  <Plus className="h-3.5 w-3.5" />
                  Buat Tugas
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* Tabs View: Tabel, Kanban, Kalender */}
      <Tabs defaultValue={activeView} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="h-8 p-0.5 bg-muted">
            <TabsTrigger
              value="table"
              nativeButton={false}
              render={
                <Link href={createViewUrl("table")} className="flex items-center gap-1.5">
                  <LayoutList className="h-3.5 w-3.5" />
                  Tabel
                </Link>
              }
              className="text-xs h-7 px-3"
            />
            <TabsTrigger
              value="kanban"
              nativeButton={false}
              render={
                <Link href={createViewUrl("kanban")} className="flex items-center gap-1.5">
                  <Columns className="h-3.5 w-3.5" />
                  Kanban
                </Link>
              }
              className="text-xs h-7 px-3"
            />
            <TabsTrigger
              value="calendar"
              nativeButton={false}
              render={
                <Link href={createViewUrl("calendar")} className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Kalender
                </Link>
              }
              className="text-xs h-7 px-3"
            />
          </TabsList>

          <span className="text-xs text-muted-foreground hidden sm:inline">
            Scope aktif: <strong>{activeScope === "mine" ? "Tugas Saya" : "Semua Tugas"}</strong>
          </span>
        </div>

        <TabsContent value="table" className="m-0">
          <TaskList tasks={tasks} courses={courses} members={members} session={session} />
        </TabsContent>

        <TabsContent value="kanban" className="m-0">
          <TaskKanban tasks={tasks} courses={courses} members={members} session={session} />
        </TabsContent>

        <TabsContent value="calendar" className="m-0">
          <TaskCalendar tasks={tasks} courses={courses} members={members} session={session} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
