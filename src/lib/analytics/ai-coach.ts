import { prisma } from "@/lib/prisma";
import { wibDayKey, offsetDateKey, formatWib } from "@/lib/datetime";
import {
  getDailyStudyAggregation,
  getCourseBreakdown,
  getSessionCompletionRatio,
  getWeeklyTrendRecords,
} from "@/lib/analytics/study-queries";
import {
  calculateTolerantStreak,
  calculateWeeklyConsistencyScore,
  calculateStudyTrend,
} from "@/lib/analytics/study-metrics";
import { z } from "zod";

export const DAILY_AI_MESSAGE_LIMIT = 20;

/**
 * Memeriksa dan memperbarui kuota harian pesan AI untuk user.
 */
export async function checkAndConsumeAiQuota(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  used: number;
}> {
  const todayKey = wibDayKey(new Date());

  const usage = await prisma.aiUsage.findUnique({
    where: {
      userId_date: {
        userId,
        date: todayKey,
      },
    },
  });

  const used = usage?.count || 0;
  if (used >= DAILY_AI_MESSAGE_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      used,
    };
  }

  // Increment penggunaan
  const updated = await prisma.aiUsage.upsert({
    where: {
      userId_date: {
        userId,
        date: todayKey,
      },
    },
    create: {
      userId,
      date: todayKey,
      count: 1,
    },
    update: {
      count: {
        increment: 1,
      },
    },
  });

  return {
    allowed: true,
    remaining: Math.max(0, DAILY_AI_MESSAGE_LIMIT - updated.count),
    used: updated.count,
  };
}

/**
 * Mengambil kuota hari ini tanpa menambah hitungan.
 */
export async function getAiQuotaStatus(userId: string): Promise<{
  remaining: number;
  used: number;
  limit: number;
}> {
  const todayKey = wibDayKey(new Date());
  const usage = await prisma.aiUsage.findUnique({
    where: {
      userId_date: {
        userId,
        date: todayKey,
      },
    },
  });

  const used = usage?.count || 0;
  return {
    remaining: Math.max(0, DAILY_AI_MESSAGE_LIMIT - used),
    used,
    limit: DAILY_AI_MESSAGE_LIMIT,
  };
}

/**
 * Membangun ringkasan konteks belajar 8 minggu milik user (pribadi).
 * Tanpa nama, tanpa email, dan tanpa catatan sesi (kecuali diminta eksplisit).
 */
export async function buildUserStudyContext(
  userId: string,
  includeNotes: boolean = false
) {
  const todayKey = wibDayKey(new Date());
  const eightWeeksAgoKey = offsetDateKey(todayKey, -56);

  // Ambil preferensi
  const preference = await prisma.studyPreference.findUnique({
    where: { userId },
  });

  const weeklyTargetMin = preference?.weeklyTargetMin || 600;
  const minActiveDayMin = preference?.minActiveDayMin || 25;

  // 1. Agregasi harian 8 minggu
  const dailyRows = await getDailyStudyAggregation(userId, eightWeeksAgoKey, todayKey);

  // 2. Breakdown mata kuliah 8 minggu
  const courses = await getCourseBreakdown(userId, eightWeeksAgoKey, todayKey);

  // 3. Rasio sesi
  const completion = await getSessionCompletionRatio(userId, eightWeeksAgoKey, todayKey);

  // 4. Rekor mingguan & tren
  const weeklyRecords = await getWeeklyTrendRecords(userId);
  const trend = calculateStudyTrend(
    weeklyRecords.thisWeekMinutes,
    weeklyRecords.pastWeeksMinutes,
    weeklyRecords.availableWeeksCount
  );

  // 5. Streak
  const dailyMap = new Map<string, number>();
  for (const r of dailyRows) {
    dailyMap.set(r.day_key, r.total_minutes);
  }
  const streak = calculateTolerantStreak(dailyMap, minActiveDayMin, todayKey);

  // 6. Konsistensi minggu ini
  const activeDaysThisWeek = dailyRows
    .filter((r) => r.day_key >= offsetDateKey(todayKey, -6) && r.total_minutes >= minActiveDayMin)
    .length;

  const consistency = calculateWeeklyConsistencyScore({
    weeklyActualMinutes: weeklyRecords.thisWeekMinutes,
    weeklyTargetMinutes: weeklyTargetMin,
    activeDaysInWeek: activeDaysThisWeek,
    startedSessionsCount: completion.startedCount,
    completedSessionsCount: completion.completedCount,
    hasFullWeekData: weeklyRecords.availableWeeksCount >= 1,
  });

  // 7. Catatan singkat (hanya jika includeNotes = true)
  let sessionNotes: { date: string; note: string }[] | undefined = undefined;
  if (includeNotes) {
    const sessionsWithNotes = await prisma.focusSession.findMany({
      where: {
        userId,
        note: { not: null },
      },
      orderBy: { startedAt: "desc" },
      take: 10,
      select: {
        startedAt: true,
        note: true,
      },
    });

    sessionNotes = sessionsWithNotes.map((s) => ({
      date: formatWib(s.startedAt, "date-short"),
      note: (s.note || "").slice(0, 150),
    }));
  }

  return {
    zone: "Asia/Jakarta (WIB)",
    today: todayKey,
    preference: {
      weeklyTargetMin,
      minActiveDayMin,
    },
    metrics: {
      currentStreakDays: streak.currentStreakDays,
      longestStreakDays: streak.longestStreakDays,
      consistencyScore: consistency.score,
      consistencyExplanation: consistency.explanation,
      trendDirection: trend.direction,
      trendLabel: trend.label,
      completionRatePercent: completion.completionRatio,
      totalSessionsStarted: completion.startedCount,
      totalSessionsCompleted: completion.completedCount,
    },
    subjectDistribution: courses.map((c) => ({
      name: c.course_name,
      totalMinutes: c.total_minutes,
      sessionCount: c.session_count,
    })),
    recentDailyMinutes: dailyRows.slice(-14).map((d) => ({
      date: d.day_key,
      minutes: d.total_minutes,
    })),
    notes: sessionNotes,
  };
}

