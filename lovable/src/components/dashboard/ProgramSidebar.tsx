// PostPilot — Panneau "Mes Programmes" (sidebar du dashboard)

import { useNavigate } from 'react-router-dom'
import { Plus, Layers } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import ProgramCard from './ProgramCard'
import type { Program, Post } from '@/types/database'

export default function ProgramSidebar({ organizationId }: { organizationId: string }) {
  const navigate = useNavigate()

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['programs', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['active', 'draft', 'paused'])
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data as Program[]
    },
    enabled: !!organizationId,
  })

  const { data: posts = [] } = useQuery({
    queryKey: ['posts', organizationId, 'for-programs'],
    queryFn: async () => {
      if (programs.length === 0) return []
      const ids = programs.map((p) => p.id)
      const { data, error } = await supabase
        .from('posts')
        .select('id, program_id, status')
        .in('program_id', ids)
        .is('deleted_at', null)
      if (error) throw error
      return data as Pick<Post, 'id' | 'program_id' | 'status'>[]
    },
    enabled: programs.length > 0,
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-gray-500" />
          Mes programmes
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-blue-600 h-auto p-0"
          onClick={() => navigate('/programmes')}
        >
          Voir tout →
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center py-4 text-gray-400">
          <p className="text-xs">Aucun programme actif</p>
          <p className="text-xs mt-0.5">Demandez à l'assistant de créer votre premier programme</p>
        </div>
      ) : (
        <div className="space-y-2">
          {programs.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              posts={posts.filter((p) => p.program_id === program.id) as Post[]}
            />
          ))}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={() => navigate('/programmes')}
      >
        <Plus className="h-3 w-3 mr-1" />
        Nouveau programme
      </Button>
    </div>
  )
}
