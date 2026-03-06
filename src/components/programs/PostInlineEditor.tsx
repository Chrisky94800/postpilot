// PostPilot — Éditeur inline d'un post (accordion dans ProgramTimeline)

import { useState } from 'react'
import { Wand2, Loader2, Check, Save, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { generatePost } from '@/lib/api'
import type { Post } from '@/types/database'

interface PostInlineEditorProps {
  post: Post
  organizationId: string
  onSaved: () => void  // Pour rafraîchir la liste après sauvegarde
}

/** Détecte les titres placeholders générés par l'IA */
function isPlaceholderTitle(title: string | null): boolean {
  if (!title) return true
  return /^Post \d+ — Semaine \d+$/i.test(title)
}

export default function PostInlineEditor({ post, organizationId, onSaved }: PostInlineEditorProps) {
  const isWaiting = post.status === 'waiting'
  const hasRealTitle = !isPlaceholderTitle(post.title)

  // Étape : 'theme' (saisie sujet) → 'content' (édition contenu)
  const [step, setStep] = useState<'theme' | 'content'>(
    isWaiting ? 'theme' : 'content'
  )
  const [theme, setTheme] = useState(hasRealTitle ? (post.title ?? '') : '')
  const [content, setContent] = useState(post.content ?? '')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  // ── Générer le post via l'IA ──────────────────────────────────────────────
  const handleGenerate = async () => {
    setGenerating(true)
    try {
      // Mettre à jour le titre avec le sujet saisi avant la génération
      if (theme.trim()) {
        await supabase
          .from('posts')
          .update({ title: theme.trim() })
          .eq('id', post.id)
      }

      const res = await generatePost(post.id, organizationId)
      setContent(res.content)
      setStep('content')
      toast.success('Post généré !')
    } catch {
      toast.error('Erreur lors de la génération. Veuillez réessayer.')
    } finally {
      setGenerating(false)
    }
  }

  // ── Sauvegarder brouillon ─────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      await supabase
        .from('posts')
        .update({ content, status: 'draft', updated_at: new Date().toISOString() })
        .eq('id', post.id)
      toast.success('Brouillon sauvegardé')
      onSaved()
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  // ── Valider le post ───────────────────────────────────────────────────────
  const handleApprove = async () => {
    setSaving(true)
    try {
      await supabase
        .from('posts')
        .update({ content, status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', post.id)
      toast.success('Post validé !')
      onSaved()
    } catch {
      toast.error('Erreur lors de la validation')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-gray-50 border-t border-gray-100 px-4 py-4 space-y-3">

      {/* ── Étape 1 : Saisie du sujet (posts waiting) ── */}
      {step === 'theme' && (
        <>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">
              Quel est le sujet de ce post ?
            </label>
            <Textarea
              placeholder="Ex : Retour d'expérience sur notre migration cloud, Tendances IA en 2025…"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              rows={2}
              className="resize-none text-sm bg-white"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-400">
              L'IA utilisera votre profil de marque pour rédiger le post.
            </p>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setStep('content')}
                disabled={generating}
              >
                Écrire moi-même
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
              <Button
                size="sm"
                className="text-xs bg-[#0077B5] hover:bg-[#006097]"
                onClick={handleGenerate}
                disabled={generating || !theme.trim()}
              >
                {generating ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Génération…</>
                ) : (
                  <><Wand2 className="h-3.5 w-3.5 mr-1.5" />Générer avec l'IA</>
                )}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ── Étape 2 : Édition du contenu ── */}
      {step === 'content' && (
        <>
          {/* Bouton retour vers sujet si post waiting */}
          {isWaiting && (
            <button
              className="text-xs text-[#0077B5] hover:underline flex items-center gap-1"
              onClick={() => setStep('theme')}
            >
              ← Changer le sujet
            </button>
          )}

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center justify-between">
              <span>Contenu du post</span>
              <span className="text-gray-400 font-normal">{content.length} caractères</span>
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="resize-none text-sm bg-white font-mono leading-relaxed"
              placeholder="Rédigez votre post LinkedIn ici…"
              autoFocus={!isWaiting}
            />
          </div>

          {/* Option de régénérer si on a déjà du contenu */}
          {isWaiting && content && (
            <button
              className="text-xs text-gray-400 hover:text-[#0077B5] flex items-center gap-1"
              onClick={() => { setStep('theme'); setContent('') }}
            >
              <Wand2 className="h-3 w-3" /> Régénérer avec un autre sujet
            </button>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={handleSaveDraft}
              disabled={saving || !content.trim()}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              Brouillon
            </Button>
            <Button
              size="sm"
              className="text-xs bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={saving || !content.trim()}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5 mr-1.5" />
              )}
              Valider le post
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
