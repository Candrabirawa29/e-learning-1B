"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { formatDateTimeIndo } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  RotateCcw,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Layers,
  User,
  Activity,
  Code2,
  Copy,
  Check,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { ActivityAction } from "@prisma/client";

export interface AuditLogItem {
  id: string;
  createdAt: string | Date;
  action: ActivityAction;
  entityType: string;
  entityId: string | null;
  metadata: string | null;
  actor: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl?: string | null;
  } | null;
}

interface AuditLogClientProps {
  logs: AuditLogItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  actors: { id: string; name: string | null; email: string }[];
  actions: string[];
  entityTypes: string[];
  currentFilters: {
    q: string;
    actor: string;
    action: string;
    entityType: string;
    startDate: string;
    endDate: string;
  };
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  USER_LOGIN: {
    label: "User Login",
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  },
  TASK_CREATED: {
    label: "Tugas Dibuat",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  TASK_UPDATED: {
    label: "Tugas Diperbarui",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  TASK_DELETED: {
    label: "Tugas Dihapus",
    color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800",
  },
  TASK_ASSIGNED: {
    label: "Tugas Ditugaskan",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
  MATERIAL_UPLOADED: {
    label: "Materi Diunggah",
    color: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  },
  MATERIAL_DELETED: {
    label: "Materi Dihapus",
    color: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
  ASSIGNMENT_CREATED: {
    label: "Assignment Dibuat",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  ASSIGNMENT_UPDATED: {
    label: "Assignment Diperbarui",
    color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
  },
  ASSIGNMENT_DELETED: {
    label: "Assignment Dihapus",
    color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800",
  },
  SUBMISSION_CREATED: {
    label: "Tugas Dikumpulkan",
    color: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800",
  },
  ROLE_CHANGED: {
    label: "Role Diubah",
    color: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  },
  PASSWORD_RESET: {
    label: "Reset Password",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  },
};

export function AuditLogClient({
  logs,
  totalCount,
  page,
  pageSize,
  actors,
  actions,
  entityTypes,
  currentFilters,
}: AuditLogClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = React.useState(currentFilters.q);
  const [selectedLog, setSelectedLog] = React.useState<AuditLogItem | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Sync internal search term when URL changes
  React.useEffect(() => {
    setSearchTerm(currentFilters.q);
  }, [currentFilters.q]);

  // Helper untuk update query parameter di URL
  const applyFilter = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val && val !== "all" && val.trim() !== "") {
          params.set(key, val);
        } else {
          params.delete(key);
        }
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Debounced search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== currentFilters.q) {
        applyFilter({ q: searchTerm, page: "1" });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm, currentFilters.q, applyFilter]);

  const handleClearFilters = () => {
    setSearchTerm("");
    router.push(pathname, { scroll: false });
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, totalCount);

  // Check which filters are actively applied
  const hasActiveFilters = Boolean(
    currentFilters.q ||
      (currentFilters.actor && currentFilters.actor !== "all") ||
      (currentFilters.action && currentFilters.action !== "all") ||
      (currentFilters.entityType && currentFilters.entityType !== "all") ||
      currentFilters.startDate ||
      currentFilters.endDate
  );

  const selectedActorObj = actors.find((a) => a.id === currentFilters.actor);

  const copyMetadata = (raw: string) => {
    navigator.clipboard.writeText(raw);
    setCopied(true);
    toast.success("Metadata disalin ke papan klip");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* FILTER & SEARCH CARD */}
      <div className="p-4 bg-card border rounded-lg shadow-sm space-y-3">
        {/* Row 1: Search & Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari aktor, email, aksi, metadata..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-xs h-9 bg-background"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  applyFilter({ q: null, page: "1" });
                }}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Actor */}
          <div>
            <Select
              value={currentFilters.actor || "all"}
              onValueChange={(val) => applyFilter({ actor: val, page: "1" })}
            >
              <SelectTrigger className="text-xs h-9 bg-background">
                <div className="flex items-center gap-1.5 truncate">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Semua Pengguna" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Pengguna / Aktor</SelectItem>
                {actors.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name || a.email.split("@")[0]} ({a.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter Action */}
          <div>
            <Select
              value={currentFilters.action || "all"}
              onValueChange={(val) => applyFilter({ action: val, page: "1" })}
            >
              <SelectTrigger className="text-xs h-9 bg-background">
                <div className="flex items-center gap-1.5 truncate">
                  <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Semua Aksi" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Aksi Mutasi</SelectItem>
                {actions.map((act) => (
                  <SelectItem key={act} value={act}>
                    {ACTION_LABELS[act]?.label || act.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter Entity Type */}
          <div>
            <Select
              value={currentFilters.entityType || "all"}
              onValueChange={(val) => applyFilter({ entityType: val, page: "1" })}
            >
              <SelectTrigger className="text-xs h-9 bg-background">
                <div className="flex items-center gap-1.5 truncate">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Semua Tipe Entitas" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe Entitas</SelectItem>
                {entityTypes.map((et) => (
                  <SelectItem key={et} value={et}>
                    {et}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Date Range & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground flex items-center gap-1 font-medium">
              <Calendar className="h-3.5 w-3.5" />
              Periode:
            </span>
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={currentFilters.startDate || ""}
                onChange={(e) => applyFilter({ startDate: e.target.value, page: "1" })}
                className="h-8 text-xs w-36 bg-background"
                title="Tanggal Mulai"
              />
              <span className="text-muted-foreground">s/d</span>
              <Input
                type="date"
                value={currentFilters.endDate || ""}
                onChange={(e) => applyFilter({ endDate: e.target.value, page: "1" })}
                className="h-8 text-xs w-36 bg-background"
                title="Tanggal Selesai"
              />
            </div>
            {(currentFilters.startDate || currentFilters.endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyFilter({ startDate: null, endDate: null, page: "1" })}
                className="h-8 text-[11px] px-2 text-muted-foreground hover:text-foreground"
              >
                Reset Tanggal
              </Button>
            )}
          </div>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 text-xs gap-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Row 3: Active Filters Chips & Result Counter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground font-medium">
              Hasil: <strong>{totalCount}</strong> log aktivitas
              {totalCount > 0 && ` (menampilkan ${startItem}–${endItem})`}
            </span>

            {/* Active Chips */}
            {currentFilters.q && (
              <Badge variant="secondary" className="gap-1 text-[11px] font-normal py-0.5">
                Cari: &quot;{currentFilters.q}&quot;
                <X
                  className="h-3 w-3 cursor-pointer hover:text-red-500"
                  onClick={() => {
                    setSearchTerm("");
                    applyFilter({ q: null, page: "1" });
                  }}
                />
              </Badge>
            )}

            {selectedActorObj && (
              <Badge variant="secondary" className="gap-1 text-[11px] font-normal py-0.5">
                Aktor: {selectedActorObj.name || selectedActorObj.email}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-red-500"
                  onClick={() => applyFilter({ actor: null, page: "1" })}
                />
              </Badge>
            )}

            {currentFilters.action && currentFilters.action !== "all" && (
              <Badge variant="secondary" className="gap-1 text-[11px] font-normal py-0.5">
                Aksi: {ACTION_LABELS[currentFilters.action]?.label || currentFilters.action}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-red-500"
                  onClick={() => applyFilter({ action: null, page: "1" })}
                />
              </Badge>
            )}

            {currentFilters.entityType && currentFilters.entityType !== "all" && (
              <Badge variant="secondary" className="gap-1 text-[11px] font-normal py-0.5">
                Entitas: {currentFilters.entityType}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-red-500"
                  onClick={() => applyFilter({ entityType: null, page: "1" })}
                />
              </Badge>
            )}

            {(currentFilters.startDate || currentFilters.endDate) && (
              <Badge variant="secondary" className="gap-1 text-[11px] font-normal py-0.5">
                Periode: {currentFilters.startDate || "Awal"} s/d {currentFilters.endDate || "Kini"}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-red-500"
                  onClick={() => applyFilter({ startDate: null, endDate: null, page: "1" })}
                />
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="border rounded-lg bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 text-[11px]">
              <TableHead className="w-[18%]">Waktu</TableHead>
              <TableHead className="w-[20%]">Pengguna (Aktor)</TableHead>
              <TableHead className="w-[20%]">Aksi</TableHead>
              <TableHead className="w-[14%]">Entitas</TableHead>
              <TableHead className="w-[28%]">Detail / Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-36 text-center text-xs text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Activity className="h-6 w-6 text-muted-foreground/50" />
                    <span>Tidak ada log aktivitas yang cocok dengan kriteria pencarian/filter.</span>
                    {hasActiveFilters && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={handleClearFilters}
                        className="text-xs h-7 text-primary p-0"
                      >
                        Reset semua filter
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const actionMeta = ACTION_LABELS[log.action] || {
                  label: log.action.replace(/_/g, " "),
                  color: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
                };

                let parsedMeta: Record<string, unknown> | null = null;
                if (log.metadata) {
                  try {
                    parsedMeta = JSON.parse(log.metadata);
                  } catch {
                    parsedMeta = null;
                  }
                }

                return (
                  <TableRow key={log.id} className="text-xs hover:bg-muted/40 transition-colors">
                    {/* Waktu */}
                    <TableCell className="text-muted-foreground text-[11px] whitespace-nowrap">
                      {formatDateTimeIndo(log.createdAt)}
                    </TableCell>

                    {/* Aktor */}
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {log.actor?.name || log.actor?.email?.split("@")[0] || "Sistem"}
                      </div>
                      {log.actor?.email && (
                        <div className="text-[11px] text-muted-foreground">{log.actor.email}</div>
                      )}
                    </TableCell>

                    {/* Aksi */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-semibold border ${actionMeta.color}`}
                      >
                        {actionMeta.label}
                      </Badge>
                    </TableCell>

                    {/* Entitas */}
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground">
                        {log.entityType}
                      </span>
                    </TableCell>

                    {/* Detail / Metadata */}
                    <TableCell>
                      <div className="flex items-center justify-between gap-2 max-w-sm">
                        <div className="truncate font-mono text-[11px] text-muted-foreground">
                          {parsedMeta ? (
                            <span>
                              {parsedMeta.title
                                ? `"${parsedMeta.title}"`
                                : parsedMeta.actorName
                                ? `oleh ${parsedMeta.actorName}`
                                : Object.entries(parsedMeta)
                                    .slice(0, 2)
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(", ")}
                            </span>
                          ) : log.metadata ? (
                            log.metadata
                          ) : (
                            "-"
                          )}
                        </div>
                        {log.metadata && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                            className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                            title="Lihat Metadata Lengkap"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs pt-1">
          <span className="text-muted-foreground">
            Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => applyFilter({ page: String(page - 1) })}
              className="h-8 gap-1 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Sebelumnya
            </Button>

            {/* Quick Page Jump */}
            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && page > 3) {
                  pageNum = Math.min(page - 2 + i, totalPages);
                }
                const isActive = pageNum === page;
                return (
                  <Button
                    key={pageNum}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyFilter({ page: String(pageNum) })}
                    className="h-8 w-8 p-0 text-xs font-medium"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => applyFilter({ page: String(page + 1) })}
              className="h-8 gap-1 text-xs"
            >
              Selanjutnya
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* DETAIL METADATA DIALOG */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Detail Aktivitas & Metadata
            </DialogTitle>
            <DialogDescription className="text-xs">
              Rincian jejak audit untuk entitas {selectedLog?.entityType} pada{" "}
              {selectedLog ? formatDateTimeIndo(selectedLog.createdAt) : ""}.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 pt-2 text-xs">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-lg border">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Aksi:</span>
                  <span className="font-semibold">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Entitas:</span>
                  <span className="font-medium">
                    {selectedLog.entityType} ({selectedLog.entityId || "N/A"})
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Aktor:</span>
                  <span className="font-medium">
                    {selectedLog.actor?.name || selectedLog.actor?.email || "Sistem"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Waktu:</span>
                  <span className="font-medium">{formatDateTimeIndo(selectedLog.createdAt)}</span>
                </div>
              </div>

              {/* JSON Metadata */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs flex items-center gap-1.5 text-muted-foreground">
                    <Code2 className="h-3.5 w-3.5" />
                    Payload Metadata (JSON)
                  </span>
                  {selectedLog.metadata && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyMetadata(selectedLog.metadata!)}
                      className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3 text-green-600" /> Disalin
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Salin JSON
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="p-3 bg-zinc-950 text-zinc-100 dark:bg-zinc-900 rounded-md overflow-x-auto font-mono text-[11px] leading-relaxed max-h-60 border border-zinc-800">
                  {selectedLog.metadata ? (
                    <pre>
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(selectedLog.metadata), null, 2);
                        } catch {
                          return selectedLog.metadata;
                        }
                      })()}
                    </pre>
                  ) : (
                    <span className="text-zinc-500 italic">Tidak ada metadata.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
