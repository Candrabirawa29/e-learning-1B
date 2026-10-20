"use server";

import { requireUser } from "@/lib/auth/session";
import {
  wibDayKey,
  offsetDateKey,
  getWibDayOfWeek,
  formatWib,
  diffWibCalendarDays,
} from "@/lib/datetime";
import {
  getDailyStudyAggregation,
  getAnnualHeatmapData,
  getHourDayMatrix,
  getCourseBreakdown,
  getTaskBreakdownIfSufficient,
  getSessionCompletionRatio,
  getWeeklyTrendRecords,
  getFirstSessionDate,
} from "@/lib/analytics/study-queries";
import {
  calculateTolerantStreak,
  calculateWeeklyConsistencyScore,
  calculateStudyTrend,
  calculateMedianWeeklyMinutes,
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

  // Minggu ini (dimulai hari Senin)
  const todayDow = getWibDayOfWeek(todayKey); // 1 = Senin, ..., 7 = Minggu
  const thisWeekMondayKey = offsetDateKey(todayKey, -(todayDow - 1));
  const lastWeekMondayKey = offsetDateKey(thisWeekMondayKey, -7);
  const lastWeekSundayKey = offsetDateKey(thisWeekMondayKey, -1);

  // 2. Query data untuk periode aktif, periode sebelumnya, dan riwayat sesi
  const [
    currentDailyRows,
    prevDailyRows,
    hourDayMatrix,
    courses,
    taskData,
    completion,
    weeklyRecords,
    firstSessionDate,
    thisWeekCompletion,
    lastWeekCompletion,
  ] = await Promise.all([
    getDailyStudyAggregation(userId, currentStartKey, currentEndKey),
    getDailyStudyAggregation(userId, prevStartKey, prevEndKey),
    getHourDayMatrix(userId, currentStartKey, currentEndKey),
    getCourseBreakdown(userId, currentStartKey, currentEndKey),
    getTaskBreakdownIfSufficient(userId, currentStartKey, currentEndKey),
    getSessionCompletionRatio(userId, currentStartKey, currentEndKey),
    getWeeklyTrendRecords(userId),
    getFirstSessionDate(userId),
    getSessionCompletionRatio(userId, thisWeekMondayKey, todayKey),
    getSessionCompletionRatio(userId, lastWeekMondayKey, lastWeekSundayKey),
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
  }

  // 7. Hitung Hari Sejak Sesi Pertama & Skor Minggu Lalu
  const daysSinceFirstSession = firstSessionDate
    ? diffWibCalendarDays(todayKey, wibDayKey(firstSessionDate)) + 1
    : 0;

  let lastWeekMinutes = 0;
  let activeDaysInLastWeek = 0;
  for (let i = 0; i < 7; i++) {
    const k = offsetDateKey(lastWeekMondayKey, i);
    const m = annualMap.get(k)?.minutes || 0;
    lastWeekMinutes += m;
    if (m >= preferences.minActiveDayMin) {
      activeDaysInLastWeek++;
    }
  }

  let lastWeekScore: number | null = null;
  if (firstSessionDate && wibDayKey(firstSessionDate) <= lastWeekSundayKey) {
    const lastWeekConsistency = calculateWeeklyConsistencyScore({
      weeklyActualMinutes: lastWeekMinutes,
      weeklyTargetMinutes: preferences.weeklyTargetMin,
      activeDaysInWeek: activeDaysInLastWeek,
      startedSessionsCount: lastWeekCompletion.startedCount,
      completedSessionsCount: lastWeekCompletion.completedCount,
      hasFullWeekData: true,
      daysSinceFirstSession: 7,
      daysElapsedInWeek: 7,
      activeDaysTarget: preferences.activeDaysTarget ?? 5,
    });
    lastWeekScore = lastWeekConsistency.score;
  }

  // Indeks Konsistensi Mingguan (0 - 100)
  const consistency = calculateWeeklyConsistencyScore({
    weeklyActualMinutes: thisWeekMinutes,
    weeklyTargetMinutes: preferences.weeklyTargetMin,
    activeDaysInWeek,
    startedSessionsCount: thisWeekCompletion.startedCount,
    completedSessionsCount: thisWeekCompletion.completedCount,
    daysSinceFirstSession,
    daysElapsedInWeek: todayDow,
    activeDaysTarget: preferences.activeDaysTarget ?? 5,
    lastWeekScore,
  });

  // 8. Tren Belajar 4 Minggu dengan Batang Mingguan
  let week1Minutes = 0;
  for (let i = 0; i < 7; i++) {
    const k = offsetDateKey(lastWeekMondayKey, i);
    week1Minutes += annualMap.get(k)?.minutes || 0;
  }
  let week2Minutes = 0;
  const week2Monday = offsetDateKey(thisWeekMondayKey, -14);
  for (let i = 0; i < 7; i++) {
    const k = offsetDateKey(week2Monday, i);
    week2Minutes += annualMap.get(k)?.minutes || 0;
  }
  let week3Minutes = 0;
  const week3Monday = offsetDateKey(thisWeekMondayKey, -21);
  for (let i = 0; i < 7; i++) {
    const k = offsetDateKey(week3Monday, i);
    week3Minutes += annualMap.get(k)?.minutes || 0;
  }

  const weeklyBars = [
    { weekLabel: "M-3", minutes: week3Minutes },
    { weekLabel: "M-2", minutes: week2Minutes },
    { weekLabel: "M-1", minutes: week1Minutes },
    { weekLabel: "Minggu ini", minutes: thisWeekMinutes },
  ];

  const trend = calculateStudyTrend(
    thisWeekMinutes,
    [week1Minutes, week2Minutes, week3Minutes],
    weeklyRecords.availableWeeksCount,
    weeklyBars
  );

  // 9. Saran Target Mingguan dari Median Riwayat User Sendiri (>= 3 minggu)
  const weeklyMinutesHistory = weeklyRecords.weeklyRows.map((r) => r.totalMinutes);
  const suggestedWeeklyTargetMin = calculateMedianWeeklyMinutes(weeklyMinutesHistory);

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
      suggestedWeeklyTargetMin,
    },
    trendChartData,
    heatmapDataMap,
    hourDayMatrix,
    courses,
    taskData,
    preferences,
    suggestedWeeklyTargetMin,
  };
}
