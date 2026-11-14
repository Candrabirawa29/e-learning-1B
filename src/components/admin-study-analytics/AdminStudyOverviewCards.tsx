"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminStudyOverviewKpis } from "@/types/admin-study-analytics";
import {
  Users,
  UserCheck,
  CheckCircle2,
  Clock,
  Timer,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
} from "lucide-react";

interface AdminStudyOverviewCardsProps {
  kpis: AdminStudyOverviewKpis;
  periodLabel: string;
}

function formatMinutesToHours(minutes: number): { hours: number; remainingMins: number; text: string } {
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours === 0) return { hours: 0, remainingMins, text: `${remainingMins}m` };
  if (remainingMins === 0) return { hours, remainingMins: 0, text: `${hours}j` };
  return { hours, remainingMins, text: `${hours}j ${remainingMins}m` };
}

function DeltaBadge({ delta, suffix = "%" }: { delta: number | null; suffix?: string }) {
  if (delta === null) {
    return (
      <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60 bg-muted/40 font-normal">
        <Minus className="h-2.5 w-2.5 mr-0.5" />
        Belum ada pembanding
      </Badge>
    );
  }

  if (delta > 0) {
    return (
      <Badge
        variant="outline"
        className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 font-semibold"
      >
        <TrendingUp className="h-2.5 w-2.5 mr-0.5 text-emerald-500" />
        +{delta}{suffix}
      </Badge>
    );
  }

  if (delta < 0) {
    return (
      <Badge
        variant="outline"
        className="text-[10px] text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10 font-semibold"
      >
        <TrendingDown className="h-2.5 w-2.5 mr-0.5 text-rose-500" />
        {delta}{suffix}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60 bg-muted/40 font-medium">
      <Minus className="h-2.5 w-2.5 mr-0.5" />
      0{suffix} (stabil)
    </Badge>
  );
}

export function AdminStudyOverviewCards({ kpis, periodLabel }: AdminStudyOverviewCardsProps) {
  const durationFormatted = formatMinutesToHours(kpis.totalStudyMinutes);
  const prevDurationFormatted = formatMinutesToHours(kpis.prevPeriod.totalStudyMinutes);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
      {/* 1. Total Adopter */}
      <Card className="border border-border/80 bg-card/90 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Total Adopter
            </span>
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-2.5 mb-1">
            <div className="text-2xl font-bold tracking-tight text-foreground flex items-baseline gap-1.5">
              <span>{kpis.totalAdopters}</span>
              <span className="text-xs font-normal text-muted-foreground">pengguna</span>
            </div>
          </div>

          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Adopsi Kelas</span>
            <span className="font-semibold text-foreground font-mono">{kpis.adoptionRate}%</span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Pengguna Aktif Periode Ini */}
      <Card className="border border-border/80 bg-card/90 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate" title={`Pengguna Aktif (${periodLabel})`}>
              Aktif ({periodLabel})
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-2.5 mb-1">
            <div className="text-2xl font-bold tracking-tight text-foreground flex items-baseline gap-1.5">
              <span>{kpis.activeUsers}</span>
              <span className="text-xs font-normal text-muted-foreground">aktif</span>
            </div>
          </div>

          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground truncate mr-1">vs periode lalu ({kpis.prevPeriod.activeUsers})</span>
            <DeltaBadge delta={kpis.deltas.activeUsersPercent} />
          </div>
        </CardContent>
      </Card>

      {/* 3. Total Sesi Selesai */}
      <Card className="border border-border/80 bg-card/90 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Sesi Selesai
            </span>
            <div className="h-7 w-7 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-2.5 mb-1">
            <div className="text-2xl font-bold tracking-tight text-foreground flex items-baseline gap-1.5">
              <span>{kpis.totalCompletedSessions.toLocaleString("id-ID")}</span>
              <span className="text-xs font-normal text-muted-foreground">sesi</span>
            </div>
          </div>

          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground truncate mr-1">vs periode lalu</span>
            <DeltaBadge delta={kpis.deltas.completedSessionsPercent} />
          </div>
        </CardContent>
      </Card>

      {/* 4. Total Durasi Belajar */}
      <Card className="border border-border/80 bg-card/90 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Total Durasi
            </span>
            <div className="h-7 w-7 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-2.5 mb-1">
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {durationFormatted.text}
            </div>
          </div>

          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground truncate mr-1">lalu: {prevDurationFormatted.text}</span>
            <DeltaBadge delta={kpis.deltas.studyMinutesPercent} />
          </div>
        </CardContent>
      </Card>

      {/* 5. Rata-rata Durasi per User Aktif */}
      <Card className="border border-border/80 bg-card/90 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Rata-rata / Pengguna
            </span>
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Timer className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-2.5 mb-1">
            <div className="text-2xl font-bold tracking-tight text-foreground flex items-baseline gap-1.5 font-mono">
              <span>{kpis.avgMinutesPerActiveUser}</span>
              <span className="text-xs font-normal text-muted-foreground">menit</span>
            </div>
          </div>

          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground truncate mr-1">lalu: {kpis.prevPeriod.avgMinutesPerActiveUser}m</span>
            <DeltaBadge delta={kpis.deltas.avgMinutesPercent} />
          </div>
        </CardContent>
      </Card>

      {/* 6. Rasio Adopsi Platform */}
      <Card className="border border-border/80 bg-card/90 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Adopsi Platform
            </span>
            <div className="h-7 w-7 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-2.5 mb-1">
            <div className="text-2xl font-bold tracking-tight text-foreground flex items-baseline gap-1 font-mono">
              <span>{kpis.adoptionRate}%</span>
              <span className="text-xs font-normal text-muted-foreground">({kpis.totalAdopters}/{kpis.totalRegisteredUsers})</span>
            </div>
          </div>

          <div className="pt-2 border-t border-border/40">
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-linear-to-r from-blue-500 to-cyan-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, kpis.adoptionRate))}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
