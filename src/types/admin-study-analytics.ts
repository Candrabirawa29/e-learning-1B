import { ConsistencyScoreResult } from "@/lib/analytics/study-metrics";
import { CourseBreakdownRow, TaskBreakdownRow } from "@/lib/analytics/study-queries";

export type AdminStudyPeriod = "7d" | "14d" | "30d" | "90d" | "year";

export interface AdminStudyOverviewKpis {
  totalAdopters: number;
  activeUsers: number;
  totalCompletedSessions: number;
  totalStudyMinutes: number;
  avgMinutesPerActiveUser: number;
  totalRegisteredUsers: number;
  adoptionRate: number; // 0 - 100 (%)
  prevPeriod: {
    activeUsers: number;
    totalCompletedSessions: number;
    totalStudyMinutes: number;
    avgMinutesPerActiveUser: number;
  };
  deltas: {
    activeUsersPercent: number | null;
    completedSessionsPercent: number | null;
    studyMinutesPercent: number | null;
    avgMinutesPercent: number | null;
  };
}

export interface AdminActivityTrendPoint {
  dateKey: string;
  label: string;
  totalMinutes: number;
  completedSessions: number;
  cancelledSessions: number;
  stoppedEarlySessions: number;
  activeUsers: number;
  previousDateKey?: string;
  previousMinutes?: number;
  previousSessions?: number;
}

export interface AdminProductInsights {
  adoptionRate: number;
  totalAdopters: number;
  totalRegisteredUsers: number;
  wau: number;
  mau: number;
  retention7d: number | null;
  retention30d: number | null;
  featureUsage: {
    focusModeCount: number;
    stopwatchModeCount: number;
    pipCount: number;
    inAppCount: number;
    offCount: number;
  };
  engagementTrend: {
    averageDailyMinutesPerActiveUser: number;
    averageSessionsPerActiveUser: number;
  };
  consistencyTrend: {
    highConsistencyUserCount: number;
    totalAssessedUsers: number;
    highConsistencyPercent: number;
  };
}

export interface AdminUserMonitoringRow {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  totalStudyMinutes: number;
  completedSessionsCount: number;
  stoppedEarlyCount: number;
  avgSessionMinutes: number;
  activeDaysCount: number;
  consistencyScore: number | null;
  consistencyStatus: string;
  lastActiveAt: string | null;
}

export interface AdminUserMonitoringListResponse {
  users: AdminUserMonitoringRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminStudySessionRow {
  id: string;
  startedAt: string;
  endedAt: string | null;
  mode: string;
  plannedSec: number;
  accumulatedSec: number;
  status: string;
  courseName: string | null;
  taskTitle: string | null;
}

export interface AdminUserDetailAnalytics {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    role: string;
    isActive: boolean;
    createdAt: string;
  };
  overview: {
    totalStudyMinutes: number;
    totalCompletedSessions: number;
    totalStoppedEarly: number;
    totalCancelled: number;
    avgSessionDurationMin: number;
    currentStreakDays: number;
    longestStreakDays: number;
    firstSessionAt: string | null;
    lastSessionAt: string | null;
  };
  trendChartData: Array<{
    date: string;
    label: string;
    minutes: number;
    sessionCount: number;
    previousDate?: string;
    previousMinutes?: number;
    previousSessionCount?: number;
  }>;
  heatmapDataMap: Record<string, { minutes: number; sessionCount: number }>;
  consistency: ConsistencyScoreResult;
  courses: CourseBreakdownRow[];
  taskData: {
    sufficientData: boolean;
    tasks: TaskBreakdownRow[];
    totalTasksCount: number;
  };
  recentSessions: {
    sessions: AdminStudySessionRow[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface AdminStudyAnalyticsDashboardData {
  filter: AdminStudyPeriod;
  startDateKey: string;
  endDateKey: string;
  overviewKpis: AdminStudyOverviewKpis;
  activityTrends: AdminActivityTrendPoint[];
  productInsights: AdminProductInsights;
}

