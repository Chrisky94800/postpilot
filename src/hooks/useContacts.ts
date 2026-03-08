// PostPilot — Hook useContacts
// CRUD + import CSV en masse pour les contacts fréquents (mentions LinkedIn)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from './useOrganization'
import type { Contact, ContactType } from '@/types/database'
import type { ParsedContact } from '@/components/contacts/LinkedInCSVImport'

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('contacts').insert({
        organization_id: organizationId!,
        name: input.name.trim(),
        linkedin_url: input.linkedin_url?.trim() || null,
        type: input.type,
        created_by: user?.id ?? null,
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

  // Import en masse depuis CSV LinkedIn — upsert sur (organization_id, name)
  const bulkImportContacts = useMutation({
    mutationFn: async (parsed: ParsedContact[]) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!organizationId) throw new Error('Organisation introuvable')

      const existingNames = new Set(contacts.map((c) => c.name.toLowerCase()))
      const skipped = parsed.filter((c) => existingNames.has(c.name.toLowerCase())).length

      const rows = parsed.map((c) => ({
        organization_id: organizationId,
        name: c.name.trim(),
        type: 'person' as ContactType,
        linkedin_url: null,
        linkedin_urn: null,
        created_by: user?.id ?? null,
      }))

      // Upsert : ignore les doublons sur (organization_id, name)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('contacts')
        .upsert(rows, { onConflict: 'organization_id,name', ignoreDuplicates: true })
      if (error) throw error

      return { imported: parsed.length, skipped, total: parsed.length }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts', organizationId] }),
  })

  // Set des noms en minuscules pour la détection rapide de doublons côté UI
  const existingNameSet = new Set(contacts.map((c) => c.name.toLowerCase()))

  return { contacts, isLoading, createContact, deleteContact, bulkImportContacts, existingNameSet }
}
