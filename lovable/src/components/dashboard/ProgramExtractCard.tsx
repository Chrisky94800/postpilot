// PostPilot — Carte programme proposé par l'IA (validable)

import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ExtractedItem } from '@/types/database'

interface ProgramExtractCardProps {
  item: ExtractedItem
  organizationId: string
  startDate?: string
  onValidated: () => void
  onCreateProgram: (payload: {
    organization_id: string
    program: {
      title: string
      description?: string
      start_date: string
      end_date: string
      posts_per_week: number
      posts: { title: string; week: number; theme?: string; day_of_week?: string }[]
    }
  }) => Promise<unknown>
}

// Calcule la end_date à partir du nombre de semaines
function addWeeks(startDate: string, weeks: number): string {
  const d = new Date(startDate)
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

function nextMonday(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export default function ProgramExtractCard({
  item,
  organizationId,
  startDate,
  onValidated,
  onCreateProgram,
}: ProgramExtractCardProps) {
  const [loading, setLoading] = useState(false)
  const { data } = item

  const start = startDate ?? nextMonday()
  const end = addWeeks(start, data.duration_weeks)

  const totalPosts = data.posts?.length ?? data.posts_per_week * data.duration_weeks

  // Group posts by week for display
  const byWeek: Record<number, typeof data.posts> = {}
  for (const p of data.posts ?? []) {
    if (!byWeek[p.week]) byWeek[p.week] = []
    byWeek[p.week].push(p)
  }

  const handleValidate = async () => {
    setLoading(true)
    try {
      await onCreateProgram({
        organization_id: organizationId,
        program: {
          title: data.title,
          start_date: start,
          end_date: end,
          posts_per_week: data.posts_per_week,
          posts: (data.posts ?? []).map((p, i) => ({
            title: p.title,
            week: p.week,
            theme: p.theme,
            day_of_week: p.day_of_week ?? (['monday','wednesday','friday'][i % 3]),
          })),
        },
      })
      onValidated()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900 text-sm">{data.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {data.duration_weeks} semaines · {data.posts_per_week} posts/sem · {totalPosts} posts au total
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-blue-700 bg-blue-100">
          Programme proposé
        </Badge>
      </div>

      {/* Aperçu des premières semaines */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {Object.entries(byWeek).slice(0, 4).map(([week, posts]) => (
          <div key={week}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Semaine {week}
            </p>
            <div className="space-y-1">
              {posts.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                  <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                  <span>{p.title}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(byWeek).length > 4 && (
          <p className="text-xs text-gray-400 italic">
            + {Object.keys(byWeek).length - 4} semaine(s) supplémentaire(s)…
          </p>
        )}
      </div>

      <Button
        onClick={handleValidate}
        disabled={loading}
        className="w-full bg-[#0077B5] hover:bg-[#005885] text-white"
        size="sm"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Création en cours…</>
        ) : (
          <><CheckCircle2 className="h-4 w-4 mr-2" /> Valider ce programme</>
        )}
      </Button>
    </div>
  )
}
