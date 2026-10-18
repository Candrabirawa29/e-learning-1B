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
import { formatWib } from "@/lib/datetime";
import { Activity } from "lucide-react";

export interface TrendDataPoint {
  dateKey: string;
  minutes: number;
  sessions: number;
}

interface StudyTrendAreaChartProps {
  data: TrendDataPoint[];
  periodLabel: string;
}

export function StudyTrendAreaChart({ data, periodLabel }: StudyTrendAreaChartProps) {
  const totalMinutes = React.useMemo(
    () => data.reduce((acc, curr) => acc + curr.minutes, 0),
    [data]
  );
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  const chartData = React.useMemo(() => {
    return data.map((d) => ({
      date: d.dateKey,
      label: formatWib(d.dateKey, "date-short"),
      menit: d.minutes,
      sesi: d.sessions,
    }));
  }, [data]);

  return (
    <Card className="border shadow-xs">
      <CardHeader className="p-4 pb-1">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Tren Waktu Fokus ({periodLabel})
            </CardTitle>
            <CardDescription className="text-xs">
              Total waktu belajar yang diakumulasikan setiap hari.
            </CardDescription>
          </div>
          <span className="text-xs font-semibold font-mono text-muted-foreground">
            Total {totalHours} jam ({totalMinutes}m)
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-3">
        {chartData.length === 0 || totalMinutes === 0 ? (
          <div className="h-56 flex items-center justify-center text-xs text-muted-foreground italic text-center">
            Belum ada data fokus yang tercatat pada periode ini.
          </div>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  unit="m"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-popover text-popover-foreground border text-xs p-2.5 rounded-lg shadow-md space-y-1">
                          <p className="font-semibold">{formatWib(item.date, "date")}</p>
                          <p className="text-primary font-mono font-bold">
                            {item.menit} menit fokus
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.sesi} sesi selesai
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="menit"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#focusGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
