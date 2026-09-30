import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { canCreateAnnouncement } from "@/lib/auth/rbac";
import { AnnouncementList } from "@/components/announcements/AnnouncementList";
import { CreateAnnouncementDialog } from "@/components/announcements/CreateAnnouncementDialog";

export const dynamic = "force-dynamic";

export default async function HomeAnnouncementsPage() {
  const [session, class1B] = await Promise.all([
    requireUser(),
    prisma.class.findUnique({ where: { code: "1-B" } }),
  ]);
  if (!class1B) return null;

  const announcements = await prisma.announcement.findMany({
    where: { classId: class1B.id },
    include: { createdBy: true },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
  });

  const canCreate = canCreateAnnouncement(session);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Pengumuman Kelas 1-B</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Papan informasi resmi terkait perkuliahan, jadwal responsi, dan instruksi akademik.
          </p>
        </div>

        {canCreate && <CreateAnnouncementDialog />}
      </div>

      <AnnouncementList announcements={announcements} session={session} />
    </div>
  );
}
