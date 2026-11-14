"use client";

import * as React from "react";
import Link from "next/link";
import {
  AdminStudyPeriod,
  AdminUserMonitoringListResponse,
} from "@/types/admin-study-analytics";
import { getAdminUserMonitoringList } from "@/actions/admin-study-analytics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Users,
} from "lucide-react";
import { formatWib } from "@/lib/datetime";

interface AdminUserMonitoringTableProps {
  initialData: AdminUserMonitoringListResponse;
  currentFilter: AdminStudyPeriod;
}

type SortField = "duration" | "sessions" | "consistency" | "lastActive" | "name";

export function AdminUserMonitoringTable({
  initialData,
  currentFilter,
}: AdminUserMonitoringTableProps) {
  const [data, setData] = React.useState<AdminUserMonitoringListResponse>(initialData);
  const [search, setSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<SortField>("duration");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [isPending, startTransition] = React.useTransition();

  const fetchUsers = React.useCallback(
    (
      newPage: number,
      newSearch: string,
      newSortBy: SortField,
      newSortOrder: "asc" | "desc",
      filter: AdminStudyPeriod
    ) => {
      startTransition(async () => {
        const res = await getAdminUserMonitoringList({
          page: newPage,
          pageSize: 10,
          search: newSearch,
          sortBy: newSortBy,
          sortOrder: newSortOrder,
          filter,
        });
        setData(res);
      });
    },
    []
  );

  // Re-fetch when currentFilter, search, or sorting changes
  React.useEffect(() => {
    fetchUsers(1, search, sortBy, sortOrder, currentFilter);
  }, [currentFilter, fetchUsers, search, sortBy, sortOrder]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground/60 ml-1 inline" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 text-blue-500 ml-1 inline" />
    ) : (
      <ArrowDown className="h-3 w-3 text-blue-500 ml-1 inline" />
    );
  };

  return (
    <Card className="border border-border/80 bg-card/95 shadow-sm overflow-hidden backdrop-blur-xs">
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base sm:text-lg font-bold tracking-tight">
                Monitoring Aktivitas Belajar Mahasiswa
              </CardTitle>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {data.totalCount} Pengguna
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Daftar statistik komprehensif durasi, penyelesaian sesi, dan konsistensi per mahasiswa.
            </CardDescription>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari nama atau email..."
              value={search}
              onChange={handleSearchChange}
              className="pl-8 text-xs h-9"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
              <tr>
                <th
                  className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("name")}
                >
                  Mahasiswa {renderSortIcon("name")}
                </th>
                <th
                  className="py-3 px-3 cursor-pointer hover:text-foreground transition-colors text-right"
                  onClick={() => handleSort("duration")}
                >
                  Total Waktu {renderSortIcon("duration")}
                </th>
                <th
                  className="py-3 px-3 cursor-pointer hover:text-foreground transition-colors text-center"
                  onClick={() => handleSort("sessions")}
                >
                  Sesi Selesai {renderSortIcon("sessions")}
                </th>
                <th className="py-3 px-3 text-center">Rata-rata</th>
                <th className="py-3 px-3 text-center">Hari Aktif</th>
                <th
                  className="py-3 px-3 cursor-pointer hover:text-foreground transition-colors text-center"
                  onClick={() => handleSort("consistency")}
                >
                  Konsistensi {renderSortIcon("consistency")}
                </th>
                <th
                  className="py-3 px-3 cursor-pointer hover:text-foreground transition-colors text-right"
                  onClick={() => handleSort("lastActive")}
                >
                  Terakhir Aktif {renderSortIcon("lastActive")}
                </th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground italic">
                    <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <span>Tidak ada data mahasiswa yang sesuai dengan filter atau pencarian.</span>
                  </td>
                </tr>
              ) : (
                data.users.map((user) => {
                  const hours = Math.floor(user.totalStudyMinutes / 60);
                  const mins = user.totalStudyMinutes % 60;
                  const timeFormatted =
                    hours > 0 ? `${hours}j ${mins}m` : `${mins}m`;

                  return (
                    <tr
                      key={user.userId}
                      className="hover:bg-muted/40 transition-colors group"
                    >
                      {/* Mahasiswa Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7 rounded-full border border-border">
                            <AvatarImage src={user.avatarUrl || undefined} />
                            <AvatarFallback className="text-[10px] uppercase font-bold bg-muted">
                              {user.name.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <Link
                              href={`/home/manage/study-analytics/${user.userId}`}
                              className="font-medium text-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:underline block truncate max-w-[150px] sm:max-w-[200px]"
                            >
                              {user.name}
                            </Link>
                            <span className="text-[10px] text-muted-foreground block truncate max-w-[150px] sm:max-w-[200px]">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Total Waktu */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-foreground">
                        {user.totalStudyMinutes > 0 ? (
                          timeFormatted
                        ) : (
                          <span className="text-muted-foreground font-normal">0m</span>
                        )}
                      </td>

                      {/* Sesi Selesai */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1 font-mono font-medium">
                          <span className="text-foreground">{user.completedSessionsCount}</span>
                          {user.stoppedEarlyCount > 0 && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                              ({user.stoppedEarlyCount} awal)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Rata-rata Sesi */}
                      <td className="py-3 px-3 text-center font-mono text-muted-foreground">
                        {user.avgSessionMinutes > 0 ? `${user.avgSessionMinutes}m` : "—"}
                      </td>

                      {/* Hari Aktif */}
                      <td className="py-3 px-3 text-center font-mono text-muted-foreground">
                        {user.activeDaysCount > 0 ? `${user.activeDaysCount} hari` : "—"}
                      </td>

                      {/* Consistency Score */}
                      <td className="py-3 px-3 text-center">
                        {user.consistencyScore !== null ? (
                          <Badge
                            variant="outline"
                            className={`font-mono text-[10px] px-2 py-0.5 ${
                              user.consistencyScore >= 80
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold"
                                : user.consistencyScore >= 60
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {user.consistencyScore}/100
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">
                            {user.consistencyStatus}
                          </span>
                        )}
                      </td>

                      {/* Terakhir Aktif */}
                      <td className="py-3 px-3 text-right text-muted-foreground font-mono text-[11px]">
                        {user.lastActiveAt
                          ? formatWib(user.lastActiveAt, "date-short")
                          : "Belum pernah"}
                      </td>

                      {/* Aksi: Detail View */}
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/home/manage/study-analytics/${user.userId}`}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "h-7 px-2 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          )}
                        >
                          Detail
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Bar */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-between p-3 sm:p-4 border-t border-border/50 text-xs text-muted-foreground">
            <div>
              Halaman <span className="font-semibold text-foreground">{data.page}</span> dari{" "}
              <span className="font-semibold text-foreground">{data.totalPages}</span> (Total {data.totalCount} mahasiswa)
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={data.page <= 1 || isPending}
                onClick={() =>
                  fetchUsers(data.page - 1, search, sortBy, sortOrder, currentFilter)
                }
                className="h-8 px-2.5 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={data.page >= data.totalPages || isPending}
                onClick={() =>
                  fetchUsers(data.page + 1, search, sortBy, sortOrder, currentFilter)
                }
                className="h-8 px-2.5 text-xs"
              >
                Selanjutnya
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
