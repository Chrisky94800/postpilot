// PostPilot — Hook useSubscription
// Récupère la subscription + l'usage IA du mois en cours pour l'organisation.
// Utilisé partout dans l'app pour conditionner les features et afficher les limites.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PlanId } from '@/lib/constants'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'free'

export type Subscription = {
  plan_id: PlanId
  status: SubscriptionStatus
  billing_cycle: 'monthly' | 'yearly' | null
  trial_ends_at: string | null
  trial_days_remaining: number | null
  current_period_end: string | null
  stripe_customer_id: string | null
}

export type Usage = {
  used: number
  limit: number
  remaining: number
  can_generate: boolean
}

export type UseSubscriptionReturn = {
  subscription: Subscription | null
  usage: Usage | null
  isLoading: boolean
  isTrial: boolean
  isFree: boolean
  isPaid: boolean
  planId: PlanId
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const DEFAULT_SUBSCRIPTION: Subscription = {
  plan_id: 'free',
  status: 'free',
  billing_cycle: null,
  trial_ends_at: null,
  trial_days_remaining: null,
  current_period_end: null,
  stripe_customer_id: null,
}

const DEFAULT_USAGE: Usage = {
  used: 0,
  limit: 1,
  remaining: 1,
  can_generate: true,
}

export function useSubscription(organizationId: string | null): UseSubscriptionReturn {
  // Subscription
  const { data: sub, isLoading: subLoading } = useQuery({
    queryKey: ['subscription', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('organization_id', organizationId!)
        .single()
      if (error) return null
      return data
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
  })

  // Usage du mois courant via RPC check_ai_post_limit
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['ai_post_limit', organizationId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('check_ai_post_limit', {
        org_id: organizationId!,
      })
      if (error) return null
      return data as Usage & { plan_id: PlanId; status: string; trial_ends_at: string | null }
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000, // 1 min (les compteurs changent plus souvent)
  })

  // Calculer les jours de trial restants
  const trialDaysRemaining = sub?.trial_ends_at
    ? Math.max(0, Math.ceil(
        (new Date(sub.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ))
    : null

  const subscription: Subscription = sub
    ? {
        plan_id: sub.plan_id as PlanId,
        status: sub.status as SubscriptionStatus,
        billing_cycle: sub.billing_cycle,
        trial_ends_at: sub.trial_ends_at,
        trial_days_remaining: trialDaysRemaining,
        current_period_end: sub.current_period_end,
        stripe_customer_id: sub.stripe_customer_id,
      }
    : DEFAULT_SUBSCRIPTION

  const usage: Usage = usageData
    ? {
        used: usageData.used,
        limit: usageData.limit,
        remaining: usageData.remaining,
        can_generate: usageData.can_generate,
      }
    : DEFAULT_USAGE

  const isTrial = subscription.status === 'trialing'
  const isFree  = subscription.status === 'free' || subscription.plan_id === 'free'
  const isPaid  = subscription.status === 'active' || subscription.status === 'past_due'
  const planId: PlanId = isTrial ? 'solo' : subscription.plan_id

  return {
    subscription,
    usage,
    isLoading: subLoading || usageLoading,
    isTrial,
    isFree,
    isPaid,
    planId,
  }
}
