export function FileListSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-3">
          <div className="h-8 w-8 rounded bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/5 rounded bg-muted animate-pulse" />
            <div className="h-3 w-2/5 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-3 w-14 rounded bg-muted animate-pulse shrink-0" />
          <div className="h-3 w-20 rounded bg-muted animate-pulse shrink-0" />
        </div>
      ))}
    </div>
  )
}
