"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminProductInsights } from "@/types/admin-study-analytics";
import {
  Compass,
  Users,
  Repeat,
  Layout,
  Award,
  Info,
  Timer,
} from "lucide-react";

interface AdminProductInsightsCardProps {
  insights: AdminProductInsights;
}

export function AdminProductInsightsCard({ insights }: AdminProductInsightsCardProps) {
  const totalModes = insights.featureUsage.focusModeCount + insights.featureUsage.stopwatchModeCount;
  const focusPercent = totalModes > 0
    ? Math.round((insights.featureUsage.focusModeCount / totalModes) * 100)
    : 100;
  const stopwatchPercent = 100 - focusPercent;

  const totalFloat = insights.featureUsage.pipCount + insights.featureUsage.inAppCount + insights.featureUsage.offCount;
  const pipPercent = totalFloat > 0
    ? Math.round((insights.featureUsage.pipCount / totalFloat) * 100)
    : 0;
  const inAppPercent = totalFloat > 0
    ? Math.round((insights.featureUsage.inAppCount / totalFloat) * 100)
    : 0;

  return (
    <Card className="border border-border/80 bg-card/95 shadow-sm overflow-hidden backdrop-blur-xs">
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 border-cyan-500/30 bg-cyan-500/10 gap-1 px-2 py-0.5"
              >
                <Compass className="h-3 w-3" />
                Product Usage & Adoption Insights
              </Badge>
            </div>
            <CardTitle className="text-base sm:text-lg font-bold tracking-tight mt-1.5">
              Evaluasi Kesehatan Produk & Keterlibatan Pengguna
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Metrik standar adopsi, retensi berkala, dan preferensi fitur oleh mahasiswa.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* Metric Grid: WAU, MAU, 7-day Retention, 30-day Retention */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* WAU */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-muted/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-medium">WAU (7 Hari Terakhir)</span>
              <Users className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="my-2">
              <div className="text-xl font-bold font-mono text-foreground flex items-baseline gap-1">
                <span>{insights.wau}</span>
                <span className="text-xs font-normal text-muted-foreground">mahasiswa</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Pengguna aktif dengan durasi fokus dalam 7 hari terakhir.
            </p>
          </div>

          {/* MAU */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-muted/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-medium">MAU (30 Hari Terakhir)</span>
              <Users className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <div className="my-2">
              <div className="text-xl font-bold font-mono text-foreground flex items-baseline gap-1">
                <span>{insights.mau}</span>
                <span className="text-xs font-normal text-muted-foreground">mahasiswa</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Pengguna aktif dengan durasi fokus dalam 30 hari terakhir.
            </p>
          </div>

          {/* 7-day Retention */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-muted/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-medium">7-Day Retention</span>
              <Repeat className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="my-2">
              <div className="text-xl font-bold font-mono text-foreground flex items-baseline gap-1">
                <span>{insights.retention7d !== null ? `${insights.retention7d}%` : "—"}</span>
                {insights.retention7d !== null && (
                  <Badge variant="outline" className="text-[9px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-1 py-0 ml-1">
                    retensi mingguan
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Persentase pengguna minggu lalu yang kembali belajar di minggu ini.
            </p>
          </div>

          {/* 30-day Retention */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-muted/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-medium">30-Day Retention</span>
              <Repeat className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <div className="my-2">
              <div className="text-xl font-bold font-mono text-foreground flex items-baseline gap-1">
                <span>{insights.retention30d !== null ? `${insights.retention30d}%` : "—"}</span>
                {insights.retention30d !== null && (
                  <Badge variant="outline" className="text-[9px] text-purple-600 dark:text-purple-400 border-purple-500/30 px-1 py-0 ml-1">
                    retensi bulanan
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Persentase pengguna bulan lalu yang tetap aktif di bulan berjalan.
            </p>
          </div>
        </div>

        {/* Feature Usage & Engagement Trends */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Card 1: Distribusi Mode Belajar */}
          <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Timer className="h-4 w-4 text-blue-500" />
              <span>Preferensi Mode Fokus</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Mode Pomodoro (Target Waktu)</span>
                <span className="font-mono font-bold text-foreground">
                  {insights.featureUsage.focusModeCount} ({focusPercent}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${focusPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>Mode Stopwatch (Waktu Bebas)</span>
                <span className="font-mono font-bold text-foreground">
                  {insights.featureUsage.stopwatchModeCount} ({stopwatchPercent}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${stopwatchPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Floating Window / PiP Mode Preference */}
          <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Layout className="h-4 w-4 text-cyan-500" />
              <span>Preferensi Jendela Mengambang</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Picture-in-Picture (PiP Asli)</span>
                <span className="font-mono font-bold text-foreground">
                  {insights.featureUsage.pipCount} ({pipPercent}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-cyan-500 h-2 rounded-full transition-all"
                  style={{ width: `${pipPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>In-App Float (Jendela Web)</span>
                <span className="font-mono font-bold text-foreground">
                  {insights.featureUsage.inAppCount} ({inAppPercent}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${inAppPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Study Engagement & Consistency Trend */}
          <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Award className="h-4 w-4 text-amber-500" />
              <span>Indeks Konsistensi & Keterlibatan</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Rata-rata Durasi Harian:</span>
                <span className="font-mono font-bold text-foreground">
                  {insights.engagementTrend.averageDailyMinutesPerActiveUser} m / hari
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Rata-rata Sesi / Pengguna:</span>
                <span className="font-mono font-bold text-foreground">
                  {insights.engagementTrend.averageSessionsPerActiveUser} sesi
                </span>
              </div>

              <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                <span className="text-muted-foreground">Konsistensi Tinggi (≥ 70):</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {insights.consistencyTrend.highConsistencyPercent}%{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    ({insights.consistencyTrend.highConsistencyUserCount}/{insights.consistencyTrend.totalAssessedUsers})
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer / Objective Methodology Note */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-foreground font-semibold">Catatan Metodologi & Privasi: </strong>
            Metrik keterlibatan dihitung murni dari log sesi fokus yang dicatat pengguna secara sadar di peramban.
            Tingginya akumulasi durasi fokus merefleksikan kebiasaan adopsi aplikasi, bukan klaim perbandingan prestasi
            akademik. Seluruh catatan refleksi pribadi dan percakapan AI tetap dienkripsi/diisolasi dan tidak dapat
            diakses dalam panel monitoring ini.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
