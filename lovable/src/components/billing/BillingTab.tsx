// PostPilot — BillingTab
// Onglet "Facturation" dans Settings. Affiche le plan, l'usage, et les actions Stripe.

import { useNavigate } from 'react-router-dom'
import { CreditCard, Loader2, ExternalLink, Zap } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useOrganization } from '@/hooks/useOrganization'
import { useSubscription } from '@/hooks/useSubscription'
import { createBillingPortal } from '@/lib/api'
import { SUBSCRIPTION_PLANS } from '@/lib/constants'
import type { PlanId } from '@/lib/constants'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  trialing:  { label: 'Trial',      color: 'bg-blue-100 text-blue-700' },
  active:    { label: 'Actif',      color: 'bg-emerald-100 text-emerald-700' },
  past_due:  { label: 'Impayé',     color: 'bg-red-100 text-red-700' },
  canceled:  { label: 'Annulé',     color: 'bg-gray-100 text-gray-600' },
  free:      { label: 'Gratuit',    color: 'bg-gray-100 text-gray-600' },
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
}

export function BillingTab() {
  const navigate = useNavigate()
  const { organization } = useOrganization()
  const { subscription, usage, isLoading, isTrial, planId } = useSubscription(organization?.id ?? null)
  const [portalLoading, setPortalLoading] = useState(false)

  async function openPortal() {
    if (!organization?.id) return
    setPortalLoading(true)
    try {
      const { portal_url } = await createBillingPortal(organization.id)
      window.open(portal_url, '_blank')
    } catch (err) {
      toast.error(`Portail inaccessible : ${(err as Error).message}`)
    } finally {
      setPortalLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const effectivePlanId: PlanId = isTrial ? 'solo' : planId
  const planInfo = SUBSCRIPTION_PLANS[effectivePlanId]
  const statusInfo = STATUS_LABELS[subscription?.status ?? 'free'] ?? STATUS_LABELS['free']
  const hasPaidPlan = subscription?.status === 'active' || subscription?.status === 'past_due'

  const usagePct = usage && usage.limit > 0
    ? Math.round((usage.used / usage.limit) * 100)
    : 0

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Mon abonnement</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Gérez votre plan et vos informations de paiement.
        </p>
      </div>

      {/* Carte plan actuel */}
      <div className="border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-gray-900">
                Plan {planInfo.label}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            {isTrial && subscription?.trial_days_remaining !== null && (
              <p className="text-sm text-blue-600 mt-0.5">
                Trial — {subscription?.trial_days_remaining} jour{(subscription?.trial_days_remaining ?? 0) > 1 ? 's' : ''} restant{(subscription?.trial_days_remaining ?? 0) > 1 ? 's' : ''}
              </p>
            )}
            {hasPaidPlan && subscription?.billing_cycle && (
              <p className="text-sm text-gray-500 mt-0.5">
                {subscription.billing_cycle === 'yearly' ? 'Annuel' : 'Mensuel'}{' '}
                — {planInfo.priceMonthly}€/mois
              </p>
            )}
            {hasPaidPlan && subscription?.current_period_end && (
              <p className="text-sm text-gray-400 mt-0.5">
                Prochain paiement : {formatDate(subscription.current_period_end)}
              </p>
            )}
          </div>
          <CreditCard className="h-5 w-5 text-gray-400 shrink-0" />
        </div>

        {/* Barre d'usage */}
        {usage && (
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>Posts IA utilisés ce mois</span>
              <span className="font-medium">{usage.used} / {usage.limit}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePct >= 100 ? 'bg-red-500' : usagePct >= 80 ? 'bg-orange-400' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(usagePct, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={() => navigate('/pricing')}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-500" />
            Changer de plan
          </div>
          <span className="text-gray-400">→</span>
        </button>

        {hasPaidPlan && (
          <>
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-gray-400" />
                Gérer la facturation
              </div>
              {portalLoading
                ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                : <span className="text-gray-400">↗</span>
              }
            </button>
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-red-100 hover:bg-red-50 transition-colors text-sm font-medium text-red-600 disabled:opacity-50"
            >
              <span>Annuler l'abonnement</span>
              <span className="text-red-300">→</span>
            </button>
          </>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Les changements de plan et annulations sont gérés via le portail Stripe sécurisé.
      </p>
    </div>
  )
}
