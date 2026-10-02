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
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export interface ActiveTaskProgressData {
  taskId: string;
  courseId: string | null;
  courseName: string;
  title: string;
  done: number;
  inProgress: number;
  review: number;
  notStarted: number;
  totalRecipients: number;
}

interface TaskProgressStackedBarProps {
  data: ActiveTaskProgressData[];
  title?: string;
  description?: string;
}

export function TaskProgressStackedBar({
  data,
  title = "Progres per Tugas Aktif",
  description = "Tingkat penyelesaian mahasiswa aktif pada tugas kelas.",
}: TaskProgressStackedBarProps) {
  const router = useRouter();

  const handleBarClick = (entry: unknown) => {
    const item = (entry as { activePayload?: Array<{ payload: ActiveTaskProgressData }> })
      ?.activePayload?.[0]?.payload;
    if (item?.courseId) {
      router.push(`/home/tasks?course=${item.courseId}`);
    } else {
      router.push("/home/tasks");
    }
  };

  return (
    <Card className="flex flex-col border shadow-xs">
      <CardHeader className="p-4 pb-1">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-primary" />
            {title}
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {data.length} Tugas Aktif
          </span>
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>

      <CardContent className="p-4 pt-3 flex-1">
        {data.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-xs text-muted-foreground italic text-center">
            Belum ada tugas aktif yang sedang berjalan.
          </div>
        ) : (
          <div style={{ height: Math.max(220, data.length * 48) }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={data}
                margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                onClick={handleBarClick}
                className="cursor-pointer"
              >
                <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="title"
                  width={130}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val: string) =>
                    val.length > 20 ? `${val.slice(0, 18)}...` : val
                  }
                />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as ActiveTaskProgressData;
                      const tot = item.totalRecipients || 1;
                      const donePct = ((item.done / tot) * 100).toFixed(0);
                      const inProgPct = ((item.inProgress / tot) * 100).toFixed(0);
                      const reviewPct = ((item.review / tot) * 100).toFixed(0);
                      const notStartPct = ((item.notStarted / tot) * 100).toFixed(0);

                      return (
                        <div className="bg-popover border text-popover-foreground text-xs p-2.5 rounded-md shadow-md space-y-1.5 min-w-[200px]">
                          <div className="font-semibold text-foreground leading-snug">
                            {item.title}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {item.courseName} • Total {item.totalRecipients} Mahasiswa Aktif
                          </div>
                          <div className="space-y-1 pt-1 border-t text-[11px]">
                            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                              <span>Selesai:</span>
                              <span className="font-medium">
                                {item.done} ({donePct}%)
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                              <span>Sedang Dikerjakan:</span>
                              <span className="font-medium">
                                {item.inProgress} ({inProgPct}%)
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
                              <span>Review:</span>
                              <span className="font-medium">
                                {item.review} ({reviewPct}%)
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-zinc-500">
                              <span>Belum Mulai:</span>
                              <span className="font-medium">
                                {item.notStarted} ({notStartPct}%)
                              </span>
                            </div>
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
                    if (value === "done") return "Selesai";
                    if (value === "inProgress") return "Sedang Dikerjakan";
                    if (value === "review") return "Review";
                    if (value === "notStarted") return "Belum Mulai";
                    return value;
                  }}
                />
                <Bar dataKey="done" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="inProgress" stackId="a" fill="#3b82f6" />
                <Bar dataKey="review" stackId="a" fill="#a855f7" />
                <Bar dataKey="notStarted" stackId="a" fill="#71717a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
