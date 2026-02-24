// PostPilot — Page liste des programmes de communication

import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Layers, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import { formatDate } from '@/lib/utils'
import type { Program, Post } from '@/types/database'

const PROGRAM_STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  active: 'Actif',
  paused: 'En pause',
  completed: 'Terminé',
}

const PROGRAM_STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
}

function ProgramRow({ program, posts }: { program: Program; posts: Post[] }) {
  const navigate = useNavigate()
  const total = posts.length
  const published = posts.filter((p) => p.status === 'published').length
  const progress = total > 0 ? Math.round((published / total) * 100) : 0

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/programmes/${program.id}`)}
    >
      <CardContent className="py-4 px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900">{program.title}</p>
              <Badge className={PROGRAM_STATUS_COLOR[program.status] ?? 'bg-gray-100'}>
                {PROGRAM_STATUS_LABEL[program.status] ?? program.status}
              </Badge>
            </div>
            {program.description && (
              <p className="text-sm text-gray-500 mt-1 truncate">{program.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              {formatDate(program.start_date)} → {formatDate(program.end_date)} ·{' '}
              {program.posts_per_week} posts/sem
            </p>
          </div>

          {total > 0 ? (
            <div className="text-right shrink-0 min-w-[80px]">
              <p className="text-sm font-semibold text-gray-900">{published}/{total}</p>
              <p className="text-xs text-gray-400">publiés</p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1.5 w-20">
                <div
                  className="h-full bg-[#0077B5] rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <ArrowRight className="h-4 w-4 text-gray-300 mt-1 shrink-0" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function Programs() {
  const navigate = useNavigate()
  const { organizationId } = useOrganization()

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['programs', organizationId, 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('organization_id', organizationId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Program[]
    },
    enabled: !!organizationId,
  })

  const { data: posts = [] } = useQuery({
    queryKey: ['posts', organizationId, 'programs-all'],
    queryFn: async () => {
      if (programs.length === 0) return []
      const ids = programs.map((p) => p.id)
      const { data, error } = await supabase
        .from('posts')
        .select('id, program_id, status')
        .in('program_id', ids)
        .is('deleted_at', null)
      if (error) throw error
      return data as Post[]
    },
    enabled: programs.length > 0,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-gray-600" />
            Programmes de communication
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Vos campagnes LinkedIn planifiées
          </p>
        </div>
        <Button
          className="bg-[#0077B5] hover:bg-[#005885]"
          onClick={() => navigate('/dashboard')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau programme
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Layers className="h-12 w-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium">Aucun programme pour l'instant</p>
          <p className="text-sm mt-1">
            Utilisez l'assistant de communication sur le tableau de bord pour créer votre
            premier programme.
          </p>
          <Button
            className="mt-6 bg-[#0077B5] hover:bg-[#005885]"
            onClick={() => navigate('/dashboard')}
          >
            Aller au tableau de bord
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {programs.map((program) => (
            <ProgramRow
              key={program.id}
              program={program}
              posts={posts.filter((p) => p.program_id === program.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
