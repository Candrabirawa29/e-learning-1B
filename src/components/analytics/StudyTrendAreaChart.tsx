"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatWib, getWibDayOfWeek } from "@/lib/datetime";
import { Activity, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface TrendDataPoint {
  dateKey: string;
  label?: string;
  minutes: number;
  sessions: number;
  previousDateKey?: string;
  previousMinutes?: number;
  previousSessions?: number;
}

interface StudyTrendAreaChartProps {
  data: TrendDataPoint[];
  periodLabel: string;
}

export function StudyTrendAreaChart({ data, periodLabel }: StudyTrendAreaChartProps) {
  // Total periode saat ini (Garis Biru)
  const totalMinutesCurrent = React.useMemo(
    () => data.reduce((acc, curr) => acc + curr.minutes, 0),
    [data]
  );
  const totalHoursCurrent = Math.round((totalMinutesCurrent / 60) * 10) / 10;

  // Total periode sebelumnya (Garis Kedua)
  const totalMinutesPrevious = React.useMemo(
    () => data.reduce((acc, curr) => acc + (curr.previousMinutes || 0), 0),
    [data]
  );
  const totalHoursPrevious = Math.round((totalMinutesPrevious / 60) * 10) / 10;

  // Selisih perbandingan antar kedua periode
  const diffMinutes = totalMinutesCurrent - totalMinutesPrevious;
  const percentChange =
    totalMinutesPrevious > 0
      ? Math.round((diffMinutes / totalMinutesPrevious) * 100)
      : null;

  const currentLabelName = periodLabel === "7 hari terakhir" ? "7 hari terakhir" : "Periode ini";
  const previousLabelName =
    periodLabel === "7 hari terakhir" ? "7 hari sebelumnya" : "Periode sebelumnya";

  const chartData = React.useMemo(() => {
    return data.map((d) => {
      const dow = getWibDayOfWeek(d.dateKey);
      const dayName = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"][dow - 1] || "";
      const dateFormatted = formatWib(d.dateKey, "date-short");

      return {
        date: d.dateKey,
        prevDate: d.previousDateKey || "",
        label: `${dayName} (${dateFormatted})`,
        dayName,
        menit: d.minutes,
        sesi: d.sessions,
        menitSebelumnya: d.previousMinutes || 0,
        sesiSebelumnya: d.previousSessions || 0,
      };
    });
  }, [data]);

  const hasAnyData = totalMinutesCurrent > 0 || totalMinutesPrevious > 0;

  return (
    <Card className="border border-border/80 bg-card/95 shadow-sm overflow-hidden backdrop-blur-xs">
      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10 gap-1 px-2 py-0.5"
              >
                <Activity className="h-3 w-3" />
                Perbandingan 2 Periode
              </Badge>

              {percentChange !== null && (
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold gap-1 px-2 py-0.5 ${
                    percentChange > 0
                      ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                      : percentChange < 0
                      ? "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10"
                      : "border-border text-muted-foreground bg-muted/40"
                  }`}
                >
                  {percentChange > 0 ? (
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                  ) : percentChange < 0 ? (
                    <TrendingDown className="h-3 w-3 text-rose-500" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  {percentChange > 0 ? `+${percentChange}%` : `${percentChange}%`} vs periode lalu
                </Badge>
              )}
            </div>

            <CardTitle className="text-sm font-semibold tracking-tight mt-1.5">
              Tren Akumulasi Waktu Fokus ({periodLabel})
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Membandingkan waktu fokus harian secara simultan antara periode aktif dan periode sebelumnya.
            </CardDescription>
          </div>

          {/* Dual Period Comparison Metric Badges */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {/* 1. Garis Biru: 7 Hari Terakhir */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10">
              <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
              <div className="text-left">
                <div className="text-[10px] font-medium text-blue-700 dark:text-blue-300">
                  {currentLabelName}
                </div>
                <div className="text-sm font-bold font-mono text-foreground leading-none mt-0.5">
                  {totalHoursCurrent} <span className="text-[10px] font-normal text-muted-foreground">jam</span>
                </div>
              </div>
            </div>

            {/* 2. Garis Kedua: 7 Hari Sebelumnya */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-purple-500/30 bg-purple-500/5 dark:bg-purple-500/10">
              <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
              <div className="text-left">
                <div className="text-[10px] font-medium text-purple-700 dark:text-purple-300">
                  {previousLabelName}
                </div>
                <div className="text-sm font-bold font-mono text-foreground leading-none mt-0.5">
                  {totalHoursPrevious} <span className="text-[10px] font-normal text-muted-foreground">jam</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-1">
        {!hasAnyData ? (
          <div className="h-60 flex flex-col items-center justify-center text-xs text-muted-foreground italic text-center border border-dashed rounded-xl p-4">
            <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <span>Belum ada data fokus yang tercatat pada kedua periode ini.</span>
          </div>
        ) : (
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  {/* Garis 1: Vibrant Blue Gradient */}
                  <linearGradient id="blueLineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="60%" stopColor="#3b82f6" stopOpacity={0.06} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Garis 2: Vibrant Purple / Violet Gradient */}
                  <linearGradient id="purpleLineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.22} />
                    <stop offset="60%" stopColor="#8b5cf6" stopOpacity={0.04} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="4 4" vertical={false} opacity={0.12} stroke="currentColor" />

                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "currentColor", opacity: 0.65 }}
                  dy={6}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "currentColor", opacity: 0.65 }}
                  unit="m"
                  dx={-4}
                />

                {/* Enhanced Dual-Line Tooltip */}
                <Tooltip
                  cursor={{
                    stroke: "#3b82f6",
                    strokeWidth: 1.5,
                    strokeDasharray: "3 3",
                    opacity: 0.7,
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      const dayDiffMin = item.menit - item.menitSebelumnya;
                      const dayPercent =
                        item.menitSebelumnya > 0
                          ? Math.round((dayDiffMin / item.menitSebelumnya) * 100)
                          : null;

                      return (
                        <div className="rounded-xl border border-border/80 bg-card/95 dark:bg-slate-950/90 text-foreground text-xs p-3.5 shadow-xl backdrop-blur-md space-y-2.5 min-w-[210px]">
                          <div className="flex items-center justify-between gap-2 border-b pb-1.5 border-border/50">
                            <span className="font-semibold text-[11px] text-muted-foreground">
                              {item.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              vs {formatWib(item.prevDate, "date-short")}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {/* Garis Biru Info */}
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                {currentLabelName}:
                              </span>
                              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                {item.menit} m{" "}
                                <span className="text-[10px] font-normal text-muted-foreground">
                                  ({item.sesi}x)
                                </span>
                              </span>
                            </div>

                            {/* Garis Kedua Info */}
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <span className="h-2 w-2 rounded-full bg-purple-500" />
                                {previousLabelName}:
                              </span>
                              <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                                {item.menitSebelumnya} m{" "}
                                <span className="text-[10px] font-normal text-muted-foreground">
                                  ({item.sesiSebelumnya}x)
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Delta Perubahan Hari */}
                          <div className="pt-1.5 border-t border-border/50 flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Perubahan:</span>
                            <span
                              className={`font-mono font-semibold ${
                                dayDiffMin > 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : dayDiffMin < 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {dayDiffMin > 0 ? `+${dayDiffMin}m` : `${dayDiffMin}m`}{" "}
                              {dayPercent !== null && (
                                <span className="text-[10px]">
                                  ({dayPercent > 0 ? `+${dayPercent}%` : `${dayPercent}%`})
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  formatter={(value: string) => {
                    return (
                      <span className="text-xs font-medium text-foreground mr-3">{value}</span>
                    );
                  }}
                />

                {/* Garis Kedua (7 Hari Sebelumnya - Ungu / Putus-putus Halus) */}
                <Area
                  type="monotone"
                  dataKey="menitSebelumnya"
                  name={previousLabelName}
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#purpleLineGradient)"
                  activeDot={{
                    r: 5,
                    fill: "#8b5cf6",
                    stroke: "#ffffff",
                    strokeWidth: 2,
                  }}
                />

                {/* Garis Biru (7 Hari Terakhir - Solid Biru Menyala) */}
                <Area
                  type="monotone"
                  dataKey="menit"
                  name={currentLabelName}
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#blueLineGradient)"
                  activeDot={{
                    r: 5,
                    fill: "#3b82f6",
                    stroke: "#ffffff",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
