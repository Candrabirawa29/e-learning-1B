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
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, CheckCircle2, PlusCircle } from "lucide-react";

export interface WeeklyActivityPoint {
  week: string;
  created: number;
  completed: number;
}

interface TasksWeeklyAreaChartProps {
  data: WeeklyActivityPoint[];
}

export function TasksWeeklyAreaChart({ data }: TasksWeeklyAreaChartProps) {
  const totalCreated = data.reduce((acc, curr) => acc + curr.created, 0);
  const totalCompleted = data.reduce((acc, curr) => acc + curr.completed, 0);
  const completionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;

  return (
    <Card className="flex flex-col border border-border/80 bg-card/95 shadow-sm overflow-hidden backdrop-blur-xs">
      <CardHeader className="p-4 sm:p-5 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 border-cyan-500/30 bg-cyan-500/10 gap-1 px-2 py-0.5"
              >
                <TrendingUp className="h-3 w-3" />
                Tren Mingguan
              </Badge>
              {totalCreated > 0 && (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  {completionRate}% Rasio Selesai
                </span>
              )}
            </div>
            <CardTitle className="text-sm font-semibold tracking-tight mt-1">
              Tugas Dibuat vs Diselesaikan
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Perbandingan produktivitas tugas masuk dan tugas tuntas tiap minggu.
            </CardDescription>
          </div>

          {/* Quick Pill Legend / Stats */}
          <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-medium">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300">
              <PlusCircle className="h-3.5 w-3.5 text-indigo-500" />
              <span>{totalCreated} Dibuat</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-cyan-500" />
              <span>{totalCompleted} Selesai</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-3 flex-1">
        {data.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-xs text-muted-foreground italic text-center border border-dashed rounded-xl p-4">
            <TrendingUp className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <span>Belum ada data aktivitas mingguan.</span>
          </div>
        ) : (
          <div className="h-52 sm:h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                <defs>
                  {/* Indigo gradient for created tasks */}
                  <linearGradient id="gradientCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="60%" stopColor="#6366f1" stopOpacity={0.06} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Cyan gradient for completed tasks */}
                  <linearGradient id="gradientCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="60%" stopColor="#06b6d4" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="4 4" vertical={false} opacity={0.12} stroke="currentColor" />

                <XAxis
                  dataKey="week"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "currentColor", opacity: 0.65 }}
                  dy={6}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "currentColor", opacity: 0.65 }}
                  allowDecimals={false}
                  dx={-4}
                />

                {/* Floating Glassmorphism Tooltip */}
                <Tooltip
                  cursor={{
                    stroke: "#6366f1",
                    strokeWidth: 1.5,
                    strokeDasharray: "3 3",
                    opacity: 0.7,
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as WeeklyActivityPoint;
                      return (
                        <div className="rounded-xl border border-border/80 bg-card/95 dark:bg-slate-950/90 text-foreground text-xs p-3 shadow-xl backdrop-blur-md space-y-2 min-w-[170px]">
                          <div className="font-semibold text-[11px] text-muted-foreground border-b pb-1.5 border-border/50">
                            {item.week}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                                Dibuat:
                              </span>
                              <strong className="font-mono text-indigo-600 dark:text-indigo-400">
                                {item.created}
                              </strong>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <span className="h-2 w-2 rounded-full bg-cyan-500" />
                                Selesai:
                              </span>
                              <strong className="font-mono text-cyan-600 dark:text-cyan-400">
                                {item.completed}
                              </strong>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Indigo Area - Created */}
                <Area
                  type="monotone"
                  dataKey="created"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#gradientCreated)"
                  activeDot={{
                    r: 5,
                    fill: "#6366f1",
                    stroke: "#ffffff",
                    strokeWidth: 2,
                  }}
                />

                {/* Cyan Area - Completed */}
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#gradientCompleted)"
                  activeDot={{
                    r: 5,
                    fill: "#06b6d4",
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
