// PostPilot — Page Paramètres
// Onglets : Profil de marque · Plateformes · Compte

import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Linkedin, Check, AlertCircle, Loader2, Trash2, CreditCard, Save,
  User, Building2, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'
import { connectLinkedIn, syncLinkedInContacts, createBillingPortal } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import Documents from '@/pages/Documents'
import { BillingTab } from '@/components/billing/BillingTab'
import { useContacts } from '@/hooks/useContacts'
import { TagInput } from '@/components/onboarding/TagInput'
import {
  TONE_OPTIONS, WEEK_DAYS, INDUSTRIES, SUBSCRIPTION_PLANS,
} from '@/lib/constants'
import { formatDateTime } from '@/lib/utils'
import type { Platform, PostLength, HashtagStrategy } from '@/types/database'

// ─── Constantes ───────────────────────────────────────────────────────────────

const EMOJI_LABELS = ['Aucun 😐', 'Rare 🙂', 'Modéré 😊', 'Régulier 😄', 'Fréquent 🎉', 'Intensif 🚀']

const POST_LENGTH_OPTIONS: { value: PostLength; label: string; sub: string }[] = [
  { value: 'short',  label: 'Court',  sub: '< 500 car.' },
  { value: 'medium', label: 'Moyen',  sub: '500–1500 car.' },
  { value: 'long',   label: 'Long',   sub: '> 1500 car.' },
]

const HASHTAG_STRATEGY_OPTIONS: { value: HashtagStrategy; label: string; description: string }[] = [
  { value: 'none',   label: 'Aucun',  description: 'Pas de hashtags' },
  { value: 'few',    label: '1–3',    description: 'Ciblés, très sélectifs' },
  { value: 'medium', label: '4–7',    description: 'Mix niche + volume' },
  { value: 'many',   label: '8+',     description: 'Large portée' },
]

const CTA_SUGGESTIONS = [
  "Dites-moi en commentaires…",
  "Partagez si vous êtes d'accord 🔄",
  "Abonnez-vous pour ne rien manquer",
  "Qu'en pensez-vous ?",
  "Suivez-moi pour plus de conseils",
  "Contactez-moi en DM",
]

// ─── Onglet Profil de marque ──────────────────────────────────────────────────

