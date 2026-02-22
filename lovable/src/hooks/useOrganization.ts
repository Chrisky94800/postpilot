// PostPilot — Hook d'organisation courante
// Fournit l'organisation, le brand_profile, et le rôle de l'utilisateur.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Organization, BrandProfile, MemberRole } from '@/types/database'

interface MembershipRow {
  organization_id: string
  role: MemberRole
  organizations: Organization
}

interface UseOrganizationReturn {
  /** Organisation courante */
  organization: Organization | null
  /** UUID de l'organisation courante */
  organizationId: string | null
  /** Profil de marque de l'organisation */
  brandProfile: BrandProfile | null
  /** Rôle de l'utilisateur courant dans l'organisation */
  role: MemberRole | null
  /** true si l'utilisateur n'a pas encore d'organisation (→ onboarding) */
  hasNoOrganization: boolean
  /** Chargement initial */
  loading: boolean
  /** Met à jour le brand_profile */
  updateBrandProfile: (updates: Partial<BrandProfile>) => Promise<void>
}

export function useOrganization(): UseOrganizationReturn {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // ── Membership : récupère l'org via organization_members ─────────────────
  const {
    data: membership,
    isLoading: membershipLoading,
    isFetched: membershipFetched,
  } = useQuery({
    queryKey: ['membership', user?.id],
    queryFn: async (): Promise<MembershipRow | null> => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id, role, organizations(*)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return data as MembershipRow | null
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 min
  })

  const organization = membership?.organizations ?? null
  const organizationId = membership?.organization_id ?? null
  const role = membership?.role ?? null

  // ── Brand profile ─────────────────────────────────────────────────────────
  const { data: brandProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['brand_profile', organizationId],
    queryFn: async (): Promise<BrandProfile | null> => {
      const { data, error } = await supabase
        .from('brand_profiles')
        .select('*')
        .eq('organization_id', organizationId!)
        .maybeSingle()

      // PGRST116 = pas de résultat → l'onboarding n'est pas terminé
      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  })

  // ── Mutation : mise à jour du brand profile ───────────────────────────────
  const { mutateAsync: updateBrandProfile } = useMutation({
    mutationFn: async (updates: Partial<BrandProfile>) => {
      if (!organizationId) throw new Error('Aucune organisation')

      if (brandProfile?.id) {
        // UPDATE
        const { error } = await supabase
          .from('brand_profiles')
          .update(updates)
          .eq('id', brandProfile.id)
        if (error) throw error
      } else {
        // INSERT (premier enregistrement)
        const { error } = await supabase.from('brand_profiles').insert({
          organization_id: organizationId,
          ...updates,
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand_profile', organizationId] })
    },
  })

  return {
    organization,
    organizationId,
    brandProfile: brandProfile ?? null,
    role,
    hasNoOrganization: membershipFetched && !membership,
    loading: membershipLoading || (!!organizationId && profileLoading),
    updateBrandProfile,
  }
}
