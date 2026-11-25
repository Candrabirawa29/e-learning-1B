"use client";

import * as React from "react";
import { formatWib, wibDayKey } from "@/lib/datetime";
import { buildHeatmapWeeksGrid } from "@/lib/analytics/heatmap-layout";
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

  // Construct weeks grid & aligned month header columns via pure helper
  const { weeks, monthLabels } = React.useMemo(
    () => buildHeatmapWeeksGrid({ period, todayKey, currentYear, dataMap }),
    [period, todayKey, currentYear, dataMap]
  );

  // Otomatis scroll ke minggu terbaru hanya jika container memang overflow (mis. mobile/tablet)
  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (el && el.scrollWidth > el.clientWidth) {
      el.scrollLeft = el.scrollWidth;
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
          <div
            className="grid gap-[3px] min-w-[740px] select-none items-center"
            style={{
              gridTemplateColumns: `28px repeat(${weeks.length}, minmax(10px, 1fr))`,
            }}
          >
            {/* Row 1: Month Labels placed on exact same week column tracks */}
            <div className="sticky left-0 bg-card z-10 h-4" />
            {monthLabels.map((m) => (
              <div
                key={`${m.label}-${m.colIndex}`}
                style={{ gridColumn: `${m.colIndex + 2} / span ${m.colSpan}` }}
                className="text-[10px] text-muted-foreground font-medium text-left leading-none pb-0.5 truncate"
              >
                {m.label}
              </div>
            ))}

            {/* Rows 2..8: 7 days (Sen=0 .. Min=6) with sticky day labels on the left */}
            {DAY_LABELS.map((lbl, dayIdx) => (
              <React.Fragment key={`row-${dayIdx}`}>
                <div className="sticky left-0 bg-card z-10 pr-1.5 text-[9px] text-muted-foreground font-medium text-right leading-none">
                  {lbl}
                </div>
                {weeks.map((w, colIdx) => {
                  const day = w.days[dayIdx];
                  if (!day) {
                    return <div key={`empty-${colIdx}-${dayIdx}`} />;
                  }
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
                      className={`w-full aspect-square rounded-[2.5px] transition-colors focus:outline-hidden ${getColorClass(
                        day.level,
                        day.isFuture
                      )}`}
                    />
                  );
                })}
              </React.Fragment>
            ))}
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
