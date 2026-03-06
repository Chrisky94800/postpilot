// PostPilot — Hook usePosts
// Récupère les posts de l'organisation courante avec filtres optionnels.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from './useOrganization'
import type { Post, PostStatus } from '@/types/database'

interface PostsFilter {
  status?: PostStatus | PostStatus[]
  year?: number
  month?: number   // 0-indexed (0 = janvier)
  limit?: number
}

export function usePosts(filter: PostsFilter = {}) {
  const { organizationId } = useOrganization()

  return useQuery({
    queryKey: ['posts', organizationId, filter],
    queryFn: async (): Promise<Post[]> => {
      let query = supabase
        .from('posts')
        .select('*')
        .eq('organization_id', organizationId!)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })

      if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status]
        query = query.in('status', statuses)
      }

      if (filter.year !== undefined && filter.month !== undefined) {
        const start = new Date(filter.year, filter.month, 1).toISOString()
        const end   = new Date(filter.year, filter.month + 1, 0, 23, 59, 59).toISOString()
        query = query.gte('scheduled_at', start).lte('scheduled_at', end)
      }

      if (filter.limit) {
        query = query.limit(filter.limit)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Post[]
    },
    enabled: !!organizationId,
    staleTime: 30_000,
  })
}
