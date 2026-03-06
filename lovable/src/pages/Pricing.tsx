// PostPilot — Page /pricing (in-app)
// Accessible depuis : bandeau trial, bouton upgrade sidebar, écran de blocage, settings.

import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PricingCards } from '@/components/billing/PricingCards'
import { useOrganization } from '@/hooks/useOrganization'
import { useSubscription } from '@/hooks/useSubscription'
import { createCheckoutSession } from '@/lib/api'
import type { PlanId } from '@/lib/constants'
import { useState } from 'react'

export default function Pricing() {
  const navigate = useNavigate()
  const { organization } = useOrganization()
  const { subscription, isTrial, planId } = useSubscription(organization?.id ?? null)
  const [loading, setLoading] = useState(false)

  async function handleSelectPlan(
    priceId: string,
    selectedPlanId: PlanId,
    _cycle: 'monthly' | 'yearly',
  ) {
    if (!organization?.id) return
    if (!priceId) {
      toast.error('Configuration Stripe manquante — contactez le support.')
      return
    }
    setLoading(true)
    try {
      const { checkout_url } = await createCheckoutSession(organization.id, priceId)
      window.location.href = checkout_url
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[Pricing] createCheckoutSession error:', err)
      toast.error(`Erreur paiement : ${msg}`)
      setLoading(false)
    }
    void selectedPlanId
  }

  const currentPlan = isTrial ? 'solo' : planId

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* En-tête */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Choisissez votre plan</h1>
        {isTrial && subscription?.trial_days_remaining !== null && (
          <p className="mt-1 text-sm text-blue-600">
            Votre trial Solo se termine dans{' '}
            <strong>{subscription?.trial_days_remaining} jour{(subscription?.trial_days_remaining ?? 0) > 1 ? 's' : ''}</strong>.
            Choisissez un plan pour continuer sans interruption.
          </p>
        )}
      </div>

      {/* Loader pendant redirect Stripe */}
      {loading && (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-sm text-gray-600">Redirection vers le paiement…</p>
          </div>
        </div>
      )}

      <PricingCards
        currentPlanId={currentPlan}
        isTrial={isTrial}
        onSelectPlan={handleSelectPlan}
      />
    </div>
  )
}
