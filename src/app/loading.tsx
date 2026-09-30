import { Skeleton } from "@/components/ui/skeleton";

export default function PublicHomeLoading() {
  return (
    <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Welcome Banner Skeleton */}
      <div className="border rounded-lg p-5 bg-card relative overflow-hidden space-y-3">
        <div className="max-w-2xl space-y-2">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-7 w-3/4 max-w-md" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>

        <div className="flex flex-wrap gap-2.5 pt-2">
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>

      {/* Main Grid: Deadlines & Recent Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upcoming Tasks / Deadlines & Materials */}
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

          {/* Recent Materials */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="border rounded-lg bg-card p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
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

        {/* Right Column: Recent Announcements & Courses */}
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

          {/* Courses List */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-32 px-1" />
            <div className="grid grid-cols-1 gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg bg-card p-3 flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-4 w-14 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
