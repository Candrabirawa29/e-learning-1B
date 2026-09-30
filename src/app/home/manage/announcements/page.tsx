import { prisma } from "@/lib/prisma";
import { requirePJOrAdmin } from "@/lib/auth/session";
import { AnnouncementList } from "@/components/announcements/AnnouncementList";
import { CreateAnnouncementDialog } from "@/components/announcements/CreateAnnouncementDialog";

export const dynamic = "force-dynamic";

export default async function ManageAnnouncementsPage() {
  const session = await requirePJOrAdmin();

  const class1B = await prisma.class.findUnique({ where: { code: "1-B" } });
  if (!class1B) return null;

  const announcements = await prisma.announcement.findMany({
    where: { classId: class1B.id },
    include: { createdBy: true },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Manajemen Pengumuman Kelas</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Publikasikan atau sematkan pengumuman penting untuk seluruh mahasiswa kelas 1-B.
          </p>
        </div>

        <CreateAnnouncementDialog />
      </div>

      <AnnouncementList announcements={announcements} session={session} />
    </div>
  );
}
