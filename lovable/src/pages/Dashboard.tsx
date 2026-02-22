// PostPilot — Dashboard
// Sprint 2 : résumé des posts, actions rapides, prochaines publications.

import { useNavigate } from 'react-router-dom'
import { PenLine, Calendar, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import { POST_STATUSES } from '@/lib/constants'
import { formatDateTime } from '@/lib/utils'
import type { Post, PostStatus } from '@/types/database'

// ─── KPI cards ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
}: {
  label: string
  value: string | number
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
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
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

// ─── Post row dans la liste ───────────────────────────────────────────────────

function PostRow({ post }: { post: Post }) {
  const navigate = useNavigate()
  const statusMeta = POST_STATUSES[post.status]

  return (
    <div
      className="flex items-center gap-4 py-3 px-4 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors"
      onClick={() => navigate(`/posts/${post.id}`)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {post.title ?? post.content.slice(0, 60) + '…'}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {post.scheduled_at
            ? `Programmé · ${formatDateTime(post.scheduled_at)}`
            : `Créé · ${formatDateTime(post.created_at)}`}
        </p>
      </div>
      <Badge className={statusMeta.color}>{statusMeta.label}</Badge>
    </div>
  )
}

// ─── Page Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()
  const { organizationId, organization } = useOrganization()

  // Posts récents
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts', organizationId, 'recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('organization_id', organizationId!)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data as Post[]
    },
    enabled: !!organizationId,
  })

  // Compteurs par statut
  const counts = posts.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1
      return acc
    },
    {} as Partial<Record<PostStatus, number>>,
  )

  const scheduledPosts = posts.filter(
    (p) => p.status === 'scheduled' || p.status === 'approved',
  )

  return (
    <div className="space-y-6">
      {/* Bienvenue */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Bonjour 👋
          </h2>
          <p className="text-gray-500 mt-1">
            {organization?.name ?? 'Votre organisation'} — voici l'état de votre contenu LinkedIn.
          </p>
        </div>
        <Button
          className="bg-[#0077B5] hover:bg-[#005885] hidden sm:flex"
          onClick={() => navigate('/posts/new')}
        >
          <PenLine className="h-4 w-4 mr-2" />
          Nouveau post
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Publiés ce mois"
          value={counts['published'] ?? 0}
          icon={CheckCircle2}
          color="bg-green-50 text-green-600"
          loading={isLoading}
        />
        <KpiCard
          label="En attente"
          value={counts['pending_review'] ?? 0}
          icon={AlertCircle}
          color="bg-amber-50 text-amber-600"
          loading={isLoading}
        />
        <KpiCard
          label="Programmés"
          value={(counts['scheduled'] ?? 0) + (counts['approved'] ?? 0)}
          icon={Clock}
          color="bg-blue-50 text-blue-600"
          loading={isLoading}
        />
        <KpiCard
          label="Posts max/mois"
          value={organization?.max_posts_per_month ?? '—'}
          icon={TrendingUp}
          color="bg-purple-50 text-purple-600"
          loading={isLoading}
        />
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-dashed"
          onClick={() => navigate('/posts/new')}
        >
          <CardContent className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <PenLine className="h-8 w-8 text-[#0077B5]" />
            <p className="font-medium text-gray-900">Rédiger un post</p>
            <p className="text-xs text-gray-500">L'IA rédige en 30 secondes</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-dashed"
          onClick={() => navigate('/calendar')}
        >
          <CardContent className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <Calendar className="h-8 w-8 text-purple-500" />
            <p className="font-medium text-gray-900">Voir le calendrier</p>
            <p className="text-xs text-gray-500">Planifiez vos publications</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-dashed"
          onClick={() => navigate('/analytics')}
        >
          <CardContent className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <p className="font-medium text-gray-900">Analytics</p>
            <p className="text-xs text-gray-500">Vos performances LinkedIn</p>
          </CardContent>
        </Card>
      </div>

      {/* Posts récents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Posts récents</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-blue-600"
            onClick={() => navigate('/calendar')}
          >
            Voir tout →
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-4 py-2 space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <PenLine className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Aucun post pour l'instant.</p>
              <Button
                className="mt-4 bg-[#0077B5] hover:bg-[#005885]"
                onClick={() => navigate('/posts/new')}
              >
                Créer votre premier post
              </Button>
            </div>
          ) : (
            <div className="px-2 pb-2">
              {posts.map((post) => (
                <PostRow key={post.id} post={post} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
