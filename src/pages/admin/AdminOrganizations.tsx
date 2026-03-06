// PostPilot — Back-office : Liste des organisations

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, Linkedin, Users, ChevronRight, Ban, CheckCircle2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminOrg = {
  id: string
  name: string
  slug: string | null
  subscription_plan: string
  max_posts_per_month: number
  status: string
  created_at: string
  owner_email: string | null
  member_count: number
  post_count: number
  posts_published_this_month: number
  linkedin_connected: boolean
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

function PlanBadge({ plan }: { plan: string }) {
  const labels: Record<string, string> = { starter: 'Starter', pro: 'Pro', business: 'Business' }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${PLAN_COLORS[plan] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[plan] ?? plan}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold
      ${status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {status === 'active' ? 'Actif' : 'Suspendu'}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOrganizations() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['admin_organizations', search, filterPlan, filterStatus],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_admin_organizations', {
        p_search: search || null,
        p_plan:   filterPlan || null,
        p_status: filterStatus || null,
      })
      if (error) throw error
      return (data as AdminOrg[]) ?? []
    },
    staleTime: 30 * 1000,
  })

  // Quick-action : suspendre / réactiver depuis la liste
  const toggleStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('admin_set_status', {
        p_org_id: id,
        p_status: newStatus,
      })
      if (error) throw error
    },
    onSuccess: (_, { newStatus }) => {
      toast.success(newStatus === 'suspended' ? 'Compte suspendu' : 'Compte réactivé')
      queryClient.invalidateQueries({ queryKey: ['admin_organizations'] })
      queryClient.invalidateQueries({ queryKey: ['admin_stats'] })
    },
    onError: (err) => toast.error((err as Error).message),
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">Organisations</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {isLoading ? '—' : `${orgs.length} résultat${orgs.length > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        {/* Recherche */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une organisation..."
            className="w-full pl-9 pr-4 py-2.5 text-[13px] rounded-lg border border-gray-200
                       bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
          />
        </div>

        {/* Filtre forfait */}
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="px-3 py-2.5 text-[13px] rounded-lg border border-gray-200 bg-white
                     focus:outline-none focus:border-blue-400 text-gray-700"
        >
          <option value="">Tous les forfaits</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
        </select>

        {/* Filtre statut */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 text-[13px] rounded-lg border border-gray-200 bg-white
                     focus:outline-none focus:border-blue-400 text-gray-700"
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="suspended">Suspendu</option>
        </select>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3.5 text-gray-400 font-medium">Organisation</th>
              <th className="text-left px-4 py-3.5 text-gray-400 font-medium">Forfait</th>
              <th className="text-left px-4 py-3.5 text-gray-400 font-medium">Statut</th>
              <th className="text-left px-4 py-3.5 text-gray-400 font-medium">
                <div className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Membres</div>
              </th>
              <th className="text-left px-4 py-3.5 text-gray-400 font-medium">Posts</th>
              <th className="text-left px-4 py-3.5 text-gray-400 font-medium">
                <div className="flex items-center gap-1"><Linkedin className="h-3.5 w-3.5" /> LinkedIn</div>
              </th>
              <th className="text-left px-4 py-3.5 text-gray-400 font-medium">Inscrit le</th>
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : orgs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-gray-400">
                  Aucune organisation trouvée.
                </td>
              </tr>
            ) : (
              orgs.map((org) => (
                <tr
                  key={org.id}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors group"
                  onClick={() => navigate(`/admin/organizations/${org.id}`)}
                >
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-900">{org.name}</p>
                    <p className="text-gray-400 text-[12px] mt-0.5">{org.owner_email ?? '—'}</p>
                  </td>
                  <td className="px-4 py-4"><PlanBadge plan={org.subscription_plan} /></td>
                  <td className="px-4 py-4"><StatusBadge status={org.status} /></td>
                  <td className="px-4 py-4 text-gray-600">{org.member_count}</td>
                  <td className="px-4 py-4">
                    <p className="text-gray-600">{org.post_count} total</p>
                    <p className="text-gray-400 text-[12px]">{org.posts_published_this_month} ce mois</p>
                  </td>
                  <td className="px-4 py-4">
                    {org.linkedin_connected ? (
                      <span className="flex items-center gap-1 text-[#0077B5] font-medium">
                        <Linkedin className="h-3.5 w-3.5" /> Connecté
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-gray-400">{formatDate(org.created_at)}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                         onClick={(e) => e.stopPropagation()}>
                      {/* Quick-action : suspendre/réactiver */}
                      {org.status === 'active' ? (
                        <button
                          onClick={() => toggleStatus.mutate({ id: org.id, newStatus: 'suspended' })}
                          title="Suspendre"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleStatus.mutate({ id: org.id, newStatus: 'active' })}
                          title="Réactiver"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
