import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { AuditLogClient } from "@/components/audit/AuditLogClient";
import { ActivityAction, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    actor?: string;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const q = params.q?.trim() || "";
  const actor = params.actor || "all";
  const action = params.action || "all";
  const entityType = params.entityType || "all";
  const startDate = params.startDate || "";
  const endDate = params.endDate || "";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const pageSize = 25;
  const skip = (page - 1) * pageSize;

  const where: Prisma.ActivityLogWhereInput = {};

  if (actor !== "all") {
    where.actorId = actor;
  }

  if (
    action !== "all" &&
    Object.values(ActivityAction).includes(action as ActivityAction)
  ) {
    where.action = action as ActivityAction;
  }

  if (entityType !== "all") {
    where.entityType = {
      equals: entityType,
      mode: "insensitive",
    };
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      where.createdAt.gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (q) {
    const matchingActions = Object.values(ActivityAction).filter((act) =>
      act.toLowerCase().includes(q.toLowerCase())
    );

    where.AND = [
      ...(where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []),
      {
        OR: [
          { actor: { name: { contains: q, mode: "insensitive" } } },
          { actor: { email: { contains: q, mode: "insensitive" } } },
          { entityType: { contains: q, mode: "insensitive" } },
          { metadata: { contains: q, mode: "insensitive" } },
          ...(matchingActions.length > 0 ? [{ action: { in: matchingActions } }] : []),
        ],
      },
    ];
  }

  const [logs, totalCount, actors, distinctEntityTypes] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      take: pageSize,
      skip,
      orderBy: { createdAt: "desc" },
      include: {
        actor: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    }),
    prisma.activityLog.count({ where }),
    prisma.profile.findMany({
      where: {
        activityLogs: { some: {} },
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.activityLog.findMany({
      select: { entityType: true },
      distinct: ["entityType"],
      orderBy: { entityType: "asc" },
    }),
  ]);

  const allActions = Object.values(ActivityAction);
  const allEntityTypes = Array.from(
    new Set([
      "Task",
      "Material",
      "User",
      "Assignment",
      "Announcement",
      ...distinctEntityTypes.map((e) => e.entityType).filter(Boolean),
    ])
  ).sort();

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">Log Aktivitas & Audit Sistem</h1>
          <Badge
            variant="outline"
            className="text-[10px] bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300"
          >
            Admin Only
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Rekam jejak seluruh mutasi penting: pembuatan dan perubahan tugas, upload materi, perubahan role, pengumpulan tugas, dan aktivitas sistem.
        </p>
      </div>

      <AuditLogClient
        logs={logs}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        actors={actors}
        actions={allActions}
        entityTypes={allEntityTypes}
        currentFilters={{
          q,
          actor,
          action,
          entityType,
          startDate,
          endDate,
        }}
      />
    </div>
  );
}
