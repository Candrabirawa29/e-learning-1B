"use server";

import { requireAdmin } from "@/lib/auth/session";
import {
  getAdminPeriodDates,
  getAdminOverviewKpis,
  getAdminActivityTrends,
  getAdminProductInsights,
  getAdminUserMonitoringList as fetchAdminUserMonitoringList,
  getAdminUserDetailAnalytics as fetchAdminUserDetailAnalytics,
} from "@/lib/analytics/admin-study-queries";
import {
  AdminStudyPeriod,
  AdminStudyAnalyticsDashboardData,
  AdminUserMonitoringListResponse,
  AdminUserDetailAnalytics,
} from "@/types/admin-study-analytics";
import { wibDayKey } from "@/lib/datetime";

/**
 * Server Action: Mengambil data keseluruhan dashboard Admin Study Analytics.
 * Otorisasi: Wajib ADMIN.
 */
export async function getAdminStudyAnalyticsDashboard(
  filter: AdminStudyPeriod = "7d"
): Promise<AdminStudyAnalyticsDashboardData> {
  await requireAdmin();

  const todayKey = wibDayKey(new Date());
  const { currentStartKey, currentEndKey, prevStartKey, prevEndKey } = getAdminPeriodDates(
    filter,
    todayKey
  );

  const [overviewKpis, activityTrends, productInsights] = await Promise.all([
    getAdminOverviewKpis(currentStartKey, currentEndKey, prevStartKey, prevEndKey),
    getAdminActivityTrends(currentStartKey, currentEndKey, prevStartKey, prevEndKey),
    getAdminProductInsights(todayKey),
  ]);

  return {
    filter,
    startDateKey: currentStartKey,
    endDateKey: currentEndKey,
    overviewKpis,
    activityTrends,
    productInsights,
  };
}

/**
 * Server Action: Mengambil data tabel monitoring pengguna dengan server-side search, filter, sort, dan pagination.
 * Otorisasi: Wajib ADMIN.
 */
export async function getAdminUserMonitoringList(params: {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: "duration" | "sessions" | "consistency" | "lastActive" | "name";
  sortOrder?: "asc" | "desc";
  filter: AdminStudyPeriod;
}): Promise<AdminUserMonitoringListResponse> {
  await requireAdmin();

  const todayKey = wibDayKey(new Date());
  const { currentStartKey, currentEndKey } = getAdminPeriodDates(params.filter, todayKey);

  return fetchAdminUserMonitoringList({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    startDateKey: currentStartKey,
    endDateKey: currentEndKey,
  });
}

/**
 * Server Action: Mengambil data detail analitik studi seorang mahasiswa (Read-only monitoring).
 * Otorisasi: Wajib ADMIN.
 */
export async function getAdminUserDetailAnalytics(
  userId: string,
  filter: AdminStudyPeriod = "30d",
  sessionPage: number = 1,
  sessionPageSize: number = 10
): Promise<AdminUserDetailAnalytics | null> {
  await requireAdmin();

  return fetchAdminUserDetailAnalytics(userId, filter, sessionPage, sessionPageSize);
}

