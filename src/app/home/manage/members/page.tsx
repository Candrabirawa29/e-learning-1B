import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { MemberTable } from "@/components/members/MemberTable";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ManageMembersPage() {
  const [session, class1B] = await Promise.all([
    requireAdmin(),
    prisma.class.findUnique({ where: { code: "1-B" } }),
  ]);
  if (!class1B) return null;

  const rawMemberships = await prisma.classMembership.findMany({
    where: { classId: class1B.id },
    include: { profile: true },
    orderBy: [{ role: "asc" }, { profile: { email: "asc" } }],
  });

  const memberList = rawMemberships.map((m) => ({
    id: m.profile.id,
    email: m.profile.email,
    name: m.profile.name,
    mustChangePassword: m.profile.mustChangePassword,
    isActive: m.profile.isActive,
    lastLoginAt: m.profile.lastLoginAt,
    createdAt: m.profile.createdAt,
    role: m.role,
  }));

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">Manajemen Anggota Kelas 1-B</h1>
          <Badge variant="outline" className="text-[10px] bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300">
            Admin Only
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Kelola peran pengguna (Member, PJ, Admin), reset kata sandi mahasiswa, dan pantau status akun mahasiswa Kelas 1-B.
        </p>
      </div>

      <MemberTable members={memberList} session={session} />
    </div>
  );
}
