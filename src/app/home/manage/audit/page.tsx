import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTimeIndo } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireAdmin();

  const logs = await prisma.activityLog.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { actor: true },
  });

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">Log Aktivitas & Audit Sistem</h1>
          <Badge variant="outline" className="text-[10px] bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300">
            Admin Only
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Rekam jejak seluruh mutasi penting: pembuatan tugas, upload materi, perubahan role, pengumpulan tugas, dan reset password.
        </p>
      </div>

      <div className="border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 text-[11px]">
              <TableHead className="w-[20%]">Waktu</TableHead>
              <TableHead className="w-[20%]">Pengguna (Aktor)</TableHead>
              <TableHead className="w-[20%]">Aksi</TableHead>
              <TableHead className="w-[15%]">Tipe Entitas</TableHead>
              <TableHead className="w-[25%]">Detail / Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">
                  Belum ada log aktivitas yang tercatat.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="text-xs">
                  <TableCell className="text-muted-foreground text-[11px] whitespace-nowrap">
                    {formatDateTimeIndo(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">
                      {log.actor?.name || log.actor?.email?.split("@")[0] || "Sistem"}
                    </div>
                    {log.actor?.email && (
                      <div className="text-[11px] text-muted-foreground">{log.actor.email}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                      {log.action.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{log.entityType}</TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground max-w-xs truncate">
                    {log.metadata || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
