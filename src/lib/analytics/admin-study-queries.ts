import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { wibLocal, getAnnualHeatmapData, TaskBreakdownRow } from "@/lib/analytics/study-queries";
import {
  wibDayKey,
  offsetDateKey,
  formatWib,
  diffWibCalendarDays,
  getWibDayOfWeek,
  parseWibLocal,
} from "@/lib/datetime";
import {
  calculateTolerantStreak,
  calculateWeeklyConsistencyScore,
} from "@/lib/analytics/study-metrics";
import {
  AdminStudyPeriod,
  AdminStudyOverviewKpis,
  AdminActivityTrendPoint,
  AdminProductInsights,
  AdminUserMonitoringRow,
  AdminUserMonitoringListResponse,
  AdminUserDetailAnalytics,
  AdminStudySessionRow,
} from "@/types/admin-study-analytics";

function calculatePercentDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Mengambil batas rentang tanggal (WIB) berdasarkan period identifier.
 */
export function getAdminPeriodDates(
  filter: AdminStudyPeriod,
  customTodayKey?: string
): {
  currentStartKey: string;
  currentEndKey: string;
  prevStartKey: string;
  prevEndKey: string;
  daysCount: number;
} {
  const todayKey = customTodayKey || wibDayKey(new Date());
  let currentStartKey: string;
  const currentEndKey: string = todayKey;
  let prevStartKey: string;
  let prevEndKey: string;
  let daysCount: number;

  if (filter === "7d") {
    daysCount = 7;
    currentStartKey = offsetDateKey(todayKey, -6);
    prevEndKey = offsetDateKey(todayKey, -7);
    prevStartKey = offsetDateKey(todayKey, -13);
  } else if (filter === "14d") {
    daysCount = 14;
    currentStartKey = offsetDateKey(todayKey, -13);
    prevEndKey = offsetDateKey(todayKey, -14);
    prevStartKey = offsetDateKey(todayKey, -27);
  } else if (filter === "30d") {
    daysCount = 30;
    currentStartKey = offsetDateKey(todayKey, -29);
    prevEndKey = offsetDateKey(todayKey, -30);
    prevStartKey = offsetDateKey(todayKey, -59);
  } else if (filter === "90d") {
    daysCount = 90;
    currentStartKey = offsetDateKey(todayKey, -89);
    prevEndKey = offsetDateKey(todayKey, -90);
    prevStartKey = offsetDateKey(todayKey, -179);
  } else {
    // 1 Tahun (365 hari ke belakang)
    daysCount = 365;
    currentStartKey = offsetDateKey(todayKey, -364);
    prevEndKey = offsetDateKey(todayKey, -365);
    prevStartKey = offsetDateKey(todayKey, -729);
  }

  return { currentStartKey, currentEndKey, prevStartKey, prevEndKey, daysCount };
}

/**
 * 1. Overview KPIs:
 * Mengagregasi data fokus platform untuk periode aktif dan periode sebelumnya.
 */
