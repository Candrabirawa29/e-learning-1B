import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { Navbar } from "@/components/layout/Navbar";
import { MaterialList, MaterialItem } from "@/components/materials/MaterialList";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function PublicMaterialsPage() {
  const session = await getCurrentSession();

  let materials: MaterialItem[] = [];
  let courses: { id: string; name: string }[] = [];

  try {
    const class1B = await prisma.class.findUnique({ where: { code: "1-B" } });
    if (class1B) {
      [materials, courses] = await Promise.all([
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
        prisma.course.findMany({
          where: { classId: class1B.id },
          orderBy: { name: "asc" },
        }),
      ]);
    }
  } catch (error) {
    console.error("Gagal memuat materi publik:", error);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar session={session} />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Katalog Materi Pembelajaran</h1>
              <Badge variant="outline" className="text-[10px]">Publik</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Arsip bahan kuliah, slide presentasi, dokumen modul, dan referensi akademik Kelas 1-B.
            </p>
          </div>
        </div>

        <MaterialList materials={materials} courses={courses} session={session} />
      </main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground bg-muted/20">
        Class 1-B Task Management & E-Learning Platform • Dikembangkan untuk satu kelas internal: 1-B
      </footer>
    </div>
  );
}
