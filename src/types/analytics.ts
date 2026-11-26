import { StreakResult, ConsistencyScoreResult, TrendAnalysisResult } from "@/lib/analytics/study-metrics";
import { CourseBreakdownRow, TaskBreakdownRow, HourDayMatrixRow } from "@/lib/analytics/study-queries";
import { StudyPreferenceDto } from "@/types/focus";
import type { AiPersonaModeType } from "@/lib/analytics/ai-persona";

export interface AiChatMessageDto {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode: AiPersonaModeType;
  createdAt: string;
}

export interface AiQuotaStatusDto {
  used: number;
  remaining: number | null;
  limit: number | null;
  isUnlimited: boolean;
}

export interface AnalyticsKpis {
  todayMinutes: number;
  thisWeekMinutes: number;
  thisMonthMinutes: number;
  weeklyTargetMin: number;
  streak: StreakResult;
  consistency: ConsistencyScoreResult;
  trend: TrendAnalysisResult;
  completion: {
    startedCount: number;
    completedCount: number;
    stoppedEarlyCount: number;
    completionRatio: number;
  };
  periodComparison: {
    currentMinutes: number;
    previousMinutes: number;
    percentChange: number | null;
  };
  suggestedWeeklyTargetMin?: number | null;
}

export interface TrendChartPoint {
  date: string;
  label: string;
  minutes: number;
  sessionCount: number;
  previousDate?: string;
  previousMinutes?: number;
  previousSessionCount?: number;
}

export interface StudyAnalyticsDashboardData {
  filter: "7d" | "30d" | "year";
  kpi: AnalyticsKpis;
  trendChartData: TrendChartPoint[];
  heatmapDataMap: Record<string, { minutes: number; sessionCount: number }>;
  hourDayMatrix: HourDayMatrixRow[];
  courses: CourseBreakdownRow[];
  taskData: {
    sufficientData: boolean;
    tasks: TaskBreakdownRow[];
    totalTasksCount: number;
  };
  preferences: StudyPreferenceDto;
  suggestedWeeklyTargetMin: number | null;
  aiQuota: AiQuotaStatusDto;
  aiChatHistory: {
    coach: AiChatMessageDto[];
    partner: AiChatMessageDto[];
  };
}
