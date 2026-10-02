"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock } from "lucide-react";

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

  const handleBarClick = () => {
    router.push("/home/tasks?scope=mine");
  };

  return (
    <Card className="flex flex-col border shadow-xs">
      <CardHeader className="p-4 pb-1">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4 text-amber-500" />
            Beban Deadline 4 Minggu ke Depan
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {totalLoad} Deadline
          </span>
        </CardTitle>
        <CardDescription className="text-xs">
          Distribusi tenggat waktu tugas yang harus diselesaikan dalam sebulan ke depan.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 pt-3 flex-1 flex flex-col justify-end">
        {totalLoad === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs text-muted-foreground italic text-center">
            Tidak ada deadline tugas dalam 4 minggu ke depan.
          </div>
        ) : (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={handleBarClick}
                className="cursor-pointer"
              >
                <XAxis
                  dataKey="label"
                  stroke="#888888"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as WeekLoad;
                      return (
                        <div className="bg-popover border text-popover-foreground text-xs p-2 rounded-md shadow-md">
                          <p className="font-semibold">{item.week}</p>
                          <p className="text-muted-foreground">{item.count} tugas tenggat waktu</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={entry.count > 3 ? "#ef4444" : entry.count > 1 ? "#f59e0b" : "#3b82f6"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
