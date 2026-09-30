import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { Navbar } from "@/components/layout/Navbar";
import { AnnouncementList, AnnouncementItem } from "@/components/announcements/AnnouncementList";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function PublicAnnouncementsPage() {
  const session = await getCurrentSession();

  let announcements: AnnouncementItem[] = [];

  try {
    const class1B = await prisma.class.findUnique({ where: { code: "1-B" } });
    if (class1B) {
      announcements = await prisma.announcement.findMany({
        where: { classId: class1B.id },
        include: { createdBy: true },
        orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      });
    }
  } catch (error) {
    console.error("Gagal memuat pengumuman publik:", error);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar session={session} />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
        <div className="border-b pb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Pengumuman Resmi Kelas 1-B</h1>
            <Badge variant="outline" className="text-[10px]">Publik</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Papan informasi pengumuman akademik resmi, perubahan jadwal, dan instruksi perkuliahan.
          </p>
        </div>

        <AnnouncementList announcements={announcements} session={session} />
      </main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground bg-muted/20">
        Class 1-B Task Management & E-Learning Platform • Dikembangkan untuk satu kelas internal: 1-B
      </footer>
    </div>
  );
}
