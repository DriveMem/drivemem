import { Skeleton } from "./skeleton"

export function DashboardSkeleton() {
  return (
    <div className="max-w-4xl mx-auto w-full px-4 md:px-6 py-6 md:py-8 space-y-6">
      {/* Status bar */}
      <Skeleton className="h-10 w-full rounded-xl" />
      {/* Quick actions */}
      <div className="flex gap-3">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      {/* Value summary card */}
      <Skeleton className="h-32 w-full rounded-2xl" />
      {/* Getting smarter card */}
      <Skeleton className="h-40 w-full rounded-2xl" />
      {/* Activity feed */}
      <Skeleton className="h-4 w-32" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}

export function ChatSkeleton() {
  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="hidden md:flex w-64 flex-col border-r border-border p-4 space-y-3">
        <Skeleton className="h-8 w-full rounded-lg" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-4 w-48 rounded-lg" />
        <div className="flex gap-2 mt-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-32 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function KnowledgeSkeleton() {
  return (
    <div className="flex h-full">
      <div className="hidden md:flex w-60 flex-col border-r border-border p-3 space-y-2">
        <Skeleton className="h-4 w-16 mb-2" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-full rounded-md" />
        ))}
      </div>
      <div className="flex-1 p-4 space-y-2">
        {/* Top bar */}
        <Skeleton className="h-8 w-full rounded-md mb-4" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
