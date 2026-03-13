// PostPilot — 4 KPI Cards du Dashboard
// Design moderne : icône colorée par métrique, valeur large, trend badge.

import { FileText, PenLine, Clock, Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardKPIs } from '@/hooks/useDashboardKPIs'

function KPICard({
  label,
  value,
  sub,
  loading,
  icon: Icon,
  iconBg,
  iconColor,
  valueColor,
}: {
  label: string
  value: string
  sub: string
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

      {/* Sous-texte */}
      <div className="text-[12px] text-gray-400">
        {sub}
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
        label="En attente"
        value={String(kpis.pendingReview)}
        sub={kpis.pendingReview === 0 ? 'rien à valider' : 'à valider'}
        loading={isLoading}
        icon={Clock}
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
        valueColor={kpis.pendingReview > 0 ? 'text-amber-600' : 'text-gray-900'}
      />
      <KPICard
        label="Quota restant"
        value={String(kpis.quotaLeft)}
        sub={kpis.maxPostsPerMonth > 0 ? `posts dispo. ce mois` : ''}
        loading={isLoading}
        icon={Sparkles}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
        valueColor={kpis.quotaLeft === 0 ? 'text-red-500' : 'text-emerald-600'}
      />
    </div>
  )
}
