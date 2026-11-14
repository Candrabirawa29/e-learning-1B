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
import { BookOpen, CheckSquare, Info, Sparkles } from "lucide-react";
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

  const totalAllMinutes = kuliahMinutes + mandiriMinutes;
  const kuliahPercent = totalAllMinutes > 0 ? Math.round((kuliahMinutes / totalAllMinutes) * 100) : 0;
  const mandiriPercent = totalAllMinutes > 0 ? 100 - kuliahPercent : 0;

  const chartCourseData = React.useMemo(() => {
    return filteredCourses.map((c) => {
      const isKuliah = c.kind === "REGULAR";
      return {
        name: c.course_name,
        code: c.course_code,
        category: isKuliah ? "Kuliah" : "Mandiri",
        color: isKuliah ? "#06b6d4" : "#8b5cf6", // Cyan for Regular Kuliah, Purple for Mandiri
        menit: c.total_minutes,
        jam: Math.round((c.total_minutes / 60) * 10) / 10,
        sesi: c.session_count,
      };
    });
  }, [filteredCourses]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Course Distribution (Bar Chart with Pinterest-style aesthetic) */}
      <Card className="border border-border/80 bg-card/95 shadow-sm overflow-hidden backdrop-blur-xs">
        <CardHeader className="p-4 sm:p-5 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 border-cyan-500/30 bg-cyan-500/10 gap-1 px-2 py-0.5"
                >
                  <BookOpen className="h-3 w-3" />
                  Alokasi Subjek
                </Badge>
              </div>
              <CardTitle className="text-sm font-semibold tracking-tight mt-1">
                Distribusi Mata Kuliah & Mandiri
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Rincian alokasi waktu fokus kuliah resmi vs belajar mandiri.
              </CardDescription>
            </div>

            {/* Switcher Filter Pill */}
            <div className="inline-flex rounded-xl border border-border/60 bg-muted/30 p-1 text-[11px] self-start sm:self-auto">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  categoryFilter === "all"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setCategoryFilter("kuliah")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  categoryFilter === "kuliah"
                    ? "bg-background text-cyan-600 dark:text-cyan-400 shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block" />
                Kuliah
              </button>
              <button
                onClick={() => setCategoryFilter("mandiri")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  categoryFilter === "mandiri"
                    ? "bg-background text-purple-600 dark:text-purple-400 shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />
                Mandiri
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-3">
          {chartCourseData.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-xs text-muted-foreground italic text-center border border-dashed rounded-xl p-4">
              <BookOpen className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <span>Belum ada data fokus yang tercatat pada kategori ini.</span>
            </div>
          ) : (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartCourseData}
                  layout="vertical"
                  margin={{ top: 6, right: 16, left: 16, bottom: 6 }}
                >
                  <CartesianGrid strokeDasharray="4 4" horizontal={false} opacity={0.12} stroke="currentColor" />
                  <XAxis
                    type="number"
                    unit="m"
                    tick={{ fontSize: 10, fill: "currentColor", opacity: 0.65 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "currentColor", opacity: 0.75 }}
                    width={110}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(6, 182, 212, 0.06)", radius: 6 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-border/80 bg-card/95 dark:bg-slate-950/90 text-foreground text-xs p-3 shadow-xl backdrop-blur-md space-y-1.5 min-w-[170px]">
                            <div className="flex items-center gap-2 border-b pb-1.5 border-border/50">
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <p className="font-semibold truncate">{item.name}</p>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>Kategori:</span>
                              <span className="font-medium text-foreground">
                                {item.category === "Kuliah" ? "Kuliah Resmi" : "Mandiri"}
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between pt-0.5">
                              <span className="text-muted-foreground text-[11px]">Total:</span>
                              <span
                                className="font-mono font-bold text-sm"
                                style={{ color: item.color }}
                              >
                                {item.jam} jam ({item.menit}m)
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {item.sesi} sesi fokus tercatat
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="menit" radius={[0, 6, 6, 0]} maxBarSize={20}>
                    {chartCourseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pinterest-style Multi-segment Progress Bar & Ratio Stat */}
          <div className="pt-4 border-t mt-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">Rasio Alokasi Belajar</span>
              <span className="text-[11px] font-mono text-muted-foreground">
                {Math.round((totalAllMinutes / 60) * 10) / 10} jam total
              </span>
            </div>

            {/* Split Progress Track */}
            <div className="h-2.5 w-full bg-muted/40 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${kuliahPercent}%` }}
                className="bg-cyan-500 transition-all duration-500"
                title={`Kuliah: ${kuliahPercent}%`}
              />
              <div
                style={{ width: `${mandiriPercent}%` }}
                className="bg-purple-500 transition-all duration-500"
                title={`Mandiri: ${mandiriPercent}%`}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-0.5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />
                  <span className="text-muted-foreground">Kuliah:</span>
                  <span className="font-semibold font-mono text-foreground">
                    {Math.round((kuliahMinutes / 60) * 10) / 10}h ({kuliahPercent}%)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                  <span className="text-muted-foreground">Mandiri:</span>
                  <span className="font-semibold font-mono text-foreground">
                    {Math.round((mandiriMinutes / 60) * 10) / 10}h ({mandiriPercent}%)
                  </span>
                </div>
              </div>

              <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-cyan-500" />
                Semua waktu dihitung untuk target & streak
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Task Breakdown (Strictly requires >= 10 tasks) */}
      <Card className="border border-border/80 bg-card/95 shadow-sm overflow-hidden backdrop-blur-xs flex flex-col justify-between">
        <CardHeader className="p-4 sm:p-5 pb-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/10 gap-1 px-2 py-0.5"
            >
              <CheckSquare className="h-3 w-3" />
              Tugas & Proyek
            </Badge>
          </div>
          <CardTitle className="text-sm font-semibold tracking-tight mt-1">
            Fokus per Tugas Kuliah
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Rincian waktu pengerjaan tugas dan tingkat penyelesaian.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-3 flex-1 flex flex-col justify-between">
          {!taskData.sufficientData ? (
            <div className="h-52 flex flex-col items-center justify-center text-center p-4 bg-muted/20 border border-dashed rounded-xl">
              <Info className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-xs font-semibold text-foreground">
                Data belum cukup untuk statistik tugas
              </p>
              <p className="text-[11px] text-muted-foreground max-w-sm mt-1 leading-relaxed">
                Anda baru mengaitkan <strong>{taskData.totalTasksCount}</strong> tugas. Fitur analitik tugas dan perbandingan penyelesaian tepat waktu otomatis aktif setelah minimal <strong>10 tugas</strong> tercatat, untuk memastikan kesimpulan statistik yang akurat.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1 text-xs">
              {taskData.tasks.slice(0, 10).map((t) => (
                <div
                  key={t.task_id}
                  className="flex items-center justify-between p-2.5 rounded-xl border bg-card hover:bg-muted/40 transition-colors"
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <p className="font-semibold text-foreground line-clamp-1">{t.task_title}</p>
                    <span className="text-[10px] text-muted-foreground">{t.course_name || "Umum"}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline" className="text-[10px] font-mono border-cyan-500/30 text-cyan-700 dark:text-cyan-300 bg-cyan-500/5">
                      {t.total_minutes}m ({t.session_count}x)
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Minimum sample threshold</span>
            <span className="font-mono font-medium">{taskData.totalTasksCount} / 10 tugas</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
