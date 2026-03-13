// PostPilot — Boîte à idées
// Liste des idées de posts sauvegardées depuis le chat IA ou créées manuellement.

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import { Lightbulb, PenLine, Trash2, Plus, X, Check } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

type Idea = {
  id: string
  title: string
  description: string | null
  created_at: string
  status: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function Ideas() {
  const navigate = useNavigate()
  const { organizationId } = useOrganization()
  const queryClient = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    if (!newTitle.trim()) {
      titleRef.current?.focus()
      return
    }
    setSaving(true)
    const { error } = await db
      .from('ideas')
      .insert({
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

  const handleCancelForm = () => {
    setShowForm(false)
    setNewTitle('')
    setNewDescription('')
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

  const handleWrite = (idea: Idea) => {
    navigate('/posts/new', {
      state: { ideaTitle: idea.title, ideaDescription: idea.description },
    })
  }

  return (
    <div className="space-y-5">
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
            <button onClick={handleCancelForm} className="text-gray-400 hover:text-gray-600">
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
              onClick={handleCancelForm}
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
            <span className="text-gray-300">|</span>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-[13px] text-[#2563EB] font-semibold hover:underline"
            >
              Aller au tableau de bord →
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
                  onClick={() => handleWrite(idea)}
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