export async function getAdminOverviewKpis(
  startDateKey: string,
  endDateKey: string,
  prevStartKey: string,
  prevEndKey: string
): Promise<AdminStudyOverviewKpis> {
  // Query total pengguna aktif terdaftar
  const totalRegisteredUsers = await prisma.profile.count({
    where: { isActive: true },
  });

  // Query total pengguna yang pernah menggunakan Pomodoro (adopters)
  const adoptersRow = await prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
    SELECT COUNT(DISTINCT "userId")::integer AS count
    FROM "focus_sessions"
    WHERE "status" != 'CANCELLED' AND "accumulatedSec" > 0;
  `);
  const totalAdopters = Number(adoptersRow[0]?.count) || 0;
  const adoptionRate = totalRegisteredUsers > 0
    ? Math.round((totalAdopters / totalRegisteredUsers) * 100)
    : 0;

  // Agregasi periode saat ini
  const currentPeriodRow = await prisma.$queryRaw<{
    active_users: number;
    completed_sessions: number;
    total_minutes: number;
  }[]>(Prisma.sql`
    SELECT
      COUNT(DISTINCT "userId") FILTER (WHERE "accumulatedSec" > 0)::integer AS active_users,
      COUNT(*) FILTER (WHERE "status" = 'COMPLETED')::integer AS completed_sessions,
      ROUND(COALESCE(SUM("accumulatedSec") FILTER (WHERE "status" = 'COMPLETED' OR ("status" = 'STOPPED_EARLY' AND "accumulatedSec" > 0)), 0) / 60.0)::integer AS total_minutes
    FROM "focus_sessions"
    WHERE "status" != 'CANCELLED'
      AND ${wibLocal('"startedAt"')} >= (${startDateKey} || ' 00:00:00')::timestamp
      AND ${wibLocal('"startedAt"')} <= (${endDateKey} || ' 23:59:59.999')::timestamp;
  `);

  const activeUsers = Number(currentPeriodRow[0]?.active_users) || 0;
  const totalCompletedSessions = Number(currentPeriodRow[0]?.completed_sessions) || 0;
  const totalStudyMinutes = Number(currentPeriodRow[0]?.total_minutes) || 0;
  const avgMinutesPerActiveUser = activeUsers > 0
    ? Math.round(totalStudyMinutes / activeUsers)
    : 0;

  // Agregasi periode sebelumnya
  const prevPeriodRow = await prisma.$queryRaw<{
    active_users: number;
    completed_sessions: number;
    total_minutes: number;
  }[]>(Prisma.sql`
    SELECT
      COUNT(DISTINCT "userId") FILTER (WHERE "accumulatedSec" > 0)::integer AS active_users,
      COUNT(*) FILTER (WHERE "status" = 'COMPLETED')::integer AS completed_sessions,
      ROUND(COALESCE(SUM("accumulatedSec") FILTER (WHERE "status" = 'COMPLETED' OR ("status" = 'STOPPED_EARLY' AND "accumulatedSec" > 0)), 0) / 60.0)::integer AS total_minutes
    FROM "focus_sessions"
    WHERE "status" != 'CANCELLED'
      AND ${wibLocal('"startedAt"')} >= (${prevStartKey} || ' 00:00:00')::timestamp
      AND ${wibLocal('"startedAt"')} <= (${prevEndKey} || ' 23:59:59.999')::timestamp;
  `);

  const prevActiveUsers = Number(prevPeriodRow[0]?.active_users) || 0;
  const prevCompletedSessions = Number(prevPeriodRow[0]?.completed_sessions) || 0;
  const prevTotalMinutes = Number(prevPeriodRow[0]?.total_minutes) || 0;
  const prevAvgMinutes = prevActiveUsers > 0
    ? Math.round(prevTotalMinutes / prevActiveUsers)
    : 0;

  return {
    totalAdopters,
    activeUsers,
    totalCompletedSessions,
    totalStudyMinutes,
    avgMinutesPerActiveUser,
    totalRegisteredUsers,
    adoptionRate,
    prevPeriod: {
      activeUsers: prevActiveUsers,
      totalCompletedSessions: prevCompletedSessions,
      totalStudyMinutes: prevTotalMinutes,
      avgMinutesPerActiveUser: prevAvgMinutes,
    },
    deltas: {
      activeUsersPercent: calculatePercentDelta(activeUsers, prevActiveUsers),
      completedSessionsPercent: calculatePercentDelta(totalCompletedSessions, prevCompletedSessions),
      studyMinutesPercent: calculatePercentDelta(totalStudyMinutes, prevTotalMinutes),
      avgMinutesPercent: calculatePercentDelta(avgMinutesPerActiveUser, prevAvgMinutes),
    },
  };
}

/**
 * 2. Activity Trends:
 * Tren harian dengan perbandingan periode sebelumnya untuk grafik Recharts.
 */
export async function getAdminActivityTrends(
  startDateKey: string,
  endDateKey: string,
  prevStartKey?: string,
  prevEndKey?: string
): Promise<AdminActivityTrendPoint[]> {
  const currentRows = await prisma.$queryRaw<{
    day_key: string;
    total_minutes: number;
    completed_sessions: number;
    stopped_early_sessions: number;
    cancelled_sessions: number;
    active_users: number;
  }[]>(Prisma.sql`
    SELECT
      to_char(${wibLocal('"startedAt"')}, 'YYYY-MM-DD') AS day_key,
      ROUND(COALESCE(SUM("accumulatedSec") FILTER (WHERE "status" = 'COMPLETED' OR ("status" = 'STOPPED_EARLY' AND "accumulatedSec" > 0)), 0) / 60.0)::integer AS total_minutes,
      COUNT(*) FILTER (WHERE "status" = 'COMPLETED')::integer AS completed_sessions,
      COUNT(*) FILTER (WHERE "status" = 'STOPPED_EARLY')::integer AS stopped_early_sessions,
      COUNT(*) FILTER (WHERE "status" = 'CANCELLED')::integer AS cancelled_sessions,
      COUNT(DISTINCT "userId") FILTER (WHERE "accumulatedSec" > 0)::integer AS active_users
    FROM "focus_sessions"
    WHERE ${wibLocal('"startedAt"')} >= (${startDateKey} || ' 00:00:00')::timestamp
      AND ${wibLocal('"startedAt"')} <= (${endDateKey} || ' 23:59:59.999')::timestamp
    GROUP BY day_key
    ORDER BY day_key ASC;
  `);

  const currentMap = new Map<string, typeof currentRows[0]>();
  for (const r of currentRows) {
    currentMap.set(r.day_key, r);
  }

  // Jika ada periode sebelumnya, ambil juga untuk dual-line comparison
  const prevMap = new Map<string, { total_minutes: number; completed_sessions: number }>();
  if (prevStartKey && prevEndKey) {
    const prevRows = await prisma.$queryRaw<{
      day_key: string;
      total_minutes: number;
      completed_sessions: number;
    }[]>(Prisma.sql`
      SELECT
        to_char(${wibLocal('"startedAt"')}, 'YYYY-MM-DD') AS day_key,
        ROUND(COALESCE(SUM("accumulatedSec") FILTER (WHERE "status" = 'COMPLETED' OR ("status" = 'STOPPED_EARLY' AND "accumulatedSec" > 0)), 0) / 60.0)::integer AS total_minutes,
        COUNT(*) FILTER (WHERE "status" = 'COMPLETED')::integer AS completed_sessions
      FROM "focus_sessions"
      WHERE ${wibLocal('"startedAt"')} >= (${prevStartKey} || ' 00:00:00')::timestamp
        AND ${wibLocal('"startedAt"')} <= (${prevEndKey} || ' 23:59:59.999')::timestamp
      GROUP BY day_key
      ORDER BY day_key ASC;
    `);

    for (const pr of prevRows) {
      prevMap.set(pr.day_key, pr);
    }
  }

  // Bangun kontinum setiap hari dari startDateKey s/d endDateKey
  const result: AdminActivityTrendPoint[] = [];
  let cursor = startDateKey;
  let prevCursor = prevStartKey;

  while (cursor <= endDateKey) {
    const curData = currentMap.get(cursor);
    const prevData = prevCursor ? prevMap.get(prevCursor) : undefined;

    const parsedDate = parseWibLocal(cursor);
    const label = parsedDate ? formatWib(parsedDate, "d MMM") : cursor;

    result.push({
      dateKey: cursor,
      label,
      totalMinutes: Number(curData?.total_minutes) || 0,
      completedSessions: Number(curData?.completed_sessions) || 0,
      stoppedEarlySessions: Number(curData?.stopped_early_sessions) || 0,
      cancelledSessions: Number(curData?.cancelled_sessions) || 0,
      activeUsers: Number(curData?.active_users) || 0,
      previousDateKey: prevCursor,
      previousMinutes: prevData ? Number(prevData.total_minutes) || 0 : 0,
      previousSessions: prevData ? Number(prevData.completed_sessions) || 0 : 0,
    });

    cursor = offsetDateKey(cursor, 1);
    if (prevCursor) {
      prevCursor = offsetDateKey(prevCursor, 1);
    }
  }

  return result;
}

/**
 * 3. Product Usage Insights:
 * Menghitung metrik adopsi, WAU, MAU, 7-day & 30-day retention, dan distribusi fitur.
 */
export async function getAdminProductInsights(
  todayKey: string
): Promise<AdminProductInsights> {
  const totalRegisteredUsers = await prisma.profile.count({
    where: { isActive: true },
  });

  const adoptersRow = await prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
    SELECT COUNT(DISTINCT "userId")::integer AS count
    FROM "focus_sessions"
    WHERE "status" != 'CANCELLED' AND "accumulatedSec" > 0;
  `);
  const totalAdopters = Number(adoptersRow[0]?.count) || 0;
  const adoptionRate = totalRegisteredUsers > 0
    ? Math.round((totalAdopters / totalRegisteredUsers) * 100)
    : 0;

  // WAU: 7 hari terakhir (todayKey - 6 .. todayKey)
  const wauStartKey = offsetDateKey(todayKey, -6);
  const wauRow = await prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
    SELECT COUNT(DISTINCT "userId")::integer AS count
    FROM "focus_sessions"
    WHERE "status" != 'CANCELLED' AND "accumulatedSec" > 0
      AND ${wibLocal('"startedAt"')} >= (${wauStartKey} || ' 00:00:00')::timestamp
      AND ${wibLocal('"startedAt"')} <= (${todayKey} || ' 23:59:59.999')::timestamp;
  `);
  const wau = Number(wauRow[0]?.count) || 0;

  // MAU: 30 hari terakhir (todayKey - 29 .. todayKey)
  const mauStartKey = offsetDateKey(todayKey, -29);
  const mauRow = await prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
    SELECT COUNT(DISTINCT "userId")::integer AS count
    FROM "focus_sessions"
    WHERE "status" != 'CANCELLED' AND "accumulatedSec" > 0
      AND ${wibLocal('"startedAt"')} >= (${mauStartKey} || ' 00:00:00')::timestamp
      AND ${wibLocal('"startedAt"')} <= (${todayKey} || ' 23:59:59.999')::timestamp;
  `);
  const mau = Number(mauRow[0]?.count) || 0;

  // 7-day Retention:
  // User yang aktif di minggu W-1 (hari -13 s/d -7) yang kembali aktif di minggu W (hari -6 s/d 0)
  const prevWeekStartKey = offsetDateKey(todayKey, -13);
  const prevWeekEndKey = offsetDateKey(todayKey, -7);

  const [prevWeekUsers, curWeekUsers] = await Promise.all([
    prisma.$queryRaw<{ userId: string }[]>(Prisma.sql`
      SELECT DISTINCT "userId"
      FROM "focus_sessions"
      WHERE "status" != 'CANCELLED' AND "accumulatedSec" > 0
        AND ${wibLocal('"startedAt"')} >= (${prevWeekStartKey} || ' 00:00:00')::timestamp
        AND ${wibLocal('"startedAt"')} <= (${prevWeekEndKey} || ' 23:59:59.999')::timestamp;
    `),
    prisma.$queryRaw<{ userId: string }[]>(Prisma.sql`
      SELECT DISTINCT "userId"
      FROM "focus_sessions"
      WHERE "status" != 'CANCELLED' AND "accumulatedSec" > 0
        AND ${wibLocal('"startedAt"')} >= (${wauStartKey} || ' 00:00:00')::timestamp
        AND ${wibLocal('"startedAt"')} <= (${todayKey} || ' 23:59:59.999')::timestamp;
    `),
  ]);

  const prevWeekSet = new Set(prevWeekUsers.map((u) => u.userId));
  const curWeekSet = new Set(curWeekUsers.map((u) => u.userId));

  let retention7d: number | null = null;
  if (prevWeekSet.size > 0) {
    let retainedCount = 0;
    for (const uid of prevWeekSet) {
      if (curWeekSet.has(uid)) retainedCount++;
    }
    retention7d = Math.round((retainedCount / prevWeekSet.size) * 100);
  }

  // 30-day Retention:
  // User yang aktif di bulan M-1 (hari -59 s/d -30) yang kembali di bulan M (hari -29 s/d 0)
  const prevMonthStartKey = offsetDateKey(todayKey, -59);
  const prevMonthEndKey = offsetDateKey(todayKey, -30);

  const [prevMonthUsers, curMonthUsers] = await Promise.all([
    prisma.$queryRaw<{ userId: string }[]>(Prisma.sql`
      SELECT DISTINCT "userId"
      FROM "focus_sessions"
      WHERE "status" != 'CANCELLED' AND "accumulatedSec" > 0
        AND ${wibLocal('"startedAt"')} >= (${prevMonthStartKey} || ' 00:00:00')::timestamp
        AND ${wibLocal('"startedAt"')} <= (${prevMonthEndKey} || ' 23:59:59.999')::timestamp;
    `),
    prisma.$queryRaw<{ userId: string }[]>(Prisma.sql`
      SELECT DISTINCT "userId"
      FROM "focus_sessions"
      WHERE "status" != 'CANCELLED' AND "accumulatedSec" > 0
        AND ${wibLocal('"startedAt"')} >= (${mauStartKey} || ' 00:00:00')::timestamp
        AND ${wibLocal('"startedAt"')} <= (${todayKey} || ' 23:59:59.999')::timestamp;
    `),
  ]);

  const prevMonthSet = new Set(prevMonthUsers.map((u) => u.userId));
  const curMonthSet = new Set(curMonthUsers.map((u) => u.userId));

  let retention30d: number | null = null;
  if (prevMonthSet.size > 0) {
    let retainedCount = 0;
    for (const uid of prevMonthSet) {
      if (curMonthSet.has(uid)) retainedCount++;
    }
    retention30d = Math.round((retainedCount / prevMonthSet.size) * 100);
  }

  // Feature usage distribution (Focus vs Stopwatch, Float Mode)
  const [modeCounts, floatModeCounts] = await Promise.all([
    prisma.$queryRaw<{ mode: string; count: number }[]>(Prisma.sql`
      SELECT "mode"::text, COUNT(*)::integer AS count
      FROM "focus_sessions"
      WHERE "status" != 'CANCELLED'
      GROUP BY "mode";
    `),
    prisma.$queryRaw<{ floatMode: string; count: number }[]>(Prisma.sql`
      SELECT "floatMode"::text, COUNT(*)::integer AS count
      FROM "study_preferences"
      GROUP BY "floatMode";
    `),
  ]);

  let focusModeCount = 0;
  let stopwatchModeCount = 0;
  for (const m of modeCounts) {
    if (m.mode === "FOCUS") focusModeCount = Number(m.count) || 0;
    if (m.mode === "STOPWATCH") stopwatchModeCount = Number(m.count) || 0;
  }

  let pipCount = 0;
  let inAppCount = 0;
  let offCount = 0;
  for (const f of floatModeCounts) {
    if (f.floatMode === "PIP") pipCount = Number(f.count) || 0;
    if (f.floatMode === "IN_APP") inAppCount = Number(f.count) || 0;
    if (f.floatMode === "OFF") offCount = Number(f.count) || 0;
  }

  // Engagement Trend (rata-rata harian 30 hari terakhir)
  const engagementRow = await prisma.$queryRaw<{
    total_minutes: number;
    total_sessions: number;
  }[]>(Prisma.sql`
    SELECT
      ROUND(COALESCE(SUM("accumulatedSec"), 0) / 60.0)::integer AS total_minutes,
      COUNT(*)::integer AS total_sessions
    FROM "focus_sessions"
    WHERE "status" = 'COMPLETED'
      AND ${wibLocal('"startedAt"')} >= (${mauStartKey} || ' 00:00:00')::timestamp
      AND ${wibLocal('"startedAt"')} <= (${todayKey} || ' 23:59:59.999')::timestamp;
  `);

  const engMinutes = Number(engagementRow[0]?.total_minutes) || 0;
  const engSessions = Number(engagementRow[0]?.total_sessions) || 0;
  const averageDailyMinutesPerActiveUser = mau > 0 ? Math.round(engMinutes / (mau * 30)) : 0;
  const averageSessionsPerActiveUser = mau > 0 ? Math.round((engSessions / mau) * 10) / 10 : 0;

  // Consistency Trend (persentase user aktif dengan konsistensi >= 70)
  const consistencyTrend = await getPlatformConsistencySummary(todayKey);

  return {
    adoptionRate,
    totalAdopters,
    totalRegisteredUsers,
    wau,
    mau,
    retention7d,
    retention30d,
    featureUsage: {
      focusModeCount,
      stopwatchModeCount,
      pipCount,
      inAppCount,
      offCount,
    },
    engagementTrend: {
      averageDailyMinutesPerActiveUser,
      averageSessionsPerActiveUser,
    },
    consistencyTrend,
  };
}

