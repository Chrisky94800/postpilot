// PostPilot — UsageCounter
// Barre de progression des posts IA utilisés ce mois.
// Affiché dans la sidebar sous le nom de l'organisation.

import { cn } from '@/lib/utils'
import type { Usage } from '@/hooks/useSubscription'

interface UsageCounterProps {
  usage: Usage | null
  isLoading?: boolean
}

export function UsageCounter({ usage, isLoading }: UsageCounterProps) {
  if (isLoading) {
    return (
      <div className="px-3 py-2">
        <div className="h-1.5 bg-white/10 rounded-full animate-pulse" />
      </div>
    )
  }

  if (!usage) return null

  const pct = usage.limit > 0 ? Math.round((usage.used / usage.limit) * 100) : 0
  const isFull    = pct >= 100
  const isWarning = pct >= 80 && !isFull

  const barColor = isFull
    ? 'bg-red-500'
    : isWarning
    ? 'bg-orange-400'
    : 'bg-emerald-500'

  const textColor = isFull
    ? 'text-red-400'
    : isWarning
    ? 'text-orange-400'
    : 'text-slate-400'

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
          Posts IA
        </span>
        <span className={cn('text-[10px] font-semibold tabular-nums', textColor)}>
          {usage.used}/{usage.limit}
        </span>
      </div>
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', barColor)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}
