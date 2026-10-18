"use server";

import { requireUser } from "@/lib/auth/session";
import {
  wibDayKey,
  offsetDateKey,
  getWibDayOfWeek,
  formatWib,
} from "@/lib/datetime";
import {
  getDailyStudyAggregation,
  getAnnualHeatmapData,
  getHourDayMatrix,
  getCourseBreakdown,
  getTaskBreakdownIfSufficient,
  getSessionCompletionRatio,
  getWeeklyTrendRecords,
} from "@/lib/analytics/study-queries";
import {
  calculateTolerantStreak,
  calculateWeeklyConsistencyScore,
  calculateStudyTrend,
} from "@/lib/analytics/study-metrics";
import { getOrCreateStudyPreference } from "@/actions/focus";
import { StudyAnalyticsDashboardData, TrendChartPoint } from "@/types/analytics";

export async function getStudyAnalyticsDashboard(
  filter: "7d" | "30d" | "year" = "7d"
): Promise<StudyAnalyticsDashboardData> {
  const session = await requireUser();
  const userId = session.user!.id;

  const preferences = await getOrCreateStudyPreference(userId);
  const todayKey = wibDayKey(new Date());

  // 1. Hitung rentang tanggal untuk filter aktif
  let currentStartKey: string;
  const currentEndKey: string = todayKey;
  let prevStartKey: string;
  let prevEndKey: string;

  if (filter === "7d") {
    currentStartKey = offsetDateKey(todayKey, -6);
    prevEndKey = offsetDateKey(todayKey, -7);
    prevStartKey = offsetDateKey(todayKey, -13);
  } else if (filter === "30d") {
    currentStartKey = offsetDateKey(todayKey, -29);
    prevEndKey = offsetDateKey(todayKey, -30);
    prevStartKey = offsetDateKey(todayKey, -59);
  } else {
    // Tahun ini (dari 1 Jan tahun berjalan s/d hari ini)
    const currentYear = todayKey.slice(0, 4);
    currentStartKey = `${currentYear}-01-01`;
    const prevYear = String(parseInt(currentYear, 10) - 1);
    prevStartKey = `${prevYear}-01-01`;
    prevEndKey = `${prevYear}-${todayKey.slice(5)}`;
  }

  // 2. Query data untuk periode aktif dan periode sebelumnya
  const [
    currentDailyRows,
    prevDailyRows,
    hourDayMatrix,
    courses,
    taskData,
    completion,
    weeklyRecords,
  ] = await Promise.all([
    getDailyStudyAggregation(userId, currentStartKey, currentEndKey),
    getDailyStudyAggregation(userId, prevStartKey, prevEndKey),
    getHourDayMatrix(userId, currentStartKey, currentEndKey),
    getCourseBreakdown(userId, currentStartKey, currentEndKey),
    getTaskBreakdownIfSufficient(userId, currentStartKey, currentEndKey),
    getSessionCompletionRatio(userId, currentStartKey, currentEndKey),
    getWeeklyTrendRecords(userId),
  ]);

  // 3. Query data Heatmap (53 minggu ke belakang dari hari ini untuk streak & GitHub heatmap)
  const heatmapStartKey = offsetDateKey(todayKey, -370);
  const annualMap = await getAnnualHeatmapData(userId, heatmapStartKey, todayKey);

  // Ubah Map menjadi Record serializable
  const heatmapDataMap: Record<string, { minutes: number; sessionCount: number }> = {};
  for (const [k, v] of annualMap.entries()) {
    heatmapDataMap[k] = v;
  }

  // 4. Hitung Streak Toleran
  const streakMinutesMap = new Map<string, number>();
  for (const [k, v] of annualMap.entries()) {
    streakMinutesMap.set(k, v.minutes);
  }
  const streak = calculateTolerantStreak(
    streakMinutesMap,
    preferences.minActiveDayMin,
    todayKey
  );

  // 5. Hitung Metrik Hari Ini, Minggu Ini, Bulan Ini (WIB)
  const todayMinutes = annualMap.get(todayKey)?.minutes || 0;

  // Minggu ini (dimulai hari Senin)
  const todayDow = getWibDayOfWeek(todayKey); // 1 = Senin, ..., 7 = Minggu
  const thisWeekMondayKey = offsetDateKey(todayKey, -(todayDow - 1));
  let thisWeekMinutes = 0;
  let activeDaysInWeek = 0;
  for (let i = 0; i < 7; i++) {
    const k = offsetDateKey(thisWeekMondayKey, i);
    const m = annualMap.get(k)?.minutes || 0;
    thisWeekMinutes += m;
    if (m >= preferences.minActiveDayMin) {
      activeDaysInWeek++;
    }
  }

  // Bulan ini (dimulai tanggal 01)
  const monthStartKey = `${todayKey.slice(0, 7)}-01`;
  let thisMonthMinutes = 0;
  let curCursor = monthStartKey;
  while (curCursor <= todayKey) {
    thisMonthMinutes += annualMap.get(curCursor)?.minutes || 0;
    curCursor = offsetDateKey(curCursor, 1);
  }

  // 6. Perbandingan Periode Sekarang vs Sebelumnya
  const currentMinutesTotal = currentDailyRows.reduce(
    (acc, r) => acc + (Number(r.total_minutes) || 0),
    0
  );
  const prevMinutesTotal = prevDailyRows.reduce(
    (acc, r) => acc + (Number(r.total_minutes) || 0),
    0
  );

  let percentChange: number | null = null;
  if (prevMinutesTotal > 0) {
    percentChange = Math.round(
      ((currentMinutesTotal - prevMinutesTotal) / prevMinutesTotal) * 100
    );
  } else if (currentMinutesTotal > 0) {
    percentChange = 100;
  }

  // 7. Konsistensi Mingguan (0 - 100)
  // Periksa apakah user memiliki data minimal 1 minggu (7 hari dari sesi pertama)
  const hasFullWeekData = streakMinutesMap.size >= 7 || weeklyRecords.availableWeeksCount >= 1;
  const consistency = calculateWeeklyConsistencyScore({
    weeklyActualMinutes: thisWeekMinutes,
    weeklyTargetMinutes: preferences.weeklyTargetMin,
    activeDaysInWeek,
    startedSessionsCount: completion.startedCount,
    completedSessionsCount: completion.completedCount,
    hasFullWeekData,
  });

  // 8. Tren 4 Minggu (±15% pita netral)
  const trend = calculateStudyTrend(
    weeklyRecords.thisWeekMinutes,
    weeklyRecords.pastWeeksMinutes,
    weeklyRecords.availableWeeksCount
  );

  // 9. Format Data Chart Tren Harian (isi hari kosong dengan 0)
  const currentDailyMap = new Map<string, { minutes: number; count: number }>();
  for (const r of currentDailyRows) {
    currentDailyMap.set(r.day_key, {
      minutes: Number(r.total_minutes) || 0,
      count: Number(r.session_count) || 0,
    });
  }

  const trendChartData: TrendChartPoint[] = [];
  let dayCursor = currentStartKey;
  while (dayCursor <= currentEndKey) {
    const rec = currentDailyMap.get(dayCursor);
    trendChartData.push({
      date: dayCursor,
      label: formatWib(dayCursor, "date-short"),
      minutes: rec ? rec.minutes : 0,
      sessionCount: rec ? rec.count : 0,
    });
    dayCursor = offsetDateKey(dayCursor, 1);
  }

  return {
    filter,
    kpi: {
      todayMinutes,
      thisWeekMinutes,
      thisMonthMinutes,
      weeklyTargetMin: preferences.weeklyTargetMin,
      streak,
      consistency,
      trend,
      completion,
      periodComparison: {
        currentMinutes: currentMinutesTotal,
        previousMinutes: prevMinutesTotal,
        percentChange,
      },
    },
    trendChartData,
    heatmapDataMap,
    hourDayMatrix,
    courses,
    taskData,
    preferences,
  };
}
