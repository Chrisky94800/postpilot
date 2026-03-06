// PostPilot — Graphique d'engagement dans le temps
// Sprint 4 : recharts AreaChart, agrégé par jour

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { PostAnalytics } from '@/types/database'

interface DayData {
  date: string
  likes: number
  comments: number
  shares: number
}

function aggregateByDay(analytics: PostAnalytics[]): DayData[] {
  const map: Record<string, DayData> = {}

  for (const a of analytics) {
    const date = a.collected_at.slice(0, 10)
    const [, m, d] = date.split('-')
    const label = `${d}/${m}`

    if (!map[date]) {
      map[date] = { date: label, likes: 0, comments: 0, shares: 0 }
    }
    map[date].likes += a.likes_count
    map[date].comments += a.comments_count
    map[date].shares += a.shares_count
  }

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
}

const TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  fontSize: 12,
}

export default function EngagementChart({ data }: { data: PostAnalytics[] }) {
  const chartData = aggregateByDay(data)

  if (chartData.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorShares" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#d97706" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          formatter={(value) =>
            value === 'likes' ? "J'aime" : value === 'comments' ? 'Commentaires' : 'Partages'
          }
        />
        <Area
          type="monotone"
          dataKey="likes"
          stroke="#16a34a"
          strokeWidth={2}
          fill="url(#colorLikes)"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="comments"
          stroke="#7c3aed"
          strokeWidth={2}
          fill="url(#colorComments)"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="shares"
          stroke="#d97706"
          strokeWidth={2}
          fill="url(#colorShares)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
