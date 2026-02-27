// PostPilot — Contenu de l'éditeur de post (réutilisable : page + accordéon inline)

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2, Save, CheckCircle2, Linkedin,
  PenLine, Link, FileText, Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'
import { generatePost, revisePost } from '@/lib/api'
import { useOrganization } from '@/hooks/useOrganization'
import { POST_STATUSES, LINKEDIN_POST_MAX_LENGTH } from '@/lib/constants'
import { cn } from '@/lib/utils'
import SourceFreeWriting from '@/components/editor/SourceFreeWriting'
import SourceURL from '@/components/editor/SourceURL'
import SourceDocument from '@/components/editor/SourceDocument'
import SourceBrainstorm from '@/components/editor/SourceBrainstorm'
import AIExchangePanel, { type ExchangeMessage } from '@/components/editor/AIExchangePanel'
import BrandProfileSidebar from '@/components/editor/BrandProfileSidebar'
import MentionPicker from '@/components/editor/MentionPicker'
import type { Post, PostStatus, SourceType, PostVersion } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

type SourceMode = 'free_writing' | 'url' | 'document' | 'brainstorm'

const SOURCE_MODES: { value: SourceMode; label: string; icon: React.ElementType }[] = [
  { value: 'free_writing', label: 'Rédaction libre', icon: PenLine },
  { value: 'url', label: 'URL / Article', icon: Link },
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'brainstorm', label: 'Brainstorming IA', icon: Sparkles },
]

function toSourceMode(s: SourceType | null | undefined): SourceMode {
  if (s === 'url') return 'url'
  if (s === 'document') return 'document'
  return 'free_writing'
}

// ─── Preview LinkedIn (exporté pour réutilisation) ───────────────────────────

