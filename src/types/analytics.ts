import { StreakResult, ConsistencyScoreResult, TrendAnalysisResult } from "@/lib/analytics/study-metrics";
import { CourseBreakdownRow, TaskBreakdownRow, HourDayMatrixRow } from "@/lib/analytics/study-queries";
import { StudyPreferenceDto } from "@/types/focus";

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
}

export interface TrendChartPoint {
  date: string;
  label: string;
  minutes: number;
  sessionCount: number;
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
}
