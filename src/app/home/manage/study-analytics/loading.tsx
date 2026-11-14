import { Card } from "@/components/ui/card";

export default function AdminStudyAnalyticsLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b">
        <div className="space-y-2">
          <div className="h-6 w-64 bg-muted rounded-md" />
          <div className="h-4 w-96 bg-muted/60 rounded-md" />
        </div>
        <div className="h-9 w-64 bg-muted rounded-xl" />
      </div>

      {/* 6 KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border border-border/60 bg-card p-4 h-28 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="h-7 w-7 rounded-lg bg-muted" />
            </div>
            <div className="h-6 w-24 bg-muted rounded" />
            <div className="h-2 w-full bg-muted/60 rounded" />
          </Card>
        ))}
      </div>

      {/* Chart Skeleton */}
      <Card className="border border-border/60 bg-card p-5">
        <div className="flex items-center justify-between pb-4 border-b border-border/40">
          <div className="space-y-1.5">
            <div className="h-4 w-48 bg-muted rounded" />
            <div className="h-3 w-72 bg-muted/60 rounded" />
          </div>
          <div className="h-8 w-44 bg-muted rounded-lg" />
        </div>
        <div className="h-72 w-full bg-muted/30 rounded-xl mt-4" />
      </Card>

      {/* Product Insights Skeleton */}
      <Card className="border border-border/60 bg-card p-5 space-y-4">
        <div className="h-4 w-56 bg-muted rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted/40 rounded-xl border border-border/40" />
          ))}
        </div>
      </Card>

      {/* Table Skeleton */}
      <Card className="border border-border/60 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-40 bg-muted rounded" />
          <div className="h-8 w-56 bg-muted rounded-md" />
        </div>
        <div className="space-y-2 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted/30 rounded border border-border/30" />
          ))}
        </div>
      </Card>
    </div>
  );
}
