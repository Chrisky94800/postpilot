// PostPilot — Calendrier éditorial
// Sprint 2 : vue mois + liste des posts programmés et publiés.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  PenLine,
  CalendarDays,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import { POST_STATUSES } from '@/lib/constants'
import { formatDateTime } from '@/lib/utils'
import type { Post } from '@/types/database'

// ─── Helpers dates ────────────────────────────────────────────────────────────

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const firstDay = new Date(year, month, 1)
  // Décalage pour commencer le calendrier au lundi
  let startDay = firstDay.getDay() - 1
  if (startDay < 0) startDay = 6
  for (let i = startDay; i > 0; i--) {
    days.push(new Date(year, month, 1 - i))
  }
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d))
  }
  // Compléter jusqu'à 42 cases (6 semaines)
  while (days.length < 42) {
    days.push(new Date(year, month + 1, days.length - daysInMonth - startDay + 1))
  }
  return days
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Calendar() {
  const navigate = useNavigate()
  const { organizationId } = useOrganization()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Bornes du mois affiché + buffer d'une semaine avant/après
  const startOfMonth = new Date(year, month, 1)
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts', organizationId, 'calendar', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('organization_id', organizationId!)
        .is('deleted_at', null)
        .in('status', ['approved', 'scheduled', 'published'])
        .gte('scheduled_at', startOfMonth.toISOString())
        .lte('scheduled_at', endOfMonth.toISOString())
        .order('scheduled_at', { ascending: true })
      if (error) throw error
      return data as Post[]
    },
    enabled: !!organizationId,
  })

  const days = getDaysInMonth(year, month)

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
    setSelectedDay(null)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
    setSelectedDay(null)
  }

  const selectedPosts = selectedDay
    ? posts.filter((p) => p.scheduled_at && isSameDay(new Date(p.scheduled_at), selectedDay))
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {MONTHS_FR[month]} {year}
          </h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button
          className="bg-[#0077B5] hover:bg-[#005885]"
          onClick={() => navigate('/posts/new')}
        >
          <PenLine className="h-4 w-4 mr-2" />
          Nouveau post
        </Button>
      </div>

      {/* Grille calendrier */}
      <Card>
        <CardContent className="p-4">
          {/* En-têtes jours */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_FR.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Cases */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              const isCurrentMonth = day.getMonth() === month
              const isToday = isSameDay(day, now)
              const isSelected = selectedDay && isSameDay(day, selectedDay)
              const dayPosts = posts.filter(
                (p) => p.scheduled_at && isSameDay(new Date(p.scheduled_at), day),
              )

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(isSameDay(day, selectedDay!) ? null : day)}
                  className={`relative p-1.5 rounded-lg text-left min-h-[64px] transition-colors ${
                    isSelected
                      ? 'bg-blue-50 ring-1 ring-[#0077B5]'
                      : 'hover:bg-gray-50'
                  } ${!isCurrentMonth ? 'opacity-30' : ''}`}
                >
                  <span
                    className={`text-xs font-medium block mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-[#0077B5] text-white'
                        : 'text-gray-700'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 2).map((p) => (
                      <div
                        key={p.id}
                        className={`text-[10px] px-1 py-0.5 rounded truncate ${POST_STATUSES[p.status].color}`}
                      >
                        {p.title ?? p.content.slice(0, 20)}
                      </div>
                    ))}
                    {dayPosts.length > 2 && (
                      <div className="text-[10px] text-gray-400">
                        +{dayPosts.length - 2}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Détail du jour sélectionné */}
      {selectedDay && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">
            {selectedDay.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </h3>
          {selectedPosts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Aucun post programmé ce jour.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate('/posts/new')}
                >
                  Créer un post pour ce jour
                </Button>
              </CardContent>
            </Card>
          ) : (
            selectedPosts.map((post) => (
              <Card
                key={post.id}
                className="cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => navigate(`/posts/${post.id}`)}
              >
                <CardContent className="py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {post.title ?? post.content.slice(0, 60) + '…'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDateTime(post.scheduled_at)}
                    </p>
                  </div>
                  <Badge className={POST_STATUSES[post.status].color}>
                    {POST_STATUSES[post.status].label}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
