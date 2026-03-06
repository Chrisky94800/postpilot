// PostPilot — Hook : vérifie si l'utilisateur courant est administrateur

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export function useIsAdmin(): { isAdmin: boolean; isLoading: boolean } {
  const { user, loading: authLoading } = useAuth()

  const { data: isAdmin = false, isLoading: queryLoading } = useQuery({
    queryKey: ['is_admin', user?.id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('is_admin')
      if (error) return false
      return data as boolean
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  // authLoading : l'auth n'est pas encore résolue (user peut être null transitoirement)
  // queryLoading : user est connu mais la query n'a pas encore répondu
  return {
    isAdmin,
    isLoading: authLoading || (!!user && queryLoading),
  }
}
