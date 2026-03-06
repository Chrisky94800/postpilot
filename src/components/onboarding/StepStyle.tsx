// PostPilot — Onboarding Step 2 : Style de communication

import { Check } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { PostLength } from '@/types/database'

// ─── Données statiques ────────────────────────────────────────────────────────

const TONE_CARDS = [
  {
    value: 'professionnel',
    label: 'Professionnel',
    emoji: '👔',
    description: 'Formel, structuré, crédible',
    example: '"Nous avons le plaisir d\'annoncer le lancement de notre nouvelle solution…"',
  },
  {
    value: 'expert',
    label: 'Expert',
    emoji: '🎓',
    description: 'Pédagogue, analytique, autorité',
    example: '"Selon les dernières études, 73 % des entreprises qui adoptent…"',
  },
  {
    value: 'bienveillant',
    label: 'Bienveillant',
    emoji: '🤝',
    description: 'Empathique, chaleureux, accessible',
    example: '"On l\'oublie souvent, mais derrière chaque chiffre, il y a une personne…"',
  },
  {
    value: 'inspirant',
    label: 'Inspirant',
    emoji: '✨',
    description: 'Motivant, visionnaire, énergisant',
    example: '"Imaginez un monde où chaque entrepreneur dispose des mêmes outils…"',
  },
  {
    value: 'authentique',
    label: 'Authentique',
    emoji: '💬',
    description: 'Honnête, direct, personnel',
    example: '"Soyons honnêtes — j\'ai commis cette erreur moi-même au début…"',
  },
]

const EMOJI_LABELS: Record<number, string> = {
  0: 'Aucun emoji',
  1: 'Très peu',
  2: 'Quelques-uns',
  3: 'Régulièrement',
  4: 'Souvent',
  5: 'Beaucoup',
}

const LENGTH_OPTIONS: { value: PostLength; label: string; description: string }[] = [
  { value: 'short',  label: 'Court',  description: '~300 car. — Punch, accroche directe' },
  { value: 'medium', label: 'Moyen',  description: '~800 car. — Développement équilibré' },
  { value: 'long',   label: 'Long',   description: '~2 000 car. — Article approfondi' },
]

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StepStyleData {
  tone: string[]
  emoji_style: number
  post_length: PostLength
  signature: string
}

interface Props {
  data: StepStyleData
  onChange: (data: Partial<StepStyleData>) => void
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function StepStyle({ data, onChange }: Props) {
  const toggleTone = (value: string) => {
    const current = data.tone
    if (current.includes(value)) {
      onChange({ tone: current.filter((t) => t !== value) })
    } else if (current.length < 3) {
      onChange({ tone: [...current, value] })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Votre style de communication</h2>
        <p className="text-sm text-gray-500 mt-1">
          Définissez le ton et le format qui reflètent le mieux votre marque.
        </p>
      </div>

      {/* Ton éditorial */}
      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <Label>Ton éditorial</Label>
          <span className="text-xs text-gray-400">({data.tone.length}/3 maximum)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TONE_CARDS.map((card) => {
            const selected = data.tone.includes(card.value)
            const disabled = !selected && data.tone.length >= 3
            return (
              <button
                key={card.value}
                type="button"
                disabled={disabled}
                onClick={() => toggleTone(card.value)}
                className={cn(
                  'relative text-left rounded-xl border-2 p-4 transition-all',
                  selected
                    ? 'border-[#0077B5] bg-blue-50/60 shadow-sm'
                    : disabled
                      ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-[#0077B5]/50 bg-white cursor-pointer',
                )}
              >
                {selected && (
                  <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-[#0077B5] flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                )}
                <div className="text-2xl mb-2">{card.emoji}</div>
                <p className="font-semibold text-sm text-gray-900">{card.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{card.description}</p>
                <p className="text-xs text-gray-400 mt-2 italic leading-relaxed line-clamp-2">
                  {card.example}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Emojis */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Utilisation des emojis</Label>
          <span className="text-sm font-medium text-[#0077B5]">
            {EMOJI_LABELS[data.emoji_style]}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={5}
          step={1}
          value={data.emoji_style}
          onChange={(e) => onChange({ emoji_style: Number(e.target.value) })}
          className="w-full accent-[#0077B5]"
        />
        <div className="flex justify-between text-xs text-gray-400 px-1">
          <span>Aucun</span>
          <span>Quelques-uns</span>
          <span>Beaucoup</span>
        </div>
      </div>

      {/* Longueur des posts */}
      <div className="space-y-3">
        <Label>Longueur habituelle des posts</Label>
        <div className="grid grid-cols-3 gap-3">
          {LENGTH_OPTIONS.map((opt) => {
            const selected = data.post_length === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ post_length: opt.value })}
                className={cn(
                  'rounded-xl border-2 p-4 text-center transition-all',
                  selected
                    ? 'border-[#0077B5] bg-blue-50/60 shadow-sm'
                    : 'border-gray-200 hover:border-[#0077B5]/50 bg-white',
                )}
              >
                {selected && (
                  <Check className="h-4 w-4 text-[#0077B5] mx-auto mb-1" />
                )}
                <p className="font-semibold text-sm text-gray-900">{opt.label}</p>
                <p className="text-xs text-gray-500 mt-1">{opt.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Signature */}
      <div className="space-y-1.5">
        <Label htmlFor="signature">
          Signature / accroche finale <span className="text-gray-400">(optionnel)</span>
        </Label>
        <Input
          id="signature"
          placeholder='ex : 💡 Christopher – fondateur @PostPilot | Abonnez-vous pour plus de conseils'
          value={data.signature}
          onChange={(e) => onChange({ signature: e.target.value })}
          maxLength={200}
        />
        <p className="text-xs text-gray-500">
          Texte ajouté systématiquement à la fin de vos posts (optionnel).
        </p>
      </div>
    </div>
  )
}
