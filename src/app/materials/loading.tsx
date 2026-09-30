import { Skeleton } from "@/components/ui/skeleton";

export default function PublicMaterialsLoading() {
  return (
    <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-12 rounded" />
          </div>
          <Skeleton className="h-3.5 w-96 max-w-full" />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-card p-3 border rounded-lg">
        <Skeleton className="h-8 flex-1 max-w-md rounded-md" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-[170px] rounded-md" />
          <Skeleton className="h-8 w-[120px] rounded-md" />
        </div>
      </div>

      {/* Material Cards List */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border rounded-lg bg-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-14 rounded" />
                </div>
                <Skeleton className="h-3 w-72" />
                <div className="flex items-center gap-2 pt-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
            <Skeleton className="h-8 w-24 rounded-md shrink-0 self-end sm:self-center" />
          </div>
        ))}
      </div>
    </main>
  );
}
