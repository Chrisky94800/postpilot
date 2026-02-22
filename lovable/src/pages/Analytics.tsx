// PostPilot — Analytics LinkedIn
// Sprint 4 : graphiques engagement, top posts, insights IA.

import { useQuery } from '@tanstack/react-query'
import { TrendingUp, ThumbsUp, MessageSquare, Eye, Share2, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import { formatDate } from '@/lib/utils'
import type { PostAnalytics, Post } from '@/types/database'

// ─── Carte KPI ────────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  color: string
  loading?: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            {loading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
              </p>
            )}
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page Analytics ───────────────────────────────────────────────────────────

export default function Analytics() {
  const { organizationId } = useOrganization()

  // Analytics agrégées des 30 derniers jours
  const { data: analytics = [], isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', organizationId, '30d'],
    queryFn: async () => {
      const since = new Date()
      since.setDate(since.getDate() - 30)
      const { data, error } = await supabase
        .from('post_analytics')
        .select('*, posts(title, content, scheduled_at, platform_post_id)')
        .eq('organization_id', organizationId!)
        .gte('collected_at', since.toISOString())
        .order('collected_at', { ascending: false })
      if (error) throw error
      return data as (PostAnalytics & { posts: Pick<Post, 'title' | 'content' | 'scheduled_at' | 'platform_post_id'> | null })[]
    },
    enabled: !!organizationId,
  })

  // Posts publiés (pour la liste "top posts")
  const { data: publishedPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['posts', organizationId, 'published'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('organization_id', organizationId!)
        .eq('status', 'published')
        .is('deleted_at', null)
        .order('published_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as Post[]
    },
    enabled: !!organizationId,
  })

  // Agrégats globaux
  const totals = analytics.reduce(
    (acc, a) => ({
      likes: acc.likes + a.likes_count,
      comments: acc.comments + a.comments_count,
      shares: acc.shares + a.shares_count,
      impressions: acc.impressions + a.impressions_count,
    }),
    { likes: 0, comments: 0, shares: 0, impressions: 0 },
  )

  const avgEngagement =
    analytics.length > 0
      ? (
          analytics.reduce((s, a) => s + (a.engagement_rate ?? 0), 0) /
          analytics.length
        ).toFixed(2)
      : '—'

  const isLoading = analyticsLoading || postsLoading

  return (
    <div className="space-y-6">
      {/* KPI — 30 derniers jours */}
      <div>
        <p className="text-sm text-gray-500 mb-4">30 derniers jours</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            label="Impressions"
            value={totals.impressions}
            icon={Eye}
            color="bg-blue-50 text-blue-600"
            loading={isLoading}
          />
          <MetricCard
            label="J'aime"
            value={totals.likes}
            icon={ThumbsUp}
            color="bg-green-50 text-green-600"
            loading={isLoading}
          />
          <MetricCard
            label="Commentaires"
            value={totals.comments}
            icon={MessageSquare}
            color="bg-purple-50 text-purple-600"
            loading={isLoading}
          />
          <MetricCard
            label="Partages"
            value={totals.shares}
            icon={Share2}
            color="bg-amber-50 text-amber-600"
            loading={isLoading}
          />
          <MetricCard
            label="Eng. moyen"
            value={`${avgEngagement}%`}
            icon={TrendingUp}
            color="bg-red-50 text-red-600"
            loading={isLoading}
          />
        </div>
      </div>

      {/* Graphique — Sprint 4 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Engagement dans le temps</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : analytics.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-400">
              <TrendingUp className="h-8 w-8 mb-2 text-gray-200" />
              <p className="text-sm">Aucune donnée disponible</p>
              <p className="text-xs mt-1">
                Les analytics sont collectées après publication sur LinkedIn.
              </p>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-lg">
              <p className="text-sm">
                📊 Graphique — Sprint 4 (recharts ou nivo)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top posts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Posts publiés</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : publishedPosts.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <p className="text-sm">Aucun post publié pour l'instant.</p>
            </div>
          ) : (
            <div className="divide-y">
              {publishedPosts.map((post) => {
                const postAnalytics = analytics.find((a) => a.post_id === post.id)
                return (
                  <div key={post.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {post.title ?? post.content.slice(0, 50) + '…'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(post.published_at)}
                      </p>
                    </div>
                    {postAnalytics ? (
                      <div className="flex items-center gap-3 text-xs text-gray-600 shrink-0">
                        <span>👍 {postAnalytics.likes_count}</span>
                        <span>💬 {postAnalytics.comments_count}</span>
                        <span>👁 {postAnalytics.impressions_count.toLocaleString('fr-FR')}</span>
                        {postAnalytics.engagement_rate != null && (
                          <Badge variant="secondary">
                            {postAnalytics.engagement_rate.toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        En attente
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights IA — Sprint 4 */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            ✨ Insights IA
            <Badge variant="secondary">Sprint 4</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            L'IA analysera vos performances et vous donnera des recommandations
            personnalisées : meilleurs jours/horaires, formats qui engagent, sujets
            à approfondir…
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
