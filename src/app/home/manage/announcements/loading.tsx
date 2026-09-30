import { Skeleton } from "@/components/ui/skeleton";

export default function ManageAnnouncementsLoading() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-3.5 w-80 max-w-full" />
        </div>
        <Skeleton className="h-8 w-40 rounded-md" />
      </div>

      {/* Filter Bar */}
      <div className="bg-card p-3 border rounded-lg">
        <Skeleton className="h-8 w-full max-w-md rounded-md" />
      </div>

      {/* Announcement Cards List */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border rounded-lg bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-5 w-52" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-4 w-16 rounded" />
            </div>
            <div className="space-y-1.5 pt-1">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
