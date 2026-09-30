import { Skeleton } from "@/components/ui/skeleton";

export default function HomeDashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Welcome Card Skeleton */}
      <div className="border rounded-lg p-5 bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3.5 w-80 max-w-full" />
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border rounded-lg bg-card p-3.5 space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Main Grid: Deadlines & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Deadlines & Materials */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-20" />
            </div>

            <div className="border rounded-lg bg-card divide-y">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="h-4 w-20 rounded" />
                    </div>
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Materials */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-24" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="border rounded-lg bg-card p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-12 rounded" />
                  </div>
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Announcements */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-20" />
            </div>

            <div className="border rounded-lg bg-card divide-y">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
