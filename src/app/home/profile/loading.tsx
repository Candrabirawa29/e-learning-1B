import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="border-b pb-4 space-y-1.5">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>

      <div className="space-y-5">
        {/* Profile Card Skeleton */}
        <div className="border rounded-lg bg-card p-6 space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-72" />
          </div>

          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>

          <div className="pt-2 border-t flex justify-end">
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>

        {/* Password Card Skeleton */}
        <div className="border rounded-lg bg-card p-6 space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3.5 w-64" />
          </div>

          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </div>

          <div className="pt-2 border-t flex justify-end">
            <Skeleton className="h-9 w-36 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