// ==========================================
// TOOL EXECUTORS (READ-ONLY, VALIDATED)
// ==========================================

export const CompareStudyPeriodsSchema = z.object({
  startDate1: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate1: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startDate2: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate2: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const SubjectBreakdownSchema = z.object({
  daysCount: z.number().int().min(7).max(90).default(30),
});

export const UpcomingTasksSchema = z.object({
  limit: z.number().int().min(1).max(10).default(5),
});

export const StudyPlanSchema = z.object({
  availableHoursPerDay: z.number().min(0.5).max(12).default(2),
  focusSubjectIds: z.array(z.string()).optional(),
});

export async function executeGetStudySummary(userId: string) {
  const context = await buildUserStudyContext(userId, false);
  return {
    weeklyTargetMin: context.preference.weeklyTargetMin,
    currentStreak: context.metrics.currentStreakDays,
    longestStreak: context.metrics.longestStreakDays,
    consistencyScore: context.metrics.consistencyScore,
    consistencyDetail: context.metrics.consistencyExplanation,
    trend: context.metrics.trendLabel,
    completionRate: `${context.metrics.completionRatePercent}%`,
    sessionsStarted: context.metrics.totalSessionsStarted,
    sessionsCompleted: context.metrics.totalSessionsCompleted,
  };
}

export async function executeCompareStudyPeriods(
  userId: string,
  args: z.infer<typeof CompareStudyPeriodsSchema>
) {
  const [period1, period2] = await Promise.all([
    getDailyStudyAggregation(userId, args.startDate1, args.endDate1),
    getDailyStudyAggregation(userId, args.startDate2, args.endDate2),
  ]);

  const totalMin1 = period1.reduce((acc, r) => acc + r.total_minutes, 0);
  const totalMin2 = period2.reduce((acc, r) => acc + r.total_minutes, 0);
  const count1 = period1.reduce((acc, r) => acc + r.session_count, 0);
  const count2 = period2.reduce((acc, r) => acc + r.session_count, 0);

  return {
    period1: {
      range: `${args.startDate1} s/d ${args.endDate1}`,
      totalMinutes: totalMin1,
      totalHours: Math.round((totalMin1 / 60) * 10) / 10,
      sessionCount: count1,
    },
    period2: {
      range: `${args.startDate2} s/d ${args.endDate2}`,
      totalMinutes: totalMin2,
      totalHours: Math.round((totalMin2 / 60) * 10) / 10,
      sessionCount: count2,
    },
    differenceMinutes: totalMin1 - totalMin2,
    percentChange: totalMin2 > 0 ? Math.round(((totalMin1 - totalMin2) / totalMin2) * 100) : null,
  };
}

export async function executeGetSubjectStudyBreakdown(
  userId: string,
  args: z.infer<typeof SubjectBreakdownSchema>
) {
  const todayKey = wibDayKey(new Date());
  const startKey = offsetDateKey(todayKey, -args.daysCount);

  const courses = await getCourseBreakdown(userId, startKey, todayKey);
  const totalAllMin = courses.reduce((acc, c) => acc + c.total_minutes, 0);

  return {
    daysAnalyzed: args.daysCount,
    totalMinutes: totalAllMin,
    totalHours: Math.round((totalAllMin / 60) * 10) / 10,
    breakdown: courses.map((c) => ({
      courseName: c.course_name,
      courseCode: c.course_code,
      totalMinutes: c.total_minutes,
      sessionCount: c.session_count,
      percentage: totalAllMin > 0 ? Math.round((c.total_minutes / totalAllMin) * 100) : 0,
    })),
  };
}

/**
 * Mengambil daftar tugas mendatang.
 * PENTING: Judul tugas dibatasi 80 karakter dan diisolasi sebagai data tidak tepercaya.
 */
export async function executeGetUpcomingTasks(
  userId: string,
  args: z.infer<typeof UpcomingTasksSchema>
) {
  const now = new Date();

  const tasks = await prisma.task.findMany({
    where: {
      status: { not: "DONE" },
      deadline: { gte: now },
    },
    orderBy: { deadline: "asc" },
    take: args.limit,
    include: {
      course: {
        select: { name: true, code: true },
      },
      progresses: {
        where: { profileId: userId },
        select: { status: true },
      },
    },
  });

  return {
    tasksCount: tasks.length,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title.slice(0, 80), // Dibatasi panjangnya
      course: t.course?.name || "Umum",
      deadline: t.deadline ? formatWib(t.deadline, "datetime-short") : "-",
      myProgress: t.progresses[0]?.status || "Belum Dimulai",
    })),
  };
}

export async function executeGenerateStudyPlan(
  userId: string,
  args: z.infer<typeof StudyPlanSchema>
) {
  const upcoming = await executeGetUpcomingTasks(userId, { limit: 5 });
  const subjects = await executeGetSubjectStudyBreakdown(userId, { daysCount: 14 });

  return {
    availableHoursPerDay: args.availableHoursPerDay,
    upcomingDeadlines: upcoming.tasks,
    recentSubjectFocus: subjects.breakdown.slice(0, 4),
    advice: "Gunakan data ini untuk menyusun saran alokasi sesi Pomodoro 25 menit yang seimbang sesuai tenggat waktu terdekat.",
  };
}
