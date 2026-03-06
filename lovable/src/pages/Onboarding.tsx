// PostPilot — Page Onboarding (wizard 4 étapes) — Sprint 1
// StepCompany → StepStyle → StepKeywords → StepExamples → Dashboard

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Zap, ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { StepCompany }  from '@/components/onboarding/StepCompany'
import { StepStyle }    from '@/components/onboarding/StepStyle'
import { StepKeywords } from '@/components/onboarding/StepKeywords'
import { StepExamples } from '@/components/onboarding/StepExamples'
import type { StepCompanyData }   from '@/components/onboarding/StepCompany'
import type { StepStyleData }     from '@/components/onboarding/StepStyle'
import type { StepKeywordsData }  from '@/components/onboarding/StepKeywords'
import type { StepExamplesData }  from '@/components/onboarding/StepExamples'

// ─── Wizard state ─────────────────────────────────────────────────────────────

interface WizardData {
  company:  StepCompanyData
  style:    StepStyleData
  keywords: StepKeywordsData
  examples: StepExamplesData
}

const INITIAL: WizardData = {
  company: {
    company_name:    '',
    description:     '',
    industry:        '',
    target_audience: '',
  },
  style: {
    tone:        [],
    emoji_style: 2,
    post_length: 'medium',
    signature:   '',
  },
  keywords: {
    keywords:           [],
    keywords_avoid:     [],
    hashtags_preferred: [],
    hashtag_strategy:   'medium',
    ctas_preferred:     [],
  },
  examples: {
    example_posts: ['', '', ''],
    files:         [],
  },
}

// ─── Étapes ───────────────────────────────────────────────────────────────────

const STEPS = [
  { title: 'Votre entreprise',     subtitle: 'Parlez-nous de vous' },
  { title: 'Votre style',          subtitle: 'Comment vous exprimez-vous ?' },
  { title: 'Mots-clés & hashtags', subtitle: 'Guidez l\'IA' },
  { title: 'Exemples & documents', subtitle: 'Affinez votre style' },
]

// ─── Validation par étape ─────────────────────────────────────────────────────

