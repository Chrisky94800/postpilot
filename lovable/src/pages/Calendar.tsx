// PostPilot — Calendrier éditorial
// Sprint 2 : vue mois + liste des posts programmés et publiés.

import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  PenLine,
  CalendarDays,
  Maximize2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import { POST_STATUSES } from '@/lib/constants'
import { formatDateTime } from '@/lib/utils'
import type { Post } from '@/types/database'
import PostEditorContent from '@/components/editor/PostEditorContent'

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
  const queryClient = useQueryClient()
  const { organizationId } = useOrganization()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  // Bornes du mois affiché + buffer d'une semaine avant/après
  const startOfMonth = new Date(year, month, 1)
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)

  const { data: posts = [] } = useQuery({
    queryKey: ['posts', organizationId, 'calendar', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('organization_id', organizationId!)
        .is('deleted_at', null)
        .in('status', ['waiting', 'draft', 'pending_review', 'approved', 'scheduled', 'published'])
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
    setSelectedPostId(null)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
    setSelectedDay(null)
    setSelectedPostId(null)
  }

  const handlePostClick = (post: Post, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedDay(new Date(post.scheduled_at!))
    setSelectedPostId(post.id)
    // Scroll vers l'éditeur après le prochain rendu
    setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
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
                      <button
                        key={p.id}
                        onClick={(e) => handlePostClick(p, e)}
                        className={`text-[10px] px-1 py-0.5 rounded truncate w-full text-left transition-all ${
                          POST_STATUSES[p.status].color
                        } ${selectedPostId === p.id ? 'ring-1 ring-offset-1 ring-blue-500 font-semibold' : 'hover:opacity-80'}`}
                      >
                        {p.title ?? p.content?.slice(0, 20)}
                      </button>
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
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              {selectedDay.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h3>
            <button
              onClick={() => { setSelectedDay(null); setSelectedPostId(null) }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
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
            selectedPosts.map((post) => {
              const isActive = selectedPostId === post.id
              return (
                <Card
                  key={post.id}
                  className={`cursor-pointer transition-all ${
                    isActive
                      ? 'ring-2 ring-[#0077B5] shadow-md'
                      : 'hover:shadow-sm'
                  }`}
                  onClick={(e) => handlePostClick(post, e)}
                >
                  <CardContent className="py-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {post.title ?? (post.content ? post.content.slice(0, 60) + '…' : 'Sans titre')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDateTime(post.scheduled_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={POST_STATUSES[post.status].color}>
                        {POST_STATUSES[post.status].label}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={(e) => { e.stopPropagation(); navigate(`/posts/${post.id}`) }}
                      >
                        <Maximize2 className="h-3 w-3 mr-1" />
                        Plein écran
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Éditeur de post inline */}
      {selectedPostId && (
        <div ref={editorRef} className="border-t pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Édition du post</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/posts/${selectedPostId}`)}
              >
                <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
                Plein écran
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPostId(null)}
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Fermer
              </Button>
            </div>
          </div>
          <PostEditorContent
            postId={selectedPostId}
            onNewPostCreated={(id) => {
              setSelectedPostId(id)
              queryClient.invalidateQueries({ queryKey: ['posts', organizationId, 'calendar', year, month] })
            }}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['posts', organizationId, 'calendar', year, month] })
            }}
          />
        </div>
      )}
    </div>
  )
}
