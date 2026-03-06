// PostPilot — Section "Actions rapides" du Dashboard

import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface QuickActionsProps {
  organizationId: string
  onOpenChat: (prefill?: string) => void
}

function ActionButton({
  icon,
  label,
  desc,
  onClick,
  primary,
  iconBg,
  id,
}: {
  icon: string
  label: string
  desc: string
  onClick: () => void
  primary?: boolean
  iconBg?: string
  id?: string
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`
        group flex items-center gap-3.5 w-full text-left px-4 py-3.5 rounded-xl border
        transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
        ${primary
          ? 'bg-gradient-to-r from-[#0077B5] to-[#005885] border-transparent text-white shadow-md shadow-blue-200'
          : 'bg-white border-gray-100 text-gray-900 hover:border-gray-200 shadow-sm'
        }
      `}
    >
      <div
        className={`
          w-10 h-10 rounded-xl flex items-center justify-center text-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110
          ${primary ? 'bg-white/15' : (iconBg ?? 'bg-gray-50')}
        `}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className={`text-[13px] font-semibold truncate ${primary ? 'text-white' : 'text-gray-900'}`}>
          {label}
        </div>
        <div className={`text-[11px] mt-0.5 truncate ${primary ? 'text-white/70' : 'text-gray-400'}`}>
          {desc}
        </div>
      </div>
    </button>
  )
}

export default function QuickActions({ organizationId, onOpenChat }: QuickActionsProps) {
  const navigate = useNavigate()

  const { data: hasLinkedIn = false } = useQuery({
    queryKey: ['platforms', organizationId, 'linkedin_active'],
    queryFn: async () => {
      const { count } = await supabase
        .from('platforms')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('platform_type', 'linkedin')
        .eq('is_active', true)
      return (count ?? 0) > 0
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Actions rapides
      </h3>
      <div className="flex flex-col gap-2">
        <ActionButton
          icon="💬"
          label="Parler à mon assistant"
          desc="Planifier, idées, programme de communication..."
          onClick={() => onOpenChat()}
          primary
        />
        <ActionButton
          id="tour-create-post"
          icon="✍️"
          label="Rédiger un post"
          desc="À partir d'une idée, d'un article ou d'un document"
          onClick={() => navigate('/posts/new')}
          iconBg="bg-violet-50"
        />
        <ActionButton
          id="tour-create-program"
          icon="📋"
          label="Créer un programme"
          desc="Planifier plusieurs semaines de publications"
          onClick={() => onOpenChat('Je voudrais créer un nouveau programme de communication')}
          iconBg="bg-blue-50"
        />
        {!hasLinkedIn ? (
          <ActionButton
            icon="🔗"
            label="Connecter LinkedIn"
            desc="Activer la publication automatique"
            onClick={() => navigate('/settings?tab=platforms')}
            iconBg="bg-sky-50"
          />
        ) : (
          <ActionButton
            icon="📈"
            label="Voir mes analytics"
            desc="Performances de vos posts LinkedIn"
            onClick={() => navigate('/analytics')}
            iconBg="bg-emerald-50"
          />
        )}
      </div>
    </div>
  )
}
