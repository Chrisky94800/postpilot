// PostPilot — Dashboard V2
// Assistant de communication conversationnel + KPIs + Programmes sidebar

import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, AlertCircle, Clock, BarChart2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import AIChatPanel from '@/components/dashboard/AIChatPanel'
import ProgramSidebar from '@/components/dashboard/ProgramSidebar'
import type { Post, PostStatus } from '@/types/database'

// ─── KPI Card ─────────────────────────────────────────────────────────────────

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
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">{label}</p>
            {loading ? (
              <Skeleton className="h-7 w-14 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            )}
          </div>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { organizationId, organization } = useOrganization()

  // Posts du mois en cours
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts', organizationId, 'dashboard'],
    queryFn: async () => {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('posts')
        .select('id, status, scheduled_at, created_at')
        .eq('organization_id', organizationId!)
        .is('deleted_at', null)
        .gte('created_at', startOfMonth.toISOString())
      if (error) throw error
      return data as Pick<Post, 'id' | 'status' | 'scheduled_at' | 'created_at'>[]
    },
    enabled: !!organizationId,
  })

  const counts = posts.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1
      return acc
    },
    {} as Partial<Record<PostStatus, number>>,
  )

  const publishedCount = counts['published'] ?? 0
  const waitingCount = counts['waiting'] ?? 0
  const scheduledCount = (counts['approved'] ?? 0) + (counts['scheduled'] ?? 0)
  const maxPosts = organization?.max_posts_per_month ?? 0

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {organization?.name ?? 'Tableau de bord'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Assistant de communication LinkedIn
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Publiés ce mois"
          value={publishedCount}
          icon={CheckCircle2}
          color="bg-green-50 text-green-600"
          loading={isLoading}
        />
        <KpiCard
          label="En attente"
          value={waitingCount}
          icon={AlertCircle}
          color="bg-gray-100 text-gray-500"
          loading={isLoading}
        />
        <KpiCard
          label="Approuvés"
          value={scheduledCount}
          icon={Clock}
          color="bg-blue-50 text-blue-600"
          loading={isLoading}
        />
        <KpiCard
          label="Quota mensuel"
          value={maxPosts > 0 ? `${publishedCount}/${maxPosts}` : '—'}
          icon={BarChart2}
          color="bg-purple-50 text-purple-600"
          loading={isLoading}
        />
      </div>

      {/* Zone principale : Chat IA + Programmes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chat IA — 2/3 */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-900">
                Assistant de communication
              </CardTitle>
            </CardHeader>
            <CardContent>
              {organizationId && <AIChatPanel organizationId={organizationId} />}
            </CardContent>
          </Card>
        </div>

        {/* Programmes — 1/3 */}
        <div>
          <Card className="h-full">
            <CardContent className="pt-5">
              {organizationId && <ProgramSidebar organizationId={organizationId} />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
