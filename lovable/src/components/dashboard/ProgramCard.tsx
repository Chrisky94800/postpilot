// PostPilot — Carte compacte d'un programme (sidebar)

import { useNavigate } from 'react-router-dom'
import type { Program, Post } from '@/types/database'

interface ProgramCardProps {
  program: Program
  posts?: Post[]
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  draft: 'bg-gray-400',
  paused: 'bg-amber-500',
  completed: 'bg-blue-500',
}

export default function ProgramCard({ program, posts = [] }: ProgramCardProps) {
  const navigate = useNavigate()

  const total = posts.length
  const published = posts.filter((p) => p.status === 'published').length
  const progress = total > 0 ? Math.round((published / total) * 100) : 0

  return (
    <button
      type="button"
      onClick={() => navigate(`/programmes/${program.id}`)}
      className="w-full text-left p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors space-y-2"
    >
      <div className="flex items-start gap-2">
        <span
          className={`mt-1 h-2 w-2 rounded-full shrink-0 ${STATUS_COLORS[program.status] ?? 'bg-gray-400'}`}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{program.title}</p>
          <p className="text-xs text-gray-500">
            {program.posts_per_week} posts/sem · {program.status}
          </p>
        </div>
      </div>

      {total > 0 && (
        <div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0077B5] rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {published}/{total} publiés
          </p>
        </div>
      )}
    </button>
  )
}
