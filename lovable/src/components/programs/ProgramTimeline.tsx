// PostPilot — Timeline d'un programme (groupée par semaine)

import { useNavigate } from 'react-router-dom'
import { PenLine, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { POST_STATUSES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { Post } from '@/types/database'

interface ProgramTimelineProps {
  posts: Post[]
}

const STATUS_ICON: Record<string, string> = {
  waiting: '⬜',
  draft: '🟡',
  approved: '🟢',
  published: '✅',
  failed: '❌',
}

export default function ProgramTimeline({ posts }: ProgramTimelineProps) {
  const navigate = useNavigate()

  if (posts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        Aucun post dans ce programme.
      </div>
    )
  }

  // Grouper par semaine (on détermine la semaine relative depuis le plus ancien scheduled_at)
  const sortedPosts = [...posts].sort((a, b) =>
    (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''),
  )

  const firstDate = sortedPosts[0]?.scheduled_at
    ? new Date(sortedPosts[0].scheduled_at)
    : new Date()

  const weekGroups: Record<number, Post[]> = {}
  for (const post of sortedPosts) {
    const postDate = post.scheduled_at ? new Date(post.scheduled_at) : null
    const weekNum = postDate
      ? Math.floor((postDate.getTime() - firstDate.getTime()) / (7 * 86400000)) + 1
      : 1
    if (!weekGroups[weekNum]) weekGroups[weekNum] = []
    weekGroups[weekNum].push(post)
  }

  return (
    <div className="space-y-6">
      {Object.entries(weekGroups).map(([week, weekPosts]) => (
        <div key={week}>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Semaine {week}
          </h4>
          <div className="space-y-2">
            {weekPosts.map((post) => {
              const statusMeta = POST_STATUSES[post.status]
              const icon = STATUS_ICON[post.status] ?? '⬜'
              const canEdit = post.status === 'waiting' || post.status === 'draft'

              return (
                <div
                  key={post.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {post.title ?? post.content?.slice(0, 50) ?? 'Sans titre'}
                    </p>
                    {post.scheduled_at && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(post.scheduled_at)}
                        {post.publication_time && ` · ${post.publication_time.slice(0, 5)}`}
                      </p>
                    )}
                  </div>
                  <Badge className={`shrink-0 ${statusMeta.color}`}>
                    {statusMeta.label}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() => navigate(`/posts/${post.id}`)}
                  >
                    {canEdit ? (
                      <><PenLine className="h-3 w-3 mr-1" />Rédiger</>
                    ) : (
                      <><Eye className="h-3 w-3 mr-1" />Voir</>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
