import { ReactNode } from "react"

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  secondaryAction?: ReactNode
  condition?: string
}

export function EmptyState({ icon, title, description, action, secondaryAction, condition }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
      <div className="text-muted-foreground/50">{icon}</div>
      <p className="text-lg font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {condition && (
        <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-4 py-2 mt-1">
          {condition}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-1 flex items-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}

