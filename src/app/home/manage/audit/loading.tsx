import { Skeleton } from "@/components/ui/skeleton";

export default function ManageAuditLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4 space-y-1.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-60" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
        <Skeleton className="h-3.5 w-96 max-w-full" />
      </div>

      {/* Table Skeleton */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="h-10 bg-muted/50 border-b flex items-center px-4 gap-4">
          <Skeleton className="h-4 w-[20%]" />
          <Skeleton className="h-4 w-[20%]" />
          <Skeleton className="h-4 w-[20%]" />
          <Skeleton className="h-4 w-[15%] hidden sm:block" />
          <Skeleton className="h-4 w-[25%]" />
        </div>
        <div className="divide-y">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-12 flex items-center px-4 gap-4">
              <Skeleton className="h-3.5 w-[20%]" />
              <div className="w-[20%] space-y-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-2.5 w-32" />
              </div>
              <Skeleton className="h-5 w-24 rounded" />
              <Skeleton className="h-4 w-[15%] hidden sm:block" />
              <Skeleton className="h-3.5 w-[25%]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
