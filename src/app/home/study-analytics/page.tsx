import { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getStudyAnalyticsDashboard } from "@/actions/analytics";
import { StudyAnalyticsClient } from "./StudyAnalyticsClient";

export const metadata: Metadata = {
  title: "Analitik Belajar & Study Intelligence | Class 1-B",
  description: "Dashboard analitik pribadi, tren fokus, konsistensi mingguan, heatmap belajar tahunan, dan AI Study Analyst.",
};

export default async function StudyAnalyticsPage() {
  await requireUser();
  const initialData = await getStudyAnalyticsDashboard("7d");

  return <StudyAnalyticsClient initialData={initialData} />;
}
