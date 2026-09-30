import { prisma } from "@/lib/prisma";
import { requirePJOrAdmin } from "@/lib/auth/session";
import { MaterialList } from "@/components/materials/MaterialList";
import { UploadMaterialDialog } from "@/components/materials/UploadMaterialDialog";
import { getStorageFileUrl } from "@/lib/supabase/storage";

export const dynamic = "force-dynamic";

export default async function ManageMaterialsPage() {
  const [session, class1B] = await Promise.all([
    requirePJOrAdmin(),
    prisma.class.findUnique({ where: { code: "1-B" } }),
  ]);
  if (!class1B) return null;

  const [rawMaterials, courses] = await Promise.all([
    prisma.material.findMany({
      where: { course: { classId: class1B.id } },
      include: {
        course: true,
        topic: true,
        uploadedBy: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.findMany({
      where: { classId: class1B.id },
      include: {
        topics: { orderBy: { orderIndex: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const materialsWithUrls = await Promise.all(
    rawMaterials.map(async (m) => {
      let downloadUrl = m.externalUrl || undefined;
      if (m.storagePath) {
        try {
          downloadUrl = await getStorageFileUrl("materials", m.storagePath);
        } catch (e) {
          console.error("Gagal mendapatkan storage URL:", e);
        }
      }
      return {
        ...m,
        downloadUrl,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Manajemen Materi Perkuliahan</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Unggah modul ajar, slide presentasi, tautan eksternal, dan arsip pembelajaran terpadu.
          </p>
        </div>

        <UploadMaterialDialog courses={courses} />
      </div>

      <MaterialList
        materials={materialsWithUrls}
        courses={courses}
        session={session}
      />
    </div>
  );
}
