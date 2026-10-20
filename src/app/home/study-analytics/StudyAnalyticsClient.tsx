"use client";

import * as React from "react";
import { getStudyAnalyticsDashboard } from "@/actions/analytics";
import { StudyAnalyticsDashboardData } from "@/types/analytics";
import { StudyKpiCards } from "@/components/analytics/StudyKpiCards";
import { StudyContributionHeatmap } from "@/components/analytics/StudyContributionHeatmap";
import { StudyTrendAreaChart } from "@/components/analytics/StudyTrendAreaChart";
import { StudyHourDayMatrix } from "@/components/analytics/StudyHourDayMatrix";
import { StudySubjectTaskDistribution } from "@/components/analytics/StudySubjectTaskDistribution";
import { StudyCoachChat } from "@/components/analytics/StudyCoachChat";
import { FocusPreferenceDialog } from "@/components/focus/FocusPreferenceDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3,
  Sparkles,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Clock,
  Lock,
} from "lucide-react";

interface StudyAnalyticsClientProps {
  initialData: StudyAnalyticsDashboardData;
}

export function StudyAnalyticsClient({ initialData }: StudyAnalyticsClientProps) {
  const [data, setData] = React.useState<StudyAnalyticsDashboardData>(initialData);
  const [filter, setFilter] = React.useState<"7d" | "30d" | "year">(initialData.filter);
  const [isPending, startTransition] = React.useTransition();
  const [isPreferenceOpen, setIsPreferenceOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"dashboard" | "coach">("dashboard");

  const handleFilterChange = (newFilter: "7d" | "30d" | "year") => {
    if (newFilter === filter) return;
    setFilter(newFilter);
    startTransition(async () => {
      const updated = await getStudyAnalyticsDashboard(newFilter);
      setData(updated);
    });
  };

  const handlePreferencesUpdated = () => {
    startTransition(async () => {
      const updated = await getStudyAnalyticsDashboard(filter);
      setData(updated);
    });
  };

  const periodLabel = React.useMemo(() => {
    if (filter === "7d") return "7 hari terakhir";
    if (filter === "30d") return "30 hari terakhir";
    return "1 tahun ini";
  }, [filter]);

  // Transform trendChartData for StudyTrendAreaChart
  const areaChartData = React.useMemo(() => {
    return data.trendChartData.map((d) => ({
      dateKey: d.date,
      minutes: d.minutes,
      sessions: d.sessionCount,
    }));
  }, [data.trendChartData]);

  const { periodComparison } = data.kpi;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header: Title, Privacy Note & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Study Intelligence & Analitik
            </h1>
            <Badge variant="outline" className="text-xs flex items-center gap-1 font-normal text-muted-foreground">
              <Lock className="h-3 w-3 text-muted-foreground" />
              Pribadi
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Data belajar, streak, dan skor konsistensi ini bersifat pribadi dan hanya dapat diakses oleh Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Period Buttons */}
          <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-xs">
            <button
              onClick={() => handleFilterChange("7d")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                filter === "7d"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              7 hari terakhir
            </button>
            <button
              onClick={() => handleFilterChange("30d")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                filter === "30d"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              30 hari terakhir
            </button>
            <button
              onClick={() => handleFilterChange("year")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                filter === "year"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              1 tahun ini
            </button>
          </div>

          {/* Preferences Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreferenceOpen(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Target & AI</span>
          </Button>
        </div>
      </div>

      {/* Main Mode Tabs: Dashboard Analitik vs AI Study Coach */}
      <div className="flex items-center gap-2 border-b">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`pb-2.5 px-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "dashboard"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Dashboard Metrik & Visualisasi
        </button>
        <button
          onClick={() => setActiveTab("coach")}
          className={`pb-2.5 px-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "coach"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-4 w-4 text-primary" />
          AI Study Analyst
          {data.preferences.aiConsent && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* Tab 1: Dashboard Metrik & Visualisasi */}
      {activeTab === "dashboard" && (
        <div className={`space-y-6 transition-opacity duration-200 ${isPending ? "opacity-60" : "opacity-100"}`}>
          {/* KPI Cards */}
          <StudyKpiCards
            todayMinutes={data.kpi.todayMinutes}
            thisWeekMinutes={data.kpi.thisWeekMinutes}
            thisMonthMinutes={data.kpi.thisMonthMinutes}
            weeklyTargetMinutes={data.kpi.weeklyTargetMin}
            showTargetRemaining={data.preferences.showTargetRemaining ?? true}
            consistency={data.kpi.consistency}
            trend={data.kpi.trend}
            startedSessionsCount={data.kpi.completion.startedCount}
            completedSessionsCount={data.kpi.completion.completedCount}
            completionRatio={data.kpi.completion.completionRatio}
            currentStreakDays={data.kpi.streak.currentStreakDays}
            filterPeriodLabel={periodLabel}
          />

          {/* Period Comparison Card: Dua Batang (Periode Ini vs Sebelumnya) & Selisih */}
          <Card className="border shadow-xs bg-muted/20">
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">
                      Perbandingan Periode
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Membandingkan durasi fokus {periodLabel} dengan periode sebelumnya berdurasi sama.
                    </p>
                  </div>
                </div>

                {/* Selisih Badge */}
                <div className="flex items-center gap-2">
                  {periodComparison.previousMinutes > 0 ? (
                    periodComparison.percentChange !== null ? (
                      periodComparison.percentChange > 0 ? (
                        <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400 gap-1 font-mono">
                          <ArrowUpRight className="h-3 w-3" />
                          +{Math.round(((periodComparison.currentMinutes - periodComparison.previousMinutes) / 60) * 10) / 10}j (+{periodComparison.percentChange}%)
                        </Badge>
                      ) : periodComparison.percentChange < 0 ? (
                        <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 gap-1 font-mono">
                          <ArrowDownRight className="h-3 w-3" />
                          {Math.round(((periodComparison.currentMinutes - periodComparison.previousMinutes) / 60) * 10) / 10}j ({periodComparison.percentChange}%)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 font-mono">
                          <Minus className="h-3 w-3" />
                          Stabil (0%)
                        </Badge>
                      )
                    ) : null
                  ) : (
                    <span className="text-xs text-muted-foreground italic">belum ada pembanding</span>
                  )}
                </div>
              </div>

              {/* Dua Batang Visual */}
              <div className="space-y-2 pt-1">
                {(() => {
                  const currentHours = Math.round((periodComparison.currentMinutes / 60) * 10) / 10;
                  const prevHours = Math.round((periodComparison.previousMinutes / 60) * 10) / 10;
                  const maxMinutes = Math.max(1, periodComparison.currentMinutes, periodComparison.previousMinutes);

                  if (periodComparison.previousMinutes === 0) {
                    return (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-foreground">Periode ini ({periodLabel})</span>
                          <span className="font-mono font-semibold text-foreground">{currentHours} jam</span>
                        </div>
                        <div className="w-full bg-muted/60 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-primary h-full rounded-full w-full transition-all duration-300" />
                        </div>
                      </div>
                    );
                  }

                  const currentPct = Math.min(100, Math.round((periodComparison.currentMinutes / maxMinutes) * 100));
                  const prevPct = Math.min(100, Math.round((periodComparison.previousMinutes / maxMinutes) * 100));

                  return (
                    <div className="space-y-2.5">
                      {/* Batang 1: Periode Ini */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-foreground">Periode ini ({periodLabel})</span>
                          <span className="font-mono font-semibold text-foreground">{currentHours} jam</span>
                        </div>
                        <div className="w-full bg-muted/60 h-2.5 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.max(2, currentPct)}%` }}
                            className="bg-primary h-full rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>

                      {/* Batang 2: Periode Sebelumnya */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-muted-foreground">Periode sebelumnya</span>
                          <span className="font-mono text-muted-foreground">{prevHours} jam</span>
                        </div>
                        <div className="w-full bg-muted/60 h-2.5 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.max(2, prevPct)}%` }}
                            className="bg-muted-foreground/45 h-full rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Area Chart: Tren Fokus Harian */}
          <StudyTrendAreaChart data={areaChartData} periodLabel={periodLabel} />

          {/* Annual Contribution Heatmap (GitHub style 7x53 pure CSS grid) */}
          <StudyContributionHeatmap
            dataMap={data.heatmapDataMap}
            currentStreak={data.kpi.streak.currentStreakDays}
            longestStreak={data.kpi.streak.longestStreakDays}
          />

          {/* Matrix Jam x Hari (Waktu Mulai Belajar) */}
          <StudyHourDayMatrix matrixData={data.hourDayMatrix} />

          {/* Subject & Task Distribution */}
          <StudySubjectTaskDistribution
            courseData={data.courses}
            taskData={data.taskData}
          />
        </div>
      )}

      {/* Tab 2: AI Study Coach */}
      {activeTab === "coach" && (
        <div className="space-y-4">
          <StudyCoachChat
            preferences={data.preferences}
            onPreferencesUpdated={handlePreferencesUpdated}
            openPreferenceDialog={() => setIsPreferenceOpen(true)}
          />
        </div>
      )}

      {/* Preferences Dialog */}
      <FocusPreferenceDialog
        open={isPreferenceOpen}
        onOpenChange={setIsPreferenceOpen}
        onSaved={handlePreferencesUpdated}
        suggestedWeeklyTargetMin={data.suggestedWeeklyTargetMin}
      />
    </div>
  );
}
