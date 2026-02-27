// PostPilot — Hook useContacts
// CRUD pour les contacts fréquents (mentions LinkedIn)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from './useOrganization'
import type { Contact, ContactType } from '@/types/database'

export function useContacts() {
  const { organizationId } = useOrganization()
  const queryClient = useQueryClient()

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', organizationId],
    queryFn: async (): Promise<Contact[]> => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('organization_id', organizationId!)
        .order('name', { ascending: true })
      if (error) throw error
      return data as Contact[]
    },
    enabled: !!organizationId,
  })

  const createContact = useMutation({
    mutationFn: async (input: { name: string; linkedin_url?: string; type: ContactType }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('contacts').insert({
        organization_id: organizationId!,
        name: input.name.trim(),
        linkedin_url: input.linkedin_url?.trim() || null,
        type: input.type,
        created_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts', organizationId] }),
  })

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts', organizationId] }),
  })

  return { contacts, isLoading, createContact, deleteContact }
}
