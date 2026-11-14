"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminActivityTrendPoint } from "@/types/admin-study-analytics";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  UserCheck,
  CheckCircle2,
  Clock,
  Minus,
} from "lucide-react";

interface AdminActivityAnalyticsChartProps {
  data: AdminActivityTrendPoint[];
  periodLabel: string;
}

export function AdminActivityAnalyticsChart({
  data,
  periodLabel,
}: AdminActivityAnalyticsChartProps) {
  const [activeTab, setActiveTab] = React.useState<"duration" | "sessions" | "users">("duration");

  const totalMinutesCurrent = React.useMemo(
    () => data.reduce((acc, curr) => acc + curr.totalMinutes, 0),
    [data]
  );
  const totalMinutesPrev = React.useMemo(
    () => data.reduce((acc, curr) => acc + (curr.previousMinutes || 0), 0),
    [data]
  );
  const totalCompletedSessions = React.useMemo(
    () => data.reduce((acc, curr) => acc + curr.completedSessions, 0),
    [data]
  );
  const totalStoppedEarly = React.useMemo(
    () => data.reduce((acc, curr) => acc + curr.stoppedEarlySessions, 0),
    [data]
  );
  const totalCancelled = React.useMemo(
    () => data.reduce((acc, curr) => acc + curr.cancelledSessions, 0),
    [data]
  );

  const diffMinutes = totalMinutesCurrent - totalMinutesPrev;
  const percentChange =
    totalMinutesPrev > 0 ? Math.round((diffMinutes / totalMinutesPrev) * 100) : null;

  const currentLabelName = periodLabel;
  const previousLabelName = "Periode Sebelumnya";

  const hasAnyData = totalMinutesCurrent > 0 || totalCompletedSessions > 0;

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
                Aktivitas Belajar Platform
              </Badge>

              {percentChange !== null && (
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold gap-1 px-2 py-0.5 ${
                    percentChange > 0
                      ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                      : percentChange < 0
                      ? "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10"
                      : "border-border/60 text-muted-foreground bg-muted/40"
                  }`}
                >
                  {percentChange > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : percentChange < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  {percentChange > 0 ? `+${percentChange}%` : `${percentChange}%`} vs periode lalu
                </Badge>
              )}
            </div>

            <CardTitle className="text-base sm:text-lg font-bold tracking-tight mt-1.5 flex items-center gap-2">
              Tren Aktivitas Belajar Seluruh Pengguna
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Pantau akumulasi durasi belajar, penyelesaian sesi, dan tren pengguna aktif ({periodLabel}).
            </CardDescription>
          </div>

          {/* View Toggles */}
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border/50 self-start lg:self-auto">
            <Button
              type="button"
              variant={activeTab === "duration" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("duration")}
              className={`text-xs h-7 px-2.5 rounded-md ${
                activeTab === "duration"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="h-3.5 w-3.5 mr-1 text-blue-500" />
              Durasi (Dual-Line)
            </Button>
            <Button
              type="button"
              variant={activeTab === "sessions" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("sessions")}
              className={`text-xs h-7 px-2.5 rounded-md ${
                activeTab === "sessions"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-indigo-500" />
              Status Sesi
            </Button>
            <Button
              type="button"
              variant={activeTab === "users" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("users")}
              className={`text-xs h-7 px-2.5 rounded-md ${
                activeTab === "users"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5 mr-1 text-emerald-500" />
              Pengguna Aktif
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-1">
        {!hasAnyData ? (
          <div className="h-64 sm:h-72 flex flex-col items-center justify-center text-xs text-muted-foreground italic text-center border border-dashed rounded-xl p-4">
            <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <span>Belum ada aktivitas sesi Pomodoro tercatat pada periode {periodLabel}.</span>
          </div>
        ) : (
          <div className="h-64 sm:h-76 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {activeTab === "duration" ? (
                /* Tab 1: Dual-Line Area Chart (Durasi Belajar vs Periode Sebelumnya) */
                <AreaChart data={data} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminBlueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="60%" stopColor="#3b82f6" stopOpacity={0.08} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="adminPurpleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="60%" stopColor="#8b5cf6" stopOpacity={0.05} />
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

                  <Tooltip
                    cursor={{
                      stroke: "#3b82f6",
                      strokeWidth: 1.5,
                      strokeDasharray: "3 3",
                      opacity: 0.7,
                    }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as AdminActivityTrendPoint;
                        const dayDiffMin = item.totalMinutes - (item.previousMinutes || 0);

                        return (
                          <div className="rounded-xl border border-border/80 bg-card/95 dark:bg-slate-950/90 text-foreground text-xs p-3.5 shadow-xl backdrop-blur-md space-y-2.5 min-w-[220px]">
                            <div className="flex items-center justify-between gap-2 border-b pb-1.5 border-border/50">
                              <span className="font-semibold text-[11px] text-muted-foreground">
                                {item.label} ({item.dateKey})
                              </span>
                              {item.previousDateKey && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  vs {item.previousDateKey}
                                </span>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              {/* Periode Saat Ini */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                                  {currentLabelName}:
                                </span>
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                  {item.totalMinutes} menit
                                </span>
                              </div>

                              {/* Periode Sebelumnya */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                                  {previousLabelName}:
                                </span>
                                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                                  {item.previousMinutes ?? 0} menit
                                </span>
                              </div>

                              {/* Selisih */}
                              <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[11px]">
                                <span className="text-muted-foreground">Selisih Durasi:</span>
                                <span
                                  className={`font-mono font-semibold ${
                                    dayDiffMin > 0
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : dayDiffMin < 0
                                      ? "text-rose-600 dark:text-rose-400"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {dayDiffMin > 0 ? `+${dayDiffMin}` : dayDiffMin} m
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  {/* Garis 2: Periode Sebelumnya (Purple) */}
                  <Area
                    type="monotone"
                    dataKey="previousMinutes"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fill="url(#adminPurpleGradient)"
                    activeDot={{ r: 4, stroke: "#8b5cf6", strokeWidth: 2, fill: "#ffffff" }}
                    isAnimationActive={true}
                    animationDuration={600}
                  />

                  {/* Garis 1: Periode Ini (Electric Blue) */}
                  <Area
                    type="monotone"
                    dataKey="totalMinutes"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fill="url(#adminBlueGradient)"
                    activeDot={{ r: 5, stroke: "#3b82f6", strokeWidth: 2, fill: "#ffffff" }}
                    isAnimationActive={true}
                    animationDuration={600}
                  />
                </AreaChart>
              ) : activeTab === "sessions" ? (
                /* Tab 2: Stacked Bar Chart Status Sesi (Selesai vs Berhenti Awal vs Dibatalkan) */
                <BarChart data={data} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
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
                    dx={-4}
                  />

                  <Tooltip
                    cursor={{ fill: "currentColor", opacity: 0.05 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as AdminActivityTrendPoint;
                        const totalDay =
                          item.completedSessions + item.stoppedEarlySessions + item.cancelledSessions;

                        return (
                          <div className="rounded-xl border border-border/80 bg-card/95 dark:bg-slate-950/90 text-foreground text-xs p-3.5 shadow-xl backdrop-blur-md space-y-2 min-w-[200px]">
                            <div className="font-semibold text-[11px] text-muted-foreground border-b pb-1 border-border/50">
                              {item.label} ({item.dateKey})
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                  Selesai Penuh:
                                </span>
                                <span className="font-mono font-bold text-foreground">
                                  {item.completedSessions}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                                  Berhenti Awal:
                                </span>
                                <span className="font-mono font-bold text-foreground">
                                  {item.stoppedEarlySessions}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                                  Dibatalkan:
                                </span>
                                <span className="font-mono font-bold text-foreground">
                                  {item.cancelledSessions}
                                </span>
                              </div>
                              <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>Total Sesi:</span>
                                <span className="font-mono font-bold text-foreground">{totalDay} sesi</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
                  />

                  <Bar dataKey="completedSessions" name="Selesai" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="stoppedEarlySessions" name="Berhenti Awal" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="cancelledSessions" name="Dibatalkan" stackId="a" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                </BarChart>
              ) : (
                /* Tab 3: Tren Pengguna Aktif Harian (DAU) */
                <AreaChart data={data} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminEmeraldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="60%" stopColor="#10b981" stopOpacity={0.08} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
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
                    dx={-4}
                  />

                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as AdminActivityTrendPoint;
                        return (
                          <div className="rounded-xl border border-border/80 bg-card/95 dark:bg-slate-950/90 text-foreground text-xs p-3 shadow-xl backdrop-blur-md space-y-1.5 min-w-[170px]">
                            <div className="font-semibold text-[11px] text-muted-foreground border-b pb-1 border-border/50">
                              {item.label} ({item.dateKey})
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Pengguna Aktif:</span>
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {item.activeUsers} orang
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>Sesi Selesai:</span>
                              <span className="font-mono text-foreground">{item.completedSessions} sesi</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="activeUsers"
                    name="Pengguna Aktif"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#adminEmeraldGradient)"
                    activeDot={{ r: 5, stroke: "#10b981", strokeWidth: 2, fill: "#ffffff" }}
                    isAnimationActive={true}
                    animationDuration={600}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* Bottom Metrics Pill Bar */}
        <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-muted/40 p-2 rounded-lg border border-border/40">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Total Menit Periode</span>
            <span className="font-mono font-bold text-sm text-foreground">{totalMinutesCurrent.toLocaleString("id-ID")} m</span>
          </div>
          <div className="bg-muted/40 p-2 rounded-lg border border-border/40">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Sesi Selesai Penuh</span>
            <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">{totalCompletedSessions}</span>
          </div>
          <div className="bg-muted/40 p-2 rounded-lg border border-border/40">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Berhenti Lebih Awal</span>
            <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">{totalStoppedEarly}</span>
          </div>
          <div className="bg-muted/40 p-2 rounded-lg border border-border/40">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Sesi Dibatalkan</span>
            <span className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">{totalCancelled}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
