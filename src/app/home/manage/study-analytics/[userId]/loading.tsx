import { Card } from "@/components/ui/card";

export default function AdminUserStudyAnalyticsDetailLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b">
        <div className="flex items-center gap-3">
          <div className="h-9 w-24 bg-muted rounded-md" />
          <div className="h-10 w-10 rounded-full bg-muted" />
          <div className="space-y-1.5">
            <div className="h-5 w-48 bg-muted rounded" />
            <div className="h-3 w-32 bg-muted/60 rounded" />
          </div>
        </div>
        <div className="h-9 w-64 bg-muted rounded-xl" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border border-border/60 bg-card p-3.5 h-24 flex flex-col justify-between">
            <div className="h-3 w-16 bg-muted rounded" />
            <div className="h-5 w-20 bg-muted rounded" />
            <div className="h-2 w-12 bg-muted/60 rounded" />
          </Card>
        ))}
      </div>

      {/* Trend Chart Skeleton */}
      <Card className="border border-border/60 bg-card p-5 h-72">
        <div className="h-full w-full bg-muted/30 rounded-xl" />
      </Card>

      {/* Consistency & Heatmap Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border border-border/60 bg-card p-5 h-64" />
        <Card className="lg:col-span-2 border border-border/60 bg-card p-5 h-64" />
      </div>

      {/* Table Skeleton */}
      <Card className="border border-border/60 bg-card p-5 h-64" />
    </div>
  );
}

