import { cn } from '@/lib/utils'

interface UsageBadgeProps {
  used: number
  total: number
  label: string
  className?: string
}

export function UsageBadge({ used, total, label, className }: UsageBadgeProps) {
  const percentage = (used / total) * 100
  const isNearLimit = percentage >= 80
  const isAtLimit = percentage >= 100

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={cn(
            'font-semibold',
            isAtLimit
              ? 'text-destructive'
              : isNearLimit
              ? 'text-yellow-500'
              : 'text-foreground'
          )}
        >
          {used}/{total}
        </span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isAtLimit
              ? 'bg-destructive'
              : isNearLimit
              ? 'bg-yellow-500'
              : 'bg-primary'
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}