function BrandProfileTab() {
  const { brandProfile, updateBrandProfile } = useOrganization()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    // Étape 1 — Entreprise
    company_name:    '',
    industry:        '',
    description:     '',
    target_audience: '',
    // Étape 2 — Style
    tone:        [] as string[],
    emoji_style: 2,
    post_length: 'medium' as PostLength,
    signature:   '',
    // Fréquence
    posting_frequency: 3,
    preferred_days:    [] as string[],
    preferred_time:    '',
    // Étape 3 — Mots-clés
    keywords:            [] as string[],
    keywords_avoid:      [] as string[],
    hashtags_preferred:  [] as string[],
    hashtag_strategy:    'medium' as HashtagStrategy,
    ctas_preferred:      [] as string[],
    // Étape 4 — Exemples
    example_posts: ['', '', ''] as [string, string, string],
  })

  // Pré-remplissage depuis le profil existant
  useEffect(() => {
    if (!brandProfile) return
    const ex = brandProfile.example_posts ?? ['', '', '']
    setForm({
      company_name:       brandProfile.company_name    ?? '',
      industry:           brandProfile.industry         ?? '',
      description:        brandProfile.description      ?? '',
      target_audience:    brandProfile.target_audience  ?? '',
      tone:               brandProfile.tone             ?? [],
      emoji_style:        brandProfile.emoji_style      ?? 2,
      post_length:        brandProfile.post_length      ?? 'medium',
      signature:          brandProfile.signature        ?? '',
      posting_frequency:  brandProfile.posting_frequency ?? 3,
      preferred_days:     brandProfile.preferred_days   ?? [],
      preferred_time:     brandProfile.preferred_time   ?? '',
      keywords:           brandProfile.keywords         ?? [],
      keywords_avoid:     brandProfile.keywords_avoid   ?? [],
      hashtags_preferred: brandProfile.hashtags_preferred ?? [],
      hashtag_strategy:   brandProfile.hashtag_strategy ?? 'medium',
      ctas_preferred:     brandProfile.ctas_preferred   ?? [],
      example_posts: [
        ex[0] ?? '',
        ex[1] ?? '',
        ex[2] ?? '',
      ],
    })
  }, [brandProfile])

  const toggleTone = (v: string) =>
    setForm((f) => ({
      ...f,
      tone: f.tone.includes(v)
        ? f.tone.filter((t) => t !== v)
        : f.tone.length < 3 ? [...f.tone, v] : f.tone,
    }))

  const toggleDay = (v: string) =>
    setForm((f) => ({
      ...f,
      preferred_days: f.preferred_days.includes(v)
        ? f.preferred_days.filter((d) => d !== v)
        : [...f.preferred_days, v],
    }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateBrandProfile({
        company_name:       form.company_name    || null,
        industry:           form.industry         || null,
        description:        form.description      || null,
        target_audience:    form.target_audience  || null,
        tone:               form.tone,
        emoji_style:        form.emoji_style,
        post_length:        form.post_length,
        signature:          form.signature        || null,
        posting_frequency:  form.posting_frequency,
        preferred_days:     form.preferred_days,
        preferred_time:     form.preferred_time   || null,
        keywords:           form.keywords,
        keywords_avoid:     form.keywords_avoid,
        hashtags_preferred: form.hashtags_preferred,
        hashtag_strategy:   form.hashtag_strategy,
        ctas_preferred:     form.ctas_preferred,
        example_posts:      form.example_posts.filter(Boolean),
      })
      toast.success('Profil de marque mis à jour')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* ── Informations générales ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nom de l'entreprise</Label>
              <Input
                value={form.company_name}
                onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                placeholder="PostPilot SAS"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Secteur d'activité</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              >
                <option value="">Choisir…</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description de l'activité <span className="text-gray-400 font-normal text-xs ml-1">{form.description.length}/1000</span></Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 1000) }))}
              rows={3}
              placeholder="Décrivez votre activité, ce que vous faites et pour qui…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Audience cible</Label>
            <Input
              value={form.target_audience}
              onChange={(e) => setForm((f) => ({ ...f, target_audience: e.target.value }))}
              placeholder="Dirigeants de PME, DRH, entrepreneurs…"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Style de communication ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Style de communication</CardTitle>
          <CardDescription>L'IA utilisera ces paramètres pour adapter le ton de vos posts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Tons */}
          <div>
            <Label className="mb-2 block">Ton de communication <span className="text-gray-400 font-normal text-xs">({form.tone.length}/3 max)</span></Label>
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map((t) => {
                const selected = form.tone.includes(t.value)
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => toggleTone(t.value)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      selected
                        ? 'bg-[#0077B5] text-white border-[#0077B5]'
                        : 'border-gray-300 text-gray-700 hover:border-[#0077B5]'
                    }`}
                  >
                    {selected && <Check className="h-3 w-3 inline mr-1" />}{t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Utilisation des emojis */}
          <div>
            <Label className="mb-2 block">
              Utilisation des emojis — <span className="text-[#0077B5] font-medium">{EMOJI_LABELS[form.emoji_style]}</span>
            </Label>
            <input
              type="range"
              min={0}
              max={5}
              step={1}
              value={form.emoji_style}
              onChange={(e) => setForm((f) => ({ ...f, emoji_style: Number(e.target.value) }))}
              className="w-full accent-[#0077B5]"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Aucun</span><span>Intensif</span>
            </div>
          </div>

          {/* Longueur des posts */}
          <div>
            <Label className="mb-2 block">Longueur cible</Label>
            <div className="flex gap-2">
              {POST_LENGTH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, post_length: opt.value }))}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium text-center transition-colors ${
                    form.post_length === opt.value
                      ? 'bg-[#0077B5] text-white border-[#0077B5]'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <div>{opt.label}</div>
                  <div className={`text-xs ${form.post_length === opt.value ? 'text-blue-100' : 'text-gray-400'}`}>{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Signature */}
          <div className="space-y-1.5">
            <Label>
              Signature <span className="text-gray-400 font-normal text-xs ml-1">Optionnel — ajoutée à la fin de chaque post</span>
            </Label>
            <Input
              value={form.signature}
              onChange={(e) => setForm((f) => ({ ...f, signature: e.target.value }))}
              placeholder="— Jean Dupont | Fondateur @PostPilot"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Fréquence de publication ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fréquence de publication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">Posts par semaine</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, posting_frequency: n }))}
                  className={`h-10 w-14 rounded-lg border text-sm font-medium transition-colors ${
                    form.posting_frequency === n
                      ? 'bg-[#0077B5] text-white border-[#0077B5]'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {n}×
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Jours préférés</Label>
            <div className="flex gap-2 flex-wrap">
              {WEEK_DAYS.map((d) => {
                const selected = form.preferred_days.includes(d.value)
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                      selected
                        ? 'bg-[#0077B5] text-white border-[#0077B5]'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {d.short}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Heure de publication préférée</Label>
            <Input
              type="time"
              value={form.preferred_time}
              onChange={(e) => setForm((f) => ({ ...f, preferred_time: e.target.value }))}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Mots-clés & Hashtags ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mots-clés & Hashtags</CardTitle>
          <CardDescription>L'IA intègre ces éléments systématiquement dans vos posts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label>Mots-clés à utiliser <span className="text-gray-400 text-xs font-normal">({form.keywords.length}/15)</span></Label>
              <TagInput
                tags={form.keywords}
                onChange={(tags) => setForm((f) => ({ ...f, keywords: tags }))}
                placeholder="leadership, innovation…"
                maxTags={15}
                transform={(v) => v.toLowerCase()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mots-clés à éviter <span className="text-gray-400 text-xs font-normal">({form.keywords_avoid.length}/10)</span></Label>
              <TagInput
                tags={form.keywords_avoid}
                onChange={(tags) => setForm((f) => ({ ...f, keywords_avoid: tags }))}
                placeholder="concurrents, termes négatifs…"
                maxTags={10}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label>Hashtags favoris <span className="text-gray-400 text-xs font-normal">({form.hashtags_preferred.length}/10)</span></Label>
            <TagInput
              tags={form.hashtags_preferred}
              onChange={(tags) => setForm((f) => ({ ...f, hashtags_preferred: tags }))}
              placeholder="react, webdev…"
              maxTags={10}
              prefix="#"
              transform={(v) => v.toLowerCase().replace(/\s+/g, '')}
            />
          </div>

          <div>
            <Label className="mb-2 block">Stratégie de hashtags</Label>
            <div className="flex gap-2 flex-wrap">
              {HASHTAG_STRATEGY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, hashtag_strategy: opt.value }))}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.hashtag_strategy === opt.value
                      ? 'bg-[#0077B5] text-white border-[#0077B5]'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className={`text-xs block ${form.hashtag_strategy === opt.value ? 'text-blue-100' : 'text-gray-400'}`}>{opt.description}</span>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Call-to-action favoris <span className="text-gray-400 text-xs font-normal">({form.ctas_preferred.length}/5)</span></Label>
            <TagInput
              tags={form.ctas_preferred}
              onChange={(tags) => setForm((f) => ({ ...f, ctas_preferred: tags }))}
              placeholder="Partagez si vous êtes d'accord…"
              maxTags={5}
            />
            <div className="flex flex-wrap gap-1.5 mt-1">
              {CTA_SUGGESTIONS.map((cta) => (
                !form.ctas_preferred.includes(cta) && (
                  <button
                    key={cta}
                    type="button"
                    onClick={() => {
                      if (form.ctas_preferred.length < 5) {
                        setForm((f) => ({ ...f, ctas_preferred: [...f.ctas_preferred, cta] }))
                      }
                    }}
                    className="text-xs px-2.5 py-1 rounded-full border border-dashed border-gray-300 text-gray-500 hover:border-[#0077B5] hover:text-[#0077B5] transition-colors"
                  >
                    + {cta}
                  </button>
                )
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Exemples de posts ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exemples de posts</CardTitle>
          <CardDescription>
            Partagez vos meilleurs posts LinkedIn pour que l'IA imite votre style naturel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {([0, 1, 2] as const).map((i) => (
            <div key={i} className="space-y-1.5">
              <Label className="text-gray-600">Exemple {i + 1} <span className="text-gray-400 font-normal">(optionnel)</span></Label>
              <Textarea
                value={form.example_posts[i]}
                onChange={(e) => {
                  const updated = [...form.example_posts] as [string, string, string]
                  updated[i] = e.target.value
                  setForm((f) => ({ ...f, example_posts: updated }))
                }}
                rows={4}
                placeholder="Collez ici un de vos posts LinkedIn qui reflète bien votre style…"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Bouton Sauvegarder ─────────────────────────────────────────────── */}
      <div className="flex justify-end pb-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#0077B5] hover:bg-[#005885]"
        >
          {saving
            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            : <Save className="h-4 w-4 mr-2" />}
          Sauvegarder les modifications
        </Button>
      </div>
    </div>
  )
}

// ─── Onglet Plateformes ───────────────────────────────────────────────────────

function PlateformesTab() {
  const { organizationId } = useOrganization()
  const queryClient = useQueryClient()
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const { contacts, deleteContact } = useContacts()
  const linkedinContacts = contacts.filter((c) => c.linkedin_urn !== null)

  // Détection du callback OAuth dans l'URL
  const [searchParams] = useSearchParams()
  const linkedinStatus = searchParams.get('linkedin')

  useEffect(() => {
    if (linkedinStatus === 'connected') {
      toast.success('LinkedIn connecté avec succès !')
      // Sync automatique des pages entreprise après connexion
      if (organizationId) {
        syncLinkedInContacts(organizationId)
          .then((res) => {
            if (res.synced > 0) {
              queryClient.invalidateQueries({ queryKey: ['contacts', organizationId] })
              toast.success(`${res.synced} page(s) entreprise LinkedIn synchronisée(s)`)
            }
          })
          .catch(() => {
            // Silencieux — l'utilisateur peut resynchroniser manuellement
          })
      }
    }
    if (linkedinStatus === 'error') toast.error('Erreur lors de la connexion LinkedIn. Réessayez.')
  }, [linkedinStatus, organizationId, queryClient])

  const handleSyncContacts = async () => {
    if (!organizationId) return
    setSyncing(true)
    try {
      const res = await syncLinkedInContacts(organizationId)
      queryClient.invalidateQueries({ queryKey: ['contacts', organizationId] })
      if (res.synced > 0) {
        toast.success(`${res.synced} page(s) entreprise synchronisée(s)`)
      } else {
        toast.info(res.message ?? 'Aucune page entreprise LinkedIn trouvée.')
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSyncing(false)
    }
  }

  const { data: platform, isLoading } = useQuery({
    queryKey: ['platform', organizationId, 'linkedin'],
    queryFn: async () => {
      const { data } = await supabase
        .from('platforms')
        .select('*')
        .eq('organization_id', organizationId!)
        .eq('platform_type', 'linkedin')
        .maybeSingle()
      return data as Platform | null
    },
    enabled: !!organizationId,
  })

  const handleConnect = async () => {
    if (!organizationId) return
    setConnecting(true)
    try {
      const { oauth_url } = await connectLinkedIn(organizationId)
      window.location.href = oauth_url
    } catch (err) {
      toast.error((err as Error).message)
      setConnecting(false)
    }
  }

  const { mutateAsync: disconnectPlatform, isPending: disconnecting } = useMutation({
    mutationFn: async () => {
      if (!platform) throw new Error('Pas de plateforme trouvée')
      const { error } = await supabase
        .from('platforms')
        .update({ is_active: false, oauth_tokens: null })
        .eq('id', platform.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', organizationId] })
      toast.success('Compte LinkedIn déconnecté')
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const isConnected = !!platform?.is_active && !!platform?.oauth_tokens
  const isExpired = platform?.token_expires_at
    ? new Date(platform.token_expires_at) < new Date()
    : false

  return (
    <div className="space-y-4">

      {/* LinkedIn */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-[#0077B5]" />
            LinkedIn
          </CardTitle>
          <CardDescription>
            Connectez votre compte LinkedIn pour publier vos posts directement depuis PostPilot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Vérification…
            </div>
          ) : isConnected && !isExpired ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[#0077B5] flex items-center justify-center shrink-0">
                  <Linkedin className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {platform?.platform_user_name ?? 'Compte LinkedIn'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Token valide jusqu'au {formatDateTime(platform!.token_expires_at)}
                  </p>
                </div>
                <Badge className="ml-auto bg-green-50 text-green-700 border-green-200">
                  <Check className="h-3 w-3 mr-1" />Connecté
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => disconnectPlatform()}
                disabled={disconnecting}
              >
                {disconnecting
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <Trash2 className="h-4 w-4 mr-2" />}
                Déconnecter
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {isExpired && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  <p className="text-sm text-amber-700">
                    Votre token LinkedIn a expiré. Reconnectez votre compte.
                  </p>
                </div>
              )}
              {!isExpired && !isConnected && (
                <p className="text-sm text-gray-500">
                  Aucun compte LinkedIn connecté.
                </p>
              )}
              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="bg-[#0077B5] hover:bg-[#005885]"
              >
                {connecting
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <Linkedin className="h-4 w-4 mr-2" />}
                Connecter mon compte LinkedIn
              </Button>
              <p className="text-xs text-gray-400">
                Vous serez redirigé vers LinkedIn pour autoriser PostPilot à publier en votre nom.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contacts LinkedIn (pages entreprise) */}
      {isConnected && !isExpired && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-[#0077B5]" />
                  Contacts LinkedIn
                </CardTitle>
                <CardDescription className="mt-1">
                  Pages entreprise que vous gérez sur LinkedIn. Disponibles pour les mentions
                  dans vos posts via le bouton <code>@Mentionner</code>.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncContacts}
                disabled={syncing}
                className="shrink-0"
              >
                {syncing
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <RefreshCw className="h-4 w-4 mr-2" />
                }
                Resynchroniser
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {linkedinContacts.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-sm text-gray-500">
                  Aucune page entreprise LinkedIn synchronisée.
                </p>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  PostPilot peut synchroniser les pages entreprise que vous administrez sur LinkedIn.
                  Cliquez sur "Resynchroniser" pour les importer.
                </p>
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
                  <p className="text-xs text-amber-700">
                    <strong>Note :</strong> L'API LinkedIn ne permet pas de récupérer vos connexions personnelles.
                    Pour mentionner des personnes, ajoutez-les directement depuis le bouton{' '}
                    <code>@ Mentionner</code> dans l'éditeur de post.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {linkedinContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg border bg-white hover:border-gray-300 transition-colors"
                    >
                      <div className="h-7 w-7 rounded-full bg-[#0077B5] flex items-center justify-center shrink-0">
                        {contact.type === 'company'
                          ? <Building2 className="h-3.5 w-3.5 text-white" />
                          : <User className="h-3.5 w-3.5 text-white" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                        {contact.linkedin_url && (
                          <a
                            href={contact.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#0077B5] hover:underline truncate block"
                          >
                            {contact.linkedin_url}
                          </a>
                        )}
                      </div>
                      <code className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded shrink-0 hidden sm:block">
                        @[{contact.name}]
                      </code>
                      <button
                        type="button"
                        onClick={() => deleteContact.mutate(contact.id)}
                        disabled={deleteContact.isPending}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                        title="Supprimer ce contact"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 pt-1">
                  Pour mentionner des personnes (non récupérables via l'API LinkedIn), utilisez
                  le bouton <code>@ Mentionner</code> dans l'éditeur — vous pourrez y ajouter
                  des contacts manuellement.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plateformes à venir */}
      <Card className="border-dashed opacity-60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Instagram
            <Badge variant="secondary">Phase 2</Badge>
          </CardTitle>
          <CardDescription>Disponible quand PostPilot atteint 15+ clients actifs.</CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-dashed opacity-60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            TikTok
            <Badge variant="secondary">Phase 2</Badge>
          </CardTitle>
          <CardDescription>Disponible quand PostPilot atteint 15+ clients actifs.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}

// ─── Onglet Compte ────────────────────────────────────────────────────────────

function CompteTab() {
  const { user } = useAuth()
  const { organization, organizationId } = useOrganization()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const plan = organization?.subscription_plan ?? 'starter'
  const planInfo = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS]

  const [orgName, setOrgName] = useState(organization?.name ?? '')
  const [savingOrg, setSavingOrg] = useState(false)
  const [loadingPortal, setLoadingPortal] = useState(false)

  const handleManageBilling = async () => {
    if (!organizationId) return
    setLoadingPortal(true)
    try {
      const { portal_url } = await createBillingPortal(organizationId)
      window.location.href = portal_url
    } catch (err) {
      toast.error(`Impossible d'ouvrir le portail : ${(err as Error).message}`)
      setLoadingPortal(false)
    }
  }

  // Sync quand l'org charge
  useEffect(() => {
    if (organization?.name) setOrgName(organization.name)
  }, [organization?.name])

  const handleSaveOrg = async () => {
    if (!organizationId || !orgName.trim()) return
    setSavingOrg(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: orgName.trim() })
        .eq('id', organizationId)
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['membership'] })
      toast.success("Nom de l'organisation mis à jour")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSavingOrg(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Informations du compte */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations du compte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Adresse e-mail</Label>
            <Input value={user?.email ?? ''} readOnly className="bg-gray-50 text-gray-500 cursor-default" />
            <p className="text-xs text-gray-400">
              Pour modifier votre e-mail, contactez le support.
            </p>
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label>Nom de l'organisation</Label>
            <div className="flex gap-2">
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Mon Entreprise"
              />
              <Button
                variant="outline"
                onClick={handleSaveOrg}
                disabled={savingOrg || !orgName.trim() || orgName === organization?.name}
              >
                {savingOrg
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Save className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abonnement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Abonnement</CardTitle>
          <CardDescription>
            Plan actuel : <strong>{planInfo?.label ?? plan}</strong> · {planInfo?.priceMonthly === 0 ? 'Gratuit' : planInfo?.priceMonthly ? `${planInfo.priceMonthly}€/mois` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-blue-900">
                {planInfo?.maxPosts} posts LinkedIn / mois inclus
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                {organization?.max_posts_per_month ?? planInfo?.maxPosts} posts disponibles sur votre compte
              </p>
            </div>
          </div>

          <ul className="space-y-1.5">
            {planInfo?.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="h-4 w-4 text-green-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <Separator />

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleManageBilling} disabled={loadingPortal}>
              {loadingPortal
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Chargement…</>
                : <><CreditCard className="h-4 w-4 mr-2" />Gérer l'abonnement</>
              }
            </Button>
            {plan !== 'pro' && plan !== 'business' && (
              <Button
                className="bg-[#0077B5] hover:bg-[#005885]"
                onClick={() => navigate('/pricing')}
              >
                Passer au plan supérieur
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Zone dangereuse */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-base text-red-700">Zone dangereuse</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-3">
            La suppression de votre compte est irréversible et entraîne la perte de toutes vos données.
          </p>
          <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" disabled>
            Supprimer mon compte (contacter le support)
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Settings() {
  const [searchParams] = useSearchParams()

  // Auto-sélectionner l'onglet Plateformes si on revient du callback OAuth LinkedIn
  const linkedinCallback = searchParams.get('linkedin')
  const tabParam = searchParams.get('tab')

  const defaultTab =
    linkedinCallback
      ? 'plateformes'
      : tabParam === 'plateformes'
        ? 'plateformes'
        : tabParam === 'compte'
          ? 'compte'
          : tabParam === 'connaissance'
            ? 'connaissance'
            : tabParam === 'billing'
              ? 'billing'
              : 'brand'

  return (
    <div className="max-w-3xl">
      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="brand">Profil de marque</TabsTrigger>
          <TabsTrigger value="plateformes">Plateformes</TabsTrigger>
          <TabsTrigger value="connaissance">Base de connaissance</TabsTrigger>
          <TabsTrigger value="billing">Facturation</TabsTrigger>
          <TabsTrigger value="compte">Compte</TabsTrigger>
        </TabsList>
        <TabsContent value="brand">
          <BrandProfileTab />
        </TabsContent>
        <TabsContent value="plateformes">
          <PlateformesTab />
        </TabsContent>
        <TabsContent value="connaissance">
          <Documents />
        </TabsContent>
        <TabsContent value="billing">
          <BillingTab />
        </TabsContent>
        <TabsContent value="compte">
          <CompteTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
