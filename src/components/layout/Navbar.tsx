// PostPilot — Navbar (barre supérieure)
// Titre de la page courante + NotificationBell + menu utilisateur.

import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, User, Settings, LogOut, HelpCircle } from 'lucide-react'
import { requestTourStart } from '@/hooks/useOnboardingTour'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MobileSidebar } from './Sidebar'
import { NotificationBell } from './NotificationBell'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'

// ─── Mapping route → titre ────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
  '/calendar': 'Calendrier éditorial',
  '/posts/new': 'Nouveau post',
  '/documents': 'Documents',
  '/analytics': 'Analytics',
  '/settings': 'Paramètres',
  '/notifications': 'Notifications',
}

function usePageTitle(): string {
  const { pathname } = useLocation()
  if (pathname.startsWith('/posts/') && pathname !== '/posts/new') {
    return 'Édition du post'
  }
  return PAGE_TITLES[pathname] ?? 'PostPilot'
}

// ─── Avatar utilisateur ───────────────────────────────────────────────────────

function UserMenu() {
  const { user, signOut } = useAuth()
  const { organization } = useOrganization()
  const navigate = useNavigate()

  const initials = (() => {
    const fullName = user?.user_metadata?.full_name as string | undefined
    if (fullName) {
      const parts = fullName.trim().split(/\s+/)
      if (parts.length >= 2) {
        // 1ère lettre du prénom + 2 premières lettres du nom
        return (parts[0][0] + parts[parts.length - 1].slice(0, 2)).toUpperCase()
      }
      return fullName.slice(0, 3).toUpperCase()
    }
    // Fallback sur l'email
    return user?.email ? user.email.slice(0, 2).toUpperCase() : 'PP'
  })()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-2 h-9"
          aria-label="Menu utilisateur"
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-[#0077B5] text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="font-semibold text-sm text-gray-900 truncate">
            {user?.email}
          </p>
          {organization && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {organization.name}
            </p>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => navigate('/settings?tab=profile')}>
          <User className="h-4 w-4 mr-2" />
          Mon profil
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings className="h-4 w-4 mr-2" />
          Paramètres
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-red-600 focus:text-red-700"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

function HelpButton() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const handleClick = () => {
    requestTourStart()
    if (pathname !== '/dashboard') {
      navigate('/dashboard')
    }
  }

  return (
    <button
      onClick={handleClick}
      title="Revoir la visite guidée"
      className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
    >
      <HelpCircle className="h-4 w-4" />
    </button>
  )
}

export function Navbar() {
  const title = usePageTitle()

  return (
    <header className="h-14 border-b border-gray-100 bg-white/80 backdrop-blur-md flex items-center px-4 gap-4 shrink-0 sticky top-0 z-40">
      <MobileSidebar />

      <h1 className="font-semibold text-gray-800 text-[15px] flex-1 truncate tracking-tight">
        {title}
      </h1>

      <div className="flex items-center gap-1">
        <HelpButton />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}
