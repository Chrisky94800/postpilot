// PostPilot — IdeaExtractCard
// Carte affichée dans le chat pour chaque idée générée par l'IA.
// Actions : sauvegarder dans la boîte à idées OU rédiger ce post.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lightbulb, BookmarkPlus, PenLine, Check } from 'lucide-react'
import { toast } from 'sonner'
import { saveIdea } from '@/lib/api'

interface IdeaExtractCardProps {
  idea: { title: string; description: string }
  organizationId: string
  /** Affiche le bouton "Autres idées" sous cette carte (à mettre sur la dernière) */
  isLast?: boolean
  onRequestMore?: () => void
}

export default function IdeaExtractCard({ idea, organizationId, isLast, onRequestMore }: IdeaExtractCardProps) {
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveIdea(organizationId, idea.title, idea.description)
      setSaved(true)
      toast.success('Idée sauvegardée dans la boîte à idées !')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleWrite = () => {
    navigate('/posts/new', {
      state: { ideaTitle: idea.title, ideaDescription: idea.description },
    })
  }

  return (
    <div className="space-y-1.5">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
        {/* Header */}
        <div className="flex items-start gap-2">
          <div className="h-6 w-6 bg-amber-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-gray-900 leading-snug">{idea.title}</p>
            <p className="text-[12px] text-gray-500 mt-0.5 leading-snug">{idea.description}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saved || saving}
            className={`
              flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold
              border transition-all
              ${saved
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default'
                : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-100'
              }
            `}
          >
            {saved ? (
              <><Check className="h-3.5 w-3.5" /> Sauvegardée</>
            ) : (
              <><BookmarkPlus className="h-3.5 w-3.5" /> Sauvegarder</>
            )}
          </button>
          <button
            onClick={handleWrite}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold bg-[#0077B5] text-white hover:bg-[#005885] transition-colors"
          >
            <PenLine className="h-3.5 w-3.5" />
            Rédiger ce post
          </button>
        </div>
      </div>

      {/* Footer "autres idées" — sur la dernière carte seulement */}
      {isLast && onRequestMore && (
        <button
          onClick={onRequestMore}
          className="w-full px-3 py-2 rounded-lg text-[12px] font-medium border border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors"
        >
          Proposer d'autres idées sur ce thème
        </button>
      )}
    </div>
  )
}
