// PostPilot — Éditeur de post (réutilisable : page plein écran + inline calendrier)
//
// Flux UX unifié pour les 3 sources :
//   1. Choisir une source (Rédaction libre / URL / Document)
//   2. Donner des instructions à l'IA (optionnel)
//   3. Lancer la rédaction → contenu généré et éditable
//   4. Affiner avec l'IA via le chat de révision
//   5. Enregistrer en brouillon ou Valider

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2, Save, CheckCircle2,
  PenLine, Link, FileText, Sparkles, AtSign, Bold,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { generatePost, revisePost, scrapeUrl } from '@/lib/api'
import { useOrganization } from '@/hooks/useOrganization'
import { POST_STATUSES, LINKEDIN_POST_MAX_LENGTH } from '@/lib/constants'
import { cn } from '@/lib/utils'
import SourceFreeWriting from '@/components/editor/SourceFreeWriting'
import SourceURL from '@/components/editor/SourceURL'
import SourceDocument from '@/components/editor/SourceDocument'
import AIExchangePanel, { type ExchangeMessage } from '@/components/editor/AIExchangePanel'
import BrandProfileSidebar from '@/components/editor/BrandProfileSidebar'
import MediaUploader from '@/components/editor/MediaUploader'
import MentionPicker from '@/components/editor/MentionPicker'
import type { Post, PostStatus, SourceType, PostVersion, PostingAs } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

type SourceMode = 'free_writing' | 'url' | 'document'
type DocMode = 'synthesis' | 'surprise_me'

const SOURCE_MODES: {
  value: SourceMode
  label: string
  icon: React.ElementType
  description: string
}[] = [
  {
    value: 'free_writing',
    label: 'Rédaction libre',
    icon: PenLine,
    description: 'Notez vos idées en vrac. L\'IA les transforme en post LinkedIn percutant.',
  },
  {
    value: 'url',
    label: 'URL / Article',
    icon: Link,
    description: 'Collez une URL. L\'IA extrait l\'essentiel et rédige un post original.',
  },
  {
    value: 'document',
    label: 'Document',
    icon: FileText,
    description: 'Importez un fichier. L\'IA rédige un post à partir de son contenu.',
  },
]

function toSourceMode(s: SourceType | null | undefined): SourceMode {
  if (s === 'url') return 'url'
  if (s === 'document') return 'document'
  return 'free_writing'
}

// ─── Preview LinkedIn (exporté pour réutilisation) ───────────────────────────

