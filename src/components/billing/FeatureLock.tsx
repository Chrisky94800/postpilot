// PostPilot — FeatureLock
// Composant générique pour verrouiller une feature non disponible dans le plan actuel.
// Deux variantes : inline (dans une liste d'options) ou overlay (sur une section).

import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlanId } from '@/lib/constants'

interface FeatureLockProps {
  /** Le plan minimum requis pour accéder à la feature */
  requiredPlan: 'solo' | 'pro'
  /** Nom de la feature (pour le message) */
  featureName: string
  /** Mode d'affichage */
  variant?: 'inline' | 'overlay' | 'badge'
  className?: string
  children?: React.ReactNode
}

const PLAN_LABELS: Record<PlanId, string> = {
  free: 'Gratuit',
  solo: 'Solo',
  pro: 'Pro',
}

export function FeatureLock({
  requiredPlan,
  featureName,
  variant = 'inline',
  className,
  children,
}: FeatureLockProps) {
  const navigate = useNavigate()

  if (variant === 'badge') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
          'bg-amber-100 text-amber-700 cursor-pointer hover:bg-amber-200 transition-colors',
          className,
        )}
        onClick={() => navigate('/pricing')}
        title={`Disponible avec le plan ${PLAN_LABELS[requiredPlan]}`}
      >
        <Lock className="h-2.5 w-2.5" />
        {PLAN_LABELS[requiredPlan]}
      </span>
    )
  }

  if (variant === 'overlay') {
    return (
      <div className={cn('relative', className)}>
        {children}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer"
          onClick={() => navigate('/pricing')}
        >
          <Lock className="h-5 w-5 text-gray-400" />
          <p className="text-sm font-medium text-gray-600 text-center px-4">
            Disponible avec le plan <strong>{PLAN_LABELS[requiredPlan]}</strong>
          </p>
          <button className="text-xs text-blue-600 hover:underline font-medium">
            Voir les plans →
          </button>
        </div>
      </div>
    )
  }

  // variant === 'inline' (default)
  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-xl border border-dashed border-gray-200',
        'bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors',
        className,
      )}
      onClick={() => navigate('/pricing')}
    >
      <div className="flex items-center gap-2.5">
        <Lock className="h-4 w-4 text-gray-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-500">{featureName}</p>
          <p className="text-xs text-gray-400">
            Disponible avec le plan {PLAN_LABELS[requiredPlan]}
          </p>
        </div>
      </div>
      <button className="text-xs text-blue-600 hover:underline font-medium shrink-0">
        Passer au {PLAN_LABELS[requiredPlan]} →
      </button>
    </div>
  )
}
