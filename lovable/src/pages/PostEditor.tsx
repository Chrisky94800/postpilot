// PostPilot — Éditeur de post V2
// 3 modes source (libre / URL / document) + échange IA + profil de marque sidebar

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2, Save, CheckCircle2, Linkedin,
  PenLine, Link, FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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
import type { Post, PostStatus, SourceType, PostVersion } from '@/types/database'

// ─── Modes source ─────────────────────────────────────────────────────────────

type SourceMode = 'free_writing' | 'url' | 'document'

const SOURCE_MODES: { value: SourceMode; label: string; icon: React.ElementType }[] = [
  { value: 'free_writing', label: 'Rédaction libre', icon: PenLine },
  { value: 'url', label: 'URL / Article', icon: Link },
  { value: 'document', label: 'Document', icon: FileText },
]

// Map SourceType → SourceMode
function toSourceMode(s: SourceType | null | undefined): SourceMode {
  if (s === 'url') return 'url'
  if (s === 'document') return 'document'
  return 'free_writing'
}

// ─── Preview LinkedIn ─────────────────────────────────────────────────────────

function LinkedInPreview({ content, userName }: { content: string; userName: string }) {
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
        {content || <span className="text-gray-400 italic">Votre post apparaîtra ici…</span>}
      </p>
      <Separator className="my-3" />
      <div className="flex gap-4 text-xs text-gray-500">
        <span>👍 J'aime</span><span>💬 Commenter</span>
        <span>🔁 Republier</span><span>📤 Envoyer</span>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function PostEditor() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { organizationId } = useOrganization()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [sourceMode, setSourceMode] = useState<SourceMode>('free_writing')
  const [scheduledAt, setScheduledAt] = useState('')
  const [publicationTime, setPublicationTime] = useState('09:00')
  const [aiMessages, setAiMessages] = useState<ExchangeMessage[]>([])
  const [aiLoading, setAiLoading] = useState(false)

  // Chargement du post
  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Post
    },
    enabled: !!id,
  })

  // Versions du post (pour l'historique)
  const { data: versions = [] } = useQuery({
    queryKey: ['post_versions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_versions')
        .select('*')
        .eq('post_id', id!)
        .order('version_number', { ascending: false })
      if (error) throw error
      return data as PostVersion[]
    },
    enabled: !!id,
  })

  // Sync form ← post
  useEffect(() => {
    if (post) {
      setTitle(post.title ?? '')
      setContent(post.content ?? '')
      setSourceMode(toSourceMode(post.source_type))
      if (post.scheduled_at) setScheduledAt(post.scheduled_at.slice(0, 10))
      if (post.publication_time) setPublicationTime(post.publication_time.slice(0, 5))
    }
  }, [post])

  // Sauvegarde
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
        ...(status ? { status } : {}),
        ...(scheduledAt ? {
          scheduled_at: new Date(`${scheduledAt}T${publicationTime}:00`).toISOString(),
        } : {}),
        publication_time: publicationTime || '09:00',
        updated_at: new Date().toISOString(),
      }

      if (id) {
        const { error } = await supabase.from('posts').update(payload).eq('id', id)
        if (error) throw error
        return id
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
      if (!id) navigate(`/posts/${newId}`, { replace: true })
    },
    onError: (err) => toast.error((err as Error).message),
  })

  // Génération IA (depuis les modes source)
  const handleGenerateFromSource = async (sourceContent: string, docMode?: 'synthesis' | 'surprise_me') => {
    if (!organizationId) return
    setAiLoading(true)
    try {
      let postId = id
      if (!postId) postId = await savePost(undefined)

      // Sauvegarder le source_content
      await supabase.from('posts').update({
        source_content: sourceContent,
        source_type: sourceMode === 'url' ? 'url' : 'document',
      }).eq('id', postId)

      const response = await generatePost(postId!, organizationId)
      setContent(response.content)
      setAiMessages([
        { role: 'assistant', content: response.content },
      ])
      toast.success("Post généré par l'IA ✨")
      queryClient.invalidateQueries({ queryKey: ['post', id] })
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setAiLoading(false)
    }
  }

  // Mode libre : soumettre à l'IA pour optimisation
  const handleFreeWritingSubmit = async () => {
    if (!organizationId || !content.trim()) return
    setAiLoading(true)
    try {
      let postId = id
      if (!postId) {
        await supabase.from('posts').upsert({
          id: postId,
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
        postId = (data as { id: string } | null)?.id ?? postId
      } else {
        await supabase.from('posts').update({ content }).eq('id', postId)
      }

      if (!postId) { toast.error('Erreur : post non trouvé'); return }
      const response = await generatePost(postId, organizationId)
      setAiMessages([{ role: 'assistant', content: response.content }])
      toast.success("L'IA a optimisé votre post ✨")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setAiLoading(false)
    }
  }

  // Révision conversationnelle
  const handleRevision = async (instruction: string) => {
    if (!id) {
      toast.error("Sauvegardez d'abord le post")
      return
    }
    setAiLoading(true)
    setAiMessages((prev) => [...prev, { role: 'user', content: instruction }])
    try {
      const response = await revisePost(id, instruction, 'full')
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

  // Valider → approved
  const handleValidate = async () => {
    if (!content.trim()) { toast.error('Le post est vide'); return }
    await savePost('approved')
    toast.success("Post validé — il sera publié à l'heure prévue ✅")
  }

  // Sauvegarder brouillon
  const handleDraft = async () => {
    await savePost('draft')
    toast.success('Brouillon sauvegardé')
  }

  const charCount = content.length
  const isOverLimit = charCount > LINKEDIN_POST_MAX_LENGTH
  const statusMeta = post ? POST_STATUSES[post.status] : null

  if (postLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barre d'actions haut */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {statusMeta && (
            <Badge className={statusMeta.color}>{statusMeta.label}</Badge>
          )}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre interne (optionnel)"
            className="w-56 text-sm"
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

      {/* Zone principale : éditeur + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Colonne gauche — source + échange IA (2/3) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Sélecteur de mode source */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
            {SOURCE_MODES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSourceMode(value)}
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

          {/* Contenu du mode source */}
          <Card>
            <CardContent className="pt-4">
              {sourceMode === 'free_writing' && (
                <SourceFreeWriting
                  content={content}
                  onChange={setContent}
                  onSubmitToAI={handleFreeWritingSubmit}
                  loading={aiLoading}
                />
              )}
              {sourceMode === 'url' && (
                <SourceURL
                  initialUrl={post?.source_url ?? ''}
                  onGenerate={(url, scraped) => handleGenerateFromSource(scraped)}
                  loading={aiLoading}
                />
              )}
              {sourceMode === 'document' && (
                <SourceDocument
                  onGenerate={(text, mode) => handleGenerateFromSource(text, mode)}
                  loading={aiLoading}
                />
              )}
            </CardContent>
          </Card>

          {/* Zone d'échange IA */}
          {(aiMessages.length > 0 || aiLoading) && (
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
