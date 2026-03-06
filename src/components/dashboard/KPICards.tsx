// PostPilot — 4 KPI Cards du Dashboard
// Design moderne : icône colorée par métrique, valeur large, trend badge.

import { FileText, PenLine, Eye, TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardKPIs } from '@/hooks/useDashboardKPIs'

function formatNumber(n: number): string {
  return n.toLocaleString('fr-FR')
}

function TrendBadge({ trend }: { trend: number }) {
  if (trend > 0) return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
      ↑ +{trend}%
    </span>
  )
  if (trend < 0) return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
      ↓ {trend}%
    </span>
  )
  return (
    <span className="text-[11px] font-medium text-gray-400">→ stable</span>
  )
}

function KPICard({
  label,
  value,
  sub,
  trend,
  loading,
  icon: Icon,
  iconBg,
  iconColor,
  valueColor,
}: {
  label: string
  value: string
  sub: string
  trend?: number | null
  loading?: boolean
  icon: React.ElementType
  iconBg: string
  iconColor: string
  valueColor?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex-1 min-w-0 card-hover">
      {/* Icône */}
      <div className={`h-9 w-9 ${iconBg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>

      {/* Label */}
      <div className="text-[12px] text-gray-400 font-medium uppercase tracking-wide mb-1.5">
        {label}
      </div>

      {/* Valeur */}
      {loading ? (
        <Skeleton className="h-8 w-16 mb-2" />
      ) : (
        <div className={`text-[28px] font-extrabold leading-none tracking-tight mb-2 ${valueColor ?? 'text-gray-900'}`}>
          {value}
        </div>
      )}

      {/* Sous-texte / Trend */}
      <div className="text-[12px] text-gray-400 flex items-center gap-1.5">
        {trend !== undefined && trend !== null ? (
          <>
            <TrendBadge trend={trend} />
            <span>vs mois dernier</span>
          </>
        ) : (
          sub
        )}
      </div>
    </div>
  )
}

interface KPICardsProps {
  kpis: DashboardKPIs
}

export default function KPICards({ kpis }: KPICardsProps) {
  const { isLoading } = kpis

  return (
    <div className="flex gap-3.5">
      <KPICard
        label="Publiés ce mois"
        value={String(kpis.publishedThisMonth)}
        sub={kpis.maxPostsPerMonth > 0 ? `sur ${kpis.maxPostsPerMonth} dispo.` : ''}
        loading={isLoading}
        icon={FileText}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
      />
      <KPICard
        label="À rédiger"
        value={String(kpis.toWriteThisWeek)}
        sub={kpis.toWriteThisWeek === 0 ? 'rien cette semaine' : 'cette semaine'}
        loading={isLoading}
        icon={PenLine}
        iconBg="bg-violet-50"
        iconColor="text-violet-600"
      />
      <KPICard
        label="Vues LinkedIn"
        value={kpis.viewsThisMonth !== null ? formatNumber(kpis.viewsThisMonth) : '—'}
        sub="aucune donnée encore"
        trend={kpis.viewsThisMonth !== null ? kpis.viewsTrend : undefined}
        loading={isLoading}
        icon={Eye}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
      />
      <KPICard
        label="Engagement"
        value={kpis.engagementRate !== null ? `${kpis.engagementRate}%` : '—'}
        sub="aucune donnée encore"
        trend={kpis.engagementRate !== null ? kpis.engagementTrend : undefined}
        loading={isLoading}
        icon={TrendingUp}
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
        valueColor={
          kpis.engagementRate !== null && kpis.engagementRate > 3
            ? 'text-emerald-600'
            : 'text-gray-900'
        }
      />
    </div>
  )
}
