import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { visibleCoursesWhere } from "@/lib/courses/course-filter";
import { GlossaryPageClient } from "@/components/glossary/GlossaryPageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kosakata Pribadi | Kelas 1-B",
  description: "Kamus istilah mandiri dan catatan konsep perkuliahan untuk mahasiswa Kelas 1-B.",
};

export default async function KosakataPage() {
  const session = await requireUser();

  // Ambil daftar mata kuliah yang dapat diakses oleh user ini
  const courses = await prisma.course.findMany({
    where: {
      ...visibleCoursesWhere(session, { includeArchived: false }),
    },
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <GlossaryPageClient courses={courses} />
    </div>
  );
}
