// PostPilot — Onboarding Step 3 : Mots-clés & hashtags

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { TagInput } from './TagInput'
import type { HashtagStrategy } from '@/types/database'

// ─── Données statiques ────────────────────────────────────────────────────────

const HASHTAG_STRATEGY_OPTIONS: {
  value: HashtagStrategy
  label: string
  description: string
}[] = [
  { value: 'none',   label: 'Aucun',     description: 'Pas de hashtags' },
  { value: 'few',    label: '1 – 3',     description: 'Ciblés, très sélectifs' },
  { value: 'medium', label: '4 – 7',     description: 'Mix niche + volume' },
  { value: 'many',   label: '8+',        description: 'Large portée' },
]

const CTA_SUGGESTIONS = [
  'Dites-moi en commentaires…',
  'Partagez si vous êtes d\'accord 🔄',
  'Abonnez-vous pour ne rien manquer',
  'Qu\'en pensez-vous ?',
  'Suivez-moi pour plus de conseils',
  'Contactez-moi en DM',
]

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StepKeywordsData {
  keywords: string[]
  keywords_avoid: string[]
  hashtags_preferred: string[]
  hashtag_strategy: HashtagStrategy
  ctas_preferred: string[]
}

interface Props {
  data: StepKeywordsData
  onChange: (data: Partial<StepKeywordsData>) => void
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function StepKeywords({ data, onChange }: Props) {
  const toggleCta = (cta: string) => {
    if (data.ctas_preferred.includes(cta)) {
      onChange({ ctas_preferred: data.ctas_preferred.filter((c) => c !== cta) })
    } else if (data.ctas_preferred.length < 5) {
      onChange({ ctas_preferred: [...data.ctas_preferred, cta] })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Mots-clés & hashtags</h2>
        <p className="text-sm text-gray-500 mt-1">
          Guidez l'IA sur le vocabulaire à utiliser (ou éviter) dans vos posts.
        </p>
      </div>

      {/* Mots-clés à utiliser */}
      <div className="space-y-1.5">
        <Label>Mots-clés à mettre en avant</Label>
        <TagInput
          tags={data.keywords}
          onChange={(tags) => onChange({ keywords: tags })}
          placeholder="ex : transformation digitale, productivité…"
          maxTags={15}
          transform={(v) => v.toLowerCase()}
        />
        <p className="text-xs text-gray-500">
          Termes clés de votre activité que l'IA devra intégrer naturellement.
        </p>
      </div>

      {/* Mots-clés à éviter */}
      <div className="space-y-1.5">
        <Label>Mots / expressions à éviter</Label>
        <TagInput
          tags={data.keywords_avoid}
          onChange={(tags) => onChange({ keywords_avoid: tags })}
          placeholder="ex : disruptif, synergies, paradigme…"
          maxTags={15}
          transform={(v) => v.toLowerCase()}
        />
        <p className="text-xs text-gray-500">
          Jargon, buzzwords ou termes qui ne correspondent pas à votre image.
        </p>
      </div>

      {/* Hashtags */}
      <div className="space-y-1.5">
        <Label>Hashtags favoris</Label>
        <TagInput
          tags={data.hashtags_preferred}
          onChange={(tags) => onChange({ hashtags_preferred: tags })}
          placeholder="ex : ia, marketing, entrepreneuriat…"
          maxTags={20}
          prefix="#"
          transform={(v) => v.toLowerCase().replace(/^#/, '')}
        />
        <p className="text-xs text-gray-500">
          Saisissez sans le # — il sera ajouté automatiquement.
        </p>
      </div>

      {/* Stratégie hashtags */}
      <div className="space-y-2">
        <Label>Stratégie de hashtags</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {HASHTAG_STRATEGY_OPTIONS.map((opt) => {
            const selected = data.hashtag_strategy === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ hashtag_strategy: opt.value })}
                className={cn(
                  'rounded-lg border-2 p-3 text-center transition-all',
                  selected
                    ? 'border-[#0077B5] bg-blue-50/60'
                    : 'border-gray-200 hover:border-[#0077B5]/40 bg-white',
                )}
              >
                <p className="font-semibold text-sm text-gray-900">{opt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* CTAs préférés */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <Label>Call-to-action préférés</Label>
          <span className="text-xs text-gray-400">({data.ctas_preferred.length}/5)</span>
        </div>
        <p className="text-xs text-gray-500">
          Choisissez parmi les suggestions ou ajoutez les vôtres via le champ ci-dessous.
        </p>
        {/* Suggestions rapides */}
        <div className="flex flex-wrap gap-2">
          {CTA_SUGGESTIONS.map((cta) => {
            const selected = data.ctas_preferred.includes(cta)
            const disabled = !selected && data.ctas_preferred.length >= 5
            return (
              <button
                key={cta}
                type="button"
                disabled={disabled}
                onClick={() => toggleCta(cta)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs border transition-colors',
                  selected
                    ? 'bg-[#0077B5] text-white border-[#0077B5]'
                    : disabled
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 text-gray-700 hover:border-[#0077B5]',
                )}
              >
                {cta}
              </button>
            )
          })}
        </div>
        {/* Champ libre */}
        <TagInput
          tags={data.ctas_preferred}
          onChange={(tags) => onChange({ ctas_preferred: tags })}
          placeholder="Ou écrivez votre propre CTA…"
          maxTags={5}
        />
      </div>
    </div>
  )
}
