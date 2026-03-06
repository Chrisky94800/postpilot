// PostPilot — Hook usePlanLimits
// Retourne les features disponibles pour un plan donné.
// Pendant le trial, les limites Solo s'appliquent.

import { PLAN_LIMITS } from '@/lib/constants'
import type { PlanId } from '@/lib/constants'
import type { SubscriptionStatus } from './useSubscription'

type PlanLimits = typeof PLAN_LIMITS['free']

export function usePlanLimits(
  planId: PlanId,
  status?: SubscriptionStatus,
): PlanLimits {
  // Pendant le trial, les limites Solo s'appliquent
  const effectivePlan: PlanId =
    status === 'trialing' ? 'solo' : (planId ?? 'free')

  return PLAN_LIMITS[effectivePlan] ?? PLAN_LIMITS['free']
}