/**
 * Ringkasan konsistensi belajar platform pada minggu berjalan.
 */
async function getPlatformConsistencySummary(todayKey: string): Promise<{
  highConsistencyUserCount: number;
  totalAssessedUsers: number;
  highConsistencyPercent: number;
}> {
  const todayDow = getWibDayOfWeek(todayKey); // 1 = Senin, ..., 7 = Minggu
  const thisWeekMondayKey = offsetDateKey(todayKey, -(todayDow - 1));

  // Ambil user yang aktif dalam minggu ini atau minggu lalu
  const twoWeeksAgoKey = offsetDateKey(todayKey, -14);
  const activeUserProfiles = await prisma.profile.findMany({
    where: {
      isActive: true,
      focusSessions: {
        some: {
          startedAt: {
            gte: new Date(parseWibLocal(twoWeeksAgoKey) || Date.now()),
          },
        },
      },
    },
    select: {
      id: true,
      studyPreference: {
        select: {
          weeklyTargetMin: true,
          activeDaysTarget: true,
        },
      },
      focusSessions: {
        where: {
          status: { not: "CANCELLED" },
        },
        select: {
          startedAt: true,
          accumulatedSec: true,
          status: true,
        },
        orderBy: { startedAt: "asc" },
      },
    },
  });

  let highCount = 0;
  let totalAssessed = 0;

  for (const user of activeUserProfiles) {
    if (user.focusSessions.length === 0) continue;
    const firstSession = user.focusSessions[0].startedAt;
    const daysSinceFirst = diffWibCalendarDays(firstSession, parseWibLocal(todayKey) || new Date());

    if (daysSinceFirst < 7) continue; // Masih mengumpulkan data

    // Hitung sesi minggu berjalan
    const weekSessions = user.focusSessions.filter((s) => {
      const sDayKey = wibDayKey(s.startedAt);
      return sDayKey >= thisWeekMondayKey && sDayKey <= todayKey;
    });

    const activeDaysSet = new Set(
      weekSessions
        .filter((s) => (s.accumulatedSec || 0) >= 1500) // minimal 25 menit
        .map((s) => wibDayKey(s.startedAt))
    );

    const weeklyMinutes = Math.round(
      weekSessions.reduce((acc, s) => acc + (s.accumulatedSec || 0), 0) / 60
    );
    const completedCount = weekSessions.filter((s) => s.status === "COMPLETED").length;
    const startedCount = weekSessions.length;

    const res = calculateWeeklyConsistencyScore({
      weeklyActualMinutes: weeklyMinutes,
      weeklyTargetMinutes: user.studyPreference?.weeklyTargetMin || 600,
      activeDaysInWeek: activeDaysSet.size,
      startedSessionsCount: startedCount,
      completedSessionsCount: completedCount,
      daysSinceFirstSession: daysSinceFirst,
      daysElapsedInWeek: todayDow,
      activeDaysTarget: user.studyPreference?.activeDaysTarget || 5,
    });

    if (res.score !== null) {
      totalAssessed++;
      if (res.score >= 70) {
        highCount++;
      }
    }
  }

  const highConsistencyPercent = totalAssessed > 0
    ? Math.round((highCount / totalAssessed) * 100)
    : 0;

  return {
    highConsistencyUserCount: highCount,
    totalAssessedUsers: totalAssessed,
    highConsistencyPercent,
  };
}

