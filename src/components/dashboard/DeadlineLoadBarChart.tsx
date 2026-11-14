"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, AlertCircle, ArrowUpRight } from "lucide-react";

interface WeekLoad {
  week: string;
  label: string;
  count: number;
}

interface DeadlineLoadBarChartProps {
  data: WeekLoad[];
}

export function DeadlineLoadBarChart({ data }: DeadlineLoadBarChartProps) {
  const router = useRouter();

  const totalLoad = data.reduce((acc, curr) => acc + curr.count, 0);
  const maxCount = React.useMemo(() => Math.max(0, ...data.map((d) => d.count)), [data]);

  const handleBarClick = () => {
    router.push("/home/tasks?scope=mine");
  };

  return (
    <Card className="flex flex-col border border-border/80 bg-card/95 shadow-sm overflow-hidden backdrop-blur-xs">
      <CardHeader className="p-4 sm:p-5 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 gap-1 px-2 py-0.5"
              >
                <CalendarClock className="h-3 w-3" />
                Beban Tugas
              </Badge>
              {maxCount > 3 && (
                <span className="text-[11px] font-medium text-rose-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Pekan Padat
                </span>
              )}
            </div>
            <CardTitle className="text-sm font-semibold tracking-tight mt-1">
              Beban Deadline 4 Minggu ke Depan
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Distribusi tugas yang jatuh tempo dalam sebulan mendatang.
            </CardDescription>
          </div>

          <button
            onClick={handleBarClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-muted/40 hover:bg-muted text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span className="font-mono text-sm text-foreground">{totalLoad}</span>
            <span className="text-muted-foreground font-normal">Deadline</span>
            <ArrowUpRight className="h-3 w-3 text-muted-foreground ml-0.5" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-3 flex-1 flex flex-col justify-end">
        {totalLoad === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-xs text-muted-foreground italic text-center border border-dashed rounded-xl p-4">
            <CalendarClock className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <span>Tidak ada deadline tugas dalam 4 minggu ke depan.</span>
          </div>
        ) : (
          <div className="h-48 sm:h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 12, right: 8, left: -22, bottom: 0 }}
                onClick={handleBarClick}
                className="cursor-pointer"
              >
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
                  allowDecimals={false}
                  dx={-4}
                />

                {/* Glassmorphism Tooltip */}
                <Tooltip
                  cursor={{ fill: "rgba(6, 182, 212, 0.08)", radius: 6 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as WeekLoad;
                      const isHigh = item.count > 3;
                      const isMed = item.count > 1;
                      return (
                        <div className="rounded-xl border border-border/80 bg-card/95 dark:bg-slate-950/90 text-foreground text-xs p-3 shadow-xl backdrop-blur-md space-y-1 min-w-[140px]">
                          <div className="font-semibold text-[11px] text-muted-foreground border-b pb-1 border-border/50">
                            {item.week}
                          </div>
                          <div className="flex items-baseline justify-between gap-2 pt-0.5">
                            <span className="text-muted-foreground text-[11px]">Jumlah:</span>
                            <span
                              className={`font-mono font-bold text-sm ${
                                isHigh
                                  ? "text-rose-500"
                                  : isMed
                                  ? "text-amber-500"
                                  : "text-cyan-500"
                              }`}
                            >
                              {item.count} tugas
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Klik untuk lihat daftar</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Rounded Bar with Pinterest-style dynamic cyan/slate highlights */}
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {data.map((entry, index) => {
                    const isPeak = entry.count === maxCount && maxCount > 0;
                    const isHigh = entry.count > 3;
                    const isMed = entry.count > 1;

                    // Pinterest neon cyan for peak, rose for heavy overload, slate for normal
                    const fillColor = isHigh
                      ? "#f43f5e" // rose-500
                      : isPeak
                      ? "#06b6d4" // vibrant cyan-500
                      : isMed
                      ? "#0ea5e9" // sky-500
                      : "#38bdf8"; // cyan-400 / sky

                    return (
                      <Cell
                        key={`bar-${index}`}
                        fill={fillColor}
                        opacity={isPeak || isHigh ? 1 : 0.75}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
