import { Skeleton } from "@/components/ui/skeleton";

export default function ManageMembersLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4 space-y-1.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
        <Skeleton className="h-3.5 w-96 max-w-full" />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-card p-3 border rounded-lg">
        <Skeleton className="h-8 flex-1 max-w-md rounded-md" />
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>

      {/* Table Skeleton */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="h-10 bg-muted/50 border-b flex items-center px-4 gap-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/6 hidden sm:block" />
          <Skeleton className="h-4 w-1/6 hidden md:block" />
          <Skeleton className="h-4 w-20 ml-auto" />
        </div>
        <div className="divide-y">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-14 flex items-center px-4 gap-4">
              <div className="w-1/4 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-5 w-14 rounded hidden sm:block" />
              <Skeleton className="h-3.5 w-24 hidden md:block" />
              <Skeleton className="h-8 w-20 rounded-md ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