/**
 * 4. User Monitoring Table:
 * Menampilkan daftar pengguna dengan server-side search, filter, sort, dan pagination.
 */
export async function getAdminUserMonitoringList(params: {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: "duration" | "sessions" | "consistency" | "lastActive" | "name";
  sortOrder?: "asc" | "desc";
  startDateKey: string;
  endDateKey: string;
}): Promise<AdminUserMonitoringListResponse> {
  const {
    page = 1,
    pageSize = 10,
    search = "",
    sortBy = "duration",
    sortOrder = "desc",
    startDateKey,
    endDateKey,
  } = params;

  const todayKey = wibDayKey(new Date());
  const todayDow = getWibDayOfWeek(todayKey);
  const thisWeekMondayKey = offsetDateKey(todayKey, -(todayDow - 1));

  // Ambil profil mahasiswa aktif beserta data sesi dalam periode
  const profiles = await prisma.profile.findMany({
    where: {
      isActive: true,
      ...(search.trim()
        ? {
            OR: [
              { name: { contains: search.trim(), mode: "insensitive" } },
              { email: { contains: search.trim(), mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      studyPreference: {
        select: {
          weeklyTargetMin: true,
          activeDaysTarget: true,
        },
      },
    },
  });

  if (profiles.length === 0) {
    return {
      users: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  const userIds = profiles.map((p) => p.id);

  // Agregasi sesi dalam periode terpilih
  const periodStats = await prisma.$queryRaw<{
    user_id: string;
    total_minutes: number;
    completed_sessions: number;
    stopped_early_count: number;
    active_days_count: number;
    last_active_at: Date | null;
  }[]>(Prisma.sql`
    SELECT
      "userId" AS user_id,
      ROUND(COALESCE(SUM("accumulatedSec") FILTER (WHERE "status" = 'COMPLETED' OR ("status" = 'STOPPED_EARLY' AND "accumulatedSec" > 0)), 0) / 60.0)::integer AS total_minutes,
      COUNT(*) FILTER (WHERE "status" = 'COMPLETED')::integer AS completed_sessions,
      COUNT(*) FILTER (WHERE "status" = 'STOPPED_EARLY')::integer AS stopped_early_count,
      COUNT(DISTINCT to_char(${wibLocal('"startedAt"')}, 'YYYY-MM-DD')) FILTER (WHERE "accumulatedSec" > 0)::integer AS active_days_count,
      MAX("startedAt") AS last_active_at
    FROM "focus_sessions"
    WHERE "userId" IN (${Prisma.join(userIds)})
      AND "status" != 'CANCELLED'
      AND ${wibLocal('"startedAt"')} >= (${startDateKey} || ' 00:00:00')::timestamp
      AND ${wibLocal('"startedAt"')} <= (${endDateKey} || ' 23:59:59.999')::timestamp
    GROUP BY "userId";
  `);

  const statMap = new Map<string, typeof periodStats[0]>();
  for (const s of periodStats) {
    statMap.set(s.user_id, s);
  }

  // Agregasi sesi pertama sepanjang masa untuk evaluasi konsistensi (gating 7 hari)
  const firstSessions = await prisma.$queryRaw<{
    user_id: string;
    first_session_at: Date;
    all_time_last_active: Date | null;
  }[]>(Prisma.sql`
    SELECT
      "userId" AS user_id,
      MIN("startedAt") AS first_session_at,
      MAX("startedAt") AS all_time_last_active
    FROM "focus_sessions"
    WHERE "userId" IN (${Prisma.join(userIds)})
      AND "status" != 'CANCELLED'
    GROUP BY "userId";
  `);

  const firstSessionMap = new Map<string, typeof firstSessions[0]>();
  for (const fs of firstSessions) {
    firstSessionMap.set(fs.user_id, fs);
  }

  // Ambil sesi minggu berjalan untuk menghitung consistency score
  const weekSessions = await prisma.$queryRaw<{
    user_id: string;
    day_key: string;
    accumulated_sec: number;
    status: string;
  }[]>(Prisma.sql`
    SELECT
      "userId" AS user_id,
      to_char(${wibLocal('"startedAt"')}, 'YYYY-MM-DD') AS day_key,
      "accumulatedSec" AS accumulated_sec,
      "status"::text
    FROM "focus_sessions"
    WHERE "userId" IN (${Prisma.join(userIds)})
      AND "status" != 'CANCELLED'
      AND ${wibLocal('"startedAt"')} >= (${thisWeekMondayKey} || ' 00:00:00')::timestamp
      AND ${wibLocal('"startedAt"')} <= (${todayKey} || ' 23:59:59.999')::timestamp;
  `);

  const userWeekMap = new Map<string, typeof weekSessions>();
  for (const ws of weekSessions) {
    const arr = userWeekMap.get(ws.user_id) || [];
    arr.push(ws);
    userWeekMap.set(ws.user_id, arr);
  }

  // Rakit daftar baris monitoring
  const rows: AdminUserMonitoringRow[] = profiles.map((p) => {
    const s = statMap.get(p.id);
    const fs = firstSessionMap.get(p.id);
    const uWeek = userWeekMap.get(p.id) || [];

    const totalStudyMinutes = Number(s?.total_minutes) || 0;
    const completedSessionsCount = Number(s?.completed_sessions) || 0;
    const stoppedEarlyCount = Number(s?.stopped_early_count) || 0;
    const activeDaysCount = Number(s?.active_days_count) || 0;
    const avgSessionMinutes = completedSessionsCount > 0
      ? Math.round(totalStudyMinutes / completedSessionsCount)
      : 0;

    const lastActive = s?.last_active_at || fs?.all_time_last_active || null;

    // Hitung Konsistensi
    let consistencyScore: number | null = null;
    let consistencyStatus = "Belum Ada Sesi";

    if (fs?.first_session_at) {
      const daysSinceFirst = diffWibCalendarDays(
        fs.first_session_at,
        parseWibLocal(todayKey) || new Date()
      );

      if (daysSinceFirst < 7) {
        consistencyStatus = `Data < 7 hari (hari ke-${Math.max(1, daysSinceFirst)})`;
      } else {
        const activeDaysSet = new Set(
          uWeek
            .filter((w) => (w.accumulated_sec || 0) >= 1500)
            .map((w) => w.day_key)
        );

        const weeklyMin = Math.round(
          uWeek.reduce((sum, w) => sum + (w.accumulated_sec || 0), 0) / 60
        );
        const compCount = uWeek.filter((w) => w.status === "COMPLETED").length;
        const startCount = uWeek.length;

        const scoreRes = calculateWeeklyConsistencyScore({
          weeklyActualMinutes: weeklyMin,
          weeklyTargetMinutes: p.studyPreference?.weeklyTargetMin || 600,
          activeDaysInWeek: activeDaysSet.size,
          startedSessionsCount: startCount,
          completedSessionsCount: compCount,
          daysSinceFirstSession: daysSinceFirst,
          daysElapsedInWeek: todayDow,
          activeDaysTarget: p.studyPreference?.activeDaysTarget || 5,
        });

        consistencyScore = scoreRes.score;
        consistencyStatus = consistencyScore !== null
          ? `${consistencyScore}/100`
          : "Kurang Data";
      }
    }

    return {
      userId: p.id,
      name: p.name || "Tanpa Nama",
      email: p.email,
      avatarUrl: p.avatarUrl,
      totalStudyMinutes,
      completedSessionsCount,
      stoppedEarlyCount,
      avgSessionMinutes,
      activeDaysCount,
      consistencyScore,
      consistencyStatus,
      lastActiveAt: lastActive ? lastActive.toISOString() : null,
    };
  });

  // Sorting
  rows.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "duration") {
      cmp = a.totalStudyMinutes - b.totalStudyMinutes;
    } else if (sortBy === "sessions") {
      cmp = a.completedSessionsCount - b.completedSessionsCount;
    } else if (sortBy === "consistency") {
      const scoreA = a.consistencyScore ?? -1;
      const scoreB = b.consistencyScore ?? -1;
      cmp = scoreA - scoreB;
    } else if (sortBy === "lastActive") {
      const timeA = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
      const timeB = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
      cmp = timeA - timeB;
    } else if (sortBy === "name") {
      cmp = a.name.localeCompare(b.name);
    }

    return sortOrder === "desc" ? -cmp : cmp;
  });

  const totalCount = rows.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const skip = (page - 1) * pageSize;
  const paginatedUsers = rows.slice(skip, skip + pageSize);

  return {
    users: paginatedUsers,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * 5. Individual User Study Analytics (Admin View):
 * Menampilkan detail lengkap analitik seorang mahasiswa secara read-only.
 * Tidak menampilkan catatan rahasia/pribadi.
 */
export async function getAdminUserDetailAnalytics(
  userId: string,
  filter: AdminStudyPeriod = "30d",
  sessionPage: number = 1,
  sessionPageSize: number = 10
): Promise<AdminUserDetailAnalytics | null> {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      memberships: {
        select: { role: true },
      },
      studyPreference: true,
    },
  });

  if (!profile) return null;

  const todayKey = wibDayKey(new Date());
  const { currentStartKey, currentEndKey, prevStartKey, prevEndKey } = getAdminPeriodDates(
    filter,
    todayKey
  );

  // Overview stats individual
  const overviewRow = await prisma.$queryRaw<{
    total_minutes: number;
    completed_sessions: number;
    stopped_early: number;
    cancelled: number;
    first_session: Date | null;
    last_session: Date | null;
  }[]>(Prisma.sql`
    SELECT
      ROUND(COALESCE(SUM("accumulatedSec") FILTER (WHERE "status" = 'COMPLETED' OR ("status" = 'STOPPED_EARLY' AND "accumulatedSec" > 0)), 0) / 60.0)::integer AS total_minutes,
      COUNT(*) FILTER (WHERE "status" = 'COMPLETED')::integer AS completed_sessions,
      COUNT(*) FILTER (WHERE "status" = 'STOPPED_EARLY')::integer AS stopped_early,
      COUNT(*) FILTER (WHERE "status" = 'CANCELLED')::integer AS cancelled,
      MIN("startedAt") AS first_session,
      MAX("startedAt") AS last_session
    FROM "focus_sessions"
    WHERE "userId" = ${userId}
      AND ${wibLocal('"startedAt"')} >= (${currentStartKey} || ' 00:00:00')::timestamp
      AND ${wibLocal('"startedAt"')} <= (${currentEndKey} || ' 23:59:59.999')::timestamp;
  `);

  const totalStudyMinutes = Number(overviewRow[0]?.total_minutes) || 0;
  const totalCompletedSessions = Number(overviewRow[0]?.completed_sessions) || 0;
  const totalStoppedEarly = Number(overviewRow[0]?.stopped_early) || 0;
  const totalCancelled = Number(overviewRow[0]?.cancelled) || 0;
  const avgSessionDurationMin = totalCompletedSessions > 0
    ? Math.round(totalStudyMinutes / totalCompletedSessions)
    : 0;

  // Streak & Heatmap (53 minggu ke belakang)
  const heatmapStartKey = offsetDateKey(todayKey, -370);
  const annualMap = await getAnnualHeatmapData(userId, heatmapStartKey, todayKey);
  const heatmapDataMap: Record<string, { minutes: number; sessionCount: number }> = {};
  for (const [k, v] of annualMap.entries()) {
    heatmapDataMap[k] = v;
  }

  const streak = calculateTolerantStreak(
    new Map(Object.entries(heatmapDataMap).map(([k, v]) => [k, v.minutes])),
    profile.studyPreference?.minActiveDayMin || 25,
    todayKey
  );

  // Trend Chart Data (current vs previous period)
  const [curDailyRows, prevDailyRows] = await Promise.all([
    prisma.$queryRaw<{ day_key: string; total_minutes: number; session_count: number }[]>(Prisma.sql`
      SELECT
        to_char(${wibLocal('"startedAt"')}, 'YYYY-MM-DD') AS day_key,
        ROUND(COALESCE(SUM("accumulatedSec") FILTER (WHERE "status" = 'COMPLETED' OR ("status" = 'STOPPED_EARLY' AND "accumulatedSec" > 0)), 0) / 60.0)::integer AS total_minutes,
        COUNT(*)::integer AS session_count
      FROM "focus_sessions"
      WHERE "userId" = ${userId}
        AND ("status" = 'COMPLETED' OR ("status" = 'STOPPED_EARLY' AND "accumulatedSec" > 0))
        AND ${wibLocal('"startedAt"')} >= (${currentStartKey} || ' 00:00:00')::timestamp
        AND ${wibLocal('"startedAt"')} <= (${currentEndKey} || ' 23:59:59.999')::timestamp
      GROUP BY day_key
      ORDER BY day_key ASC;
    `),
    prisma.$queryRaw<{ day_key: string; total_minutes: number; session_count: number }[]>(Prisma.sql`
      SELECT
        to_char(${wibLocal('"startedAt"')}, 'YYYY-MM-DD') AS day_key,
        ROUND(COALESCE(SUM("accumulatedSec") FILTER (WHERE "status" = 'COMPLETED' OR ("status" = 'STOPPED_EARLY' AND "accumulatedSec" > 0)), 0) / 60.0)::integer AS total_minutes,
        COUNT(*)::integer AS session_count
      FROM "focus_sessions"
      WHERE "userId" = ${userId}
        AND ("status" = 'COMPLETED' OR ("status" = 'STOPPED_EARLY' AND "accumulatedSec" > 0))
        AND ${wibLocal('"startedAt"')} >= (${prevStartKey} || ' 00:00:00')::timestamp
        AND ${wibLocal('"startedAt"')} <= (${prevEndKey} || ' 23:59:59.999')::timestamp
      GROUP BY day_key
      ORDER BY day_key ASC;
    `),
  ]);

  const curMap = new Map(curDailyRows.map((r) => [r.day_key, r]));
  const prevMap = new Map(prevDailyRows.map((r) => [r.day_key, r]));

  const trendChartData: AdminUserDetailAnalytics["trendChartData"] = [];
  let dCursor = currentStartKey;
  let prevDCursor = prevStartKey;

  while (dCursor <= currentEndKey) {
    const curD = curMap.get(dCursor);
    const prevD = prevMap.get(prevDCursor);
    const parsed = parseWibLocal(dCursor);
    const label = parsed ? formatWib(parsed, "d MMM") : dCursor;

    trendChartData.push({
      date: dCursor,
      label,
      minutes: Number(curD?.total_minutes) || 0,
      sessionCount: Number(curD?.session_count) || 0,
      previousDate: prevDCursor,
      previousMinutes: prevD ? Number(prevD.total_minutes) || 0 : 0,
      previousSessionCount: prevD ? Number(prevD.session_count) || 0 : 0,
    });

    dCursor = offsetDateKey(dCursor, 1);
    prevDCursor = offsetDateKey(prevDCursor, 1);
  }

  // Consistency Score calculation
  const todayDow = getWibDayOfWeek(todayKey);
  const thisWeekMondayKey = offsetDateKey(todayKey, -(todayDow - 1));

  const weekSessions = await prisma.focusSession.findMany({
    where: {
      userId,
      status: { not: "CANCELLED" },
      startedAt: {
        gte: new Date(parseWibLocal(thisWeekMondayKey) || Date.now()),
      },
    },
    select: {
      startedAt: true,
      accumulatedSec: true,
      status: true,
    },
  });

  const firstSession = await prisma.focusSession.findFirst({
    where: { userId, status: { not: "CANCELLED" } },
    orderBy: { startedAt: "asc" },
    select: { startedAt: true },
  });

  const daysSinceFirst = firstSession
    ? diffWibCalendarDays(firstSession.startedAt, parseWibLocal(todayKey) || new Date())
    : 0;

  const activeDaysSet = new Set(
    weekSessions
      .filter((s) => (s.accumulatedSec || 0) >= 1500)
      .map((s) => wibDayKey(s.startedAt))
  );

  const weeklyActualMinutes = Math.round(
    weekSessions.reduce((acc, s) => acc + (s.accumulatedSec || 0), 0) / 60
  );
  const compCount = weekSessions.filter((s) => s.status === "COMPLETED").length;
  const startCount = weekSessions.length;

  const consistency = calculateWeeklyConsistencyScore({
    weeklyActualMinutes,
    weeklyTargetMinutes: profile.studyPreference?.weeklyTargetMin || 600,
    activeDaysInWeek: activeDaysSet.size,
    startedSessionsCount: startCount,
    completedSessionsCount: compCount,
    daysSinceFirstSession: daysSinceFirst,
    daysElapsedInWeek: todayDow,
    activeDaysTarget: profile.studyPreference?.activeDaysTarget || 5,
  });

  // Courses & Tasks breakdown
  const courses = await prisma.$queryRaw<AdminUserDetailAnalytics["courses"]>(Prisma.sql`
    SELECT
      fs."courseId" AS course_id,
      COALESCE(c."name", 'Umum / Mandiri') AS course_name,
      c."code" AS course_code,
      c."kind"::text AS kind,
      ROUND(COALESCE(SUM(fs."accumulatedSec"), 0) / 60.0)::integer AS total_minutes,
      COUNT(fs.id)::integer AS session_count
    FROM "focus_sessions" fs
    LEFT JOIN "courses" c ON fs."courseId" = c.id
    WHERE fs."userId" = ${userId}
      AND (fs."status" = 'COMPLETED' OR (fs."status" = 'STOPPED_EARLY' AND fs."accumulatedSec" > 0))
      AND ${wibLocal('fs."startedAt"')} >= (${currentStartKey} || ' 00:00:00')::timestamp
      AND ${wibLocal('fs."startedAt"')} <= (${currentEndKey} || ' 23:59:59.999')::timestamp
    GROUP BY fs."courseId", c."name", c."code", c."kind"
    ORDER BY total_minutes DESC;
  `);

  const taskRows = await prisma.$queryRaw<TaskBreakdownRow[]>(Prisma.sql`
    SELECT
      fs."taskId" AS task_id,
      t."title" AS task_title,
      c."name" AS course_name,
      t."status"::text AS task_status,
      ROUND(COALESCE(SUM(fs."accumulatedSec"), 0) / 60.0)::integer AS total_minutes,
      COUNT(fs.id)::integer AS session_count
    FROM "focus_sessions" fs
    JOIN "tasks" t ON fs."taskId" = t.id
    LEFT JOIN "courses" c ON t."courseId" = c.id
    WHERE fs."userId" = ${userId}
      AND fs."taskId" IS NOT NULL
      AND (fs."status" = 'COMPLETED' OR (fs."status" = 'STOPPED_EARLY' AND fs."accumulatedSec" > 0))
      AND ${wibLocal('fs."startedAt"')} >= (${currentStartKey} || ' 00:00:00')::timestamp
      AND ${wibLocal('fs."startedAt"')} <= (${currentEndKey} || ' 23:59:59.999')::timestamp
    GROUP BY fs."taskId", t."title", c."name", t."status"
    ORDER BY total_minutes DESC;
  `);

  const taskData = {
    sufficientData: taskRows.length >= 5, // Lebih informatif untuk admin view
    tasks: taskRows,
    totalTasksCount: taskRows.length,
  };

  // Paginated session history (Tanpa note untuk menjaga privasi)
  const sessionSkip = (sessionPage - 1) * sessionPageSize;
  const [totalSessionsCount, sessionItems] = await Promise.all([
    prisma.focusSession.count({
      where: { userId },
    }),
    prisma.focusSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      skip: sessionSkip,
      take: sessionPageSize,
      include: {
        course: { select: { name: true } },
        task: { select: { title: true } },
      },
    }),
  ]);

  const recentSessions: AdminStudySessionRow[] = sessionItems.map((s) => ({
    id: s.id,
    startedAt: s.startedAt.toISOString(),
    endedAt: s.endedAt ? s.endedAt.toISOString() : null,
    mode: s.mode,
    plannedSec: s.plannedSec,
    accumulatedSec: s.accumulatedSec,
    status: s.status,
    courseName: s.course?.name || null,
    taskTitle: s.task?.title || null,
  }));

  return {
    user: {
      id: profile.id,
      name: profile.name || "Tanpa Nama",
      email: profile.email,
      avatarUrl: profile.avatarUrl,
      role: profile.memberships[0]?.role || "MEMBER",
      isActive: profile.isActive,
      createdAt: profile.createdAt.toISOString(),
    },
    overview: {
      totalStudyMinutes,
      totalCompletedSessions,
      totalStoppedEarly,
      totalCancelled,
      avgSessionDurationMin,
      currentStreakDays: streak.currentStreakDays,
      longestStreakDays: streak.longestStreakDays,
      firstSessionAt: overviewRow[0]?.first_session ? overviewRow[0].first_session.toISOString() : null,
      lastSessionAt: overviewRow[0]?.last_session ? overviewRow[0].last_session.toISOString() : null,
    },
    trendChartData,
    heatmapDataMap,
    consistency,
    courses,
    taskData,
    recentSessions: {
      sessions: recentSessions,
      totalCount: totalSessionsCount,
      page: sessionPage,
      pageSize: sessionPageSize,
      totalPages: Math.ceil(totalSessionsCount / sessionPageSize),
    },
  };
}
