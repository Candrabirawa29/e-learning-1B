"use client";

import * as React from "react";
import Link from "next/link";
import {
  AdminStudyPeriod,
  AdminUserDetailAnalytics,
} from "@/types/admin-study-analytics";
import { getAdminUserDetailAnalytics } from "@/actions/admin-study-analytics";
import { StudyContributionHeatmap } from "@/components/analytics/StudyContributionHeatmap";
import { StudyTrendAreaChart, TrendDataPoint } from "@/components/analytics/StudyTrendAreaChart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Timer,
  Flame,
  Award,
  BookOpen,
  CheckSquare,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatWib } from "@/lib/datetime";

interface AdminUserDetailViewProps {
  initialData: AdminUserDetailAnalytics;
  initialFilter: AdminStudyPeriod;
}

const PERIOD_BUTTONS: Array<{ key: AdminStudyPeriod; label: string }> = [
  { key: "7d", label: "7 Hari" },
  { key: "14d", label: "14 Hari" },
  { key: "30d", label: "30 Hari" },
  { key: "90d", label: "90 Hari" },
  { key: "year", label: "1 Tahun" },
];

export function AdminUserDetailView({
  initialData,
  initialFilter,
}: AdminUserDetailViewProps) {
  const [data, setData] = React.useState<AdminUserDetailAnalytics>(initialData);
  const [filter, setFilter] = React.useState<AdminStudyPeriod>(initialFilter);
  const [isPending, startTransition] = React.useTransition();

  const handlePeriodChange = (newFilter: AdminStudyPeriod) => {
    if (newFilter === filter) return;
    setFilter(newFilter);
    startTransition(async () => {
      const updated = await getAdminUserDetailAnalytics(data.user.id, newFilter, 1);
      if (updated) {
        setData(updated);
      }
    });
  };

  const handleSessionPageChange = (newPage: number) => {
    startTransition(async () => {
      const updated = await getAdminUserDetailAnalytics(data.user.id, filter, newPage);
      if (updated) {
        setData(updated);
      }
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
        return "1 tahun ini";
      default:
        return "periode terpilih";
    }
  }, [filter]);

  // Transform trend points for StudyTrendAreaChart
  const areaChartData: TrendDataPoint[] = React.useMemo(() => {
    return data.trendChartData.map((d) => ({
      dateKey: d.date,
      label: d.label,
      minutes: d.minutes,
      sessions: d.sessionCount,
      previousDateKey: d.previousDate,
      previousMinutes: d.previousMinutes ?? 0,
      previousSessions: d.previousSessionCount ?? 0,
    }));
  }, [data.trendChartData]);

  const hours = Math.floor(data.overview.totalStudyMinutes / 60);
  const remainingMins = data.overview.totalStudyMinutes % 60;
  const totalFormatted = hours > 0 ? `${hours}j ${remainingMins}m` : `${remainingMins}m`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header: Back Link, User Bio, Read-Only Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/80">
        <div className="flex items-center gap-3">
          <Link
            href="/home/manage/study-analytics"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 px-2.5")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Kembali
          </Link>

          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={data.user.avatarUrl || undefined} />
              <AvatarFallback className="text-xs font-bold uppercase bg-muted">
                {data.user.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  {data.user.name}
                </h1>
                <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                  {data.user.role}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 gap-1 px-2 py-0.5"
                >
                  <ShieldCheck className="h-3 w-3" />
                  Mode Monitoring (Hanya Baca)
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{data.user.email}</p>
            </div>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/50 self-start sm:self-auto">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground ml-1.5 mr-0.5" />
          {PERIOD_BUTTONS.map((opt) => (
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

      {/* 1. Quick KPI Cards for User */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border border-border/80 bg-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Total Belajar</span>
            <Clock className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-foreground">{totalFormatted}</span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-1">periode {periodLabel}</span>
        </Card>

        <Card className="border border-border/80 bg-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Sesi Selesai</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-foreground">{data.overview.totalCompletedSessions}</span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-1">sesi penuh</span>
        </Card>

        <Card className="border border-border/80 bg-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Berhenti Awal</span>
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-foreground">{data.overview.totalStoppedEarly}</span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-1">dijeda/dihentikan</span>
        </Card>

        <Card className="border border-border/80 bg-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Rata-rata Sesi</span>
            <Timer className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-foreground">{data.overview.avgSessionDurationMin}m</span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-1">per sesi selesai</span>
        </Card>

        <Card className="border border-border/80 bg-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Streak Belajar</span>
            <Flame className="h-3.5 w-3.5 text-orange-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-foreground">{data.overview.currentStreakDays} hari</span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-1">terpanjang: {data.overview.longestStreakDays} hari</span>
        </Card>

        <Card className="border border-border/80 bg-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Konsistensi</span>
            <Award className="h-3.5 w-3.5 text-cyan-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-foreground">
              {data.consistency.score !== null ? `${data.consistency.score}/100` : "Data < 7h"}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-1 truncate">
            {data.consistency.score !== null ? "minggu berjalan" : "sedang kumpul"}
          </span>
        </Card>
      </div>

      {/* 2. Tren Aktivitas Belajar (Dual Line) */}
      <StudyTrendAreaChart data={areaChartData} periodLabel={periodLabel} />

      {/* 3. Consistency Score Detailed Breakdown & Calendar Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consistency Breakdown */}
        <Card className="border border-border/80 bg-card/95 p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm font-bold tracking-tight">
                Indeks Konsistensi Belajar
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Evaluasi kebiasaan belajar berbobot target, hari aktif, dan penyelesaian sesi.
            </CardDescription>
          </div>

          <div className="flex items-baseline justify-between border-b pb-3 border-border/50">
            <div>
              <span className="text-3xl font-extrabold font-mono text-foreground">
                {data.consistency.score !== null ? data.consistency.score : "—"}
              </span>
              <span className="text-xs text-muted-foreground ml-1">/ 100</span>
            </div>
            {data.consistency.lastWeekScore !== null && (
              <Badge variant="outline" className="text-[10px]">
                Minggu lalu: {data.consistency.lastWeekScore}
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed italic">
            &ldquo;{data.consistency.explanation}&rdquo;
          </p>

          <div className="space-y-3 pt-2 text-xs">
            {/* Component 1: Target */}
            <div>
              <div className="flex justify-between text-muted-foreground mb-1">
                <span>Capaian Target Mingguan (50%)</span>
                <span className="font-mono font-semibold text-foreground">
                  {data.consistency.targetComponent} / 50 pts
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-1.5 rounded-full"
                  style={{ width: `${(data.consistency.targetComponent / 50) * 100}%` }}
                />
              </div>
            </div>

            {/* Component 2: Active Days */}
            <div>
              <div className="flex justify-between text-muted-foreground mb-1">
                <span>Hari Aktif Belajar (30%)</span>
                <span className="font-mono font-semibold text-foreground">
                  {data.consistency.activeDaysComponent} / 30 pts
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full"
                  style={{ width: `${(data.consistency.activeDaysComponent / 30) * 100}%` }}
                />
              </div>
            </div>

            {/* Component 3: Completion Rate */}
            <div>
              <div className="flex justify-between text-muted-foreground mb-1">
                <span>Rasio Penyelesaian Sesi (20%)</span>
                <span className="font-mono font-semibold text-foreground">
                  {data.consistency.completionRateComponent} / 20 pts
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full"
                  style={{ width: `${(data.consistency.completionRateComponent / 20) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Contribution Heatmap Calendar */}
        <div className="lg:col-span-2">
          <StudyContributionHeatmap
            dataMap={data.heatmapDataMap}
            currentStreak={data.overview.currentStreakDays}
            longestStreak={data.overview.longestStreakDays}
          />
        </div>
      </div>

      {/* 4. Course & Task Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mata Kuliah */}
        <Card className="border border-border/80 bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-bold tracking-tight text-foreground">Mata Kuliah Paling Sering Dipelajari</h3>
          </div>
          {data.courses.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4">Belum ada mata kuliah yang dipilih pada sesi fokus.</p>
          ) : (
            <div className="divide-y divide-border/50 text-xs">
              {data.courses.slice(0, 6).map((c, idx) => (
                <div key={c.course_id || idx} className="py-2.5 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <span className="font-medium text-foreground block truncate">{c.course_name}</span>
                    <span className="text-[10px] text-muted-foreground">{c.session_count} sesi</span>
                  </div>
                  <span className="font-mono font-semibold text-foreground shrink-0">{c.total_minutes}m</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Tugas */}
        <Card className="border border-border/80 bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-bold tracking-tight text-foreground">Tugas yang Dikerjakan Saat Belajar</h3>
          </div>
          {data.taskData.tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4">Belum ada tugas spesifik yang dikaitkan pada sesi fokus.</p>
          ) : (
            <div className="divide-y divide-border/50 text-xs">
              {data.taskData.tasks.slice(0, 6).map((t) => (
                <div key={t.task_id} className="py-2.5 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <span className="font-medium text-foreground block truncate">{t.task_title}</span>
                    <span className="text-[10px] text-muted-foreground">{t.course_name || "Umum"} • {t.session_count} sesi</span>
                  </div>
                  <span className="font-mono font-semibold text-foreground shrink-0">{t.total_minutes}m</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 5. Session History Table (Paginated, Strictly Read-Only) */}
      <Card className="border border-border/80 bg-card/95 shadow-sm overflow-hidden backdrop-blur-xs">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold tracking-tight">
                Riwayat Sesi Fokus Pengguna
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Log histori sesi belajar (Catatan pribadi dan percakapan AI tidak ditampilkan demi privasi).
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] self-start sm:self-auto font-mono">
              Total {data.recentSessions.totalCount} Sesi
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Waktu Mulai (WIB)</th>
                  <th className="py-3 px-3">Mode</th>
                  <th className="py-3 px-3 text-right">Durasi Rencana</th>
                  <th className="py-3 px-3 text-right">Durasi Akumulasi</th>
                  <th className="py-3 px-3">Mata Kuliah / Tugas</th>
                  <th className="py-3 px-4 text-center">Status Sesi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.recentSessions.sessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground italic">
                      Belum ada sesi fokus yang tercatat untuk mahasiswa ini.
                    </td>
                  </tr>
                ) : (
                  data.recentSessions.sessions.map((s) => {
                    const accMins = Math.round(s.accumulatedSec / 60);
                    const planMins = Math.round(s.plannedSec / 60);

                    return (
                      <tr key={s.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-foreground">
                          {formatWib(s.startedAt, "full")}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {s.mode}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                          {planMins > 0 ? `${planMins}m` : "—"}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-foreground">
                          {accMins}m
                        </td>
                        <td className="py-3 px-3 text-muted-foreground truncate max-w-[200px]">
                          {s.courseName ? (
                            <span className="text-foreground">{s.courseName}</span>
                          ) : (
                            <span>Umum / Mandiri</span>
                          )}
                          {s.taskTitle && (
                            <span className="text-[10px] text-muted-foreground block truncate">
                              ↳ {s.taskTitle}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0.5 ${
                              s.status === "COMPLETED"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : s.status === "STOPPED_EARLY"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                            }`}
                          >
                            {s.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {data.recentSessions.totalPages > 1 && (
            <div className="flex items-center justify-between p-3 sm:p-4 border-t border-border/50 text-xs text-muted-foreground">
              <div>
                Halaman <span className="font-semibold text-foreground">{data.recentSessions.page}</span> dari{" "}
                <span className="font-semibold text-foreground">{data.recentSessions.totalPages}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.recentSessions.page <= 1 || isPending}
                  onClick={() => handleSessionPageChange(data.recentSessions.page - 1)}
                  className="h-8 px-2.5 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.recentSessions.page >= data.recentSessions.totalPages || isPending}
                  onClick={() => handleSessionPageChange(data.recentSessions.page + 1)}
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
    </div>
  );
}
