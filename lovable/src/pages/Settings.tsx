// PostPilot — Page Paramètres
// Onglets : Profil de marque · Connexions LinkedIn · Équipe · Abonnement

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Linkedin, Link as LinkIcon, Check, AlertCircle,
  Loader2, Trash2, UserPlus, CreditCard,
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
import { connectLinkedIn } from '@/lib/api'
import { useOrganization } from '@/hooks/useOrganization'
import { TONE_OPTIONS, WEEK_DAYS, INDUSTRIES, SUBSCRIPTION_PLANS, MEMBER_ROLES } from '@/lib/constants'
import { formatDateTime } from '@/lib/utils'
import type { Platform, OrganizationMember } from '@/types/database'

// ─── Onglet Profil de marque ──────────────────────────────────────────────────

function BrandProfileTab() {
  const { brandProfile, updateBrandProfile, organizationId } = useOrganization()
  const [form, setForm] = useState({
    company_name: '',
    industry: '',
    description: '',
    target_audience: '',
    tone: [] as string[],
    posting_frequency: 3,
    preferred_days: [] as string[],
    keywords: [] as string[],
  })
  const [saving, setSaving] = useState(false)
  const [kwInput, setKwInput] = useState('')

  useEffect(() => {
    if (brandProfile) {
      setForm({
        company_name: brandProfile.company_name ?? '',
        industry: brandProfile.industry ?? '',
        description: brandProfile.description ?? '',
        target_audience: brandProfile.target_audience ?? '',
        tone: brandProfile.tone ?? [],
        posting_frequency: brandProfile.posting_frequency ?? 3,
        preferred_days: brandProfile.preferred_days ?? [],
        keywords: brandProfile.keywords ?? [],
      })
    }
  }, [brandProfile])

  const toggleTone = (v: string) => {
    setForm((f) => ({
      ...f,
      tone: f.tone.includes(v)
        ? f.tone.filter((t) => t !== v)
        : f.tone.length < 3 ? [...f.tone, v] : f.tone,
    }))
  }

  const toggleDay = (v: string) => {
    setForm((f) => ({
      ...f,
      preferred_days: f.preferred_days.includes(v)
        ? f.preferred_days.filter((d) => d !== v)
        : [...f.preferred_days, v],
    }))
  }

  const addKeyword = () => {
    const kw = kwInput.trim()
    if (kw && !form.keywords.includes(kw) && form.keywords.length < 15) {
      setForm((f) => ({ ...f, keywords: [...f.keywords, kw] }))
      setKwInput('')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateBrandProfile(form)
      toast.success('Profil de marque mis à jour')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nom de l'entreprise</Label>
              <Input value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Secteur d'activité</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              >
                <option value="">Choisir…</option>
                {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description de l'activité</Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Audience cible</Label>
            <Input value={form.target_audience} onChange={(e) => setForm((f) => ({ ...f, target_audience: e.target.value }))} placeholder="Dirigeants de PME, DRH…" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Style de communication</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">Tons ({form.tone.length}/3)</Label>
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map((t) => {
                const selected = form.tone.includes(t.value)
                return (
                  <button key={t.value} type="button" onClick={() => toggleTone(t.value)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selected ? 'bg-[#0077B5] text-white border-[#0077B5]' : 'border-gray-300 text-gray-700 hover:border-[#0077B5]'}`}>
                    {selected && <Check className="h-3 w-3 inline mr-1" />}{t.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Fréquence souhaitée</Label>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setForm((f) => ({ ...f, posting_frequency: n }))}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${form.posting_frequency === n ? 'bg-[#0077B5] text-white border-[#0077B5]' : 'border-gray-300 text-gray-700'}`}>
                  {n}×/sem
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
                  <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${selected ? 'bg-[#0077B5] text-white border-[#0077B5]' : 'border-gray-300 text-gray-700'}`}>
                    {d.short}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Mots-clés ({form.keywords.length}/15)</Label>
            <div className="flex gap-2 mb-2">
              <Input value={kwInput} onChange={(e) => setKwInput(e.target.value)} placeholder="Ajouter un mot-clé…" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())} />
              <Button type="button" variant="outline" onClick={addKeyword}>+</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.keywords.map((kw) => (
                <Badge key={kw} variant="secondary" className="cursor-pointer" onClick={() => setForm((f) => ({ ...f, keywords: f.keywords.filter((k) => k !== kw) }))}>
                  {kw} ×
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="bg-[#0077B5] hover:bg-[#005885]">
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Sauvegarder les modifications
      </Button>
    </div>
  )
}

// ─── Onglet Connexions ────────────────────────────────────────────────────────

function ConnectionsTab() {
  const { organizationId } = useOrganization()
  const queryClient = useQueryClient()
  const [connecting, setConnecting] = useState(false)

  // Lecture depuis l'URL (callback OAuth)
  const [searchParams] = useSearchParams()
  const linkedinStatus = searchParams.get('linkedin')

  useEffect(() => {
    if (linkedinStatus === 'connected') toast.success('LinkedIn connecté avec succès !')
    if (linkedinStatus === 'error') toast.error('Erreur lors de la connexion LinkedIn. Réessayez.')
  }, [linkedinStatus])

  const { data: platform } = useQuery({
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

  const handleDisconnect = async () => {
    if (!platform) return
    const { error } = await supabase
      .from('platforms')
      .update({ is_active: false })
      .eq('id', platform.id)
    if (error) { toast.error(error.message); return }
    queryClient.invalidateQueries({ queryKey: ['platform', organizationId] })
    toast.success('Compte LinkedIn déconnecté')
  }

  const isExpired = platform?.token_expires_at
    ? new Date(platform.token_expires_at) < new Date()
    : false

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-[#0077B5]" />
            LinkedIn
          </CardTitle>
          <CardDescription>
            Connectez votre compte LinkedIn pour publier vos posts directement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {platform?.is_active && !isExpired ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-gray-900">
                  {platform.platform_user_name ?? 'Compte connecté'}
                </span>
                <Badge className="bg-green-50 text-green-700">Actif</Badge>
              </div>
              <p className="text-xs text-gray-500">
                Token valide jusqu'au {formatDateTime(platform.token_expires_at)}
              </p>
              <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDisconnect}>
                <Trash2 className="h-4 w-4 mr-2" />
                Déconnecter
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {isExpired && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  <p className="text-sm text-amber-700">Token expiré. Reconnectez votre compte.</p>
                </div>
              )}
              <Button onClick={handleConnect} disabled={connecting} className="bg-[#0077B5] hover:bg-[#005885]">
                {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Linkedin className="h-4 w-4 mr-2" />}
                Connecter mon compte LinkedIn
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed opacity-60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Instagram <Badge variant="secondary">Phase 2</Badge>
          </CardTitle>
          <CardDescription>Disponible quand PostPilot atteint 15+ clients.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}

// ─── Onglet Abonnement ────────────────────────────────────────────────────────

function SubscriptionTab() {
  const { organization } = useOrganization()
  const plan = organization?.subscription_plan ?? 'starter'
  const planInfo = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan actuel : {planInfo?.label ?? plan}</CardTitle>
          <CardDescription>{planInfo?.price} · {planInfo?.maxPosts} posts/mois</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {planInfo?.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="h-4 w-4 text-green-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <Separator />
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline">
              <CreditCard className="h-4 w-4 mr-2" />
              Gérer l'abonnement (Stripe)
            </Button>
            {plan !== 'business' && (
              <Button className="bg-[#0077B5] hover:bg-[#005885]">
                Passer au plan supérieur
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-400">
            La gestion de l'abonnement via Stripe sera disponible au Sprint 5.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Settings() {
  const [searchParams] = useSearchParams()
  const defaultTab = searchParams.get('tab') === 'connections' ? 'connections' : 'brand'

  return (
    <div className="max-w-3xl">
      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="brand">Profil de marque</TabsTrigger>
          <TabsTrigger value="connections">Connexions</TabsTrigger>
          <TabsTrigger value="subscription">Abonnement</TabsTrigger>
        </TabsList>
        <TabsContent value="brand"><BrandProfileTab /></TabsContent>
        <TabsContent value="connections"><ConnectionsTab /></TabsContent>
        <TabsContent value="subscription"><SubscriptionTab /></TabsContent>
      </Tabs>
    </div>
  )
}
