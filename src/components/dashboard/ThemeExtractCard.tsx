// PostPilot — ThemeExtractCard
// Affiche 4 thématiques proposées par l'IA.
// L'utilisateur choisit une thématique ou en demande d'autres.

import { Tag } from 'lucide-react'

interface Theme {
  id: number
  title: string
  description: string
}

interface ThemeExtractCardProps {
  themes: Theme[]
  onChoose: (theme: Theme) => void
  onRequestMore: () => void
}

export default function ThemeExtractCard({ themes, onChoose, onRequestMore }: ThemeExtractCardProps) {
  return (
    <div className="bg-violet-50 border border-violet-200 rounded-xl p-3.5 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
          <Tag className="h-3.5 w-3.5 text-violet-600" />
        </div>
        <p className="text-[13px] font-semibold text-gray-900">Choisissez une thématique</p>
      </div>

      {/* Themes list */}
      <div className="space-y-2">
        {themes.map((theme) => (
          <div
            key={theme.id}
            className="bg-white border border-violet-100 rounded-lg p-3 flex items-start gap-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-gray-900 leading-snug">{theme.title}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{theme.description}</p>
            </div>
            <button
              onClick={() => onChoose(theme)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors"
            >
              Choisir
            </button>
          </div>
        ))}
      </div>

      {/* More button */}
      <button
        onClick={onRequestMore}
        className="w-full px-3 py-2 rounded-lg text-[12px] font-medium border border-violet-200 text-violet-600 hover:bg-violet-100 transition-colors"
      >
        Proposer d'autres thématiques
      </button>
    </div>
  )
}
