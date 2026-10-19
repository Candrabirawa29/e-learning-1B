import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Fragmen SQL untuk mengonversi kolom timestamp Prisma (tanpa zona waktu, menyimpan UTC)
 * ke waktu lokal Asia/Jakarta (WIB, UTC+07:00).
 *
 * Sesuai aturan SQL PostgreSQL:
 * (("col" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta')
 * Mengonversi UTC timestamp-without-timezone menjadi timestamp-without-timezone lokal WIB.
 */
export function wibLocal(col: string = '"startedAt"'): Prisma.Sql {
  return Prisma.raw(`((${col} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta')`);
}

export interface DailyAggregationRow {
  day_key: string;
  total_minutes: number;
  session_count: number;
}

export interface HourDayMatrixRow {
  hour_of_day: number; // 0 - 23
  day_of_week: number; // 1 (Senin) - 7 (Minggu)
  session_count: number;
  total_minutes: number;
}

export interface CourseBreakdownRow {
  course_id: string | null;
  course_name: string;
  course_code: string | null;
  total_minutes: number;
  session_count: number;
}

export interface TaskBreakdownRow {
  task_id: string;
  task_title: string;
  course_name: string | null;
  total_minutes: number;
  session_count: number;
  task_status: string;
}

/**
 * Mengambil ringkasan harian untuk rentang tanggal tertentu (WIB).
 * Sesi dihitung pada hari startedAt berdasarkan waktu lokal WIB.
 */
export async function getDailyStudyAggregation(
  userId: string,
  startDateKey: string,
  endDateKey: string
): Promise<DailyAggregationRow[]> {
  const rows = await prisma.$queryRaw<DailyAggregationRow[]>(Prisma.sql`
    SELECT
      to_char(${wibLocal('"startedAt"')}, 'YYYY-MM-DD') AS day_key,
      ROUND(COALESCE(SUM("accumulatedSec"), 0) / 60.0)::integer AS total_minutes,
      COUNT(*)::integer AS session_count
    FROM "focus_sessions"
    WHERE "userId" = ${userId}
      AND ("status" = 'COMPLETED' OR ("status" = 'STOPPED_EARLY' AND "accumulatedSec" > 0))
      AND ${wibLocal('"startedAt"')} >= (${startDateKey} || ' 00:00:00')::timestamp
      AND ${wibLocal('"startedAt"')} <= (${endDateKey} || ' 23:59:59.999')::timestamp
    GROUP BY day_key
    ORDER BY day_key ASC;
  `);

  return rows;
}

/**
 * Mengambil seluruh data harian untuk heatmap tahunan ala GitHub.
 * Rentang waktu: 53 minggu terakhir (atau 365 hari terakhir) menurut WIB.
 */
export async function getAnnualHeatmapData(
  userId: string,
  startDateKey: string,
  endDateKey: string
): Promise<Map<string, { minutes: number; sessionCount: number }>> {
  const rows = await prisma.$queryRaw<DailyAggregationRow[]>(Prisma.sql`
    SELECT
      to_char(${wibLocal('"startedAt"')}, 'YYYY-MM-DD') AS day_key,
      ROUND(COALESCE(SUM("accumulatedSec"), 0) / 60.0)::integer AS total_minutes,
      COUNT(*)::integer AS session_count
    FROM "focus_sessions"
    WHERE "userId" = ${userId}
      AND ("status" = 'COMPLETED' OR ("status" = 'STOPPED_EARLY' AND "accumulatedSec" > 0))
      AND ${wibLocal('"startedAt"')} >= (${startDateKey} || ' 00:00:00')::timestamp
      AND ${wibLocal('"startedAt"')} <= (${endDateKey} || ' 23:59:59.999')::timestamp
    GROUP BY day_key
    ORDER BY day_key ASC;
  `);

  const map = new Map<string, { minutes: number; sessionCount: number }>();
  for (const r of rows) {
    map.set(r.day_key, {
      minutes: Number(r.total_minutes) || 0,
      sessionCount: Number(r.session_count) || 0,
    });
  }

  return map;
}

/**
 * Mengambil matriks Jam x Hari (Hour of Day 0..23 vs Day of Week 1..7 ISO).
 * Jam dan hari-dalam-minggu diambil dari nilai lokal WIB.
 */
export async function getHourDayMatrix(
  userId: string,
  startDateKey: string,
  endDateKey: string
): Promise<HourDayMatrixRow[]> {
  const rows = await prisma.$queryRaw<HourDayMatrixRow[]>(Prisma.sql`
    SELECT
      EXTRACT(HOUR FROM ${wibLocal('"startedAt"')})::integer AS hour_of_day,
      EXTRACT(ISODOW FROM ${wibLocal('"startedAt"')})::integer AS day_of_week,
      COUNT(*)::integer AS session_count,
      ROUND(COALESCE(SUM("accumulatedSec"), 0) / 60.0)::integer AS total_minutes
    FROM "focus_sessions"
    WHERE "userId" = ${userId}
      AND ("status" = 'COMPLETED' OR ("status" = 'STOPPED_EARLY' AND "accumulatedSec" > 0))
      AND ${wibLocal('"startedAt"')} >= (${startDateKey} || ' 00:00:00')::timestamp
      AND ${wibLocal('"startedAt"')} <= (${endDateKey} || ' 23:59:59.999')::timestamp
    GROUP BY hour_of_day, day_of_week
    ORDER BY day_of_week ASC, hour_of_day ASC;
  `);

  return rows;
}

/**
 * Distribusi fokus per Mata Kuliah.
 */
export async function getCourseBreakdown(
  userId: string,
  startDateKey: string,
  endDateKey: string
): Promise<CourseBreakdownRow[]> {
  const rows = await prisma.$queryRaw<CourseBreakdownRow[]>(Prisma.sql`
    SELECT
      fs."courseId" AS course_id,
      COALESCE(c."name", 'Umum / Mandiri') AS course_name,
      c."code" AS course_code,
      ROUND(COALESCE(SUM(fs."accumulatedSec"), 0) / 60.0)::integer AS total_minutes,
      COUNT(fs.id)::integer AS session_count
    FROM "focus_sessions" fs
    LEFT JOIN "courses" c ON fs."courseId" = c.id
    WHERE fs."userId" = ${userId}
      AND (fs."status" = 'COMPLETED' OR (fs."status" = 'STOPPED_EARLY' AND fs."accumulatedSec" > 0))
      AND ${wibLocal('fs."startedAt"')} >= (${startDateKey} || ' 00:00:00')::timestamp
      AND ${wibLocal('fs."startedAt"')} <= (${endDateKey} || ' 23:59:59.999')::timestamp
    GROUP BY fs."courseId", c."name", c."code"
    ORDER BY total_minutes DESC;
  `);

  return rows;
}

/**
 * Distribusi fokus per Task.
 * Aturan: Hanya dikembalikan jika jumlah distinct task yang dikerjakan >= 10.
 * Menghindari penarikan kesimpulan statistik dari sampel kecil.
 */
export async function getTaskBreakdownIfSufficient(
  userId: string,
  startDateKey: string,
  endDateKey: string
): Promise<{ sufficientData: boolean; tasks: TaskBreakdownRow[]; totalTasksCount: number }> {
  const rows = await prisma.$queryRaw<TaskBreakdownRow[]>(Prisma.sql`
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
      AND ${wibLocal('fs."startedAt"')} >= (${startDateKey} || ' 00:00:00')::timestamp
      AND ${wibLocal('fs."startedAt"')} <= (${endDateKey} || ' 23:59:59.999')::timestamp
    GROUP BY fs."taskId", t."title", c."name", t."status"
    ORDER BY total_minutes DESC;
  `);

  const distinctCount = rows.length;
  if (distinctCount < 10) {
    return {
      sufficientData: false,
      tasks: [],
      totalTasksCount: distinctCount,
    };
  }

  return {
    sufficientData: true,
    tasks: rows,
    totalTasksCount: distinctCount,
  };
}

/**
 * Statistik Sesi: Total Dimulai vs Selesai dan Rasio.
 */
export async function getSessionCompletionRatio(
  userId: string,
  startDateKey: string,
  endDateKey: string
): Promise<{ startedCount: number; completedCount: number; stoppedEarlyCount: number; completionRatio: number }> {
  const counts = await prisma.$queryRaw<{ status: string; count: number }[]>(Prisma.sql`
    SELECT
      "status"::text,
      COUNT(*)::integer AS count
    FROM "focus_sessions"
    WHERE "userId" = ${userId}
      AND "status" != 'CANCELLED'
      AND "mode" = 'FOCUS'
      AND ${wibLocal('"startedAt"')} >= (${startDateKey} || ' 00:00:00')::timestamp
      AND ${wibLocal('"startedAt"')} <= (${endDateKey} || ' 23:59:59.999')::timestamp
    GROUP BY "status";
  `);

  let completedCount = 0;
  let stoppedEarlyCount = 0;

  for (const c of counts) {
    const n = Number(c.count) || 0;
    if (c.status === "COMPLETED") completedCount += n;
    if (c.status === "STOPPED_EARLY") stoppedEarlyCount += n;
  }

  const totalRelevant = completedCount + stoppedEarlyCount;
  const completionRatio = totalRelevant > 0 ? Math.round((completedCount / totalRelevant) * 100) : 100;

  return {
    startedCount: totalRelevant,
    completedCount,
    stoppedEarlyCount,
    completionRatio,
  };
}

/**
 * Mengambil total menit per minggu (Senin - Minggu) untuk 5 minggu terakhir
 * untuk menghitung tren dan rata-rata 4 minggu sebelumnya.
 * Batas minggu dimulai hari Senin (date_trunc week).
 */
export async function getWeeklyTrendRecords(
  userId: string
): Promise<{ thisWeekMinutes: number; pastWeeksMinutes: number[]; availableWeeksCount: number }> {
  // Query 8 minggu terakhir dari trunc week berdasarkan nilai lokal WIB
  const rows = await prisma.$queryRaw<{ week_start: string; total_minutes: number }[]>(Prisma.sql`
    SELECT
      to_char(date_trunc('week', ${wibLocal('"startedAt"')}), 'YYYY-MM-DD') AS week_start,
      ROUND(COALESCE(SUM("accumulatedSec"), 0) / 60.0)::integer AS total_minutes
    FROM "focus_sessions"
    WHERE "userId" = ${userId}
      AND ("status" = 'COMPLETED' OR ("status" = 'STOPPED_EARLY' AND "accumulatedSec" > 0))
      AND ${wibLocal('"startedAt"')} >= (${wibLocal('NOW()')} - INTERVAL '8 weeks')
    GROUP BY week_start
    ORDER BY week_start DESC
    LIMIT 6;
  `);

  if (rows.length === 0) {
    return { thisWeekMinutes: 0, pastWeeksMinutes: [], availableWeeksCount: 0 };
  }

  const thisWeekMinutes = Number(rows[0].total_minutes) || 0;
  const pastWeeks = rows.slice(1, 5).map((r) => Number(r.total_minutes) || 0);

  return {
    thisWeekMinutes,
    pastWeeksMinutes: pastWeeks,
    availableWeeksCount: rows.length,
  };
}
