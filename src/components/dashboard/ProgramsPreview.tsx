// PostPilot — Section "Mes programmes" du Dashboard

import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'
import type { Program, Post } from '@/types/database'

// ─── Couleurs en rotation ─────────────────────────────────────────────────────

const PROGRAM_COLORS = ['#10B981', '#2563EB', '#F97316', '#8B5CF6']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function durationWeeks(startDate: string, endDate: string): number {
  const ms = new Date(endDate).getTime() - new Date(startDate).getTime()
  return Math.max(1, Math.ceil(ms / (7 * 24 * 3600 * 1000)))
}

// ─── Composant ────────────────────────────────────────────────────────────────

interface ProgramsPreviewProps {
  organizationId: string
  onOpenChat: (prefill?: string) => void
}

export default function ProgramsPreview({ organizationId, onOpenChat }: ProgramsPreviewProps) {
  const navigate = useNavigate()

  const { data: programs = [], isLoading: loadingPrograms } = useQuery({
    queryKey: ['programs', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['active', 'draft'])
        .order('created_at', { ascending: false })
        .limit(2)
      if (error) throw error
      return data as Program[]
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
  })

  const { data: posts = [] } = useQuery({
    queryKey: ['posts', organizationId, 'for-preview'],
    queryFn: async () => {
      if (programs.length === 0) return []
      const ids = programs.map((p) => p.id)
      const { data, error } = await supabase
        .from('posts')
        .select('id, program_id, status')
        .in('program_id', ids)
        .is('deleted_at', null)
      if (error) throw error
      return data as Pick<Post, 'id' | 'program_id' | 'status'>[]
    },
    enabled: programs.length > 0,
  })

  const openNewProgram = () =>
    onOpenChat('Je voudrais créer un nouveau programme de communication')

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-[14px] font-bold text-gray-900">Mes programmes</h3>
        <button
          onClick={() => navigate('/programmes')}
          className="text-[13px] text-[#2563EB] font-medium hover:underline"
        >
          Voir tout →
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        {loadingPrograms ? (
          <>
            <Skeleton className="h-[108px] rounded-[14px]" />
            <Skeleton className="h-[108px] rounded-[14px]" />
          </>
        ) : programs.length === 0 ? (
          /* État vide : carte "Nouveau programme" pleine largeur + message */
          <div
            onClick={openNewProgram}
            className="col-span-3 border-2 border-dashed border-gray-300 rounded-[14px]
                       px-4 py-6 flex flex-col items-center justify-center cursor-pointer
                       bg-gray-50 hover:border-[#2563EB] hover:bg-blue-50 transition-all"
          >
            <p className="text-xs text-gray-400 mb-2 text-center">
              Vous n'avez pas encore de programme.
              <br />
              L'assistant IA peut vous aider à planifier vos publications en quelques minutes.
            </p>
            <button className="text-xs text-[#2563EB] font-semibold hover:underline">
              Créer mon premier programme →
            </button>
          </div>
        ) : (
          <>
            {programs.map((program, idx) => {
              const programPosts = posts.filter((p) => p.program_id === program.id)
              const publishedCount = programPosts.filter((p) => p.status === 'published').length
              const totalCount = programPosts.length
              const percent = totalCount > 0 ? Math.round((publishedCount / totalCount) * 100) : 0
              const color = PROGRAM_COLORS[idx % PROGRAM_COLORS.length]
              const weeks = durationWeeks(program.start_date, program.end_date)

              return (
                <div
                  key={program.id}
                  onClick={() => navigate(`/programmes/${program.id}`)}
                  className="bg-white border border-gray-200 rounded-[14px] p-4 cursor-pointer
                             hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[13px] font-semibold text-gray-900 truncate">
                      {program.title}
                    </span>
                  </div>
                  <div className="text-[12px] text-gray-500 mb-2.5">
                    {program.posts_per_week} post{program.posts_per_week > 1 ? 's' : ''}/sem
                    {' · '}
                    {weeks} semaine{weeks > 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center justify-between text-[12px] mb-2">
                    <span className="text-gray-400">
                      {publishedCount}/{totalCount} publiés
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: percent > 0 ? color : '#9CA3AF' }}
                    >
                      {percent}%
                    </span>
                  </div>
                  <div className="h-1 rounded-sm bg-gray-100">
                    <div
                      className="h-full rounded-sm transition-all"
                      style={{ width: `${percent}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              )
            })}

            {/* Carte "Nouveau programme" */}
            <div
              onClick={openNewProgram}
              className="border-[1.5px] border-dashed border-gray-300 rounded-[14px]
                         flex flex-col items-center justify-center cursor-pointer
                         bg-gray-50 min-h-[100px]
                         hover:border-[#2563EB] hover:bg-blue-50 transition-all"
            >
              <div className="text-[22px] text-gray-400 mb-1">+</div>
              <div className="text-[13px] font-semibold text-gray-700">Nouveau programme</div>
              <div className="text-[11px] text-gray-400 mt-0.5">via l'assistant IA</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
