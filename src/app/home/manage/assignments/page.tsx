import { prisma } from "@/lib/prisma";
import { requirePJOrAdmin } from "@/lib/auth/session";
import { AssignmentList } from "@/components/assignments/AssignmentList";
import { CreateAssignmentDialog } from "@/components/assignments/CreateAssignmentDialog";

export const dynamic = "force-dynamic";

export default async function ManageAssignmentsPage() {
  const session = await requirePJOrAdmin();

  const class1B = await prisma.class.findUnique({ where: { code: "1-B" } });
  if (!class1B) return null;

  const [assignments, courses] = await Promise.all([
    prisma.assignment.findMany({
      where: { classId: class1B.id },
      include: {
        course: true,
        createdBy: true,
        submissions: {
          include: { profile: true },
        },
      },
      orderBy: { deadline: "asc" },
    }),
    prisma.course.findMany({
      where: { classId: class1B.id },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Manajemen Penugasan & Praktikum</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Buat instruksi penugasan, atur batas waktu pengumpulan, dan tinjau berkas yang dikumpulkan mahasiswa.
          </p>
        </div>

        <CreateAssignmentDialog courses={courses} />
      </div>

      <AssignmentList
        assignments={assignments}
        courses={courses}
        session={session}
      />
    </div>
  );
}