// Rend les mentions @[Nom] et le gras **texte** dans la prévisualisation
function renderContent(content: string): React.ReactNode {
  if (!content) return <span className="text-gray-400 italic">Votre post apparaîtra ici…</span>
  // Tokenise : @[Nom] et **gras**
  const parts = content.split(/(@\[[^\]]+\]|\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    const mention = part.match(/^@\[([^\]]+)\]$/)
    if (mention) {
      return (
        <span key={i} className="text-[#0077B5] font-medium cursor-pointer hover:underline">
          @{mention[1]}
        </span>
      )
    }
    const bold = part.match(/^\*\*([^*]+)\*\*$/)
    if (bold) {
      return <strong key={i}>{bold[1]}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

export function LinkedInPreview({
  content,
  userName,
  mediaUrls = [],
  mediaType = 'none',
}: {
  content: string
  userName: string
  mediaUrls?: string[]
  mediaType?: 'image' | 'video' | 'none'
}) {
  return (
    <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="p-4">
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
          {renderContent(content)}
        </p>
      </div>

      {/* Médias joints */}
      {mediaUrls.length > 0 && (
        <div className={cn(
          'grid gap-0.5',
          mediaType === 'image' && mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
        )}>
          {mediaType === 'video' ? (
            <video src={mediaUrls[0]} className="w-full aspect-video object-cover" controls />
          ) : (
            mediaUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Image ${i + 1}`}
                className={cn(
                  'w-full object-cover',
                  mediaUrls.length === 1 ? 'aspect-video' : 'aspect-square',
                )}
              />
            ))
          )}
        </div>
      )}

      <div className="px-4 py-2">
        <Separator className="mb-2" />
        <div className="flex gap-4 text-xs text-gray-500">
          <span>👍 J'aime</span><span>💬 Commenter</span>
          <span>🔁 Republier</span><span>📤 Envoyer</span>
        </div>
      </div>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PostEditorContentProps {
  postId?: string
  onNewPostCreated?: (id: string) => void
  onSaved?: () => void
  /** Titre pré-rempli depuis une idée de la boîte à idées */
  initialTitle?: string
  /** Description de l'idée → pré-remplit le champ rédaction libre */
  initialIdea?: string
  /** URL publique d'un fichier stocké (idée avec document/image) → pré-charge en mode Document */
  initialFileUrl?: string
  initialFileName?: string
  initialFileType?: string
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function PostEditorContent({ postId, onNewPostCreated, onSaved, initialTitle, initialIdea, initialFileUrl, initialFileName, initialFileType }: PostEditorContentProps) {
  const queryClient = useQueryClient()
  const { organizationId } = useOrganization()

  // ── État de l'éditeur ───────────────────────────────────────────────────────

  const [title, setTitle]                   = useState(initialTitle ?? '')
  const [content, setContent]               = useState('')        // post final (éditable)
  const [sourceMode, setSourceMode]         = useState<SourceMode>('free_writing')
  const [freeWritingInput, setFreeWritingInput] = useState(initialIdea ?? '')    // idées brutes (rédaction libre)
  const [url, setUrl]                       = useState('')
  const [file, setFile]                     = useState<File | null>(null)
  const [docMode, setDocMode]               = useState<DocMode>('synthesis')
  const [aiPrompt, setAiPrompt]             = useState('')        // instructions IA (tous modes)
  const [scheduledAt, setScheduledAt]       = useState('')
  const [publicationTime, setPublicationTime] = useState('09:00')
  const [aiMessages, setAiMessages]         = useState<ExchangeMessage[]>([])
  const [aiLoading, setAiLoading]           = useState(false)
  const [mediaUrls, setMediaUrls]           = useState<string[]>([])
  const [mediaType, setMediaType]           = useState<'image' | 'video' | 'none'>('none')
  const [postingAs, setPostingAs]           = useState<PostingAs | null>(null)

  const sourceModeExplicit = useRef(false)
  const contentFromAI      = useRef(false)
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Pré-chargement fichier depuis une idée (URL Storage) ───────────────────
  useEffect(() => {
    if (!initialFileUrl) return
    ;(async () => {
      try {
        const res = await fetch(initialFileUrl)
        const blob = await res.blob()
        const f = new File([blob], initialFileName ?? 'fichier', { type: initialFileType ?? blob.type })
        setFile(f)
        setSourceMode('document')
        sourceModeExplicit.current = true
      } catch {
        // Silencieux — l'utilisateur peut déposer manuellement
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFileUrl])

  // ── Chargement du post ──────────────────────────────────────────────────────

  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts').select('*').eq('id', postId!).single()
      if (error) throw error
      return data as Post
    },
    enabled: !!postId,
  })

  const { data: versions = [] } = useQuery({
    queryKey: ['post_versions', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_versions').select('*').eq('post_id', postId!)
        .order('version_number', { ascending: false })
      if (error) throw error
      return data as PostVersion[]
    },
    enabled: !!postId,
  })

  // Sync form ← post (au chargement initial seulement)
  useEffect(() => {
    if (!post) return
    setTitle(post.title ?? '')
    if (!contentFromAI.current) setContent(post.content ?? '')
    if (!sourceModeExplicit.current) setSourceMode(toSourceMode(post.source_type))
    if (post.scheduled_at) setScheduledAt(post.scheduled_at.slice(0, 10))
    if (post.publication_time) setPublicationTime(post.publication_time.slice(0, 5))
    if ((post as Post & { source_url?: string }).source_url) {
      setUrl((post as Post & { source_url?: string }).source_url ?? '')
    }
    if (post.media_urls) setMediaUrls(post.media_urls)
    if (post.media_type && post.media_type !== 'none') setMediaType(post.media_type)
    if (post.posting_as) setPostingAs(post.posting_as)
  }, [post])

  // ── Sauvegarde ──────────────────────────────────────────────────────────────

  const { mutateAsync: savePost, isPending: saving } = useMutation({
    mutationFn: async (status?: PostStatus) => {
      const modeToSourceType: Record<SourceMode, SourceType> = {
        free_writing: 'manual',
        url: 'url',
        document: 'document',
      }
      const payload = {
        title: title || null,
        content: content || '',
        source_type: modeToSourceType[sourceMode],
        organization_id: organizationId!,
        platform_type: 'linkedin' as const,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        media_type: mediaUrls.length > 0 ? mediaType : 'none',
        posting_as: postingAs ?? null,
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
          .from('posts').insert({ ...payload, status: status ?? 'draft' })
          .select('id').single()
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

  // ── Lancer la rédaction IA (unifié pour les 3 modes) ────────────────────────
  // NOTE : on ne passe PAS par savePost pour éviter que onNewPostCreated déclenche
  // une navigation avant que setContent() soit appelé (le composant se démonterait).

  const handleLaunchGeneration = async () => {
    if (!organizationId) return

    // Validation de la source
    if (sourceMode === 'free_writing' && !freeWritingInput.trim()) {
      toast.error('Écrivez quelques idées pour commencer')
      return
    }
    if (sourceMode === 'url' && !url.trim()) {
      toast.error('Collez une URL')
      return
    }
    if (sourceMode === 'document' && !file) {
      toast.error('Sélectionnez un document')
      return
    }

    setAiLoading(true)
    try {
      // ── 1. Construire le contenu source ──
      let rawSource = ''
      if (sourceMode === 'free_writing') {
        rawSource = freeWritingInput.trim()
      } else if (sourceMode === 'url') {
        const res = await scrapeUrl(url.trim())
        rawSource = `${res.title}\n\n${res.summary}\n\n${res.content}`
      } else if (sourceMode === 'document') {
        const f = file!
        if (f.type.startsWith('image/')) {
          // Redimensionner + compresser l'image avant envoi (évite le rate limit Claude API)
          const base64 = await new Promise<string>((resolve, reject) => {
            const img = new Image()
            const url = URL.createObjectURL(f)
            img.onload = () => {
              const MAX_PX = 1200
              const ratio = Math.min(MAX_PX / img.width, MAX_PX / img.height, 1)
              const canvas = document.createElement('canvas')
              canvas.width = Math.round(img.width * ratio)
              canvas.height = Math.round(img.height * ratio)
              canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
              URL.revokeObjectURL(url)
              resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1])
            }
            img.onerror = reject
            img.src = url
          })
          rawSource = `[IMAGE:image/jpeg]${base64}`
        } else {
          try {
            rawSource = (await f.text()).slice(0, 8000)
          } catch {
            rawSource = `Document : ${f.name} — mode : ${docMode}`
          }
        }
      }

      // ── 2. Intégrer les instructions IA ──
      const sourceContent = aiPrompt.trim()
        ? `Instructions : ${aiPrompt.trim()}\n\n---\n\n${rawSource}`
        : rawSource

      const modeToSourceType: Record<SourceMode, SourceType> = {
        free_writing: 'manual',
        url: 'url',
        document: 'document',
      }

      // ── 3. Créer ou mettre à jour le post en DB ──
      let id = postId
      if (!id) {
        const { data, error } = await supabase.from('posts').insert({
          title: title || null,
          content: '',
          source_type: modeToSourceType[sourceMode],
          source_content: sourceContent,
          organization_id: organizationId,
          platform_type: 'linkedin',
          status: 'draft',
          updated_at: new Date().toISOString(),
        }).select('id').single()
        if (error) throw error
        id = (data as { id: string }).id
      } else {
        await supabase.from('posts').update({
          source_content: sourceContent,
          source_type: modeToSourceType[sourceMode],
          ...(sourceMode === 'url' ? { source_url: url.trim() } : {}),
          updated_at: new Date().toISOString(),
        }).eq('id', id)
      }

      // ── 4. Appel génération IA ──
      const response = await generatePost(id, organizationId)
      contentFromAI.current = true
      setContent(response.content)
      setAiMessages([{ role: 'assistant', content: response.content }])
      toast.success("Post rédigé par l'IA ✨")
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['post_versions', id] })

      // Naviguer APRÈS avoir mis à jour le contenu (si nouveau post)
      if (!postId) onNewPostCreated?.(id)

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
      let id = postId
      if (!id) {
        id = await savePost(undefined)
      } else {
        await supabase.from('posts').update({ content }).eq('id', id)
      }
      const response = await revisePost(id, organizationId, instruction, 'full')
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

  // ── Actions finales ─────────────────────────────────────────────────────────

  const handleValidate = async () => {
    if (!content.trim()) { toast.error('Le post est vide'); return }
    await savePost('approved')
    toast.success("Post validé — il sera publié à l'heure prévue ✅")
    onSaved?.()
  }

  const handleDraft = async () => {
    await savePost('draft')
    toast.success('Brouillon sauvegardé')
    onSaved?.()
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const charCount = content.length
  const isOverLimit = charCount > LINKEDIN_POST_MAX_LENGTH
  const statusMeta = post ? POST_STATUSES[post.status] : null

  // ── Bold formatting ──────────────────────────────────────────────────────────
  const handleBold = () => {
    const ta = contentTextareaRef.current
    if (!ta) return
    const start = ta.selectionStart ?? 0
    const end = ta.selectionEnd ?? 0
    const selected = content.slice(start, end)
    const wrapped = selected ? `**${selected}**` : '****'
    const newContent = content.slice(0, start) + wrapped + content.slice(end)
    setContent(newContent)
    requestAnimationFrame(() => {
      ta.focus()
      if (selected) {
        ta.setSelectionRange(start + 2, end + 2)
      } else {
        ta.setSelectionRange(start + 2, start + 2)
      }
    })
  }

  const canGenerate = !aiLoading && (
    (sourceMode === 'free_writing' && freeWritingInput.trim().length > 0) ||
    (sourceMode === 'url' && url.trim().length > 0) ||
    (sourceMode === 'document' && file !== null)
  )

  const activeMode = SOURCE_MODES.find((m) => m.value === sourceMode)!

  // ── Chargement ──────────────────────────────────────────────────────────────

  if (postLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Barre titre + statut ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre interne (optionnel)"
          className="w-56 text-sm"
        />
        {statusMeta && (
          <Badge className={statusMeta.color}>{statusMeta.label}</Badge>
        )}
      </div>

      {/* ── Grille principale ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Colonne gauche (2/3) ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* ── Card 1 : Création ── */}
          <Card>
            <CardContent className="pt-5 space-y-5">

              {/* Sélecteur de source */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Source du post
                </p>
                <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                  {SOURCE_MODES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { sourceModeExplicit.current = true; setSourceMode(value) }}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center',
                        sourceMode === value
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500">{activeMode.description}</p>
              </div>

              {/* Input spécifique au mode */}
              {sourceMode === 'free_writing' && (
                <SourceFreeWriting
                  content={freeWritingInput}
                  onChange={setFreeWritingInput}
                />
              )}
              {sourceMode === 'url' && (
                <SourceURL
                  url={url}
                  onChange={setUrl}
                  onEnterKey={canGenerate ? handleLaunchGeneration : undefined}
                />
              )}
              {sourceMode === 'document' && (
                <SourceDocument
                  file={file}
                  onFileChange={setFile}
                  mode={docMode}
                  onModeChange={setDocMode}
                />
              )}

              {/* Séparateur visuel → IA */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <div className="flex items-center gap-1.5 text-gray-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">IA</span>
                </div>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Instructions pour l'IA (toujours visible) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  Instructions pour l'IA
                  <span className="text-gray-400 font-normal text-xs">Optionnel</span>
                </Label>
                <Textarea
                  value={aiPrompt}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAiPrompt(e.target.value)}
                  placeholder="Angle, ton, format… Ex : 'Commence par une question percutante, adopte un ton expert mais accessible, 3 paragraphes max.'"
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>

              {/* Bouton principal */}
              <Button
                className="w-full bg-[#0077B5] hover:bg-[#005885] h-11 text-sm font-semibold"
                onClick={handleLaunchGeneration}
                disabled={!canGenerate}
              >
                {aiLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Rédaction en cours…</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Lancer la rédaction IA</>
                )}
              </Button>

            </CardContent>
          </Card>

          {/* ── Card 2 : Post (toujours visible — rédaction directe ou via IA) ── */}
          <Card className="border-2 border-blue-100">
            <CardContent className="pt-5 space-y-4">

              {/* Header : label + compteur */}
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#0077B5]" />
                  Post LinkedIn
                </p>
                <span className={cn(
                  'text-xs tabular-nums',
                  isOverLimit ? 'text-red-500 font-medium' : 'text-gray-400',
                )}>
                  {charCount} / {LINKEDIN_POST_MAX_LENGTH}
                </span>
              </div>

              {/* Barre de mise en forme */}
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={handleBold}
                  title="Gras (**texte**)"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <Bold className="h-3 w-3" />
                  <span className="hidden sm:inline">Gras</span>
                </button>
                <MentionPicker
                  onInsert={(mention) => setContent((prev) => prev + mention)}
                  textareaRef={contentTextareaRef}
                />
              </div>

              {/* Textarea */}
              <Textarea
                ref={contentTextareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={aiLoading ? '' : 'Rédigez votre post directement ici, ou utilisez l\'IA ci-dessus pour générer un contenu…'}
                rows={10}
                className={cn(
                  'resize-none text-sm font-mono',
                  isOverLimit && 'border-red-300',
                )}
              />

              {/* Note mentions */}
              <div className="flex items-start gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <AtSign className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  Les mentions <strong>@Nom Prénom</strong> apparaissent en texte brut sur LinkedIn.
                  Pour créer une vraie mention liée à un profil, ajoutez-la directement sur LinkedIn après publication.
                </span>
              </div>

              {/* Upload médias */}
              <MediaUploader
                postId={postId}
                mediaUrls={mediaUrls}
                mediaType={mediaType}
                onMediaChange={(urls, type) => { setMediaUrls(urls); setMediaType(type) }}
              />

              {/* Zone de révision IA */}
              {!aiLoading && content.trim() && (
                <AIExchangePanel
                  messages={aiMessages.filter((m, i) => !(i === 0 && m.role === 'assistant'))}
                  onSendRevision={handleRevision}
                  loading={aiLoading}
                />
              )}

              <Separator />

              {/* Boutons de sauvegarde */}
              <div className="flex items-center justify-between gap-3">
                {versions.length > 0 ? (
                  <button
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setContent(versions[0].content)}
                    title="Restaurer la dernière version sauvegardée"
                  >
                    ↩ {versions.length} version{versions.length > 1 ? 's' : ''} sauvegardée{versions.length > 1 ? 's' : ''}
                  </button>
                ) : <div />}

                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    onClick={handleDraft}
                    disabled={saving || aiLoading}
                  >
                    {saving
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Save className="h-4 w-4 mr-1.5" />}
                    Enregistrer en brouillon
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleValidate}
                    disabled={saving || aiLoading || isOverLimit || !content.trim()}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Valider
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* ── Aperçu LinkedIn ── */}
          {(content.trim() || mediaUrls.length > 0) && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-4 w-4 rounded-sm bg-[#0077B5] flex items-center justify-center">
                  <span className="text-white font-bold text-[9px]">in</span>
                </div>
                <Label className="text-sm font-medium text-gray-700">Aperçu LinkedIn</Label>
              </div>
              <LinkedInPreview content={content} userName="Votre nom" mediaUrls={mediaUrls} mediaType={mediaType} />
            </div>
          )}

          {/* ── Historique des versions ── */}
          {versions.length > 1 && (
            <Card>
              <CardContent className="pt-4 space-y-2">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Historique des versions
                </p>
                {versions.map((v) => (
                  <button
                    key={v.id}
                    className="w-full text-left p-2 rounded-lg border hover:bg-gray-50 transition-colors"
                    onClick={() => setContent(v.content)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700">
                        Version {v.version_number}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(v.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    {v.feedback && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 italic">
                        "{v.feedback}"
                      </p>
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

        </div>

        {/* ── Colonne droite (1/3) ── */}
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
                  postingAs={postingAs}
                  onPostingAsChange={setPostingAs}
                />
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
