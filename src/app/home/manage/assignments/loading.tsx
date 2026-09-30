import { Skeleton } from "@/components/ui/skeleton";

export default function ManageAssignmentsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-3.5 w-96 max-w-full" />
        </div>
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-card p-3 border rounded-lg">
        <Skeleton className="h-8 flex-1 max-w-md rounded-md" />
        <Skeleton className="h-8 w-[180px] rounded-md" />
      </div>

      {/* Assignment Cards List */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border rounded-lg bg-card p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-52" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="h-5 w-28 rounded" />
            </div>

            <Skeleton className="h-3.5 w-4/5" />

            <div className="flex items-center justify-between pt-1 border-t">
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-28 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
