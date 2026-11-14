"use client";

import * as React from "react";
import {
  AdminStudyPeriod,
  AdminStudyAnalyticsDashboardData,
  AdminUserMonitoringListResponse,
} from "@/types/admin-study-analytics";
import { getAdminStudyAnalyticsDashboard } from "@/actions/admin-study-analytics";
import { AdminStudyOverviewCards } from "./AdminStudyOverviewCards";
import { AdminActivityAnalyticsChart } from "./AdminActivityAnalyticsChart";
import { AdminProductInsightsCard } from "./AdminProductInsightsCard";
import { AdminUserMonitoringTable } from "./AdminUserMonitoringTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

interface AdminStudyAnalyticsClientProps {
  initialDashboard: AdminStudyAnalyticsDashboardData;
  initialUserList: AdminUserMonitoringListResponse;
}

const PERIOD_OPTIONS: Array<{ key: AdminStudyPeriod; label: string }> = [
  { key: "7d", label: "7 Hari" },
  { key: "14d", label: "14 Hari" },
  { key: "30d", label: "30 Hari" },
  { key: "90d", label: "90 Hari" },
  { key: "year", label: "1 Tahun" },
];

export function AdminStudyAnalyticsClient({
  initialDashboard,
  initialUserList,
}: AdminStudyAnalyticsClientProps) {
  const [dashboard, setDashboard] = React.useState<AdminStudyAnalyticsDashboardData>(initialDashboard);
  const [filter, setFilter] = React.useState<AdminStudyPeriod>(initialDashboard.filter);
  const [isPending, startTransition] = React.useTransition();

  const handlePeriodChange = (newFilter: AdminStudyPeriod) => {
    if (newFilter === filter) return;
    setFilter(newFilter);
    startTransition(async () => {
      const updated = await getAdminStudyAnalyticsDashboard(newFilter);
      setDashboard(updated);
    });
  };

  const periodLabel = React.useMemo(() => {
    switch (filter) {
      case "7d":
        return "7 hari terakhir";
      case "14d":
        return "14 hari terakhir";
      case "30d":
        return "30 hari terakhir";
      case "90d":
        return "90 hari terakhir";
      case "year":
        return "1 tahun terakhir";
      default:
        return "periode terpilih";
    }
  }, [filter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Study Analytics & Platform Monitoring
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300 gap-1 px-2 py-0.5"
            >
              <ShieldCheck className="h-3 w-3" />
              Platform Admin
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Evaluasi adopsi fitur Pomodoro, keterlibatan belajar, retensi pengguna, dan konsistensi platform.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/50 self-start sm:self-auto">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground ml-1.5 mr-0.5" />
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.key}
              type="button"
              variant={filter === opt.key ? "secondary" : "ghost"}
              size="sm"
              disabled={isPending}
              onClick={() => handlePeriodChange(opt.key)}
              className={`text-xs h-7 px-2.5 rounded-lg transition-all ${
                filter === opt.key
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 1. Overview Cards (6 Metrik Utama) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Ringkasan Metrik ({periodLabel})
          </span>
          {isPending && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 animate-pulse">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Memperbarui data...
            </span>
          )}
        </div>
        <AdminStudyOverviewCards kpis={dashboard.overviewKpis} periodLabel={periodLabel} />
      </div>

      {/* 2. Activity Analytics (Grafik Durasi Dual-Line, Status Sesi, & Pengguna Aktif) */}
      <AdminActivityAnalyticsChart data={dashboard.activityTrends} periodLabel={periodLabel} />

      {/* 3. Product Usage Insights (WAU, MAU, Retensi 7d/30d, Preferensi Fitur) */}
      <AdminProductInsightsCard insights={dashboard.productInsights} />

      {/* 4. User Monitoring Table (Server-Side Filter, Search, Sort, Pagination) */}
      <AdminUserMonitoringTable
        initialData={initialUserList}
        currentFilter={filter}
      />
    </div>
  );
}
