export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Search bar placeholder */}
      <div className="h-10 w-full max-w-md rounded-lg bg-muted animate-pulse" />
      {/* Tab placeholder */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-muted animate-pulse" />
        ))}
      </div>
      {/* File grid placeholder */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 space-y-3">
            <div className="h-20 rounded-lg bg-muted animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
