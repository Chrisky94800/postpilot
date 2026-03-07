// PostPilot — LimitReachedModal
// Modal affiché quand l'utilisateur tente de générer un post mais a atteint sa limite.

import { useNavigate } from 'react-router-dom'
import { X, Zap } from 'lucide-react'
import type { PlanId } from '@/lib/constants'
import { SUBSCRIPTION_PLANS } from '@/lib/constants'

interface LimitReachedModalProps {
  isOpen: boolean
  onClose: () => void
  used: number
  limit: number
  planId: PlanId
}

export function LimitReachedModal({
  isOpen,
  onClose,
  used,
  limit,
  planId,
}: LimitReachedModalProps) {
  const navigate = useNavigate()

  if (!isOpen) return null

  const isOnPro  = planId === 'pro'
  const nextPlan = isOnPro ? null : planId === 'solo' ? 'pro' : 'solo'
  const nextPlanInfo = nextPlan ? SUBSCRIPTION_PLANS[nextPlan] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-3">
            <Zap className="h-6 w-6 text-orange-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Limite atteinte
          </h2>
          <p className="text-gray-500 text-sm">
            Vous avez utilisé vos <strong>{limit} posts IA</strong> ce mois
            ({used}/{limit}).
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {nextPlanInfo && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-sm font-medium text-blue-900 mb-1">
                Passez au plan {nextPlanInfo.label}
              </p>
              <p className="text-xs text-blue-700">
                {nextPlanInfo.maxPosts} posts IA / mois —{' '}
                {nextPlanInfo.priceMonthly}€/mois
              </p>
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-600">
              Ou attendez le 1er du mois prochain — votre quota sera réinitialisé.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Plus tard
          </button>
          {nextPlan && (
            <button
              onClick={() => { onClose(); navigate('/pricing') }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
            >
              Passer au {nextPlanInfo?.label} →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
