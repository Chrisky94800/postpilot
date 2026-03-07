// PostPilot — TrialBanner
// Bandeau affiché sur toutes les pages pendant le trial ou en plan gratuit.
// Couleur : bleu → orange (J-7) → rouge (J-3).

import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useSubscription } from '@/hooks/useSubscription'
import { useOrganization } from '@/hooks/useOrganization'

export function TrialBanner() {
  const { organization } = useOrganization()
  const { subscription, isTrial, isFree } = useSubscription(organization?.id ?? null)
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null
  if (!isTrial && !isFree) return null  // plan payant actif → pas de bandeau
  if (!subscription) return null

  const days = subscription.trial_days_remaining

  // Bandeau plan gratuit (trial expiré)
  if (isFree && !isTrial) {
    return (
      <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between text-sm">
        <span className="text-slate-300">
          Vous êtes sur le plan <strong className="text-white">Gratuit</strong> — 1 post IA par mois
        </span>
        <button
          onClick={() => navigate('/pricing')}
          className="ml-4 bg-white text-slate-900 px-3 py-1 rounded-md text-xs font-semibold hover:bg-slate-100 transition-colors shrink-0"
        >
          Upgrade →
        </button>
      </div>
    )
  }

  // Couleur selon urgence
  const colorClass = cn(
    days !== null && days <= 3
      ? 'bg-red-500 text-white'
      : days !== null && days <= 7
      ? 'bg-orange-400 text-white'
      : 'bg-blue-600 text-white',
  )

  const textClass = days !== null && days <= 7 ? 'text-white' : 'text-blue-100'

  return (
    <div className={cn('px-4 py-2 flex items-center justify-between text-sm', colorClass)}>
      <span className={textClass}>
        🚀 <strong>Trial Solo</strong>
        {days !== null && days > 0
          ? ` — ${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}`
          : ' — expire aujourd\'hui'}
      </span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/pricing')}
          className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md text-xs font-semibold transition-colors"
        >
          Choisir un plan →
        </button>
        <button onClick={() => setDismissed(true)} className="opacity-70 hover:opacity-100">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
