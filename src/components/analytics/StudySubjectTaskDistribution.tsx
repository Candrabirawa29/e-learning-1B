"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  Cell,
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
  const [categoryFilter, setCategoryFilter] = React.useState<"all" | "kuliah" | "mandiri">("all");

  const { kuliahMinutes, mandiriMinutes, filteredCourses } = React.useMemo(() => {
    let kMin = 0;
    let mMin = 0;
    for (const c of courseData) {
      if (c.kind === "REGULAR") {
        kMin += c.total_minutes;
      } else {
        mMin += c.total_minutes;
      }
    }

    const filtered = courseData.filter((c) => {
      if (categoryFilter === "kuliah") return c.kind === "REGULAR";
      if (categoryFilter === "mandiri") return c.kind !== "REGULAR";
      return true;
    });

    return {
      kuliahMinutes: kMin,
      mandiriMinutes: mMin,
      filteredCourses: filtered,
    };
  }, [courseData, categoryFilter]);

  const chartCourseData = React.useMemo(() => {
    return filteredCourses.map((c) => {
      const isKuliah = c.kind === "REGULAR";
      return {
        name: c.course_name,
        code: c.course_code,
        category: isKuliah ? "Kuliah" : "Mandiri",
        color: isKuliah ? "#3b82f6" : "#8b5cf6",
        menit: c.total_minutes,
        jam: Math.round((c.total_minutes / 60) * 10) / 10,
        sesi: c.session_count,
      };
    });
  }, [filteredCourses]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Course Distribution (Bar Chart) */}
      <Card className="border shadow-xs">
        <CardHeader className="p-4 pb-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Distribusi Mata Kuliah & Mandiri
              </CardTitle>
              <CardDescription className="text-xs">
                Rincian alokasi waktu fokus kuliah resmi vs belajar mandiri.
              </CardDescription>
            </div>

            {/* Switcher Filter: Semua, Kuliah, Mandiri */}
            <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-[11px] self-start sm:self-auto">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  categoryFilter === "all"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setCategoryFilter("kuliah")}
                className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  categoryFilter === "kuliah"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                Kuliah
              </button>
              <button
                onClick={() => setCategoryFilter("mandiri")}
                className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  categoryFilter === "mandiri"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />
                Mandiri
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-3">
          {chartCourseData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground italic text-center">
              Belum ada data fokus yang tercatat pada kategori ini.
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
                          <div className="bg-popover text-popover-foreground border text-xs p-2 rounded shadow-md space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full inline-block"
                                style={{ backgroundColor: item.color }}
                              />
                              <p className="font-semibold">{item.name}</p>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {item.category === "Kuliah" ? "Mata Kuliah Resmi" : "Belajar Mandiri"}
                              </span>
                              {item.code && <span>({item.code})</span>}
                            </div>
                            <p className="text-primary font-mono font-semibold">
                              {item.menit} menit ({item.jam} jam)
                            </p>
                            <p className="text-[10px] text-muted-foreground">{item.sesi} sesi fokus</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="menit" radius={[0, 4, 4, 0]}>
                    {chartCourseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Ringkasan Perbandingan Kuliah vs Mandiri */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t mt-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                <span className="text-muted-foreground">Kuliah:</span>
                <span className="font-semibold font-mono text-foreground">
                  {Math.round((kuliahMinutes / 60) * 10) / 10} jam
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ({kuliahMinutes + mandiriMinutes > 0 ? Math.round((kuliahMinutes / (kuliahMinutes + mandiriMinutes)) * 100) : 0}%)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                <span className="text-muted-foreground">Mandiri:</span>
                <span className="font-semibold font-mono text-foreground">
                  {Math.round((mandiriMinutes / 60) * 10) / 10} jam
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ({kuliahMinutes + mandiriMinutes > 0 ? Math.round((mandiriMinutes / (kuliahMinutes + mandiriMinutes)) * 100) : 0}%)
                </span>
              </div>
            </div>

            <span className="text-[11px] text-muted-foreground italic">
              Semua waktu dihitung untuk target & streak
            </span>
          </div>
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
