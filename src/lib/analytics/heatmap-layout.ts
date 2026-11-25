import { getWibDayOfWeek, offsetDateKey } from "@/lib/datetime";

export const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
] as const;

export interface HourHeaderSpec {
  hour: number;
  label: string;
  colIndex: number;
  gridColumnStart: number;
  colSpan: number;
}

/**
 * Menghasilkan spesifikasi header jam (00:00, 02:00, ..., 22:00) pada grid 24 kolom.
 * Kolom 1 adalah label hari (Sen..Min), sehingga jam h berada di gridColumnStart = h + 2.
 */
export function getHourHeaderSpecs(): HourHeaderSpec[] {
  const specs: HourHeaderSpec[] = [];
  for (let h = 0; h < 24; h += 2) {
    specs.push({
      hour: h,
      label: `${h.toString().padStart(2, "0")}:00`,
      colIndex: h,
      gridColumnStart: h + 2,
      colSpan: 2,
    });
  }
  return specs;
}

export interface HeatmapDayCell {
  dateKey: string;
  minutes: number;
  sessionCount: number;
  isFuture: boolean;
  level: number;
}

export interface HeatmapWeekColumn {
  days: HeatmapDayCell[];
}

export interface HeatmapMonthLabel {
  label: string;
  colIndex: number;
  colSpan: number;
}

export interface BuildHeatmapWeeksInput {
  period: "ROLLING_12_MONTHS" | "CALENDAR_YEAR";
  todayKey: string;
  currentYear: number;
  dataMap: Record<string, { minutes: number; sessionCount: number }>;
}

/**
 * Membangun kolom minggu (Senin-Minggu) dan pemetaan posisi kolom label bulan
 * secara murni agar header bulan selalu selaras dengan indeks kolom minggu.
 */
export function buildHeatmapWeeksGrid({
  period,
  todayKey,
  currentYear,
  dataMap,
}: BuildHeatmapWeeksInput): {
  weeks: HeatmapWeekColumn[];
  monthLabels: HeatmapMonthLabel[];
} {
  let startDateKey = "";
  let endDateKey = todayKey;

  if (period === "ROLLING_12_MONTHS") {
    const targetPast = offsetDateKey(todayKey, -364);
    const dow = getWibDayOfWeek(targetPast); // 1 = Sen ... 7 = Min
    startDateKey = offsetDateKey(targetPast, -(dow - 1));
    const todayDow = getWibDayOfWeek(todayKey);
    endDateKey = offsetDateKey(todayKey, 7 - todayDow);
  } else {
    const jan1 = `${currentYear}-01-01`;
    const dec31 = `${currentYear}-12-31`;
    const jan1Dow = getWibDayOfWeek(jan1);
    startDateKey = offsetDateKey(jan1, -(jan1Dow - 1));
    const dec31Dow = getWibDayOfWeek(dec31);
    endDateKey = offsetDateKey(dec31, 7 - dec31Dow);
  }

  const weeksList: HeatmapWeekColumn[] = [];
  const rawMonthHeaders: { label: string; colIndex: number }[] = [];
  let lastMonth = -1;

  let cursor = startDateKey;
  let currentWeek: HeatmapDayCell[] = [];
  let colIndex = 0;

  while (cursor <= endDateKey) {
    const isFuture = cursor > todayKey;
    const rec = dataMap[cursor];
    const minutes = !isFuture && rec ? rec.minutes : 0;
    const sessionCount = !isFuture && rec ? rec.sessionCount : 0;

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

    // Gunakan hari Senin (awal kolom minggu) untuk menentukan label bulan pada kolom tersebut.
    // Pada CALENDAR_YEAR, jika Senin minggu ke-0 masih di tahun sebelumnya (mis. 29 Des),
    // gunakan Jan (bulan 0) agar label tahun kalender dimulai dari Jan.
    if (currentWeek.length === 1) {
      const cursorYear = parseInt(cursor.slice(0, 4), 10);
      const rawMonthNum = parseInt(cursor.slice(5, 7), 10) - 1;
      const monthNum =
        period === "CALENDAR_YEAR" && colIndex === 0 && cursorYear < currentYear ? 0 : rawMonthNum;
      if (monthNum !== lastMonth) {
        rawMonthHeaders.push({
          label: MONTH_NAMES_SHORT[monthNum],
          colIndex,
        });
        lastMonth = monthNum;
      }
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

  const monthLabels: HeatmapMonthLabel[] = rawMonthHeaders.map((header, idx) => {
    const nextColIndex =
      idx + 1 < rawMonthHeaders.length ? rawMonthHeaders[idx + 1].colIndex : weeksList.length;
    return {
      label: header.label,
      colIndex: header.colIndex,
      colSpan: Math.max(1, nextColIndex - header.colIndex),
    };
  });

  return { weeks: weeksList, monthLabels };
}
