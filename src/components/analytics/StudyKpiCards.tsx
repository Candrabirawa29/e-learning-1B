"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Clock,
  Target,
  TrendingUp,
  CheckCircle,
  Flame,
  Info,
} from "lucide-react";
import {
  ConsistencyScoreResult,
  TrendAnalysisResult,
} from "@/lib/analytics/study-metrics";

interface StudyKpiCardsProps {
  todayMinutes: number;
  thisWeekMinutes: number;
  thisMonthMinutes: number;
  weeklyTargetMinutes: number;
  showTargetRemaining?: boolean;
  consistency: ConsistencyScoreResult;
  trend: TrendAnalysisResult;
  startedSessionsCount: number;
  completedSessionsCount: number;
  completionRatio: number;
  currentStreakDays: number;
  filterPeriodLabel: string;
}

function formatMinutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) {
    return `${h}j ${m > 0 ? `${m}m` : ""}`.trim();
  }
  return `${m} menit`;
}

export function StudyKpiCards({
  todayMinutes,
  thisWeekMinutes,
  thisMonthMinutes,
  weeklyTargetMinutes,
  showTargetRemaining = true,
  consistency,
  trend,
  startedSessionsCount,
  completedSessionsCount,
  completionRatio,
  currentStreakDays,
  filterPeriodLabel,
}: StudyKpiCardsProps) {
  // Target mingguan persen (Minggu ini)
  const targetPercent =
    weeklyTargetMinutes > 0
      ? Math.round((thisWeekMinutes / weeklyTargetMinutes) * 100)
      : 0;

  // Sisa target mingguan
  const remainingMinutes = Math.max(0, weeklyTargetMinutes - thisWeekMinutes);
  const remainingText =
    remainingMinutes > 0
      ? `sisa ${formatMinutesToHours(remainingMinutes)}`
      : "target tercapai";

  // Visual bars untuk Tren 4 Minggu
  const weeklyBars = trend.weeklyBars || [
    { weekLabel: "M-3", minutes: 0 },
    { weekLabel: "M-2", minutes: 0 },
    { weekLabel: "M-1", minutes: 0 },
    { weekLabel: "Minggu ini", minutes: thisWeekMinutes },
  ];
  const maxWeeklyMinutes = Math.max(1, ...weeklyBars.map((b) => b.minutes));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* =========================================================================
          KARTU 1: Total Waktu Fokus
          Jendela tetap: Hari ini
          Sekunder: Minggu ini (sejak Senin) X dari Y & sisa Z, Bulan ini
          Tanpa progress bar & tanpa rata-rata per hari
         ========================================================================= */}
      <Card className="border shadow-xs p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span className="font-semibold text-foreground">Total Waktu Fokus</span>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                Hari ini
              </Badge>
              <Clock className="h-4 w-4 text-primary" />
            </div>
          </div>

          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
              {formatMinutesToHours(todayMinutes)}
            </div>
            <span className="text-[11px] text-muted-foreground">Hari ini</span>
          </div>
        </div>

        <div className="pt-2.5 border-t space-y-1 text-[11px] text-muted-foreground">
          <div className="leading-tight">
            <span>Minggu ini (sejak Senin): </span>
            <strong className="text-foreground font-mono">
              {formatMinutesToHours(thisWeekMinutes)}
            </strong>{" "}
            dari{" "}
            <span className="font-mono">{formatMinutesToHours(weeklyTargetMinutes)}</span>
            {showTargetRemaining && (
              <span className="text-muted-foreground font-sans"> ({remainingText})</span>
            )}
          </div>
          <div className="leading-tight">
            <span>Bulan ini: </span>
            <strong className="text-foreground font-mono">
              {formatMinutesToHours(thisMonthMinutes)}
            </strong>
          </div>
        </div>
      </Card>

      {/* =========================================================================
          KARTU 2: Indeks Konsistensi
          Jendela tetap: Minggu ini (sejak Senin)
          Popover "Cara menghitung", label per komponen, keterangan target sendiri,
          prorata hari berlalu, skor minggu lalu, batas 7 hari data
         ========================================================================= */}
      <Card className="border shadow-xs p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span className="font-semibold text-foreground">Indeks Konsistensi</span>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                Minggu ini (sejak Senin)
              </Badge>
              <Popover>
                <PopoverTrigger
                  className="inline-flex items-center justify-center rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Cara menghitung indeks konsistensi"
                >
                  <Info className="h-3.5 w-3.5" />
                  <span className="sr-only">Cara menghitung</span>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3.5 text-xs text-popover-foreground space-y-2.5 shadow-lg">
                  <PopoverHeader>
                    <PopoverTitle className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                      <Target className="h-4 w-4 text-primary" />
                      Cara Menghitung Indeks Konsistensi
                    </PopoverTitle>
                  </PopoverHeader>
                  <div className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
                    <p>
                      Indeks bernilai <strong>0 - 100 poin</strong> yang dihitung otomatis berdasarkan 3 komponen:
                    </p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>
                        <strong className="text-foreground">Pencapaian Target (50 poin)</strong>: Persentase waktu fokus terhadap target yang disesuaikan hari berjalan (maks 100%, tanpa bonus lembur).
                      </li>
                      <li>
                        <strong className="text-foreground">Hari Aktif (30 poin)</strong>: Hari belajar dengan fokus minimal <strong>ambang 25 menit</strong> terhadap target hari aktif.
                      </li>
                      <li>
                        <strong className="text-foreground">Sesi Mencapai Target (20 poin)</strong>: Rasio sesi fokus yang mencapai durasi rencana terhadap total sesi yang dimulai minggu ini.
                      </li>
                    </ul>
                    <div className="p-2 bg-muted/60 rounded-md border text-[10px] text-foreground">
                      <strong>Penyesuaian Berjalan:</strong> Target menit dan hari aktif dikalikan <code>(hari berlalu / 7)</code> sejak hari Senin.
                    </div>
                    <p className="text-[10px] italic text-primary/80">
                      * Dibandingkan dengan targetmu sendiri, bukan dengan orang lain.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
              <Target className="h-4 w-4 text-primary" />
            </div>
          </div>

          <div className="my-2">
            {consistency.score !== null ? (
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-mono text-foreground tracking-tight">
                    {consistency.score}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                  {consistency.lastWeekScore !== null && (
                    <span className="ml-2 text-[10px] text-muted-foreground font-mono">
                      (Minggu lalu: {consistency.lastWeekScore})
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  dibandingkan dengan targetmu sendiri
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-semibold text-foreground py-0.5">
                  Mengumpulkan data
                </div>
                <div className="text-[11px] text-muted-foreground">
                  (hari ke-{consistency.collectingDayNumber} dari 7)
                </div>
                {consistency.lastWeekScore !== null && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Minggu lalu: {consistency.lastWeekScore}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 border-t space-y-1 text-[10px] text-muted-foreground">
          {consistency.score !== null ? (
            <>
              <div className="truncate" title={`Pencapaian target ${consistency.targetPercent}% -> ${consistency.targetComponent}/50 poin`}>
                Pencapaian target {consistency.targetPercent}% &rarr;{" "}
                <strong className="text-foreground">{consistency.targetComponent}/50 poin</strong>
              </div>
              <div className="truncate" title={`Hari aktif ${consistency.activeDaysInWeek} dari ${consistency.expectedActiveDays} -> ${consistency.activeDaysComponent}/30 poin`}>
                Hari aktif {consistency.activeDaysInWeek} dari {consistency.expectedActiveDays} &rarr;{" "}
                <strong className="text-foreground">{consistency.activeDaysComponent}/30 poin</strong>
              </div>
              <div className="truncate" title={`Sesi mencapai target ${consistency.completedSessionsCount} dari ${consistency.startedSessionsCount} -> ${consistency.completionRateComponent}/20 poin`}>
                Sesi mencapai target {consistency.completedSessionsCount} dari {consistency.startedSessionsCount} &rarr;{" "}
                <strong className="text-foreground">{consistency.completionRateComponent}/20 poin</strong>
              </div>
            </>
          ) : (
            <div className="text-[10px] text-muted-foreground leading-normal">
              Skor konsistensi mingguan akan tampil setelah minimal 7 hari sejak sesi pertamamu.
            </div>
          )}
        </div>
      </Card>

      {/* =========================================================================
          KARTU 3: Tren Belajar (4 Minggu)
          Jendela tetap: 4 minggu terakhir
          Selalu tampilkan batang total mingguan yang ada;
          Label naik/stabil/turun hanya bila minimal 3 minggu ("baru N dari 3 minggu")
         ========================================================================= */}
      <Card className="border shadow-xs p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span className="font-semibold text-foreground">Tren Belajar</span>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                4 minggu terakhir
              </Badge>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </div>

          <div className="my-2">
            {trend.direction === "INSUFFICIENT_DATA" ? (
              <div>
                <Badge
                  variant="outline"
                  className="text-[11px] font-medium px-2 py-0.5 bg-muted/50 text-muted-foreground border-dashed"
                >
                  {trend.label}
                </Badge>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Butuh minimal 3 minggu untuk analisis arah tren
                </div>
              </div>
            ) : (
              <div>
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
                    {trend.direction === "UP"
                      ? "▲ Naik"
                      : trend.direction === "DOWN"
                      ? "▼ Menurun"
                      : "● Stabil"}
                  </Badge>
                  <span className="text-xs font-mono font-semibold text-foreground">
                    {trend.percentChange > 0 ? `+${trend.percentChange}%` : `${trend.percentChange}%`}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground truncate mt-1" title={trend.label}>
                  Rata-rata: {formatMinutesToHours(trend.pastAverageMinutes)}/mgg
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4 Mini Bar Mingguan */}
        <div className="pt-2.5 border-t">
          <div className="flex items-end justify-between gap-2 h-11 px-1">
            {weeklyBars.map((bar, idx) => {
              const heightPct = maxWeeklyMinutes > 0 ? Math.round((bar.minutes / maxWeeklyMinutes) * 100) : 0;
              const isCurrentWeek = idx === weeklyBars.length - 1;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-muted/80 rounded-t flex items-end justify-center overflow-hidden h-7"
                    title={`${bar.weekLabel}: ${formatMinutesToHours(bar.minutes)}`}
                  >
                    <div
                      style={{ height: `${Math.max(bar.minutes > 0 ? 15 : 0, heightPct)}%` }}
                      className={`w-full transition-all duration-300 rounded-t ${
                        isCurrentWeek ? "bg-primary" : "bg-primary/45"
                      }`}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground font-mono leading-none">
                    {bar.weekLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* =========================================================================
          KARTU 4: Sesi mencapai target durasi (Ganti nama dari Penyelesaian Sesi)
          Jendela dinamis sesuai filter: 7 hari terakhir / 30 hari terakhir / 1 tahun ini
          Keterangan: "sesi yang mencapai durasi rencananya, bukan target mingguan"
          Baris "Target mingguan tercapai X%" dipertahankan
         ========================================================================= */}
      <Card className="border shadow-xs p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span className="font-semibold text-foreground leading-tight">
              Sesi mencapai target durasi
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                {filterPeriodLabel}
              </Badge>
              <CheckCircle className="h-4 w-4 text-primary" />
            </div>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-foreground tracking-tight">
                {completionRatio}%
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                ({completedSessionsCount} dari {startedSessionsCount} sesi)
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight mt-1">
              sesi yang mencapai durasi rencananya, bukan target mingguan
            </p>
          </div>
        </div>

        <div className="pt-2 border-t space-y-1 text-[11px] text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Target mingguan tercapai:</span>
            <strong className="text-foreground font-mono">{targetPercent}%</strong>
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <Flame className="h-3.5 w-3.5 text-amber-500" />
            <span>
              Streak aktif: <strong className="text-foreground">{currentStreakDays} hari</strong>
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
