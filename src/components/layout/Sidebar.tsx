// PostPilot — Sidebar de navigation
// Design : dark sidebar moderne (slate-900), nav items avec indicateur actif.

import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  BarChart2,
  Settings,
  PenLine,
  LogOut,
  Menu,
  Layers,
  ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useSubscription } from '@/hooks/useSubscription'
import { UsageCounter } from '@/components/billing/UsageCounter'
import { SUBSCRIPTION_PLANS } from '@/lib/constants'

// ─── Navigation items ─────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard, tourId: undefined,               disabled: false },
  { label: 'Calendrier',      href: '/calendar',   icon: CalendarDays,    tourId: 'tour-nav-calendar',    disabled: false },
  { label: 'Programmes',      href: '/programmes',  icon: Layers,          tourId: undefined,               disabled: false },
  { label: 'Analytics',       href: '/analytics',   icon: BarChart2,       tourId: 'tour-nav-analytics',   disabled: true  },
]

const BOTTOM_ITEMS = [
  { label: 'Paramètres', href: '/settings', icon: Settings },
] as const

// ─── NavItem composant ────────────────────────────────────────────────────────

function NavItem({
  href,
  icon: Icon,
  label,
  onClick,
  tourId,
  disabled,
}: {
  href: string
  icon: React.ElementType
  label: string
  onClick?: () => void
  tourId?: string
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <div
        id={tourId}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 cursor-not-allowed select-none"
        title="Bientôt disponible"
      >
        <Icon className="h-4 w-4 shrink-0 text-slate-700" />
        <span>{label}</span>
        <span className="ml-auto text-[9px] font-semibold uppercase tracking-wide text-slate-600 border border-slate-700 rounded px-1 py-0.5 leading-tight">
          bientôt
        </span>
      </div>
    )
  }

  return (
    <NavLink
      id={tourId}
      to={href}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-white/10 text-white'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-white' : 'text-slate-500')} />
          {label}
        </>
      )}
    </NavLink>
  )
}

// ─── Contenu de la sidebar ────────────────────────────────────────────────────

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth()
  const { organization } = useOrganization()
  const { isAdmin } = useIsAdmin()
  const { usage, isTrial, planId, isLoading: subLoading } = useSubscription(organization?.id ?? null)
  const navigate = useNavigate()

  const plan = planId ?? (organization?.subscription_plan as keyof typeof SUBSCRIPTION_PLANS) ?? 'free'
  const planInfo = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS]
  const planLabel = isTrial ? `${planInfo?.label ?? plan} (trial)` : (planInfo?.label ?? plan)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">

      {/* Logo */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-2.5">
        <img src="/logo.png" alt="PostPilot" className="h-8 w-8 rounded-lg shadow-lg" />
        <span className="font-bold text-white text-lg tracking-tight">PostPilot</span>
      </div>

      {/* CTA principal */}
      <div className="px-3 pb-4">
        <Button
          className="w-full bg-gradient-to-r from-[#0077B5] to-[#005885] hover:from-[#005885] hover:to-[#004a73] text-white font-semibold shadow-md shadow-blue-900/40 border-0"
          onClick={() => {
            navigate('/posts/new')
            onNavigate?.()
          }}
        >
          <PenLine className="h-4 w-4 mr-2" />
          Rédiger un post
        </Button>
      </div>

      {/* Séparateur */}
      <div className="mx-3 h-px bg-white/5 mb-3" />

      {/* Navigation principale */}
      <nav className="flex-1 px-3 space-y-0.5" onClick={onNavigate}>
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} tourId={item.tourId} disabled={item.disabled} />
        ))}
      </nav>

      {/* Bas de sidebar */}
      <div className="px-3 py-4 space-y-0.5 border-t border-white/5">

        {/* Bloc organisation + plan + usage */}
        {organization && (
          <div className="mb-2 rounded-lg bg-white/5 overflow-hidden">
            <div className="px-3 py-2.5 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400 truncate font-medium">
                {organization.name}
              </span>
              <Badge
                className="text-[10px] shrink-0 bg-white/10 text-slate-300 border-0 hover:bg-white/10 cursor-pointer"
                onClick={() => navigate('/pricing')}
              >
                {planLabel}
              </Badge>
            </div>
            <UsageCounter usage={usage} isLoading={subLoading} />
          </div>
        )}

        {BOTTOM_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} onClick={onNavigate} />
        ))}

        {isAdmin && (
          <NavLink
            to="/admin"
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-slate-500 hover:bg-white/5 hover:text-slate-300',
              )
            }
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Administration
          </NavLink>
        )}

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all w-full text-left"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Déconnexion
        </button>

        {user?.email && (
          <p className="px-3 pt-1.5 text-xs text-slate-600 truncate">
            {user.email}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Sidebar desktop ──────────────────────────────────────────────────────────

export function Sidebar() {
  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 h-screen sticky top-0 shrink-0">
        <SidebarContent />
      </aside>
      <MobileSidebar />
    </>
  )
}

// ─── Sidebar mobile (Sheet) ───────────────────────────────────────────────────

export function MobileSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Ouvrir le menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-60 border-0">
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
