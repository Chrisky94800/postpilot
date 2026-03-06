// PostPilot — PricingCards
// Composant réutilisable : utilisé dans /pricing (in-app) ET sur la landing page.
// Props : currentPlanId (pour badge "Plan actuel"), onSelectPlan callback.

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SUBSCRIPTION_PLANS, STRIPE_PRICES } from '@/lib/constants'
import type { PlanId } from '@/lib/constants'

interface PricingCardsProps {
  currentPlanId?: PlanId | null
  isTrial?: boolean
  onSelectPlan?: (priceId: string, planId: PlanId, cycle: 'monthly' | 'yearly') => void
  /** Mode landing : CTA "Essayer gratuitement" → /signup */
  landingMode?: boolean
  onSignup?: () => void
}

export function PricingCards({
  currentPlanId,
  isTrial = false,
  onSelectPlan,
  landingMode = false,
  onSignup,
}: PricingCardsProps) {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly')

  const plans: PlanId[] = ['free', 'solo', 'pro']

  function handleSelect(planId: PlanId) {
    if (landingMode) {
      onSignup?.()
      return
    }
    if (planId === 'free') return  // downgrade handled via portal
    const priceId = STRIPE_PRICES[planId as 'solo' | 'pro'][cycle]
    onSelectPlan?.(priceId, planId, cycle)
  }

  return (
    <div className="space-y-6">
      {/* Toggle mensuel / annuel */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setCycle('monthly')}
          className={cn(
            'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
            cycle === 'monthly'
              ? 'bg-blue-600 text-white'
              : 'text-gray-500 hover:text-gray-800',
          )}
        >
          Mensuel
        </button>
        <button
          onClick={() => setCycle('yearly')}
          className={cn(
            'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
            cycle === 'yearly'
              ? 'bg-blue-600 text-white'
              : 'text-gray-500 hover:text-gray-800',
          )}
        >
          Annuel
          <span className="ml-1.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            -22%
          </span>
        </button>
      </div>

      {/* Cartes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((planId) => {
          const plan = SUBSCRIPTION_PLANS[planId]
          const isCurrentPlan = currentPlanId === planId && !isTrial
          const isTrialPlan   = planId === 'solo' && isTrial
          const isSolo        = planId === 'solo'
          const price = cycle === 'yearly' ? plan.priceYearly : plan.priceMonthly

          return (
            <div
              key={planId}
              className={cn(
                'relative flex flex-col rounded-2xl border-2 p-6 transition-shadow',
                isSolo
                  ? 'border-blue-500 shadow-lg shadow-blue-100'
                  : 'border-gray-200',
              )}
            >
              {/* Badge Solo recommandé */}
              {isSolo && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Recommandé
                  </span>
                </div>
              )}

              {/* En-tête */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">{plan.label}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-gray-900">
                    {price}€
                  </span>
                  <span className="text-sm text-gray-500">/mois</span>
                </div>
                {cycle === 'yearly' && planId !== 'free' && (
                  <p className="text-xs text-emerald-600 mt-0.5">
                    soit {plan.priceYearlyTotal}€/an
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  {plan.maxPosts === 1
                    ? '1 post IA / mois'
                    : `${plan.maxPosts} posts IA / mois`}
                </p>
              </div>

              {/* CTA */}
              {isCurrentPlan || isTrialPlan ? (
                <div className="mb-6 text-center text-sm font-medium text-gray-500 bg-gray-100 rounded-lg py-2">
                  {isTrialPlan ? 'Trial en cours' : 'Plan actuel'}
                </div>
              ) : planId === 'free' && !landingMode ? (
                <div className="mb-6 text-center text-xs text-gray-400 italic">
                  Accessible après annulation
                </div>
              ) : (
                <button
                  onClick={() => handleSelect(planId)}
                  className={cn(
                    'mb-6 w-full rounded-lg py-2.5 text-sm font-semibold transition-colors',
                    isSolo
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : planId === 'pro'
                      ? 'bg-slate-900 hover:bg-slate-800 text-white'
                      : 'border border-gray-300 hover:bg-gray-50 text-gray-700',
                  )}
                >
                  {landingMode
                    ? 'Essayer gratuitement'
                    : planId === 'free'
                    ? 'Passer au Gratuit'
                    : `Choisir ${plan.label}`}
                </button>
              )}

              {/* Features incluses */}
              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
                {plan.missingFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-400">
                    <X className="h-4 w-4 text-gray-300 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Inclus dans tous les plans */}
      <p className="text-center text-xs text-gray-400">
        Tous les plans incluent : assistant IA, publication auto LinkedIn, profil de marque, support email
      </p>
    </div>
  )
}
