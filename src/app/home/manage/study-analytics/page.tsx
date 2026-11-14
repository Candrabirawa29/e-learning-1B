import { requireAdmin } from "@/lib/auth/session";
import {
  getAdminStudyAnalyticsDashboard,
  getAdminUserMonitoringList,
} from "@/actions/admin-study-analytics";
import { AdminStudyAnalyticsClient } from "@/components/admin-study-analytics/AdminStudyAnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AdminStudyAnalyticsPage() {
  await requireAdmin();

  const [dashboardData, userListData] = await Promise.all([
    getAdminStudyAnalyticsDashboard("7d"),
    getAdminUserMonitoringList({ page: 1, pageSize: 10, filter: "7d" }),
  ]);

  return (
    <AdminStudyAnalyticsClient
      initialDashboard={dashboardData}
      initialUserList={userListData}
    />
  );
}

