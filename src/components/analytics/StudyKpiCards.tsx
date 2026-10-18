"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Target, TrendingUp, CheckCircle, Flame } from "lucide-react";
import { ConsistencyScoreResult, TrendAnalysisResult } from "@/lib/analytics/study-metrics";

interface StudyKpiCardsProps {
  todayMinutes: number;
  thisWeekMinutes: number;
  thisMonthMinutes: number;
  weeklyTargetMinutes: number;
  consistency: ConsistencyScoreResult;
  trend: TrendAnalysisResult;
  startedSessionsCount: number;
  completedSessionsCount: number;
  completionRatio: number;
  currentStreakDays: number;
}

function formatMinutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) {
    return `${h}j ${m}m`;
  }
  return `${m} menit`;
}

export function StudyKpiCards({
  todayMinutes,
  thisWeekMinutes,
  thisMonthMinutes,
  weeklyTargetMinutes,
  consistency,
  trend,
  startedSessionsCount,
  completedSessionsCount,
  completionRatio,
  currentStreakDays,
}: StudyKpiCardsProps) {
  const targetPercent = weeklyTargetMinutes > 0
    ? Math.round((thisWeekMinutes / weeklyTargetMinutes) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* KPI 1: Waktu Fokus Hari Ini & Minggu Ini */}
      <Card className="border shadow-xs p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-muted-foreground text-xs">
          <span className="font-medium">Total Waktu Fokus</span>
          <Clock className="h-4 w-4 text-primary" />
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold font-mono text-foreground">
            {formatMinutesToHours(todayMinutes)}
          </div>
          <span className="text-[11px] text-muted-foreground">Hari ini</span>
        </div>
        <div className="pt-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
          <span>Minggu ini: <strong>{formatMinutesToHours(thisWeekMinutes)}</strong></span>
          <span>Bulan ini: <strong>{formatMinutesToHours(thisMonthMinutes)}</strong></span>
        </div>
      </Card>

      {/* KPI 2: Indeks Konsistensi Mingguan */}
      <Card className="border shadow-xs p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-muted-foreground text-xs">
          <span className="font-medium">Indeks Konsistensi</span>
          <Target className="h-4 w-4 text-primary" />
        </div>
        <div className="my-2">
          {consistency.score !== null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-foreground">
                {consistency.score}
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          ) : (
            <div className="text-sm font-semibold text-muted-foreground py-1">
              Data belum cukup
            </div>
          )}
          <span className="text-[11px] text-muted-foreground line-clamp-1" title={consistency.explanation}>
            {consistency.explanation}
          </span>
        </div>
        <div className="pt-2 border-t text-[10px] text-muted-foreground flex items-center justify-between">
          <span>Target: {consistency.targetComponent}/50</span>
          <span>Aktif: {consistency.activeDaysComponent}/30</span>
          <span>Selesai: {consistency.completionRateComponent}/20</span>
        </div>
      </Card>

      {/* KPI 3: Tren 4 Minggu */}
      <Card className="border shadow-xs p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-muted-foreground text-xs">
          <span className="font-medium">Tren Belajar (4 Minggu)</span>
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <div className="my-2">
          {trend.direction === "INSUFFICIENT_DATA" ? (
            <div className="text-sm font-semibold text-muted-foreground py-1">
              Data belum cukup
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-xs font-bold px-2 py-0.5 ${
                  trend.direction === "UP"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                    : trend.direction === "DOWN"
                    ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                    : "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300"
                }`}
              >
                {trend.direction === "UP" ? "▲ Naik" : trend.direction === "DOWN" ? "▼ Menurun" : "● Stabil"}
              </Badge>
              <span className="text-xs font-mono font-semibold">
                {trend.percentChange > 0 ? `+${trend.percentChange}%` : `${trend.percentChange}%`}
              </span>
            </div>
          )}
          <span className="text-[11px] text-muted-foreground line-clamp-1 mt-1">
            {trend.label}
          </span>
        </div>
        <div className="pt-2 border-t text-[11px] text-muted-foreground">
          Rata-rata: <strong>{formatMinutesToHours(trend.pastAverageMinutes)}</strong>/mgg
        </div>
      </Card>

      {/* KPI 4: Sesi Dimulai vs Selesai & Streak */}
      <Card className="border shadow-xs p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-muted-foreground text-xs">
          <span className="font-medium">Penyelesaian Sesi</span>
          <CheckCircle className="h-4 w-4 text-primary" />
        </div>
        <div className="my-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-foreground">
              {completionRatio}%
            </span>
            <span className="text-xs text-muted-foreground">
              ({completedSessionsCount}/{startedSessionsCount} selesai)
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Flame className="h-3.5 w-3.5 text-amber-500" />
            <span>Streak aktif: <strong>{currentStreakDays} hari</strong></span>
          </div>
        </div>
        <div className="pt-2 border-t text-[11px] text-muted-foreground">
          Target mingguan tercapai: <strong>{targetPercent}%</strong>
        </div>
      </Card>
    </div>
  );
}
