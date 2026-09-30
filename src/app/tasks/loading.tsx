import { Skeleton } from "@/components/ui/skeleton";

export default function PublicTasksLoading() {
  return (
    <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-12 rounded" />
          </div>
          <Skeleton className="h-3.5 w-80 max-w-full" />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-card p-3 border rounded-lg">
        <Skeleton className="h-8 flex-1 max-w-md rounded-md" />
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-[150px] rounded-md" />
          <Skeleton className="h-8 w-[120px] rounded-md" />
          <Skeleton className="h-8 w-[130px] rounded-md" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="h-10 bg-muted/50 border-b flex items-center px-4 gap-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/5 hidden sm:block" />
          <Skeleton className="h-4 w-1/5" />
          <Skeleton className="h-4 w-16 hidden md:block" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="divide-y">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-14 flex items-center px-4 gap-4">
              <div className="w-1/4 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2 sm:hidden" />
              </div>
              <Skeleton className="h-4 w-1/5 hidden sm:block" />
              <div className="w-1/5 space-y-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-5 w-16 rounded hidden md:block" />
              <Skeleton className="h-5 w-20 rounded" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
