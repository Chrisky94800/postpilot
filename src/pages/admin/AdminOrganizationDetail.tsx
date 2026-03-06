// PostPilot — Back-office : Détail d'une organisation

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft, Zap, Users, FileText, Layers,
  AlertTriangle, CheckCircle2, Ban, RefreshCw, ExternalLink,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type OrgDetail = {
  organization: {
    id: string
    name: string
    slug: string | null
    subscription_plan: string
    max_posts_per_month: number
    status: string
    created_at: string
    stripe_customer_id: string | null
  }
  members: {
    user_id: string
    role: string
    created_at: string
    email: string
    full_name: string | null
  }[]
  recent_posts: {
    id: string
    title: string | null
    status: string
    created_at: string
    published_at: string | null
    scheduled_at: string | null
  }[]
  linkedin: {
    is_active: boolean
    connected_at: string | null
    token_expires_at: string | null
    platform_user_id: string | null
    platform_user_name: string | null
  } | null
  stats: {
    total_posts: number
    published_this_month: number
    total_programs: number
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function formatDateFull(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const PLAN_OPTIONS = [
  { value: 'starter',  label: 'Starter — 8 posts/mois' },
  { value: 'pro',      label: 'Pro — 30 posts/mois' },
  { value: 'business', label: 'Business — 60 posts/mois' },
]

const PLAN_COLORS: Record<string, string> = {
  starter:  'bg-gray-100 text-gray-600',
  pro:      'bg-blue-100 text-blue-700',
  business: 'bg-purple-100 text-purple-700',
}

const POST_STATUS_COLORS: Record<string, string> = {
  waiting:        'bg-gray-100 text-gray-500',
  draft:          'bg-yellow-100 text-yellow-700',
  pending_review: 'bg-amber-100 text-amber-700',
  approved:       'bg-blue-100 text-blue-700',
  scheduled:      'bg-purple-100 text-purple-700',
  published:      'bg-emerald-100 text-emerald-700',
  failed:         'bg-red-100 text-red-600',
}

const POST_STATUS_LABELS: Record<string, string> = {
  waiting:        'En attente',
  draft:          'Brouillon',
  pending_review: 'En révision',
  approved:       'Approuvé',
  scheduled:      'Programmé',
  published:      'Publié',
  failed:         'Échec',
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Propriétaire', admin: 'Admin', member: 'Membre',
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <Icon className="h-4 w-4 text-gray-400" />
        <h2 className="text-[14px] font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOrganizationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [confirmAction, setConfirmAction] = useState<'suspend' | 'revoke' | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin_org_detail', id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_admin_organization_detail', {
        p_org_id: id!,
      })
      if (error) throw error
      return data as OrgDetail
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin_org_detail', id] })
    queryClient.invalidateQueries({ queryKey: ['admin_organizations'] })
    queryClient.invalidateQueries({ queryKey: ['admin_stats'] })
  }

  // Changer le forfait
  const setPlan = useMutation({
    mutationFn: async (plan: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('admin_set_plan', {
        p_org_id: id!,
        p_plan: plan,
      })
      if (error) throw error
    },
    onSuccess: () => { toast.success('Forfait mis à jour'); invalidate() },
    onError: (err) => toast.error((err as Error).message),
  })

  // Suspendre / réactiver
  const setStatus = useMutation({
    mutationFn: async (status: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('admin_set_status', {
        p_org_id: id!,
        p_status: status,
      })
      if (error) throw error
    },
    onSuccess: (_, status) => {
      toast.success(status === 'suspended' ? 'Compte suspendu' : 'Compte réactivé')
      setConfirmAction(null)
      invalidate()
    },
    onError: (err) => toast.error((err as Error).message),
  })

  // Révoquer LinkedIn
  const revokeLinkedIn = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('admin_revoke_linkedin', { p_org_id: id! })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('LinkedIn déconnecté')
      setConfirmAction(null)
      invalidate()
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const org = data?.organization
  const isSuspended = org?.status === 'suspended'

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">

      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/admin/organizations')}
        className="flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux organisations
      </button>

      {/* En-tête */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-40" />
        </div>
      ) : org && (
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[24px] font-bold text-gray-900">{org.name}</h1>
              <span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold ${PLAN_COLORS[org.subscription_plan] ?? 'bg-gray-100 text-gray-600'}`}>
                {org.subscription_plan.charAt(0).toUpperCase() + org.subscription_plan.slice(1)}
              </span>
              <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold
                ${isSuspended ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isSuspended ? 'bg-red-500' : 'bg-emerald-500'}`} />
                {isSuspended ? 'Suspendu' : 'Actif'}
              </span>
            </div>
            <p className="text-[13px] text-gray-400 mt-1">
              Inscrit le {formatDate(org.created_at)}
              {org.slug && <> · <span className="font-mono text-[12px]">{org.slug}</span></>}
            </p>
          </div>

          {/* Actions globales */}
          <div className="flex flex-wrap gap-2">
            {/* Changer le forfait */}
            <select
              value={org.subscription_plan}
              onChange={(e) => setPlan.mutate(e.target.value)}
              disabled={setPlan.isPending}
              className="px-3 py-2 text-[13px] rounded-lg border border-gray-200 bg-white
                         focus:outline-none focus:border-blue-400 text-gray-700 cursor-pointer"
            >
              {PLAN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Suspendre / réactiver */}
            {confirmAction === 'suspend' ? (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                <span className="text-[12px] text-red-700 font-medium">
                  {isSuspended ? 'Réactiver ?' : 'Suspendre ?'}
                </span>
                <button
                  onClick={() => setStatus.mutate(isSuspended ? 'active' : 'suspended')}
                  disabled={setStatus.isPending}
                  className="text-[12px] text-red-700 font-bold hover:underline"
                >
                  Confirmer
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  className="text-[12px] text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmAction('suspend')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[13px] font-medium transition-colors
                  ${isSuspended
                    ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    : 'border-red-200 text-red-600 hover:bg-red-50'
                  }`}
              >
                {isSuspended ? (
                  <><CheckCircle2 className="h-4 w-4" /> Réactiver</>
                ) : (
                  <><Ban className="h-4 w-4" /> Suspendre</>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats rapides */}
      {!isLoading && data && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: FileText,  label: 'Posts total',       value: data.stats.total_posts },
            { icon: CheckCircle2, label: 'Publiés ce mois', value: data.stats.published_this_month },
            { icon: Layers,    label: 'Programmes',        value: data.stats.total_programs },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-gray-400" />
                <p className="text-[12px] text-gray-400">{label}</p>
              </div>
              <p className="text-[24px] font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Membres */}
        <Section title="Membres" icon={Users}>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (data?.members.length ?? 0) === 0 ? (
            <p className="text-[13px] text-gray-400">Aucun membre.</p>
          ) : (
            <div className="space-y-2">
              {data?.members.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-[13px] font-medium text-gray-900">
                      {m.full_name ?? m.email}
                    </p>
                    {m.full_name && (
                      <p className="text-[12px] text-gray-400">{m.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold
                      ${m.role === 'owner' ? 'bg-amber-100 text-amber-700'
                        : m.role === 'admin' ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-500'}`}>
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                    <span className="text-[11px] text-gray-400">{formatDate(m.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* LinkedIn */}
        <Section title="LinkedIn" icon={Zap}>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !data?.linkedin ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Zap className="h-4 w-4" />
              <p className="text-[13px]">Aucun compte LinkedIn connecté.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold
                  ${data.linkedin.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${data.linkedin.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  {data.linkedin.is_active ? 'Connecté' : 'Déconnecté'}
                </span>
              </div>
              <div className="space-y-1.5 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">Nom LinkedIn</span>
                  <span className="text-gray-700 font-medium">{data.linkedin.platform_user_name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Connecté le</span>
                  <span className="text-gray-700">{formatDate(data.linkedin.connected_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Token expire</span>
                  <span className={`font-medium ${
                    data.linkedin.token_expires_at && new Date(data.linkedin.token_expires_at) < new Date()
                      ? 'text-red-500' : 'text-gray-700'
                  }`}>
                    {formatDateFull(data.linkedin.token_expires_at)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">URN</span>
                  <span className="text-gray-400 font-mono text-[11px]">
                    {data.linkedin.platform_user_id ?? '—'}
                  </span>
                </div>
              </div>

              {/* Révoquer LinkedIn */}
              {data.linkedin.is_active && (
                confirmAction === 'revoke' ? (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                    <span className="text-[12px] text-red-700 font-medium flex-1">
                      Déconnecter LinkedIn ?
                    </span>
                    <button
                      onClick={() => revokeLinkedIn.mutate()}
                      disabled={revokeLinkedIn.isPending}
                      className="text-[12px] text-red-700 font-bold hover:underline"
                    >
                      Confirmer
                    </button>
                    <button
                      onClick={() => setConfirmAction(null)}
                      className="text-[12px] text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmAction('revoke')}
                    className="flex items-center gap-1.5 text-[13px] text-red-500 hover:text-red-700 transition-colors mt-1"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Révoquer la connexion LinkedIn
                  </button>
                )
              )}
            </div>
          )}
        </Section>
      </div>

      {/* Derniers posts */}
      <Section title="Derniers posts" icon={FileText}>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (data?.recent_posts.length ?? 0) === 0 ? (
          <p className="text-[13px] text-gray-400">Aucun post.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-gray-400 font-medium">Titre</th>
                <th className="text-left py-2 px-4 text-gray-400 font-medium">Statut</th>
                <th className="text-left py-2 px-4 text-gray-400 font-medium">Créé le</th>
                <th className="text-left py-2 px-4 text-gray-400 font-medium">Publié le</th>
              </tr>
            </thead>
            <tbody>
              {data?.recent_posts.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 font-medium text-gray-800 max-w-[260px] truncate">
                    {p.title ?? <span className="italic text-gray-400">Sans titre</span>}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold
                      ${POST_STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {POST_STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400">{formatDate(p.created_at)}</td>
                  <td className="py-3 px-4 text-gray-400">{formatDate(p.published_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {org && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-[12px] text-gray-400">
              Usage ce mois : <strong className="text-gray-700">{data?.stats.published_this_month ?? 0}</strong>
              {' / '}
              <strong className="text-gray-700">{org.max_posts_per_month}</strong> posts disponibles
            </p>
            <div className="h-1.5 rounded-full bg-gray-100 mt-2 max-w-xs">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{
                  width: `${Math.min(100, ((data?.stats.published_this_month ?? 0) / (org.max_posts_per_month || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </Section>

      {/* Infos Stripe */}
      {!isLoading && org?.stripe_customer_id && (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-gray-700">Stripe</p>
              <p className="text-[12px] text-gray-400 font-mono mt-0.5">{org.stripe_customer_id}</p>
            </div>
            <a
              href={`https://dashboard.stripe.com/customers/${org.stripe_customer_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[13px] text-blue-600 hover:underline"
            >
              Ouvrir dans Stripe
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
