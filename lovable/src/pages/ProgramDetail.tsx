// PostPilot — Page détail d'un programme de communication

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pause, Play, Trash2, X, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/hooks/useOrganization'
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

  // Draft state for inline editing
  const [draftTitle, setDraftTitle] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftStartDate, setDraftStartDate] = useState('')
  const [draftEndDate, setDraftEndDate] = useState('')
  const [draftPostsPerWeek, setDraftPostsPerWeek] = useState(2)

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

  // Sync draft state when program loads
  useEffect(() => {
    if (program) {
      setDraftTitle(program.title)
      setDraftDescription(program.description ?? '')
      setDraftStartDate(program.start_date)
      setDraftEndDate(program.end_date)
      setDraftPostsPerWeek(program.posts_per_week)
    }
  }, [program])

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

  const updateProgram = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('programs')
        .update({
          title: draftTitle.trim(),
          description: draftDescription.trim() || null,
          start_date: draftStartDate,
          end_date: draftEndDate,
          posts_per_week: draftPostsPerWeek,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Paramètres sauvegardés')
      queryClient.invalidateQueries({ queryKey: ['program', id] })
      queryClient.invalidateQueries({ queryKey: ['programs', organizationId] })
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
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

  const hasChanges =
    draftTitle.trim() !== program.title ||
    (draftDescription.trim() || null) !== (program.description ?? null) ||
    draftStartDate !== program.start_date ||
    draftEndDate !== program.end_date ||
    draftPostsPerWeek !== program.posts_per_week

  return (
    <div className="space-y-5">
      {/* Navigation */}
      <button
        onClick={() => navigate('/programmes')}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Programmes
      </button>

      {/* Paramètres du programme */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        {/* Statut + progression */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[program.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {STATUS_LABEL[program.status] ?? program.status}
            </span>
            {totalCount > 0 && (
              <span className="text-xs text-gray-400">{publishedCount}/{totalCount} publiés</span>
            )}
          </div>
          {totalCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-28">
                <div
                  className="h-full bg-gradient-to-r from-[#0077B5] to-[#7C3AED] rounded-full transition-all"
                  style={{ width: `${Math.round((publishedCount / totalCount) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-gray-500">
                {Math.round((publishedCount / totalCount) * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Titre */}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Titre de la campagne</Label>
          <Input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Nom de la campagne"
            className="text-base font-semibold border-gray-200 focus:border-[#0077B5] focus:ring-[#0077B5]/20"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
            Description <span className="font-normal normal-case">(optionnelle)</span>
          </Label>
          <Textarea
            value={draftDescription}
            onChange={(e) => setDraftDescription(e.target.value)}
            placeholder="Objectif, contexte, public cible de cette campagne…"
            rows={2}
            className="resize-none text-sm border-gray-200"
          />
        </div>

        {/* Dates + fréquence */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Début</Label>
            <Input
              type="date"
              value={draftStartDate}
              onChange={(e) => setDraftStartDate(e.target.value)}
              className="text-sm border-gray-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Fin</Label>
            <Input
              type="date"
              value={draftEndDate}
              min={draftStartDate}
              onChange={(e) => setDraftEndDate(e.target.value)}
              className="text-sm border-gray-200"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Posts / sem.</Label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDraftPostsPerWeek((v) => Math.max(1, v - 1))}
                className="w-8 h-9 rounded-l-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 flex items-center justify-center text-base font-medium"
              >
                −
              </button>
              <div className="flex-1 h-9 border-y border-gray-200 bg-white flex items-center justify-center text-sm font-bold text-gray-900">
                {draftPostsPerWeek}
              </div>
              <button
                type="button"
                onClick={() => setDraftPostsPerWeek((v) => Math.min(7, v + 1))}
                className="w-8 h-9 rounded-r-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 flex items-center justify-center text-base font-medium"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Bouton save */}
        {hasChanges && (
          <div className="flex justify-end pt-1 border-t border-gray-50">
            <Button
              size="sm"
              onClick={() => updateProgram.mutate()}
              disabled={updateProgram.isPending || !draftTitle.trim()}
              className="bg-gradient-to-r from-[#0077B5] to-[#005885] text-white"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {updateProgram.isPending ? 'Sauvegarde…' : 'Sauvegarder les modifications'}
            </Button>
          </div>
        )}
      </div>

      {/* Timeline */}
      <ProgramTimeline posts={posts} organizationId={organizationId ?? ''} />

      {/* Actions danger zone */}
      <div className="flex gap-3 pt-2 border-t border-gray-100 flex-wrap">
        {program.status === 'active' ? (
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg border-gray-200"
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
            className="rounded-lg border-gray-200"
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
            className="text-red-500 border-red-100 hover:bg-red-50 rounded-lg"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-red-100 bg-red-50">
            <span className="text-xs text-red-600 font-medium">Confirmer la suppression ?</span>
            <Button
              size="sm"
              className="h-6 px-2.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg"
              onClick={() => deleteProgram.mutate()}
              disabled={deleteProgram.isPending}
            >
              Supprimer
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
