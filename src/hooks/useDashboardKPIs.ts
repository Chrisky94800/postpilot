// PostPilot — Hook KPIs du Dashboard
// Appelle la RPC get_dashboard_kpis pour récupérer les 4 métriques
// en une seule requête Supabase.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type DashboardKPIs = {
  publishedThisMonth: number
  maxPostsPerMonth: number
  toWriteThisWeek: number
  viewsThisMonth: number | null       // null = pas encore de données analytics
  viewsTrend: number | null           // % vs mois précédent, null si pas de précédent
  engagementRate: number | null       // en %, null si pas de données
  engagementTrend: number | null      // % vs mois précédent
  isLoading: boolean
}

type RpcResult = {
  published_this_month: number
  max_posts_per_month: number
  to_write_this_week: number
  views_this_month: number | null
  views_trend: number | null
  engagement_rate: number | null
  engagement_trend: number | null
}

export function useDashboardKPIs(organizationId: string | null): DashboardKPIs {
  const { data, isLoading } = useQuery({
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
    staleTime: 2 * 60 * 1000, // 2 min
  })

  return {
    publishedThisMonth: data?.published_this_month ?? 0,
    maxPostsPerMonth: data?.max_posts_per_month ?? 0,
    toWriteThisWeek: data?.to_write_this_week ?? 0,
    viewsThisMonth: data?.views_this_month ?? null,
    viewsTrend: data?.views_trend ?? null,
    engagementRate: data?.engagement_rate ?? null,
    engagementTrend: data?.engagement_trend ?? null,
    isLoading,
  }
}
