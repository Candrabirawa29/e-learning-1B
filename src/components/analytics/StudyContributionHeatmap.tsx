"use client";

import * as React from "react";
import { formatWib, getWibDayOfWeek, wibDayKey, offsetDateKey } from "@/lib/datetime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Calendar, Info } from "lucide-react";

export interface HeatmapDayData {
  dateKey: string;
  minutes: number;
  sessionCount: number;
}

interface StudyContributionHeatmapProps {
  dataMap: Record<string, { minutes: number; sessionCount: number }>;
  currentStreak: number;
  longestStreak: number;
}

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

const DAY_LABELS = ["Sen", "", "Rab", "", "Jum", "", ""];

export function StudyContributionHeatmap({
  dataMap,
  currentStreak,
  longestStreak,
}: StudyContributionHeatmapProps) {
  const [period, setPeriod] = React.useState<"ROLLING_12_MONTHS" | "CALENDAR_YEAR">("ROLLING_12_MONTHS");
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const todayKey = React.useMemo(() => wibDayKey(new Date()), []);
  const currentYear = React.useMemo(() => parseInt(todayKey.slice(0, 4), 10), [todayKey]);

  // Construct weeks grid
  const { weeks, monthLabels } = React.useMemo(() => {
    let startDateKey = "";
    let endDateKey = todayKey;

    if (period === "ROLLING_12_MONTHS") {
      // 52 minggu ke belakang mulai hari Senin
      const targetPast = offsetDateKey(todayKey, -364);
      const dow = getWibDayOfWeek(targetPast); // 1 = Sen ... 7 = Min
      // Mundur ke hari Senin minggu tersebut
      startDateKey = offsetDateKey(targetPast, -(dow - 1));
      // Maju ke hari Minggu minggu ini
      const todayDow = getWibDayOfWeek(todayKey);
      endDateKey = offsetDateKey(todayKey, 7 - todayDow);
    } else {
      // Tahun kalender berjalan (1 Jan - 31 Des)
      const jan1 = `${currentYear}-01-01`;
      const dec31 = `${currentYear}-12-31`;
      const jan1Dow = getWibDayOfWeek(jan1);
      startDateKey = offsetDateKey(jan1, -(jan1Dow - 1));
      const dec31Dow = getWibDayOfWeek(dec31);
      endDateKey = offsetDateKey(dec31, 7 - dec31Dow);
    }

    // Bangun array kolom minggu (tiap minggu memiliki 7 hari: Sen = 0 s/d Min = 6)
    const weeksList: {
      days: {
        dateKey: string;
        minutes: number;
        sessionCount: number;
        isFuture: boolean;
        level: number;
      }[];
    }[] = [];

    const monthHeaders: { label: string; colIndex: number }[] = [];
    let lastMonth = -1;

    let cursor = startDateKey;
    let currentWeek: {
      dateKey: string;
      minutes: number;
      sessionCount: number;
      isFuture: boolean;
      level: number;
    }[] = [];

    let colIndex = 0;

    while (cursor <= endDateKey) {
      const isFuture = cursor > todayKey;
      const rec = dataMap[cursor];
      const minutes = !isFuture && rec ? rec.minutes : 0;
      const sessionCount = !isFuture && rec ? rec.sessionCount : 0;

      // Hitung 5 tingkat warna
      let level = 0;
      if (minutes >= 120) level = 4;
      else if (minutes >= 60) level = 3;
      else if (minutes >= 25) level = 2;
      else if (minutes > 0) level = 1;

      currentWeek.push({
        dateKey: cursor,
        minutes,
        sessionCount,
        isFuture,
        level,
      });

      // Simpan label bulan di minggu pertama saat bulan berganti
      const monthNum = parseInt(cursor.slice(5, 7), 10) - 1;
      if (monthNum !== lastMonth && currentWeek.length === 1) {
        monthHeaders.push({
          label: MONTH_NAMES_SHORT[monthNum],
          colIndex,
        });
        lastMonth = monthNum;
      }

      if (currentWeek.length === 7) {
        weeksList.push({ days: currentWeek });
        currentWeek = [];
        colIndex++;
      }

      cursor = offsetDateKey(cursor, 1);
    }

    if (currentWeek.length > 0) {
      weeksList.push({ days: currentWeek });
    }

    return { weeks: weeksList, monthLabels: monthHeaders };
  }, [period, todayKey, currentYear, dataMap]);

  // Otomatis scroll ke minggu terbaru di mobile
  React.useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [weeks]);

  // CSS kelas untuk 5 tingkat warna
  const getColorClass = (level: number, isFuture: boolean) => {
    if (isFuture) {
      return "bg-muted/10 opacity-30 border border-transparent cursor-not-allowed";
    }
    switch (level) {
      case 1:
        return "bg-emerald-200 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 hover:ring-2 hover:ring-primary";
      case 2:
        return "bg-emerald-400 dark:bg-emerald-800 border border-emerald-500 hover:ring-2 hover:ring-primary";
      case 3:
        return "bg-emerald-500 dark:bg-emerald-600 border border-emerald-600 hover:ring-2 hover:ring-primary";
      case 4:
        return "bg-emerald-700 dark:bg-emerald-400 border border-emerald-800 hover:ring-2 hover:ring-primary";
      default:
        return "bg-muted/40 dark:bg-muted/20 border border-muted-foreground/10 hover:bg-muted/70 hover:ring-2 hover:ring-primary";
    }
  };

  return (
    <Card className="border shadow-xs overflow-hidden">
      <CardHeader className="p-4 pb-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>Heatmap Kontribusi Belajar Tahunan</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Distribusi intensitas waktu fokus setiap hari sepanjang tahun.
            </CardDescription>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <Button
              variant={period === "ROLLING_12_MONTHS" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setPeriod("ROLLING_12_MONTHS")}
              className="h-7 text-xs px-2.5"
            >
              12 Bulan Terakhir
            </Button>
            <Button
              variant={period === "CALENDAR_YEAR" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setPeriod("CALENDAR_YEAR")}
              className="h-7 text-xs px-2.5"
            >
              Tahun {currentYear}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-4">
        {/* Streak summary pill */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-medium px-3 py-1 bg-muted/40 rounded-full border">
            <Flame className="h-3.5 w-3.5 text-amber-500" />
            <span>Streak Saat Ini: <strong>{currentStreak} hari</strong></span>
          </div>

          <div className="flex items-center gap-1.5 font-medium px-3 py-1 bg-muted/40 rounded-full border">
            <Flame className="h-3.5 w-3.5 text-emerald-500" />
            <span>Streak Terlama: <strong>{longestStreak} hari</strong></span>
          </div>

          <span className="text-[11px] text-muted-foreground flex items-center gap-1 ml-auto">
            <Info className="h-3 w-3" />
            Streak toleran: 1 hari kosong dalam 7 hari tidak memutus streak.
          </span>
        </div>

        {/* The Pure CSS Grid Contribution Heatmap with Horizontal Scroll for Mobile */}
        <div
          ref={scrollContainerRef}
          tabIndex={0}
          aria-label="Tabel kontribusi belajar tahunan. Gulir horizontal untuk melihat riwayat minggu."
          className="overflow-x-auto pb-2 pt-1 focus:outline-hidden focus:ring-1 focus:ring-primary/40 rounded-lg"
        >
          <div className="min-w-[760px] select-none">
            {/* Month Labels on top */}
            <div className="flex text-[10px] text-muted-foreground font-medium mb-1 pl-7">
              {weeks.map((_, colIdx) => {
                const header = monthLabels.find((m) => m.colIndex === colIdx);
                return (
                  <div key={colIdx} className="w-3.5 mr-1 text-left shrink-0">
                    {header ? header.label : ""}
                  </div>
                );
              })}
            </div>

            {/* Grid Container (Day labels on left + 7 rows of week columns) */}
            <div className="flex gap-1.5">
              {/* Day of Week Labels (Sen, Rab, Jum) */}
              <div className="flex flex-col gap-1 text-[9px] text-muted-foreground font-medium pr-1 pt-0.5 shrink-0">
                {DAY_LABELS.map((lbl, idx) => (
                  <div key={idx} className="h-3 leading-3 w-5 text-right">
                    {lbl}
                  </div>
                ))}
              </div>

              {/* Week Columns */}
              <div className="flex gap-1">
                {weeks.map((w, colIdx) => (
                  <div key={colIdx} className="flex flex-col gap-1 shrink-0">
                    {w.days.map((day) => {
                      const formattedDate = formatWib(day.dateKey, "date");
                      const tooltipText = day.isFuture
                        ? `${formattedDate} (Mendatang)`
                        : `${formattedDate}: ${day.minutes} menit fokus (${day.sessionCount} sesi)`;

                      return (
                        <div
                          key={day.dateKey}
                          tabIndex={day.isFuture ? -1 : 0}
                          role="gridcell"
                          aria-label={tooltipText}
                          title={tooltipText}
                          className={`w-3 h-3 rounded-[2.5px] transition-colors focus:outline-hidden ${getColorClass(
                            day.level,
                            day.isFuture
                          )}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
          <span>Arahkan kursor atau sentuh kotak untuk melihat rincian tanggal</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">Sedikit</span>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-[2px] bg-muted/40 dark:bg-muted/20 border border-muted-foreground/10" title="0 menit" />
              <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-200 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800" title="< 25 menit" />
              <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 dark:bg-emerald-800 border border-emerald-500" title="25 - 59 menit" />
              <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500 dark:bg-emerald-600 border border-emerald-600" title="60 - 119 menit" />
              <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-700 dark:bg-emerald-400 border border-emerald-800" title=">= 120 menit" />
            </div>
            <span className="text-[10px]">Banyak</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
