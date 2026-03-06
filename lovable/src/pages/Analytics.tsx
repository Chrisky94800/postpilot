// PostPilot — Analytics LinkedIn
// Sprint 4 : graphiques engagement (recharts), top posts, insights IA.

import { useQuery } from '@tanstack/react-query'
import { TrendingUp, ThumbsUp, MessageSquare, Eye, Share2, Lightbulb } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import { formatDate } from '@/lib/utils'
import EngagementChart from '@/components/analytics/EngagementChart'
import type { PostAnalytics, Post } from '@/types/database'

// ─── Carte KPI ────────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  loading,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  loading?: boolean
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 card-hover">
      <div className={`h-9 w-9 ${iconBg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}</div>
      {loading ? (
        <Skeleton className="h-7 w-16 mb-1" />
      ) : (
        <div className="text-[26px] font-extrabold text-gray-900 leading-none tracking-tight">
          {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
        </div>
      )}
    </div>
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
        .order('collected_at', { ascending: true })
      if (error) throw error
      return data as unknown as (PostAnalytics & { posts: Pick<Post, 'title' | 'content' | 'scheduled_at' | 'platform_post_id'> | null })[]
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

  // Insights IA (derniers générés par le workflow 09)
  const { data: insightsRow } = useQuery({
    queryKey: ['analytics_insights', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_insights')
        .select('insights, generated_at')
        .eq('organization_id', organizationId!)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as { insights: string[]; generated_at: string } | null
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
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            loading={isLoading}
          />
          <MetricCard
            label="J'aime"
            value={totals.likes}
            icon={ThumbsUp}
            iconBg="bg-green-50"
            iconColor="text-green-600"
            loading={isLoading}
          />
          <MetricCard
            label="Commentaires"
            value={totals.comments}
            icon={MessageSquare}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
            loading={isLoading}
          />
          <MetricCard
            label="Partages"
            value={totals.shares}
            icon={Share2}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            loading={isLoading}
          />
          <MetricCard
            label="Eng. moyen"
            value={`${avgEngagement}%`}
            icon={TrendingUp}
            iconBg="bg-red-50"
            iconColor="text-red-600"
            loading={isLoading}
          />
        </div>
      </div>

      {/* Graphique engagement */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Engagement dans le temps</h3>
        </div>
        <div className="p-5">
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
            <EngagementChart data={analytics} />
          )}
        </div>
      </div>

      {/* Top posts */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Posts publiés</h3>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : publishedPosts.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <p className="text-sm">Aucun post publié pour l'instant.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {publishedPosts.map((post) => {
              const postAnalytics = analytics.find((a) => a.post_id === post.id)
              return (
                <div key={post.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/60 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {post.title ?? post.content.slice(0, 50) + '…'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(post.published_at)}
                    </p>
                  </div>
                  {postAnalytics ? (
                    <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
                      <span className="flex items-center gap-1">👍 <span className="font-medium text-gray-700">{postAnalytics.likes_count}</span></span>
                      <span className="flex items-center gap-1">💬 <span className="font-medium text-gray-700">{postAnalytics.comments_count}</span></span>
                      <span className="flex items-center gap-1">👁 <span className="font-medium text-gray-700">{postAnalytics.impressions_count.toLocaleString('fr-FR')}</span></span>
                      {postAnalytics.engagement_rate != null && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                          {postAnalytics.engagement_rate.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">
                      En attente
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Insights IA */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <div className="h-7 w-7 bg-amber-50 rounded-lg flex items-center justify-center">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Insights IA</h3>
          {insightsRow && (
            <span className="text-xs font-normal text-gray-400 ml-auto">
              Généré le {formatDate(insightsRow.generated_at)}
            </span>
          )}
        </div>
        <div className="p-5">
          {insightsRow && insightsRow.insights.length > 0 ? (
            <ul className="space-y-2.5">
              {insightsRow.insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="h-5 w-5 bg-amber-50 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-amber-500 text-[10px] font-bold">{i + 1}</span>
                  </span>
                  {insight}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 leading-relaxed">
              Les insights sont générés automatiquement chaque lundi à partir de 3 posts publiés.
              Ils apparaîtront ici après la première analyse.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
