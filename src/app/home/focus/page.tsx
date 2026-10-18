import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { FocusRoomClient } from "./FocusRoomClient";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function FocusPage() {
  await requireUser();

  const class1B = await prisma.class.findUnique({
    where: { code: "1-B" },
  });

  if (!class1B) return null;

  // Load available courses and active tasks for optional assignment in focus session
  const [courses, tasks] = await Promise.all([
    prisma.course.findMany({
      where: { classId: class1B.id },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: { classId: class1B.id },
      select: { id: true, title: true, courseId: true },
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Ruang Fokus Belajar</h1>
            <Badge variant="outline" className="text-[10px] bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              Pribadi
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tingkatkan konsentrasi belajar dengan metode Pomodoro atau Stopwatch. Waktu fokus tercatat privat hanya untuk Anda.
          </p>
        </div>
      </div>

      <FocusRoomClient courses={courses} tasks={tasks} />
    </div>
  );
}
