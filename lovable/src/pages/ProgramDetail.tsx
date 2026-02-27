// PostPilot — Page détail d'un programme de communication

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pause, Play, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import { formatDate } from '@/lib/utils'
import ProgramTimeline from '@/components/programs/ProgramTimeline'
import type { Program, Post, ProgramStatus } from '@/types/database'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  active: 'Actif',
  paused: 'En pause',
  completed: 'Terminé',
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
}

export default function ProgramDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { organizationId } = useOrganization()
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: ['program', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Program
    },
    enabled: !!id,
  })

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['posts', 'program', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('program_id', id!)
        .is('deleted_at', null)
        .order('scheduled_at', { ascending: true })
      if (error) throw error
      return data as Post[]
    },
    enabled: !!id,
  })

  const updateStatus = useMutation({
    mutationFn: async (status: ProgramStatus) => {
      const { error } = await supabase
        .from('programs')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id!)
      if (error) throw error
    },
    onSuccess: (_, status) => {
      toast.success(status === 'paused' ? 'Programme mis en pause' : 'Programme réactivé')
      queryClient.invalidateQueries({ queryKey: ['program', id] })
      queryClient.invalidateQueries({ queryKey: ['programs', organizationId] })
    },
  })

  const deleteProgram = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('programs')
        .update({ status: 'completed' })
        .eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Programme supprimé')
      navigate('/programmes')
    },
  })

  const isLoading = programLoading || postsLoading

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!program) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p>Programme introuvable.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/programmes')}>
          Retour aux programmes
        </Button>
      </div>
    )
  }

  const publishedCount = posts.filter((p) => p.status === 'published').length
  const totalCount = posts.length

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 mb-3 -ml-2"
          onClick={() => navigate('/programmes')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Programmes
        </Button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{program.title}</h1>
              <Badge className={STATUS_COLOR[program.status] ?? 'bg-gray-100'}>
                {STATUS_LABEL[program.status] ?? program.status}
              </Badge>
            </div>
            {program.description && (
              <p className="text-sm text-gray-500 mt-1">{program.description}</p>
            )}
            <p className="text-sm text-gray-400 mt-2">
              {formatDate(program.start_date)} → {formatDate(program.end_date)} ·{' '}
              {program.posts_per_week} posts/semaine
            </p>
          </div>

          {totalCount > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{publishedCount}/{totalCount}</p>
              <p className="text-xs text-gray-400">posts publiés</p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1.5 w-24 ml-auto">
                <div
                  className="h-full bg-[#0077B5] rounded-full"
                  style={{ width: `${totalCount > 0 ? Math.round((publishedCount / totalCount) * 100) : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <ProgramTimeline posts={posts} organizationId={organizationId ?? ''} />

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t flex-wrap">
        {program.status === 'active' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateStatus.mutate('paused')}
            disabled={updateStatus.isPending}
          >
            <Pause className="h-4 w-4 mr-2" />
            Mettre en pause
          </Button>
        ) : program.status === 'paused' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateStatus.mutate('active')}
            disabled={updateStatus.isPending}
          >
            <Play className="h-4 w-4 mr-2" />
            Réactiver
          </Button>
        ) : null}

        {!confirmDelete ? (
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50">
            <span className="text-xs text-red-700">Confirmer la suppression ?</span>
            <Button
              size="sm"
              className="h-6 px-2 text-xs bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteProgram.mutate()}
              disabled={deleteProgram.isPending}
            >
              Oui, supprimer
            </Button>
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={() => setConfirmDelete(false)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
