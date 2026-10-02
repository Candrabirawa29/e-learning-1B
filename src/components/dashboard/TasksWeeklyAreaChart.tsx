"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

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

  return (
    <Card className="flex flex-col border shadow-xs">
      <CardHeader className="p-4 pb-1">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-primary" />
            Tugas Dibuat vs Diselesaikan per Minggu
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {totalCreated} dibuat • {totalCompleted} selesai
          </span>
        </CardTitle>
        <CardDescription className="text-xs">
          Tren penerbitan tugas dan tingkat penyelesaian oleh mahasiswa selama beberapa minggu terakhir.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 pt-3 flex-1">
        {data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-muted-foreground italic text-center">
            Belum ada data aktivitas mingguan.
          </div>
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as WeeklyActivityPoint;
                      return (
                        <div className="bg-popover border text-popover-foreground text-xs p-2 rounded-md shadow-md space-y-1">
                          <p className="font-semibold">{item.week}</p>
                          <p className="text-purple-600 dark:text-purple-400">
                            Tugas Dibuat: <strong>{item.created}</strong>
                          </p>
                          <p className="text-emerald-600 dark:text-emerald-400">
                            Tugas Selesai: <strong>{item.completed}</strong>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
                  formatter={(value: string) => (value === "created" ? "Tugas Dibuat" : "Tugas Selesai")}
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCreated)"
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
