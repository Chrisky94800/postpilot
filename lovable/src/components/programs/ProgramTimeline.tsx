// PostPilot — Timeline d'un programme (groupée par semaine)

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PenLine, Eye, Wand2, ChevronUp, ExternalLink } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { POST_STATUSES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import PostEditorContent from '@/components/editor/PostEditorContent'
import type { Post } from '@/types/database'

interface ProgramTimelineProps {
  posts: Post[]
  organizationId: string
}

const STATUS_ICON: Record<string, string> = {
  waiting: '⬜',
  draft: '🟡',
  pending_review: '🟠',
  approved: '🟢',
  published: '✅',
  failed: '❌',
}

export default function ProgramTimeline({ posts }: ProgramTimelineProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null)

  if (posts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        Aucun post dans ce programme.
      </div>
    )
  }

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

  const toggle = (postId: string) => {
    setExpandedPostId((prev) => (prev === postId ? null : postId))
  }

  const handleSaved = (_postId: string) => {
    setExpandedPostId(null)
    queryClient.invalidateQueries({ queryKey: ['posts', 'program'] })
    // Forcer le rechargement local en invalidant toutes les queries posts
    queryClient.invalidateQueries({ queryKey: ['posts'] })
  }

  return (
    <div className="space-y-6">
      {Object.entries(weekGroups).map(([week, weekPosts]) => (
        <div key={week}>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Semaine {week}
          </h4>

          <div className="rounded-xl border overflow-hidden bg-white divide-y divide-gray-100">
            {weekPosts.map((post) => {
              const statusMeta = POST_STATUSES[post.status]
              const icon = STATUS_ICON[post.status] ?? '⬜'
              const isExpanded = expandedPostId === post.id
              const isEditable = post.status === 'waiting' || post.status === 'draft' || post.status === 'pending_review'
              const isReadOnly = !isEditable

              return (
                <div key={post.id}>
                  {/* ── Ligne du post ── */}
                  <div
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base shrink-0">{icon}</span>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {post.title ?? post.content?.slice(0, 60) ?? 'Sans titre'}
                      </p>
                      {post.scheduled_at && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDate(post.scheduled_at)}
                          {post.publication_time && ` · ${post.publication_time.slice(0, 5)}`}
                        </p>
                      )}
                    </div>

                    <Badge className={`shrink-0 text-xs ${statusMeta.color}`}>
                      {statusMeta.label}
                    </Badge>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Bouton ouvrir éditeur plein écran */}
                      {!isReadOnly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                          title="Ouvrir l'éditeur complet"
                          onClick={() => navigate(`/posts/${post.id}`)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* Bouton toggle accordion */}
                      {isReadOnly ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-gray-500"
                          onClick={() => navigate(`/posts/${post.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Voir
                        </Button>
                      ) : (
                        <Button
                          variant={isExpanded ? 'secondary' : 'ghost'}
                          size="sm"
                          className={`h-7 px-2 text-xs ${isExpanded ? 'text-blue-700' : 'text-gray-600'}`}
                          onClick={() => toggle(post.id)}
                        >
                          {isExpanded ? (
                            <><ChevronUp className="h-3.5 w-3.5 mr-1" />Fermer</>
                          ) : post.status === 'waiting' ? (
                            <><Wand2 className="h-3.5 w-3.5 mr-1" />Rédiger</>
                          ) : (
                            <><PenLine className="h-3.5 w-3.5 mr-1" />Modifier</>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* ── Éditeur inline accordion ── */}
                  {isExpanded && (
                    <PostEditorContent
                      postId={post.id}
                      onSaved={() => handleSaved(post.id)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
