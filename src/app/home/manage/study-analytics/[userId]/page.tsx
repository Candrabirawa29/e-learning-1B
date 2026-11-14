import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminUserDetailAnalytics } from "@/actions/admin-study-analytics";
import { AdminUserDetailView } from "@/components/admin-study-analytics/AdminUserDetailView";

export const dynamic = "force-dynamic";

export default async function AdminUserStudyAnalyticsDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireAdmin();

  const { userId } = await params;
  const data = await getAdminUserDetailAnalytics(userId, "30d", 1, 10);

  if (!data) {
    notFound();
  }

  return <AdminUserDetailView initialData={data} initialFilter="30d" />;
}

