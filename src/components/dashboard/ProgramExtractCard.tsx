// PostPilot — Carte programme proposé par l'IA (validable)

import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ExtractedItem } from '@/types/database'

interface ProgramExtractCardProps {
  item: ExtractedItem
  organizationId: string
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

// ─── Helpers date ─────────────────────────────────────────────────────────────

const DAY_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
}


const MONTHS_FR = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc']

function nextMonday(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

function weeksBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.round(ms / (7 * 24 * 3600 * 1000))
}

/** Calcule la date réelle d'un post (même logique que create-program Edge Function) */
function calculatePostDate(startDateStr: string, weekNumber: number, dayOfWeek: string): Date {
  const startDate = new Date(startDateStr + 'T09:00:00Z')
  const weekOffset = (weekNumber - 1) * 7
  const startDay = startDate.getDay()
  const targetDay = DAY_INDEX[dayOfWeek.toLowerCase()] ?? 1
  let dayDiff = targetDay - startDay
  if (dayDiff < 0) dayDiff += 7
  const postDate = new Date(startDate)
  postDate.setDate(postDate.getDate() + weekOffset + dayDiff)
  return postDate
}

function formatPostDate(date: Date): string {
  const dayShort = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][date.getUTCDay()]
  const day = date.getUTCDate()
  const month = MONTHS_FR[date.getUTCMonth()]
  return `${dayShort} ${day} ${month}`
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ProgramExtractCard({
  item,
  organizationId,
  onValidated,
  onCreateProgram,
}: ProgramExtractCardProps) {
  const [loading, setLoading] = useState(false)
  const { data } = item

  const start = data.start_date ?? nextMonday()
  const end = data.end_date ?? (data.duration_weeks ? addWeeks(start, data.duration_weeks) : addWeeks(start, 4))
  const durationWeeks = data.duration_weeks ?? weeksBetween(start, end)
  const totalPosts = data.posts?.length ?? data.posts_per_week * durationWeeks

  // Posts avec dates calculées, triés chronologiquement
  const postsWithDates = (data.posts ?? []).map((p, i) => {
    const dow = p.day_of_week ?? (['monday', 'wednesday', 'friday'][i % 3])
    const date = calculatePostDate(start, p.week, dow)
    return { ...p, day_of_week: dow, date }
  }).sort((a, b) => a.date.getTime() - b.date.getTime())

  const handleValidate = async () => {
    setLoading(true)
    try {
      await onCreateProgram({
        organization_id: organizationId,
        program: {
          title: data.title,
          description: data.description,
          start_date: start,
          end_date: end,
          posts_per_week: data.posts_per_week,
          posts: postsWithDates.map((p) => ({
            title: p.title,
            week: p.week,
            theme: p.theme,
            day_of_week: p.day_of_week,
          })),
        },
      })
      onValidated()
    } catch (err) {
      console.error('[ProgramExtractCard] createProgram error', err)
      toast.error('Erreur lors de la création du programme. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900 text-sm">{data.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {durationWeeks} semaine{durationWeeks > 1 ? 's' : ''} · {data.posts_per_week} post{data.posts_per_week > 1 ? 's' : ''}/sem · {totalPosts} posts
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-blue-700 bg-blue-100">
          Programme proposé
        </Badge>
      </div>

      {/* Liste des posts avec dates */}
      <div className="space-y-1 max-h-52 overflow-y-auto">
        {postsWithDates.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0 font-medium text-blue-600">
              {formatPostDate(p.date)} · 09:00
            </span>
            <span className="text-gray-600 truncate">{p.title}</span>
          </div>
        ))}
      </div>

      <Button
        onClick={handleValidate}
        disabled={loading}
        className="w-full bg-[#0077B5] hover:bg-[#005885] text-white"
        size="sm"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Création en cours…</>
        ) : (
          <><CheckCircle2 className="h-4 w-4 mr-2" />Valider ce programme</>
        )}
      </Button>
    </div>
  )
}
