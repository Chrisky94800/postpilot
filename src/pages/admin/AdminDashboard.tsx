// PostPilot — Back-office : Vue d'ensemble

import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { Building2, Users, TrendingUp, Linkedin, CalendarDays, FileText } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminStats = {
  total_organizations: number
  active_organizations: number
  suspended_organizations: number
  new_this_month: number
  plan_starter: number
  plan_pro: number
  plan_business: number
  total_posts_published: number
  posts_published_this_month: number
  linkedin_connected: number
  recent_registrations: {
    id: string
    name: string
    plan: string
    status: string
    created_at: string
    owner_email: string | null
  }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const PLAN_COLORS: Record<string, string> = {
  starter:  'bg-gray-100 text-gray-600',
  pro:      'bg-blue-100 text-blue-700',
  business: 'bg-purple-100 text-purple-700',
}

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter', pro: 'Pro', business: 'Business',
}

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${PLAN_COLORS[plan] ?? 'bg-gray-100 text-gray-600'}`}>
      {PLAN_LABELS[plan] ?? plan}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold
      ${status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
      {status === 'active' ? 'Actif' : 'Suspendu'}
    </span>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'bg-blue-50 text-blue-600',
  loading,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color?: string
  loading?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-gray-500 font-medium mb-1.5">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-[28px] font-bold text-gray-900 leading-none">{value}</p>
          )}
          {sub && <p className="text-[12px] text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin_stats'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_admin_stats')
      if (error) throw error
      return data as AdminStats
    },
    staleTime: 60 * 1000,
  })

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">

      {/* En-tête */}
      <div>
        <h1 className="text-[22px] font-bold text-gray-900">Vue d'ensemble</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">
          Tableau de bord de l'administration PostPilot
        </p>
      </div>

      {/* KPIs — ligne 1 : organisations */}
      <div>
        <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Organisations
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Building2}
            label="Total"
            value={stats?.total_organizations ?? 0}
            color="bg-slate-100 text-slate-600"
            loading={isLoading}
          />
          <StatCard
            icon={Users}
            label="Actives"
            value={stats?.active_organizations ?? 0}
            color="bg-emerald-50 text-emerald-600"
            loading={isLoading}
          />
          <StatCard
            icon={CalendarDays}
            label="Nouvelles ce mois"
            value={stats?.new_this_month ?? 0}
            color="bg-blue-50 text-blue-600"
            loading={isLoading}
          />
          <StatCard
            icon={Building2}
            label="Suspendues"
            value={stats?.suspended_organizations ?? 0}
            color="bg-red-50 text-red-500"
            loading={isLoading}
          />
        </div>
      </div>

      {/* KPIs — ligne 2 : plans + activité */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Répartition par plan */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Répartition des forfaits
          </h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {([
                { key: 'starter',  label: 'Starter',  count: stats?.plan_starter ?? 0,  color: 'bg-gray-200' },
                { key: 'pro',      label: 'Pro',      count: stats?.plan_pro ?? 0,      color: 'bg-blue-400' },
                { key: 'business', label: 'Business', count: stats?.plan_business ?? 0, color: 'bg-purple-400' },
              ]).map(({ key, label, count, color }) => {
                const total = (stats?.total_organizations ?? 1)
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={key}>
                    <div className="flex justify-between text-[13px] mb-1">
                      <span className="font-medium text-gray-700">{label}</span>
                      <span className="text-gray-500">{count} <span className="text-gray-400">({pct}%)</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${color} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Activité posts */}
        <div className="grid grid-cols-1 gap-4 content-start">
          <StatCard
            icon={FileText}
            label="Posts publiés (total)"
            value={stats?.total_posts_published ?? 0}
            color="bg-green-50 text-green-600"
            loading={isLoading}
          />
          <StatCard
            icon={TrendingUp}
            label="Publications ce mois"
            value={stats?.posts_published_this_month ?? 0}
            color="bg-amber-50 text-amber-600"
            loading={isLoading}
          />
          <StatCard
            icon={Linkedin}
            label="LinkedIn connecté"
            value={stats?.linkedin_connected ?? 0}
            sub="organisations avec un compte actif"
            color="bg-blue-50 text-[#0077B5]"
            loading={isLoading}
          />
        </div>
      </div>

      {/* Dernières inscriptions */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-[14px] font-semibold text-gray-900">Dernières inscriptions</h2>
          <button
            onClick={() => navigate('/admin/organizations')}
            className="text-[13px] text-blue-600 font-medium hover:underline"
          >
            Voir toutes →
          </button>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (stats?.recent_registrations?.length ?? 0) === 0 ? (
          <p className="p-6 text-center text-[13px] text-gray-400">
            Aucune organisation pour l'instant.
          </p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-gray-400 font-medium">Organisation</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Email propriétaire</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Forfait</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Statut</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Inscrit le</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recent_registrations.map((org) => (
                <tr
                  key={org.id}
                  onClick={() => navigate(`/admin/organizations/${org.id}`)}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3.5 font-semibold text-gray-900">{org.name}</td>
                  <td className="px-4 py-3.5 text-gray-500">{org.owner_email ?? '—'}</td>
                  <td className="px-4 py-3.5"><PlanBadge plan={org.plan} /></td>
                  <td className="px-4 py-3.5"><StatusBadge status={org.status} /></td>
                  <td className="px-4 py-3.5 text-gray-400">{formatDate(org.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