function isStepValid(step: number, data: WizardData): boolean {
  switch (step) {
    case 1:
      return (
        data.company.company_name.trim().length > 0 &&
        data.company.industry.length > 0 &&
        data.company.description.trim().length > 0
      )
    case 2:
      return data.style.tone.length > 0
    default:
      return true
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Onboarding() {
  const [step,           setStep]           = useState(1)
  const [data,           setData]           = useState<WizardData>(INITIAL)
  const [saving,         setSaving]         = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  const { user }     = useAuth()
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()

  // ── Helpers de mise à jour partielle ──────────────────────────────────────

  const patchCompany  = (p: Partial<StepCompanyData>)  => setData((d: WizardData) => ({ ...d, company:  { ...d.company,  ...p } }))
  const patchStyle    = (p: Partial<StepStyleData>)    => setData((d: WizardData) => ({ ...d, style:    { ...d.style,    ...p } }))
  const patchKeywords = (p: Partial<StepKeywordsData>) => setData((d: WizardData) => ({ ...d, keywords: { ...d.keywords, ...p } }))
  const patchExamples = (p: Partial<StepExamplesData>) => setData((d: WizardData) => ({ ...d, examples: { ...d.examples, ...p } }))

  // ── Sauvegarde finale ──────────────────────────────────────────────────────

  const handleFinish = async () => {
    if (!user) return
    setSaving(true)

    try {
      // 1. Créer l'organisation via RPC SECURITY DEFINER ────────────────────
      // (contournement du bug auth.uid() NULL avec JWT ES256 sur nouveaux projets Supabase)
      setUploadProgress('Création de votre espace…')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: orgId, error: orgError } = await (supabase.rpc as any)(
        'create_my_organization', { p_name: data.company.company_name.trim() }
      )

      if (orgError) throw orgError
      const org = { id: orgId as string }

      // 2. Insérer le profil de marque ───────────────────────────────────────
      setUploadProgress('Enregistrement de votre profil…')
      const examplePosts = data.examples.example_posts.filter((p: string) => p.trim().length > 0)

      const { error: profileError } = await supabase
        .from('brand_profiles')
        .insert({
          organization_id:    org.id,
          company_name:       data.company.company_name.trim(),
          description:        data.company.description.trim(),
          industry:           data.company.industry,
          target_audience:    data.company.target_audience.trim() || null,
          tone:               data.style.tone,
          emoji_style:        data.style.emoji_style,
          post_length:        data.style.post_length,
          signature:          data.style.signature.trim() || null,
          keywords:           data.keywords.keywords.length    ? data.keywords.keywords    : null,
          keywords_avoid:     data.keywords.keywords_avoid,
          hashtags_preferred: data.keywords.hashtags_preferred,
          hashtag_strategy:   data.keywords.hashtag_strategy,
          ctas_preferred:     data.keywords.ctas_preferred,
          example_posts:      examplePosts.length ? examplePosts : null,
          posting_frequency:  3,
        })

      if (profileError) throw profileError

      // 3. Upload des documents + génération d'embeddings ────────────────────
      const files = data.examples.files
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          setUploadProgress(`Upload du document ${i + 1}/${files.length}…`)

          // 3a. Upload dans Supabase Storage (bucket "documents")
          const storagePath = `${org.id}/${Date.now()}-${file.name}`
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(storagePath, file, { upsert: false })

          if (uploadError) {
            console.error('[onboarding] upload error', uploadError)
            toast.warning(`"${file.name}" ignoré : ${uploadError.message}`)
            continue
          }

          const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(storagePath)

          // 3b. Insérer la row documents
          const { data: doc, error: docError } = await supabase
            .from('documents')
            .insert({
              organization_id: org.id,
              title:           file.name,
              file_url:        urlData.publicUrl,
              file_type:       file.type || 'application/octet-stream',
              file_size:       file.size,
            })
            .select('id')
            .single()

          if (docError) {
            console.error('[onboarding] document insert error', docError)
            continue
          }

          // 3c. Embedding (TXT uniquement côté client — PDF/DOCX via page Documents)
          if (file.type === 'text/plain') {
            try {
              const text = await readTextFile(file)
              await supabase.functions.invoke('generate-embedding', {
                body: { document_id: doc.id, text },
              })
            } catch (embErr) {
              console.error('[onboarding] embedding error', embErr)
              // Non bloquant : l'embedding peut être déclenché manuellement
            }
          }
        }
      }

      // 4. Invalider le cache → ProtectedRoute se met à jour ────────────────
      await queryClient.invalidateQueries({ queryKey: ['membership', user.id] })

      toast.success('Votre profil de marque est configuré ! 🎉')
      navigate('/dashboard')

    } catch (err) {
      const msg = (err as Error).message ?? 'Erreur inattendue'
      toast.error(msg)
      console.error('[onboarding] handleFinish error', err)
    } finally {
      setSaving(false)
      setUploadProgress('')
    }
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────

  const valid    = isStepValid(step, data)
  const stepInfo = STEPS[step - 1]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col items-center justify-start pt-10 pb-16 px-4">

      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="h-9 w-9 bg-[#0077B5] rounded-xl flex items-center justify-center shadow-sm">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-gray-900 text-xl tracking-tight">PostPilot</span>
      </div>

      {/* Stepper */}
      <nav className="flex items-center gap-1 mb-6" aria-label="Progression du wizard">
        {STEPS.map((_s, i) => {
          const idx     = i + 1
          const done    = step > idx
          const current = step === idx
          return (
            <div key={idx} className="flex items-center gap-1">
              <div
                className={[
                  'h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                  done    ? 'bg-green-500 text-white shadow-sm'                         : '',
                  current ? 'bg-[#0077B5] text-white shadow-md ring-4 ring-blue-200'   : '',
                  !done && !current ? 'bg-gray-200 text-gray-500'                       : '',
                ].join(' ')}
                aria-current={current ? 'step' : undefined}
              >
                {done ? <Check className="h-4 w-4" /> : idx}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-10 transition-colors ${done ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </nav>

      {/* Sous-titre étape */}
      <p className="text-xs text-gray-400 mb-6">
        Étape {step}/{STEPS.length} — {stepInfo.subtitle}
      </p>

      {/* Contenu */}
      <div className="w-full max-w-2xl bg-white rounded-2xl border shadow-sm p-6 sm:p-8">

        {step === 1 && <StepCompany  data={data.company}  onChange={patchCompany}  />}
        {step === 2 && <StepStyle    data={data.style}    onChange={patchStyle}    />}
        {step === 3 && <StepKeywords data={data.keywords} onChange={patchKeywords} />}
        {step === 4 && <StepExamples data={data.examples} onChange={patchExamples} />}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button
            variant="ghost"
            onClick={() => setStep((s: number) => s - 1)}
            disabled={step === 1 || saving}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Précédent
          </Button>

          {step < STEPS.length ? (
            <Button
              onClick={() => setStep((s: number) => s + 1)}
              disabled={!valid}
              className="bg-[#0077B5] hover:bg-[#005885] min-w-[120px]"
            >
              Suivant
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={saving}
              className="bg-[#0077B5] hover:bg-[#005885] min-w-[200px]"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  {uploadProgress || 'Enregistrement…'}
                </span>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Terminer et accéder au dashboard
                </>
              )}
            </Button>
          )}
        </div>

        {/* Lien "Passer" pour les étapes optionnelles (3 et 4) */}
        {(step === 3 || step === 4) && !saving && (
          <p className="text-center mt-4">
            <button
              type="button"
              className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
              onClick={() =>
                step < STEPS.length ? setStep((s: number) => s + 1) : handleFinish()
              }
            >
              Passer cette étape (vous pourrez compléter plus tard)
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
