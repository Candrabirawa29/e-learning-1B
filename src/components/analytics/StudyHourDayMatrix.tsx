"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { HourDayMatrixRow } from "@/lib/analytics/study-queries";

interface StudyHourDayMatrixProps {
  matrixData: HourDayMatrixRow[];
}

const DOW_NAMES = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function StudyHourDayMatrix({ matrixData }: StudyHourDayMatrixProps) {
  // Map matrixData into a lookup map: `${day_of_week}_${hour_of_day}` -> minutes
  const lookup = React.useMemo(() => {
    const map = new Map<string, { minutes: number; count: number }>();
    for (const r of matrixData) {
      map.set(`${r.day_of_week}_${r.hour_of_day}`, {
        minutes: Number(r.total_minutes) || 0,
        count: Number(r.session_count) || 0,
      });
    }
    return map;
  }, [matrixData]);

  const maxMinutesInSlot = React.useMemo(() => {
    let max = 0;
    for (const r of matrixData) {
      if (r.total_minutes > max) max = r.total_minutes;
    }
    return max > 0 ? max : 1;
  }, [matrixData]);

  const getColor = (minutes: number) => {
    if (minutes === 0) return "bg-muted/40 dark:bg-muted/20 border-transparent";
    const ratio = minutes / maxMinutesInSlot;
    if (ratio >= 0.75) return "bg-emerald-600 dark:bg-emerald-500 text-white";
    if (ratio >= 0.5) return "bg-emerald-500 dark:bg-emerald-600 text-white";
    if (ratio >= 0.25) return "bg-emerald-400 dark:bg-emerald-700 text-foreground";
    return "bg-emerald-200 dark:bg-emerald-950 text-foreground";
  };

  const hasAnyData = matrixData.length > 0;

  return (
    <Card className="border shadow-xs">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Pola Waktu Belajar (Jam Mulai Sesi)
        </CardTitle>
        <CardDescription className="text-xs">
          Waktu ketika Anda paling sering memulai sesi fokus dalam sepekan (24 jam x 7 hari).
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 pt-1 space-y-3">
        {!hasAnyData ? (
          <div className="h-32 flex items-center justify-center text-xs text-muted-foreground italic text-center">
            Belum ada data pola jam belajar.
          </div>
        ) : (
          <div className="overflow-x-auto pb-2 focus:outline-hidden rounded-lg">
            <div className="min-w-[580px] text-xs">
              {/* Hour header */}
              <div className="flex pl-10 mb-1">
                {HOURS.filter((h) => h % 2 === 0).map((h) => (
                  <div key={h} className="w-10 text-[10px] text-muted-foreground font-mono text-center shrink-0">
                    {h.toString().padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {/* Rows: 1 (Senin) to 7 (Minggu) */}
              <div className="space-y-1">
                {[1, 2, 3, 4, 5, 6, 7].map((dow, rowIdx) => {
                  const dayName = DOW_NAMES[rowIdx];
                  return (
                    <div key={dow} className="flex items-center gap-1.5">
                      <span className="w-8 text-[11px] font-medium text-muted-foreground text-right shrink-0">
                        {dayName}
                      </span>

                      <div className="flex gap-1 flex-1">
                        {HOURS.map((h) => {
                          const slot = lookup.get(`${dow}_${h}`);
                          const minutes = slot?.minutes || 0;
                          const count = slot?.count || 0;

                          const tooltip = `${dayName}, ${h.toString().padStart(2, "0")}:00 - ${h}:59: ${minutes}m fokus (${count} sesi)`;

                          return (
                            <div
                              key={h}
                              title={tooltip}
                              aria-label={tooltip}
                              className={`h-4 flex-1 rounded-[2px] transition-colors cursor-pointer border ${getColor(
                                minutes
                              )}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-3 mt-2 border-t">
                <span>Warna lebih pekat menandakan akumulasi menit fokus lebih tinggi</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px]">Kurang</span>
                  <div className="w-2.5 h-2.5 rounded-[2px] bg-muted/40" />
                  <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-200 dark:bg-emerald-950" />
                  <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 dark:bg-emerald-700" />
                  <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-600 dark:bg-emerald-500" />
                  <span className="text-[10px]">Intens</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