/** Render post content with @[Name] mentions highlighted as LinkedIn-style blue links */
function renderContentWithMentions(content: string): React.ReactNode {
  if (!content) return <span className="text-gray-400 italic">Votre post apparaîtra ici…</span>
  const parts = content.split(/(@\[[^\]]+\])/g)
  return parts.map((part, i) => {
    const match = part.match(/^@\[([^\]]+)\]$/)
    if (match) {
      return (
        <span key={i} className="text-[#0077B5] font-medium cursor-pointer hover:underline">
          @{match[1]}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export function LinkedInPreview({ content, userName }: { content: string; userName: string }) {
  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-10 w-10 rounded-full bg-[#0077B5] flex items-center justify-center">
          <span className="text-white text-sm font-semibold">
            {userName.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{userName}</p>
          <p className="text-xs text-gray-500">maintenant · 🌐</p>
        </div>
      </div>
      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
        {renderContentWithMentions(content)}
      </p>
      <Separator className="my-3" />
      <div className="flex gap-4 text-xs text-gray-500">
        <span>👍 J'aime</span><span>💬 Commenter</span>
        <span>🔁 Republier</span><span>📤 Envoyer</span>
      </div>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PostEditorContentProps {
  /** ID du post à éditer. Undefined = création d'un nouveau post. */
  postId?: string
  /** Appelé après création d'un nouveau post, avec son ID. */
  onNewPostCreated?: (id: string) => void
  /** Appelé après sauvegarde (brouillon ou validation). Utile pour fermer l'accordéon. */
  onSaved?: () => void
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function PostEditorContent({ postId, onNewPostCreated, onSaved }: PostEditorContentProps) {
  const queryClient = useQueryClient()
  const { organizationId } = useOrganization()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [sourceMode, setSourceMode] = useState<SourceMode>('free_writing')
  const [scheduledAt, setScheduledAt] = useState('')
  const [publicationTime, setPublicationTime] = useState('09:00')
  const [aiMessages, setAiMessages] = useState<ExchangeMessage[]>([])
  const [aiLoading, setAiLoading] = useState(false)

  // Prevent DB refetches from overwriting user-set mode or AI-generated content
  const sourceModeExplicit = useRef(false)
  const contentFromAI = useRef(false)
  // Ref sur le textarea de rédaction libre (pour insertion de mentions à la position du curseur)
  const freeWritingTextareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Chargement du post ──────────────────────────────────────────────────────

  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId!)
        .single()
      if (error) throw error
      return data as Post
    },
    enabled: !!postId,
  })

  const { data: versions = [] } = useQuery({
    queryKey: ['post_versions', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_versions')
        .select('*')
        .eq('post_id', postId!)
        .order('version_number', { ascending: false })
      if (error) throw error
      return data as PostVersion[]
    },
    enabled: !!postId,
  })

  // Sync form ← post (initial load only for content/sourceMode)
  useEffect(() => {
    if (post) {
      setTitle(post.title ?? '')
      // Don't overwrite if AI has already generated content or user has typed
      if (!contentFromAI.current) {
        setContent(post.content ?? '')
      }
      // Don't overwrite if user has explicitly chosen a source mode
      if (!sourceModeExplicit.current) {
        setSourceMode(toSourceMode(post.source_type))
      }
      if (post.scheduled_at) setScheduledAt(post.scheduled_at.slice(0, 10))
      if (post.publication_time) setPublicationTime(post.publication_time.slice(0, 5))
    }
  }, [post])

  // ── Sauvegarde ──────────────────────────────────────────────────────────────

  const { mutateAsync: savePost, isPending: saving } = useMutation({
    mutationFn: async (status?: PostStatus) => {
      const modeToSourceType: Record<SourceMode, SourceType> = {
        free_writing: 'manual',
        url: 'url',
        document: 'document',
        brainstorm: 'manual',
      }
      const payload = {
        title: title || null,
        content: content || '',
        source_type: modeToSourceType[sourceMode],
        organization_id: organizationId!,
        platform_type: 'linkedin' as const,
        ...(status ? { status } : {}),
        ...(scheduledAt ? {
          scheduled_at: new Date(`${scheduledAt}T${publicationTime}:00`).toISOString(),
        } : {}),
        publication_time: publicationTime || '09:00',
        updated_at: new Date().toISOString(),
      }

      if (postId) {
        const { error } = await supabase.from('posts').update(payload).eq('id', postId)
        if (error) throw error
        return postId
      } else {
        const { data, error } = await supabase
          .from('posts')
          .insert({ ...payload, status: status ?? 'draft' })
          .select('id')
          .single()
        if (error) throw error
        return (data as { id: string }).id
      }
    },
    onSuccess: (newId) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      if (!postId) onNewPostCreated?.(newId)
    },
    onError: (err) => toast.error((err as Error).message),
  })

  // ── Génération depuis un angle brainstormé ──────────────────────────────────
  // NOTE: on N'utilise PAS savePost ici pour éviter que onNewPostCreated déclenche
  // une navigation en plein milieu de la génération IA (le composant se démonterait
  // et setContent() serait ignoré). On insère directement, puis on navigue à la fin.

  const handleBrainstormTheme = async (themeContent: string) => {
    if (!organizationId) return
    setAiLoading(true)
    try {
      let id = postId

      if (!id) {
        // Créer le post directement — sans déclencher onNewPostCreated
        const { data, error } = await supabase.from('posts').insert({
          title: title || null,
          content: '',
          source_type: 'manual',
          source_content: themeContent,
          organization_id: organizationId,
          platform_type: 'linkedin',
          status: 'draft',
          updated_at: new Date().toISOString(),
        }).select('id').single()
        if (error) throw error
        id = (data as { id: string }).id
      } else {
        await supabase.from('posts').update({
          source_content: themeContent,
          source_type: 'manual',
        }).eq('id', id)
      }

      // Générer le post — on est toujours sur le même composant monté
      const response = await generatePost(id, organizationId)
      contentFromAI.current = true
      setContent(response.content)
      setAiMessages([{ role: 'assistant', content: response.content }])
      toast.success("Post rédigé par l'IA ✨")
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['post_versions', id] })

      // Naviguer APRÈS que tout est affiché (si nouveau post)
      if (!postId) {
        onNewPostCreated?.(id)
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setAiLoading(false)
    }
  }

  // ── Génération IA depuis les modes source ───────────────────────────────────

  const handleGenerateFromSource = async (sourceContent: string, _docMode?: 'synthesis' | 'surprise_me') => {
    if (!organizationId) return
    setAiLoading(true)
    try {
      let id = postId
      if (!id) id = await savePost(undefined)

      await supabase.from('posts').update({
        source_content: sourceContent,
        source_type: sourceMode === 'url' ? 'url' : 'document',
      }).eq('id', id)

      const response = await generatePost(id!, organizationId)
      contentFromAI.current = true
      setContent(response.content)
      setAiMessages([{ role: 'assistant', content: response.content }])
      toast.success("Post généré par l'IA ✨")
      queryClient.invalidateQueries({ queryKey: ['post_versions', id] })
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setAiLoading(false)
    }
  }

  // ── Mode libre : soumettre à l'IA ───────────────────────────────────────────

  const handleFreeWritingSubmit = async () => {
    if (!organizationId || !content.trim()) return
    setAiLoading(true)
    try {
      let id = postId
      if (!id) {
        await supabase.from('posts').upsert({
          title: title || null,
          content,
          organization_id: organizationId,
          platform_type: 'linkedin',
          status: 'draft',
          source_type: 'manual',
        })
        const { data } = await supabase
          .from('posts')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('content', content)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        id = (data as { id: string } | null)?.id ?? id
      } else {
        await supabase.from('posts').update({ content }).eq('id', id)
      }

      if (!id) { toast.error('Erreur : post non trouvé'); return }
      const response = await generatePost(id, organizationId)
      setAiMessages([{ role: 'assistant', content: response.content }])
      toast.success("L'IA a optimisé votre post ✨")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setAiLoading(false)
    }
  }

  // ── Révision conversationnelle ──────────────────────────────────────────────

  const handleRevision = async (instruction: string) => {
    if (!organizationId) return
    setAiLoading(true)
    setAiMessages((prev) => [...prev, { role: 'user', content: instruction }])
    try {
      // Auto-sauvegarder si le post n'existe pas encore en base
      let id = postId
      if (!id) {
        id = await savePost(undefined)
      } else {
        // Persister le contenu en cours avant la révision
        await supabase.from('posts').update({ content }).eq('id', id)
      }
      const response = await revisePost(id, instruction, 'full')
      contentFromAI.current = true
      setContent(response.content)
      setAiMessages((prev) => [...prev, { role: 'assistant', content: response.content }])
      toast.success('Post révisé ✨')
      queryClient.invalidateQueries({ queryKey: ['post_versions', id] })
    } catch (err) {
      toast.error((err as Error).message)
      setAiMessages((prev) => [...prev, {
        role: 'assistant',
        content: "Désolé, je n'ai pas pu réviser le post. Réessayez.",
      }])
    } finally {
      setAiLoading(false)
    }
  }

  // ── Valider → approved ──────────────────────────────────────────────────────

  const handleValidate = async () => {
    if (!content.trim()) { toast.error('Le post est vide'); return }
    await savePost('approved')
    toast.success("Post validé — il sera publié à l'heure prévue ✅")
    onSaved?.()
  }

  // ── Sauvegarder brouillon ───────────────────────────────────────────────────

  const handleDraft = async () => {
    await savePost('draft')
    toast.success('Brouillon sauvegardé')
    onSaved?.()
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const charCount = content.length
  const isOverLimit = charCount > LINKEDIN_POST_MAX_LENGTH
  const statusMeta = post ? POST_STATUSES[post.status] : null

  if (postLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 border-t border-gray-100">
      {/* ── Barre d'actions haut ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {statusMeta && (
            <Badge className={statusMeta.color}>{statusMeta.label}</Badge>
          )}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre interne (optionnel)"
            className="w-56 text-sm bg-white"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDraft}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Brouillon
          </Button>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={handleValidate}
            disabled={saving || isOverLimit || !content.trim()}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Valider
          </Button>
        </div>
      </div>

      {/* ── Zone principale : éditeur + sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Colonne gauche — source + échange IA (2/3) */}
        <div className="lg:col-span-2 space-y-4">

          {/* Sélecteur de mode source + bouton Mentionner */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 p-1 bg-gray-200 rounded-lg">
              {SOURCE_MODES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { sourceModeExplicit.current = true; setSourceMode(value) }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    sourceMode === value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
            {/* Bouton Mentionner — insérer @[Nom] dans le contenu */}
            <MentionPicker
              textareaRef={freeWritingTextareaRef}
              onInsert={(mention) => {
                const sep = content && !content.endsWith(' ') && !content.endsWith('\n') ? ' ' : ''
                setContent(content + sep + mention + ' ')
              }}
            />
          </div>

          {/* Contenu du mode source */}
          <Card>
            <CardContent className="pt-4">
              {sourceMode === 'free_writing' && (
                <SourceFreeWriting
                  content={content}
                  onChange={setContent}
                  onSubmitToAI={handleFreeWritingSubmit}
                  loading={aiLoading}
                  textareaRef={freeWritingTextareaRef}
                />
              )}
              {sourceMode === 'url' && (
                <SourceURL
                  initialUrl={post?.source_url ?? ''}
                  onGenerate={(_url, scraped) => handleGenerateFromSource(scraped)}
                  loading={aiLoading}
                />
              )}
              {sourceMode === 'document' && (
                <SourceDocument
                  onGenerate={(text, mode) => handleGenerateFromSource(text, mode)}
                  loading={aiLoading}
                />
              )}
              {sourceMode === 'brainstorm' && (
                <SourceBrainstorm
                  onThemeSelected={handleBrainstormTheme}
                  loading={aiLoading}
                />
              )}
            </CardContent>
          </Card>

          {/* Zone d'échange IA — visible dès qu'il y a un post à réviser */}
          {(content.trim() || aiLoading) && (
            <Card>
              <CardContent className="pt-4">
                <AIExchangePanel
                  messages={aiMessages}
                  onSendRevision={handleRevision}
                  loading={aiLoading}
                />
              </CardContent>
            </Card>
          )}

          {/* Preview LinkedIn */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Linkedin className="h-4 w-4 text-[#0077B5]" />
              <Label className="text-sm font-medium text-gray-700">Aperçu LinkedIn</Label>
              <span className={cn(
                'ml-auto text-xs',
                isOverLimit ? 'text-red-500 font-medium' : 'text-gray-400',
              )}>
                {charCount} / {LINKEDIN_POST_MAX_LENGTH}
              </span>
            </div>
            <LinkedInPreview content={content} userName="Votre nom" />
          </div>

          {/* Historique des versions */}
          {versions.length > 0 && (
            <Card>
              <CardContent className="pt-4 space-y-2">
                <p className="text-sm font-medium text-gray-700 mb-2">Historique des versions</p>
                {versions.map((v) => (
                  <button
                    key={v.id}
                    className="w-full text-left p-2 rounded-lg border hover:bg-gray-50 transition-colors"
                    onClick={() => setContent(v.content)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700">Version {v.version_number}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(v.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    {v.feedback && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 italic">"{v.feedback}"</p>
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Colonne droite — profil de marque + publication (1/3) */}
        <div>
          <Card>
            <CardContent className="pt-4">
              {organizationId && (
                <BrandProfileSidebar
                  organizationId={organizationId}
                  scheduledAt={scheduledAt}
                  publicationTime={publicationTime}
                  onScheduledAtChange={setScheduledAt}
                  onPublicationTimeChange={setPublicationTime}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
