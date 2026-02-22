// PostPilot — Sidebar de navigation
// Navigation principale de l'application (desktop + mobile via Sheet).

import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  BarChart2,
  Settings,
  PenLine,
  LogOut,
  Menu,
  X,
  Linkedin,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { SUBSCRIPTION_PLANS } from '@/lib/constants'

// ─── Navigation items ─────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    label: 'Tableau de bord',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Calendrier',
    href: '/calendar',
    icon: CalendarDays,
  },
  {
    label: 'Documents',
    href: '/documents',
    icon: FileText,
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: BarChart2,
  },
] as const

const BOTTOM_ITEMS = [
  {
    label: 'Paramètres',
    href: '/settings',
    icon: Settings,
  },
] as const

// ─── NavItem composant ────────────────────────────────────────────────────────

function NavItem({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ElementType
  label: string
}) {
  return (
    <NavLink
      to={href}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'h-4 w-4 shrink-0',
              isActive ? 'text-blue-600' : 'text-gray-500',
            )}
          />
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
  const navigate = useNavigate()

  const plan = organization?.subscription_plan ?? 'starter'
  const planInfo = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS]

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-2.5">
        <div className="h-8 w-8 bg-[#0077B5] rounded-lg flex items-center justify-center">
          <Linkedin className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-gray-900 text-lg tracking-tight">
          PostPilot
        </span>
      </div>

      <Separator />

      {/* CTA principal — Rédiger un post */}
      <div className="px-3 py-4">
        <Button
          className="w-full bg-[#0077B5] hover:bg-[#005885] text-white font-medium"
          onClick={() => {
            navigate('/posts/new')
            onNavigate?.()
          }}
        >
          <PenLine className="h-4 w-4 mr-2" />
          Rédiger un post
        </Button>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 px-3 space-y-1" onClick={onNavigate}>
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Bas de sidebar */}
      <div className="px-3 py-4 space-y-1 border-t">
        {/* Plan badge */}
        {organization && (
          <div className="px-3 py-2 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 truncate font-medium">
                {organization.name}
              </span>
              <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">
                {planInfo?.label ?? plan}
              </Badge>
            </div>
          </div>
        )}

        {/* Paramètres */}
        {BOTTOM_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} onClick={onNavigate} />
        ))}

        {/* Déconnexion */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors w-full text-left"
        >
          <LogOut className="h-4 w-4 shrink-0 text-gray-500" />
          Déconnexion
        </button>

        {/* Email utilisateur */}
        {user?.email && (
          <p className="px-3 pt-1 text-xs text-gray-400 truncate">
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
      {/* Desktop — fixe à gauche */}
      <aside className="hidden lg:flex flex-col w-60 border-r bg-white h-screen sticky top-0 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile — Sheet (drawer) */}
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
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
