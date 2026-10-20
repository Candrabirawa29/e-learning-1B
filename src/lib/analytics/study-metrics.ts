/**
 * Pure business logic and calculation algorithms for Study Intelligence:
 * 1. Tolerant Streak calculation (tolerates 1 rest day per 7-day rolling window, today pending)
 * 2. Weekly Consistency Index (0 - 100)
 * 3. 4-Week Trend Analysis (+-15% band)
 */

export interface DailyStudyRecord {
  dateKey: string; // "YYYY-MM-DD"
  totalMinutes: number;
  sessionCount: number;
}

export interface StreakResult {
  currentStreakDays: number;
  longestStreakDays: number;
  isTodayCompleted: boolean;
  activeDaysCount: number;
}

/**
 * Calculates calendar day string YYYY-MM-DD offset by N days (in UTC arithmetic for date strings)
 */
export function offsetDateKey(dateKey: string, dayOffset: number): string {
  const parts = dateKey.split("-").map(Number);
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  d.setUTCDate(d.getUTCDate() + dayOffset);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Tolerant Streak Algorithm:
 * - Counts backwards starting from today (WIB).
 * - If today does not have enough minutes yet, it does NOT break the streak (student still has time today).
 * - A day is active if totalMinutes >= minActiveDayMin.
 * - The streak breaks if there are 2 or more empty days within any 7-day rolling window.
 * - Trailing rest days before the streak began are trimmed so the streak starts on the earliest active day.
 */
export function calculateTolerantStreak(
  dailyMinutesMap: Map<string, number> | Record<string, number>,
  minActiveDayMin: number,
  todayDateKey: string
): StreakResult {
  const getMinutes = (key: string): number => {
    if (dailyMinutesMap instanceof Map) {
      return dailyMinutesMap.get(key) || 0;
    }
    return dailyMinutesMap[key] || 0;
  };

  const isDayActive = (key: string): boolean => {
    return getMinutes(key) >= minActiveDayMin;
  };

  const isTodayActive = isDayActive(todayDateKey);

  // If today is not active yet, evaluation starts from yesterday so current day doesn't penalize
  const evalStartDateKey = isTodayActive ? todayDateKey : offsetDateKey(todayDateKey, -1);

  // 1. Calculate Current Streak
  const daysInCurrentStreak: { dateKey: string; active: boolean }[] = [];
  const windowDays: boolean[] = []; // rolling 7-day window
  let cursor = evalStartDateKey;

  while (true) {
    const active = isDayActive(cursor);
    windowDays.push(active);

    const recent7 = windowDays.slice(-7);
    const emptyCountInRecent7 = recent7.filter((a) => !a).length;

    if (emptyCountInRecent7 >= 2) {
      // Streak broken by second empty day within 7-day window
      break;
    }

    daysInCurrentStreak.push({ dateKey: cursor, active });

    // Safety limit (10 years)
    if (daysInCurrentStreak.length > 3650) break;

    cursor = offsetDateKey(cursor, -1);
  }

  // Trim trailing empty days: a rest day that preceded the streak start is not part of the streak
  while (daysInCurrentStreak.length > 0 && !daysInCurrentStreak[daysInCurrentStreak.length - 1].active) {
    daysInCurrentStreak.pop();
  }

  const currentStreakDays = daysInCurrentStreak.length;
  const activeDaysInCurrentStreak = daysInCurrentStreak.filter((d) => d.active).length;

  // 2. Calculate Longest Streak in history
  let longestStreakDays = currentStreakDays;

  // Find all dates in map
  let allKeys: string[] = [];
  if (dailyMinutesMap instanceof Map) {
    allKeys = Array.from(dailyMinutesMap.keys());
  } else {
    allKeys = Object.keys(dailyMinutesMap);
  }

  if (allKeys.length > 0) {
    allKeys.sort();
    const earliestKey = allKeys[0];

    // Scan day by day from earliestKey to todayDateKey
    let scanCursor = earliestKey;
    const historyStreakDays: { dateKey: string; active: boolean }[] = [];
    const historyWindow: boolean[] = [];

    while (scanCursor <= todayDateKey) {
      const active = isDayActive(scanCursor);
      historyWindow.push(active);

      const recent7 = historyWindow.slice(-7);
      const emptyCount = recent7.filter((a) => !a).length;

      if (emptyCount >= 2) {
        // Evaluate previous streak before resetting
        while (historyStreakDays.length > 0 && !historyStreakDays[historyStreakDays.length - 1].active) {
          historyStreakDays.pop();
        }
        if (historyStreakDays.length > longestStreakDays) {
          longestStreakDays = historyStreakDays.length;
        }

        historyStreakDays.length = 0;
        historyWindow.length = 0;

        // If current day is active, it starts a new candidate streak
        if (active) {
          historyStreakDays.push({ dateKey: scanCursor, active });
          historyWindow.push(active);
        }
      } else {
        historyStreakDays.push({ dateKey: scanCursor, active });
        // Trim trailing empty days for check
        let tempLen = historyStreakDays.length;
        while (tempLen > 0 && !historyStreakDays[tempLen - 1].active) {
          tempLen--;
        }
        if (tempLen > longestStreakDays) {
          longestStreakDays = tempLen;
        }
      }

      scanCursor = offsetDateKey(scanCursor, 1);
    }
  }

  return {
    currentStreakDays,
    longestStreakDays: Math.max(longestStreakDays, currentStreakDays),
    isTodayCompleted: isTodayActive,
    activeDaysCount: activeDaysInCurrentStreak,
  };
}

/**
 * Consistency Score Index (0 - 100):
 * - 50% target achievement (max 100%, no overtime bonus beyond 100%)
 * - 30% active days out of 5 (min 5 active days = full 30%)
 * - 20% completed vs started sessions ratio
 * - Do not display score if data is less than 1 full week.
 */
export interface ConsistencyScoreInput {
  weeklyActualMinutes: number;
  weeklyTargetMinutes: number;
  activeDaysInWeek: number; // 0 to 7
  startedSessionsCount: number;
  completedSessionsCount: number;
  hasFullWeekData?: boolean;
  daysSinceFirstSession?: number; // Hari kalender sejak sesi pertama
  daysElapsedInWeek?: number; // 1 (Senin) s/d 7 (Minggu)
  activeDaysTarget?: number; // default 5
  lastWeekScore?: number | null; // Skor minggu lalu bila ada
}

export interface ConsistencyScoreResult {
  score: number | null; // null if insufficient data (< 7 hari sejak sesi pertama)
  targetComponent: number; // 0 - 50
  activeDaysComponent: number; // 0 - 30
  completionRateComponent: number; // 0 - 20
  targetRatio: number; // 0 - 1
  activeDaysRatio: number; // 0 - 1
  completionRatio: number; // 0 - 1
  explanation: string;
  isCollectingData: boolean;
  collectingDayNumber: number; // 1 - 7
  targetPercent: number; // e.g. 9
  expectedTargetMinutes: number;
  expectedActiveDays: number;
  activeDaysInWeek: number;
  startedSessionsCount: number;
  completedSessionsCount: number;
  lastWeekScore: number | null;
}

export function calculateWeeklyConsistencyScore(input: ConsistencyScoreInput): ConsistencyScoreResult {
  const activeDaysTarget = input.activeDaysTarget ?? 5;
  const isFullWeek = input.daysSinceFirstSession !== undefined
    ? input.daysSinceFirstSession >= 7
    : (input.hasFullWeekData ?? true);

  const collectingDay = input.daysSinceFirstSession !== undefined
    ? Math.max(1, Math.min(7, input.daysSinceFirstSession))
    : 1;

  if (!isFullWeek || input.weeklyTargetMinutes <= 0) {
    const explanation = input.daysSinceFirstSession !== undefined
      ? `Mengumpulkan data (hari ke-${collectingDay} dari 7)`
      : "Data belajar Anda kurang dari 1 minggu penuh. Indeks konsistensi akan dihitung setelah 7 hari aktif.";

    return {
      score: null,
      targetComponent: 0,
      activeDaysComponent: 0,
      completionRateComponent: 0,
      targetRatio: 0,
      activeDaysRatio: 0,
      completionRatio: 0,
      explanation,
      isCollectingData: true,
      collectingDayNumber: collectingDay,
      targetPercent: 0,
      expectedTargetMinutes: 0,
      expectedActiveDays: 0,
      activeDaysInWeek: input.activeDaysInWeek,
      startedSessionsCount: input.startedSessionsCount,
      completedSessionsCount: input.completedSessionsCount,
      lastWeekScore: input.lastWeekScore ?? null,
    };
  }

  // Prorata minggu berjalan: disesuaikan dengan hari yang sudah berlalu sejak Senin (1..7)
  const daysElapsed = Math.max(1, Math.min(7, input.daysElapsedInWeek ?? 7));
  const expectedTargetMinutes = Math.max(1, Math.round(input.weeklyTargetMinutes * (daysElapsed / 7)));
  const expectedActiveDays = Math.max(1, Math.min(daysElapsed, Math.round(activeDaysTarget * (daysElapsed / 7))));

  // 1. Target achievement: max 1.0 (no overtime bonus) -> weight 50 poin
  const rawTargetRatio = expectedTargetMinutes > 0 ? (input.weeklyActualMinutes / expectedTargetMinutes) : 0;
  const targetRatio = Math.min(1.0, Math.max(0, rawTargetRatio));
  const targetComponent = Math.round(targetRatio * 50);
  const targetPercent = Math.round(rawTargetRatio * 100);

  // 2. Active days: out of expectedActiveDays -> max 1.0 -> weight 30 poin
  const rawActiveDaysRatio = expectedActiveDays > 0 ? (input.activeDaysInWeek / expectedActiveDays) : 0;
  const activeDaysRatio = Math.min(1.0, Math.max(0, rawActiveDaysRatio));
  const activeDaysComponent = Math.round(activeDaysRatio * 30);

  // 3. Completion rate: completed / started -> weight 20 poin
  const completionRatio = input.startedSessionsCount > 0
    ? Math.min(1.0, Math.max(0, input.completedSessionsCount / input.startedSessionsCount))
    : 1.0;
  const completionRateComponent = Math.round(completionRatio * 20);

  const totalScore = Math.min(100, Math.max(0, targetComponent + activeDaysComponent + completionRateComponent));

  let explanation = "";
  if (totalScore >= 85) {
    explanation = "Konsistensi belajar luar biasa! Anda sangat teratur memenuhi target dan menyelesaikan sesi.";
  } else if (totalScore >= 70) {
    explanation = "Konsistensi belajar sangat baik. Pertahankan ritme belajar harian Anda.";
  } else if (totalScore >= 50) {
    explanation = "Ritme belajar cukup stabil. Coba tambahkan 1 hari aktif lagi untuk mengoptimalkan pemahaman.";
  } else {
    explanation = "Jadikan sesi Pomodoro 25 menit sebagai kebiasaan harian kecil untuk membangun ritme belajar yang kokoh.";
  }

  return {
    score: totalScore,
    targetComponent,
    activeDaysComponent,
    completionRateComponent,
    targetRatio,
    activeDaysRatio,
    completionRatio,
    explanation,
    isCollectingData: false,
    collectingDayNumber: collectingDay,
    targetPercent,
    expectedTargetMinutes,
    expectedActiveDays,
    activeDaysInWeek: input.activeDaysInWeek,
    startedSessionsCount: input.startedSessionsCount,
    completedSessionsCount: input.completedSessionsCount,
    lastWeekScore: input.lastWeekScore ?? null,
  };
}

/**
 * Trend Analysis:
 * Compares this week against average of past 4 weeks with +-15% neutral band.
 * If data < 3 weeks: returns "INSUFFICIENT_DATA" with "baru N dari 3 minggu".
 */
export type TrendDirection = "UP" | "STABLE" | "DOWN" | "INSUFFICIENT_DATA";

export interface TrendAnalysisResult {
  direction: TrendDirection;
  percentChange: number;
  thisWeekMinutes: number;
  pastAverageMinutes: number;
  label: string;
  availableWeeksCount: number;
  weeklyBars?: { weekLabel: string; minutes: number }[];
}

export function calculateStudyTrend(
  thisWeekMinutes: number,
  pastWeeksMinutes: number[],
  availableWeeksCount: number,
  weeklyBars?: { weekLabel: string; minutes: number }[]
): TrendAnalysisResult {
  if (availableWeeksCount < 3 || pastWeeksMinutes.length === 0) {
    return {
      direction: "INSUFFICIENT_DATA",
      percentChange: 0,
      thisWeekMinutes,
      pastAverageMinutes: 0,
      label: `baru ${availableWeeksCount} dari 3 minggu`,
      availableWeeksCount,
      weeklyBars,
    };
  }

  const sum = pastWeeksMinutes.reduce((acc, curr) => acc + curr, 0);
  const pastAverage = Math.round(sum / pastWeeksMinutes.length);

  if (pastAverage === 0) {
    return {
      direction: thisWeekMinutes > 0 ? "UP" : "STABLE",
      percentChange: thisWeekMinutes > 0 ? 100 : 0,
      thisWeekMinutes,
      pastAverageMinutes: 0,
      label: thisWeekMinutes > 0 ? "Meningkat dibanding rata-rata sebelumnya" : "Stabil",
      availableWeeksCount,
      weeklyBars,
    };
  }

  const diff = thisWeekMinutes - pastAverage;
  const percentChange = Math.round((diff / pastAverage) * 100);

  let direction: TrendDirection = "STABLE";
  let label = "Stabil (dalam rentang wajar ±15%)";

  if (percentChange > 15) {
    direction = "UP";
    label = `Meningkat +${percentChange}% dibanding rata-rata 4 minggu terakhir`;
  } else if (percentChange < -15) {
    direction = "DOWN";
    label = `Menurun ${percentChange}% dibanding rata-rata 4 minggu terakhir`;
  }

  return {
    direction,
    percentChange,
    thisWeekMinutes,
    pastAverageMinutes: pastAverage,
    label,
    availableWeeksCount,
    weeklyBars,
  };
}

/**
 * Menghitung median menit belajar mingguan dari riwayat user sendiri (minimal 3 minggu).
 * Mengembalikan null jika data kurang dari 3 minggu.
 */
export function calculateMedianWeeklyMinutes(weeklyMinutes: number[]): number | null {
  if (!weeklyMinutes || weeklyMinutes.length < 3) return null;
  const sorted = [...weeklyMinutes].filter((m) => typeof m === "number" && !isNaN(m)).sort((a, b) => a - b);
  if (sorted.length < 3) return null;

  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}
