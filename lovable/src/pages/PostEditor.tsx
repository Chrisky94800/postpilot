// PostPilot — Éditeur de post LinkedIn
// Sprint 2 : création, génération IA, révision, approbation, programmation.

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2, Sparkles, Save, Send, Clock,
  RotateCcw, Linkedin,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'
import { generatePost, revisePost } from '@/lib/api'
import { useOrganization } from '@/hooks/useOrganization'
import { POST_STATUSES, SOURCE_TYPES, FEEDBACK_SCOPES, LINKEDIN_POST_MAX_LENGTH } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Post, PostVersion, PostStatus, FeedbackScope, SourceType } from '@/types/database'

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
        {content || (
          <span className="text-gray-400 italic">Votre post apparaîtra ici…</span>
        )}
      </p>
      <Separator className="my-3" />
      <div className="flex gap-4 text-xs text-gray-500">
        <span>👍 J'aime</span>
        <span>💬 Commenter</span>
        <span>🔁 Republier</span>
        <span>📤 Envoyer</span>
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

  // État du formulaire
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [sourceType, setSourceType] = useState<SourceType>('manual')
  const [sourceInput, setSourceInput] = useState('')
  const [feedback, setFeedback] = useState('')
  const [feedbackScope, setFeedbackScope] = useState<FeedbackScope>('full')
  const [scheduledAt, setScheduledAt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [revising, setRevising] = useState(false)

  // Chargement du post existant
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

  // Versions du post
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
      setContent(post.content)
      setSourceType(post.source_type ?? 'manual')
      if (post.scheduled_at) {
        setScheduledAt(post.scheduled_at.slice(0, 16))
      }
    }
  }, [post])

  // Sauvegarde
  const { mutateAsync: savePost, isPending: saving } = useMutation({
    mutationFn: async (status?: PostStatus) => {
      const payload = {
        title: title || null,
        content,
        source_type: sourceType,
        organization_id: organizationId!,
        platform_type: 'linkedin' as const,
        ...(status ? { status } : {}),
        ...(scheduledAt ? { scheduled_at: new Date(scheduledAt).toISOString() } : {}),
      }

      if (id) {
        const { error } = await supabase.from('posts').update(payload).eq('id', id)
        if (error) throw error
        return id
      } else {
        const { data, error } = await supabase
          .from('posts')
          .insert({ ...payload, status: 'draft' })
          .select('id')
          .single()
        if (error) throw error
        return data.id
      }
    },
    onSuccess: (newId) => {
      toast.success('Post sauvegardé')
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      if (!id) navigate(`/posts/${newId}`, { replace: true })
    },
    onError: (err) => toast.error((err as Error).message),
  })

  // Génération IA
  const handleGenerate = async () => {
    if (!organizationId) return
    setGenerating(true)
    try {
      let postId = id
      if (!postId) {
        postId = await savePost(undefined)
      }
      const response = await generatePost(postId!, organizationId)
      setContent(response.content)
      queryClient.invalidateQueries({ queryKey: ['post', id] })
      toast.success("Post généré par l'IA ✨")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  // Révision IA
  const handleRevise = async () => {
    if (!id || !feedback.trim()) return
    setRevising(true)
    try {
      const response = await revisePost(id, feedback, feedbackScope)
      setContent(response.content)
      setFeedback('')
      queryClient.invalidateQueries({ queryKey: ['post_versions', id] })
      toast.success('Post révisé ✨')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setRevising(false)
    }
  }

  // Approbation
  const handleApprove = async () => {
    await savePost('approved')
    toast.success("Post approuvé — il sera publié à l'heure programmée")
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
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Éditeur — 3 colonnes */}
      <div className="lg:col-span-3 space-y-4">
        {/* Statut */}
        {statusMeta && (
          <div className="flex items-center gap-2">
            <Badge className={statusMeta.color}>{statusMeta.label}</Badge>
            <span className="text-sm text-gray-500">{statusMeta.description}</span>
          </div>
        )}

        {/* Titre optionnel */}
        <div className="space-y-1.5">
          <Label htmlFor="title">Titre interne (optionnel)</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Retour de conférence SaaStr…"
          />
        </div>

        {/* Source */}
        <div className="space-y-1.5">
          <Label>Source du post</Label>
          <Select
            value={sourceType}
            onValueChange={(v) => setSourceType(v as SourceType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SOURCE_TYPES).map(([value, meta]) => (
                <SelectItem key={value} value={value}>
                  {meta.icon} {meta.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {sourceType !== 'manual' && (
            <Textarea
              value={sourceInput}
              onChange={(e) => setSourceInput(e.target.value)}
              placeholder={
                sourceType === 'url'
                  ? 'https://…'
                  : sourceType === 'vocal'
                  ? 'Décrivez votre idée en quelques mots…'
                  : 'Collez ou décrivez votre source…'
              }
              rows={2}
            />
          )}
        </div>

        {/* Zone de texte principale */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="content">Contenu du post *</Label>
            <span
              className={cn(
                'text-xs',
                isOverLimit ? 'text-red-500 font-medium' : 'text-gray-400',
              )}
            >
              {charCount} / {LINKEDIN_POST_MAX_LENGTH}
            </span>
          </div>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Commencez à écrire ou laissez l'IA générer votre post…"
            rows={10}
            className={cn('font-mono text-sm', isOverLimit && 'border-red-300')}
          />
        </div>

        {/* Actions principales */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleGenerate}
            disabled={generating || saving}
            variant="outline"
            className="border-[#0077B5] text-[#0077B5] hover:bg-blue-50"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {id ? 'Regénérer' : "Générer avec l'IA"}
          </Button>

          <Button
            onClick={() => savePost(undefined)}
            disabled={saving || !content.trim()}
            variant="outline"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Sauvegarder
          </Button>

          {id && post?.status === 'pending_review' && (
            <Button
              onClick={handleApprove}
              disabled={saving || isOverLimit}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Approuver
            </Button>
          )}
        </div>

        {/* Programmation */}
        {id && (
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <Label>Programmer la publication</Label>
              </div>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </CardContent>
          </Card>
        )}

        {/* Panel feedback / révision */}
        {id && content && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Demander une révision IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={feedbackScope}
                onValueChange={(v) => setFeedbackScope(v as FeedbackScope)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Que voulez-vous modifier ?" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FEEDBACK_SCOPES).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>
                      {meta.label} — {meta.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Ex : Rends l'accroche plus percutante, ajoute une question en ouverture…"
                rows={2}
              />
              <Button
                onClick={handleRevise}
                disabled={revising || !feedback.trim()}
                variant="outline"
                size="sm"
                className="border-[#0077B5] text-[#0077B5]"
              >
                {revising ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Réviser avec l'IA
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Preview + historique — 2 colonnes */}
      <div className="lg:col-span-2 space-y-4">
        {/* Preview LinkedIn */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Linkedin className="h-4 w-4 text-[#0077B5]" />
            <span className="text-sm font-medium text-gray-700">Aperçu LinkedIn</span>
          </div>
          <LinkedInPreview content={content} userName="Votre nom" />
        </div>

        {/* Historique des versions */}
        {versions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Historique des versions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
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
    </div>
  )
}
