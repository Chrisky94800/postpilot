// PostPilot — Boîte à idées
// Liste des idées de posts sauvegardées depuis le chat IA ou créées manuellement.

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import { Lightbulb, PenLine, Trash2, Plus, X, Check, Loader2, FileText, FolderOpen } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

type Idea = {
  id: string
  title: string
  description: string | null
  created_at: string
  status: string
}

type Program = {
  id: string
  title: string
  status: string
}

type Post = {
  id: string
  title: string | null
  status: string
  scheduled_at: string | null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ─── Modal choix destination ─────────────────────────────────────────────────

function WriteModal({
  idea,
  organizationId,
  onClose,
  onDone,
}: {
  idea: Idea
  organizationId: string
  onClose: () => void
  onDone: () => void
}) {
  const navigate = useNavigate()
  const db = supabase as any

  const [mode, setMode] = useState<'choose' | 'program'>('choose')
  const [selectedProgramId, setSelectedProgramId] = useState<string>('')
  const [selectedPostId, setSelectedPostId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const { data: programs = [], isLoading: programsLoading } = useQuery({
    queryKey: ['programs-active', organizationId],
    queryFn: async () => {
      const { data, error } = await db
        .from('programs')
        .select('id, title, status')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Program[]
    },
  })

  const { data: programPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['program-posts-available', selectedProgramId],
    queryFn: async () => {
      const { data, error } = await db
        .from('posts')
        .select('id, title, status, scheduled_at')
        .eq('program_id', selectedProgramId)
        .in('status', ['waiting', 'draft'])
        .is('deleted_at', null)
        .order('scheduled_at', { ascending: true })
      if (error) throw error
      return data as Post[]
    },
    enabled: !!selectedProgramId,
  })

  // ── Créer un post standalone ──────────────────────────────────────────────
  const handleStandalone = async () => {
    setSubmitting(true)
    try {
      // Créer le post en brouillon
      const { data: postData, error: postErr } = await db
        .from('posts')
        .insert({
          organization_id: organizationId,
          title: idea.title,
          content: idea.description || '',
          source_type: 'manual',
          platform_type: 'linkedin',
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (postErr) throw postErr

      // Soft delete l'idée
      await db.from('ideas').update({ deleted_at: new Date().toISOString() }).eq('id', idea.id)

      onDone()
      toast.success('Post créé en brouillon')
      navigate(`/posts/${postData.id}`)
    } catch (err) {
      toast.error((err as Error).message)
      setSubmitting(false)
    }
  }

  // ── Associer à un post de programme ──────────────────────────────────────
  const handleAssignToProgram = async () => {
    if (!selectedPostId) return
    setSubmitting(true)
    try {
      // Pré-remplir le post existant avec le contenu de l'idée + passer en draft
      const { error: updateErr } = await db
        .from('posts')
        .update({
          title: idea.title,
          content: idea.description || '',
          source_type: 'manual',
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedPostId)
      if (updateErr) throw updateErr

      // Soft delete l'idée
      await db.from('ideas').update({ deleted_at: new Date().toISOString() }).eq('id', idea.id)

      onDone()
      toast.success('Idée associée au post — brouillon créé')
      navigate(`/posts/${selectedPostId}`)
    } catch (err) {
      toast.error((err as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-bold text-gray-900">Rédiger depuis cette idée</p>
            <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2">« {idea.title} »</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        {mode === 'choose' && (
          <div className="space-y-3">
            {/* Option 1 : post standalone */}
            <button
              onClick={handleStandalone}
              disabled={submitting}
              className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-[#0077B5] hover:bg-blue-50 transition-colors text-left group"
            >
              <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-[#0077B5] transition-colors">
                <FileText className="h-4 w-4 text-[#0077B5] group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-900">Post hors programme</p>
                <p className="text-[12px] text-gray-500 mt-0.5">Crée un brouillon indépendant, non rattaché à un programme</p>
              </div>
              {submitting && <Loader2 className="h-4 w-4 animate-spin text-gray-400 ml-auto shrink-0 mt-1" />}
            </button>

            {/* Option 2 : associer à un programme */}
            <button
              onClick={() => setMode('program')}
              disabled={submitting || programsLoading || programs.length === 0}
              className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-[#0077B5] hover:bg-blue-50 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 group-hover:bg-purple-600 transition-colors">
                <FolderOpen className="h-4 w-4 text-purple-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-900">Associer à un programme</p>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  {programsLoading ? 'Chargement…' : programs.length === 0
                    ? 'Aucun programme actif'
                    : `${programs.length} programme${programs.length > 1 ? 's' : ''} actif${programs.length > 1 ? 's' : ''}`}
                </p>
              </div>
            </button>
          </div>
        )}

        {mode === 'program' && (
          <div className="space-y-4">
            {/* Sélecteur programme */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-gray-700">Programme</label>
              <select
                value={selectedProgramId}
                onChange={(e) => { setSelectedProgramId(e.target.value); setSelectedPostId('') }}
                className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
              >
                <option value="">— Choisir un programme —</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            {/* Sélecteur post */}
            {selectedProgramId && (
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-gray-700">Post à utiliser</label>
                {postsLoading ? (
                  <div className="flex items-center gap-2 text-[12px] text-gray-400 py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement des posts…
                  </div>
                ) : programPosts.length === 0 ? (
                  <p className="text-[12px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                    Aucun post disponible dans ce programme (tous sont déjà rédigés ou publiés).
                  </p>
                ) : (
                  <select
                    value={selectedPostId}
                    onChange={(e) => setSelectedPostId(e.target.value)}
                    className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                  >
                    <option value="">— Choisir un post —</option>
                    {programPosts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title || 'Post sans titre'}
                        {p.scheduled_at ? ` — ${formatDate(p.scheduled_at)}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => { setMode('choose'); setSelectedProgramId(''); setSelectedPostId('') }}
                className="px-4 py-2 rounded-lg text-[12px] font-medium text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Retour
              </button>
              <button
                onClick={handleAssignToProgram}
                disabled={!selectedPostId || submitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold bg-[#0077B5] text-white hover:bg-[#005885] disabled:opacity-50 transition-colors"
              >
                {submitting
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Association…</>
                  : <><Check className="h-3.5 w-3.5" /> Associer et rédiger</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Ideas() {
  const { organizationId } = useOrganization()
  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [writeIdea, setWriteIdea] = useState<Idea | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  const db = supabase as any

  useEffect(() => {
    if (showForm) titleRef.current?.focus()
  }, [showForm])

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ['ideas', organizationId],
    queryFn: async () => {
      const { data, error } = await db
        .from('ideas')
        .select('id, title, description, created_at, status')
        .eq('organization_id', organizationId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Idea[]
    },
    enabled: !!organizationId,
  })

  const handleCreate = async () => {
    if (!newTitle.trim()) { titleRef.current?.focus(); return }
    setSaving(true)
    const { error } = await db.from('ideas').insert({
      organization_id: organizationId,
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      source: 'manual',
    })
    setSaving(false)
    if (error) {
      toast.error('Erreur lors de la création')
    } else {
      toast.success('Idée ajoutée !')
      setNewTitle('')
      setNewDescription('')
      setShowForm(false)
      queryClient.invalidateQueries({ queryKey: ['ideas', organizationId] })
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await db
      .from('ideas')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast.error('Erreur lors de la suppression')
    } else {
      toast.success('Idée supprimée')
      queryClient.invalidateQueries({ queryKey: ['ideas', organizationId] })
    }
  }

  const handleWriteDone = () => {
    setWriteIdea(null)
    queryClient.invalidateQueries({ queryKey: ['ideas', organizationId] })
  }

  return (
    <div className="space-y-5">

      {/* Modal */}
      {writeIdea && organizationId && (
        <WriteModal
          idea={writeIdea}
          organizationId={organizationId}
          onClose={() => setWriteIdea(null)}
          onDone={handleWriteDone}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-gray-900">Boîte à idées</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            Idées de posts générées par l'IA ou ajoutées manuellement
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nouvelle idée
          </button>
        )}
      </div>

      {/* Formulaire de création inline */}
      {showForm && (
        <div className="bg-white border border-blue-200 rounded-2xl px-5 py-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[13px] font-semibold text-gray-900">Nouvelle idée</p>
            <button onClick={() => { setShowForm(false); setNewTitle(''); setNewDescription('') }} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            ref={titleRef}
            type="text"
            placeholder="Titre de l'idée *"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder-gray-400"
          />
          <textarea
            placeholder="Description / angle éditorial (optionnel)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={2}
            className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder-gray-400 resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowForm(false); setNewTitle(''); setNewDescription('') }}
              className="px-4 py-2 rounded-lg text-[12px] font-medium text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !newTitle.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold bg-[#2563EB] text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              {saving ? 'Enregistrement…' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : ideas.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl px-6 py-12 text-center shadow-sm">
          <div className="h-12 w-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="h-6 w-6 text-amber-500" />
          </div>
          <p className="text-[15px] font-semibold text-gray-900 mb-1">Aucune idée pour l'instant</p>
          <p className="text-[13px] text-gray-400 mb-4">
            Ajoutez une idée manuellement ou demandez à votre assistant depuis le tableau de bord.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setShowForm(true)}
              className="text-[13px] text-[#2563EB] font-semibold hover:underline"
            >
              + Ajouter une idée
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className="bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm flex items-start gap-4"
            >
              <div className="h-9 w-9 bg-amber-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <Lightbulb className="h-4 w-4 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-gray-900 leading-snug">{idea.title}</p>
                {idea.description && (
                  <p className="text-[12px] text-gray-500 mt-0.5 leading-snug">{idea.description}</p>
                )}
                <p className="text-[11px] text-gray-400 mt-1.5">{formatDate(idea.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setWriteIdea(idea)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0077B5] text-white text-[12px] font-semibold hover:bg-[#005885] transition-colors"
                >
                  <PenLine className="h-3.5 w-3.5" />
                  Rédiger
                </button>
                <button
                  onClick={() => handleDelete(idea.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
