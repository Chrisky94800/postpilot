// PostPilot — Section "Prochains posts" du Dashboard

import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'
import type { Post, PostStatus } from '@/types/database'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MONTHS_FR = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc']

function formatDate(scheduledAt: string): string {
  const d = new Date(scheduledAt)
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`
}

function formatTime(time: string | null): string {
  if (!time) return '9h00'
  const [h, m] = time.split(':')
  return `${parseInt(h)}h${m === '00' ? '00' : m}`
}

// ─── Badge statut ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  waiting:  { label: 'À rédiger', bg: 'bg-amber-50',   color: 'text-amber-500' },
  draft:    { label: 'Brouillon', bg: 'bg-yellow-100', color: 'text-yellow-700' },
  approved: { label: 'Validé',    bg: 'bg-emerald-50', color: 'text-emerald-600' },
}

function StatusBadge({ status }: { status: PostStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.waiting
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${cfg.bg} ${cfg.color}`}
    >
      {cfg.label}
    </span>
  )
}

// ─── Type de la requête ───────────────────────────────────────────────────────

type UpcomingPost = Pick<Post, 'id' | 'title' | 'scheduled_at' | 'publication_time' | 'status'> & {
  programs: { title: string } | null
}

// ─── Composant ────────────────────────────────────────────────────────────────

interface NextPostsProps {
  organizationId: string
  onCreateProgram: () => void
}

export default function NextPosts({ organizationId, onCreateProgram }: NextPostsProps) {
  const navigate = useNavigate()

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts', organizationId, 'upcoming'],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, scheduled_at, publication_time, status, programs(title)')
        .eq('organization_id', organizationId)
        .in('status', ['waiting', 'draft', 'approved'])
        .gte('scheduled_at', today)
        .is('deleted_at', null)
        .order('scheduled_at', { ascending: true })
        .limit(3)
      if (error) throw error
      return data as unknown as UpcomingPost[]
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000,
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-[14px] font-bold text-gray-900">Prochains posts</h3>
        <button
          onClick={() => navigate('/calendar')}
          className="text-[13px] text-[#2563EB] font-medium hover:underline"
        >
          Voir le calendrier →
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {isLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-[68px] w-full rounded-xl" />)
        ) : posts.length === 0 ? (
          /* État vide */
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-5 text-center">
            <p className="text-[13px] text-gray-500 mb-1">Aucun post planifié.</p>
            <p className="text-xs text-gray-400 mb-3">
              Créez un programme ou rédigez un post pour commencer.
            </p>
            <button
              onClick={onCreateProgram}
              className="text-xs text-[#2563EB] font-semibold hover:underline"
            >
              Créer un programme →
            </button>
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              onClick={() => navigate(`/posts/${post.id}`)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 cursor-pointer
                         transition-colors hover:border-[#2563EB]"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-[13px] font-semibold text-gray-900 leading-snug flex-1 min-w-0 truncate">
                  {post.title ?? (
                    <span className="italic text-gray-400">Post sans titre</span>
                  )}
                </p>
                <StatusBadge status={post.status} />
              </div>
              <p className="text-[12px] text-gray-400">
                {post.scheduled_at ? formatDate(post.scheduled_at) : '—'}
                {' · '}
                {formatTime(post.publication_time)}
                {post.programs?.title && (
                  <> — <span className="text-gray-500">{post.programs.title}</span></>
                )}
              </p>
            </div>
          ))
        )}

        {/* Bouton ajout hors programme */}
        <button
          onClick={() => navigate('/posts/new')}
          className="px-4 py-2.5 rounded-xl border border-dashed border-gray-300
                     text-center text-[13px] text-gray-400 hover:border-gray-400
                     hover:text-gray-500 transition-colors"
        >
          + Ajouter un post hors programme
        </button>
      </div>
    </div>
  )
}
