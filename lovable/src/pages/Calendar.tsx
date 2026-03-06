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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 rounded-lg">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 rounded-lg">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">
            {MONTHS_FR[month]} <span className="text-gray-400 font-normal">{year}</span>
          </h2>
        </div>
        <Button
          className="bg-gradient-to-r from-[#0077B5] to-[#005885] hover:from-[#005885] hover:to-[#004a73] text-white shadow-sm"
          onClick={() => navigate('/posts/new')}
        >
          <PenLine className="h-4 w-4 mr-2" />
          Nouveau post
        </Button>
      </div>

      {/* Grille calendrier */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* En-têtes jours */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAYS_FR.map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide py-3">
              {d}
            </div>
          ))}
        </div>

        {/* Cases */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const isCurrentMonth = day.getMonth() === month
            const isToday = isSameDay(day, now)
            const isSelected = selectedDay && isSameDay(day, selectedDay)
            const dayPosts = posts.filter(
              (p) => p.scheduled_at && isSameDay(new Date(p.scheduled_at), day),
            )
            const isLastRow = i >= 35

            return (
              <button
                key={i}
                onClick={() => setSelectedDay(isSameDay(day, selectedDay!) ? null : day)}
                className={`relative p-2 text-left min-h-[72px] transition-colors border-r border-b border-gray-50 last:border-r-0 ${
                  isLastRow ? 'border-b-0' : ''
                } ${
                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50/80'
                } ${!isCurrentMonth ? 'opacity-25' : ''}`}
              >
                <span
                  className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full mb-1 ${
                    isToday
                      ? 'bg-gradient-to-br from-[#0077B5] to-[#005885] text-white shadow-sm'
                      : isSelected
                      ? 'text-[#0077B5]'
                      : 'text-gray-600'
                  }`}
                >
                  {day.getDate()}
                </span>
                <div className="space-y-0.5">
                  {dayPosts.slice(0, 2).map((p) => (
                    <button
                      key={p.id}
                      onClick={(e) => handlePostClick(p, e)}
                      className={`text-[10px] px-1.5 py-0.5 rounded-md truncate w-full text-left transition-all font-medium ${
                        POST_STATUSES[p.status].color
                      } ${selectedPostId === p.id ? 'ring-1 ring-offset-1 ring-blue-400' : 'hover:opacity-80'}`}
                    >
                      {p.title ?? p.content?.slice(0, 18)}
                    </button>
                  ))}
                  {dayPosts.length > 2 && (
                    <div className="text-[10px] text-gray-400 font-medium pl-1">
                      +{dayPosts.length - 2} autre{dayPosts.length - 2 > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Détail du jour sélectionné */}
      {selectedDay && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 capitalize">
              {selectedDay.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h3>
            <button
              onClick={() => { setSelectedDay(null); setSelectedPostId(null) }}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {selectedPosts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-10 text-center">
              <CalendarDays className="h-8 w-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-500">Aucun post programmé ce jour.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => navigate('/posts/new')}
              >
                Créer un post pour ce jour
              </Button>
            </div>
          ) : (
            selectedPosts.map((post) => {
              const isActive = selectedPostId === post.id
              return (
                <div
                  key={post.id}
                  className={`bg-white rounded-2xl border shadow-sm cursor-pointer transition-all p-4 flex items-start justify-between gap-4 ${
                    isActive ? 'border-[#0077B5] ring-1 ring-[#0077B5]/20 shadow-md' : 'border-gray-100 hover:border-gray-200'
                  }`}
                  onClick={(e) => handlePostClick(post, e)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {post.title ?? (post.content ? post.content.slice(0, 60) + '…' : 'Sans titre')}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDateTime(post.scheduled_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`${POST_STATUSES[post.status].color} text-[11px]`}>
                      {POST_STATUSES[post.status].label}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 rounded-lg"
                      onClick={(e) => { e.stopPropagation(); navigate(`/posts/${post.id}`) }}
                    >
                      <Maximize2 className="h-3 w-3 mr-1" />
                      Ouvrir
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Éditeur de post inline */}
      {selectedPostId && (
        <div ref={editorRef} className="border-t border-gray-100 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Édition du post</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => navigate(`/posts/${selectedPostId}`)}
              >
                <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
                Plein écran
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg"
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
