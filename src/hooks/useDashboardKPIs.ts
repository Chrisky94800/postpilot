// PostPilot — Hook KPIs du Dashboard
// Appelle la RPC get_dashboard_kpis + une requête secondaire pour les posts en attente.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type DashboardKPIs = {
  publishedThisMonth: number
  maxPostsPerMonth: number
  toWriteThisWeek: number
  pendingReview: number   // posts draft/pending_review à valider
  quotaLeft: number       // posts restants dans le quota du mois
  isLoading: boolean
}

type RpcResult = {
  published_this_month: number
  max_posts_per_month: number
  to_write_this_week: number
}

export function useDashboardKPIs(organizationId: string | null): DashboardKPIs {
  const { data, isLoading: isLoadingKpis } = useQuery({
    queryKey: ['dashboard_kpis', organizationId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_dashboard_kpis', {
        org_id: organizationId!,
      })
      if (error) throw error
      return data as RpcResult
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
  })

  const { data: pendingCount = 0, isLoading: isLoadingPending } = useQuery({
    queryKey: ['dashboard_kpis_pending', organizationId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId!)
        .in('status', ['draft', 'pending_review'])
        .is('deleted_at', null)
      if (error) throw error
      return count ?? 0
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
  })

  const published = data?.published_this_month ?? 0
  const maxPosts = data?.max_posts_per_month ?? 0

  return {
    publishedThisMonth: published,
    maxPostsPerMonth: maxPosts,
    toWriteThisWeek: data?.to_write_this_week ?? 0,
    pendingReview: pendingCount,
    quotaLeft: Math.max(0, maxPosts - published),
    isLoading: isLoadingKpis || isLoadingPending,
  }
}
