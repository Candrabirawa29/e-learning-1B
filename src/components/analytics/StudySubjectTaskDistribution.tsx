"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckSquare, Info } from "lucide-react";
import { CourseBreakdownRow, TaskBreakdownRow } from "@/lib/analytics/study-queries";

interface StudySubjectTaskDistributionProps {
  courseData: CourseBreakdownRow[];
  taskData: {
    sufficientData: boolean;
    tasks: TaskBreakdownRow[];
    totalTasksCount: number;
  };
}

export function StudySubjectTaskDistribution({
  courseData,
  taskData,
}: StudySubjectTaskDistributionProps) {
  const chartCourseData = React.useMemo(() => {
    return courseData.map((c) => ({
      name: c.course_name,
      menit: c.total_minutes,
      jam: Math.round((c.total_minutes / 60) * 10) / 10,
      sesi: c.session_count,
    }));
  }, [courseData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Course Distribution (Bar Chart) */}
      <Card className="border shadow-xs">
        <CardHeader className="p-4 pb-1">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Distribusi per Mata Kuliah
          </CardTitle>
          <CardDescription className="text-xs">
            Alokasi waktu belajar yang terdistribusi ke setiap mata kuliah.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 pt-3">
          {chartCourseData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground italic text-center">
              Belum ada data fokus yang tercatat pada mata kuliah.
            </div>
          ) : (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartCourseData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                  <XAxis type="number" unit="m" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                    width={100}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-popover text-popover-foreground border text-xs p-2 rounded shadow-md">
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-primary font-mono">{item.menit} menit ({item.jam} jam)</p>
                            <p className="text-[10px] text-muted-foreground">{item.sesi} sesi</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="menit" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Task Breakdown (Strictly requires >= 10 tasks) */}
      <Card className="border shadow-xs flex flex-col justify-between">
        <CardHeader className="p-4 pb-1">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            Fokus per Tugas Kuliah
          </CardTitle>
          <CardDescription className="text-xs">
            Rincian waktu pengerjaan tugas dan tingkat penyelesaian.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 pt-3 flex-1">
          {!taskData.sufficientData ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4 bg-muted/20 border border-dashed rounded-xl">
              <Info className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-xs font-semibold text-foreground">
                Data belum cukup untuk statistik tugas
              </p>
              <p className="text-[11px] text-muted-foreground max-w-sm mt-1 leading-relaxed">
                Anda baru mengaitkan <strong>{taskData.totalTasksCount}</strong> tugas. Fitur analitik tugas dan perbandingan penyelesaian tepat waktu otomatis aktif setelah minimal <strong>10 tugas</strong> tercatat, untuk memastikan kesimpulan statistik yang akurat.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
              {taskData.tasks.slice(0, 10).map((t) => (
                <div
                  key={t.task_id}
                  className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold line-clamp-1">{t.task_title}</p>
                    <span className="text-[10px] text-muted-foreground">{t.course_name || "Umum"}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {t.total_minutes}m ({t.session_count}x)
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
