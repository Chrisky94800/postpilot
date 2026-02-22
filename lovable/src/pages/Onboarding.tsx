// PostPilot — Page Onboarding (wizard 4 étapes)
// Sprint 1 : StepCompany → StepStyle → StepKeywords → StepExamples → Dashboard

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Linkedin, ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { TONE_OPTIONS, INDUSTRIES } from '@/lib/constants'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingData {
  // Étape 1 — Entreprise
  company_name: string
  industry: string
  description: string
  target_audience: string
  // Étape 2 — Style
  tone: string[]
  posting_frequency: number
  // Étape 3 — Mots-clés
  keywords: string[]
  // Étape 4 — Exemples
  example_posts: string[]
}

const INITIAL_DATA: OnboardingData = {
  company_name: '',
  industry: '',
  description: '',
  target_audience: '',
  tone: [],
  posting_frequency: 3,
  keywords: [],
  example_posts: [],
}

const STEPS = [
  { id: 1, title: 'Votre entreprise', description: 'Parlez-nous de vous' },
  { id: 2, title: 'Votre style', description: 'Comment vous exprimez-vous ?' },
  { id: 3, title: 'Vos mots-clés', description: 'Vos sujets d'expertise' },
  { id: 4, title: 'Exemples', description: 'Vos meilleurs posts passés' },
]

// ─── Étapes ───────────────────────────────────────────────────────────────────

function StepCompany({
  data,
  onChange,
}: {
  data: OnboardingData
  onChange: (updates: Partial<OnboardingData>) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="company_name">Nom de votre entreprise *</Label>
        <Input
          id="company_name"
          value={data.company_name}
          onChange={(e) => onChange({ company_name: e.target.value })}
          placeholder="Acme Consulting"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="industry">Secteur d'activité *</Label>
        <select
          id="industry"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={data.industry}
          onChange={(e) => onChange({ industry: e.target.value })}
        >
          <option value="">Choisissez votre secteur</option>
          {INDUSTRIES.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description de votre activité *</Label>
        <Textarea
          id="description"
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Nous aidons les PME à optimiser leur stratégie commerciale…"
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="target_audience">Votre audience cible</Label>
        <Input
          id="target_audience"
          value={data.target_audience}
          onChange={(e) => onChange({ target_audience: e.target.value })}
          placeholder="Dirigeants de PME, DRH, responsables commerciaux…"
        />
      </div>
    </div>
  )
}

function StepStyle({
  data,
  onChange,
}: {
  data: OnboardingData
  onChange: (updates: Partial<OnboardingData>) => void
}) {
  const toggleTone = (value: string) => {
    const current = data.tone
    const updated = current.includes(value)
      ? current.filter((t) => t !== value)
      : current.length < 3
      ? [...current, value]
      : current
    onChange({ tone: updated })
  }

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base">
          Choisissez jusqu'à 3 tons qui vous ressemblent *
        </Label>
        <p className="text-sm text-gray-500 mt-1 mb-3">
          {data.tone.length}/3 sélectionnés
        </p>
        <div className="flex flex-wrap gap-2">
          {TONE_OPTIONS.map((t) => {
            const selected = data.tone.includes(t.value)
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => toggleTone(t.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  selected
                    ? 'bg-[#0077B5] text-white border-[#0077B5]'
                    : 'border-gray-300 text-gray-700 hover:border-[#0077B5]'
                }`}
              >
                {selected && <Check className="h-3 w-3 inline mr-1" />}
                {t.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Fréquence de publication souhaitée</Label>
        <div className="flex gap-3 flex-wrap">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ posting_frequency: n })}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                data.posting_frequency === n
                  ? 'bg-[#0077B5] text-white border-[#0077B5]'
                  : 'border-gray-300 text-gray-700 hover:border-[#0077B5]'
              }`}
            >
              {n}×/semaine
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function StepKeywords({
  data,
  onChange,
}: {
  data: OnboardingData
  onChange: (updates: Partial<OnboardingData>) => void
}) {
  const [input, setInput] = useState('')

  const addKeyword = () => {
    const kw = input.trim()
    if (kw && !data.keywords.includes(kw) && data.keywords.length < 15) {
      onChange({ keywords: [...data.keywords, kw] })
      setInput('')
    }
  }

  const removeKeyword = (kw: string) => {
    onChange({ keywords: data.keywords.filter((k) => k !== kw) })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Ajoutez les mots-clés, sujets et expertises sur lesquels vous voulez vous positionner (max 15).
      </p>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex : transformation digitale, leadership…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addKeyword()
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addKeyword}>
          Ajouter
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.keywords.map((kw) => (
          <Badge
            key={kw}
            variant="secondary"
            className="cursor-pointer"
            onClick={() => removeKeyword(kw)}
          >
            {kw} ×
          </Badge>
        ))}
      </div>
      {data.keywords.length === 0 && (
        <p className="text-sm text-gray-400 italic">
          Aucun mot-clé ajouté. L'IA s'adaptera à votre profil de marque.
        </p>
      )}
    </div>
  )
}

function StepExamples({
  data,
  onChange,
}: {
  data: OnboardingData
  onChange: (updates: Partial<OnboardingData>) => void
}) {
  const [input, setInput] = useState('')

  const addExample = () => {
    const ex = input.trim()
    if (ex && data.example_posts.length < 3) {
      onChange({ example_posts: [...data.example_posts, ex] })
      setInput('')
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Collez jusqu'à 3 de vos meilleurs posts LinkedIn passés. L'IA s'en
        inspirera pour capter votre style naturel.
      </p>
      {data.example_posts.map((post, i) => (
        <div key={i} className="relative p-3 border rounded-lg bg-gray-50 text-sm text-gray-700">
          <p className="line-clamp-3">{post}</p>
          <button
            type="button"
            className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xs"
            onClick={() =>
              onChange({
                example_posts: data.example_posts.filter((_, idx) => idx !== i),
              })
            }
          >
            ×
          </button>
        </div>
      ))}
      {data.example_posts.length < 3 && (
        <div className="space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Collez ici le texte d'un post LinkedIn que vous aimez particulièrement…"
            rows={4}
          />
          <Button type="button" variant="outline" onClick={addExample} disabled={!input.trim()}>
            Ajouter cet exemple
          </Button>
        </div>
      )}
      {data.example_posts.length === 0 && !input && (
        <p className="text-sm text-gray-400 italic">
          Optionnel — vous pouvez compléter plus tard dans les paramètres.
        </p>
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Onboarding() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA)
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const onChange = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }

  const isStepValid = () => {
    if (step === 1) {
      return data.company_name.trim() && data.industry && data.description.trim()
    }
    if (step === 2) return data.tone.length > 0
    return true
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      // 1. Créer l'organisation
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: data.company_name })
        .select('id')
        .single()

      if (orgError) throw orgError

      // 2. Créer le brand_profile
      const { error: profileError } = await supabase
        .from('brand_profiles')
        .insert({
          organization_id: org.id,
          company_name: data.company_name,
          industry: data.industry,
          description: data.description,
          target_audience: data.target_audience || null,
          tone: data.tone,
          keywords: data.keywords.length ? data.keywords : null,
          example_posts: data.example_posts.length ? data.example_posts : null,
          posting_frequency: data.posting_frequency,
        })

      if (profileError) throw profileError

      toast.success('Votre profil de marque est prêt !')
      navigate('/dashboard')
    } catch (err) {
      toast.error((err as Error).message ?? 'Erreur lors de la configuration')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="h-9 w-9 bg-[#0077B5] rounded-xl flex items-center justify-center">
          <Linkedin className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-gray-900 text-xl">PostPilot</span>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                step > s.id
                  ? 'bg-green-500 text-white'
                  : step === s.id
                  ? 'bg-[#0077B5] text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step > s.id ? <Check className="h-4 w-4" /> : s.id}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-8 ${step > s.id ? 'bg-green-500' : 'bg-gray-200'}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{STEPS[step - 1].title}</CardTitle>
          <CardDescription>{STEPS[step - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && <StepCompany data={data} onChange={onChange} />}
          {step === 2 && <StepStyle data={data} onChange={onChange} />}
          {step === 3 && <StepKeywords data={data} onChange={onChange} />}
          {step === 4 && <StepExamples data={data} onChange={onChange} />}

          <div className="flex justify-between mt-8">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Précédent
            </Button>

            {step < 4 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!isStepValid()}
                className="bg-[#0077B5] hover:bg-[#005885]"
              >
                Suivant
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={saving}
                className="bg-[#0077B5] hover:bg-[#005885]"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Terminer et accéder au dashboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400 mt-6">
        Étape {step} sur {STEPS.length}
      </p>
    </div>
  )
}
