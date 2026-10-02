"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface StatusCount {
  name: string;
  label: string;
  value: number;
  color: string;
}

interface MyTaskStatusDonutProps {
  data: {
    todo: number;
    inProgress: number;
    review: number;
    done: number;
  };
}

const COLORS: Record<string, string> = {
  TODO: "#71717a", // zinc-500
  IN_PROGRESS: "#3b82f6", // blue-500
  REVIEW: "#a855f7", // purple-500
  DONE: "#10b981", // emerald-500
};

export function MyTaskStatusDonut({ data }: MyTaskStatusDonutProps) {
  const router = useRouter();

  const total = data.todo + data.inProgress + data.review + data.done;

  const chartData: StatusCount[] = [
    { name: "TODO", label: "Belum Dikerjakan", value: data.todo, color: COLORS.TODO },
    { name: "IN_PROGRESS", label: "Sedang Dikerjakan", value: data.inProgress, color: COLORS.IN_PROGRESS },
    { name: "REVIEW", label: "Review", value: data.review, color: COLORS.REVIEW },
    { name: "DONE", label: "Selesai", value: data.done, color: COLORS.DONE },
  ].filter((item) => item.value > 0);

  const handleSliceClick = (entry: StatusCount) => {
    router.push(`/home/tasks?scope=mine&status=${entry.name}`);
  };

  return (
    <Card className="flex flex-col border shadow-xs">
      <CardHeader className="p-4 pb-1">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Status Tugasku
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            Total {total} Tugas
          </span>
        </CardTitle>
        <CardDescription className="text-xs">
          Klik pada diagram untuk memfilter daftar tugas berdasarkan status.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 pt-2 flex flex-col sm:flex-row items-center justify-center gap-4 flex-1">
        {total === 0 ? (
          <div className="h-44 w-full flex items-center justify-center text-xs text-muted-foreground italic text-center">
            Belum ada tugas yang ditugaskan kepada Anda.
          </div>
        ) : (
          <>
            <div className="w-44 h-44 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as StatusCount;
                        const percentage = ((item.value / total) * 100).toFixed(1);
                        return (
                          <div className="bg-popover border text-popover-foreground text-xs p-2 rounded-md shadow-md">
                            <p className="font-semibold">{item.label}</p>
                            <p className="text-muted-foreground">
                              {item.value} tugas ({percentage}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    onClick={(entry) => handleSliceClick(entry as unknown as StatusCount)}
                    className="cursor-pointer focus:outline-none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold leading-none">{data.done}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">Selesai</span>
              </div>
            </div>

            <div className="space-y-1.5 w-full sm:w-auto text-xs">
              {[
                { name: "TODO", label: "Belum Dikerjakan", value: data.todo, color: COLORS.TODO },
                { name: "IN_PROGRESS", label: "Sedang Dikerjakan", value: data.inProgress, color: COLORS.IN_PROGRESS },
                { name: "REVIEW", label: "Review", value: data.review, color: COLORS.REVIEW },
                { name: "DONE", label: "Selesai", value: data.done, color: COLORS.DONE },
              ].map((item) => {
                const percentage = total > 0 ? ((item.value / total) * 100).toFixed(0) : "0";
                return (
                  <div
                    key={item.name}
                    onClick={() => router.push(`/home/tasks?scope=mine&status=${item.name}`)}
                    className="flex items-center justify-between gap-3 p-1.5 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                    <div className="font-semibold text-foreground">
                      {item.value} <span className="text-[10px] text-muted-foreground font-normal">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
