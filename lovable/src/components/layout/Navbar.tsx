// PostPilot — Navbar (barre supérieure)
// Titre de la page courante + NotificationBell + menu utilisateur.

import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, User, Settings, LogOut } from 'lucide-react'
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

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'PP'

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
          <span className="hidden sm:block text-sm text-gray-700 max-w-32 truncate">
            {user?.email}
          </span>
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

export function Navbar() {
  const title = usePageTitle()

  return (
    <header className="h-14 border-b bg-white flex items-center px-4 gap-4 shrink-0">
      {/* Menu hamburger mobile (uniquement sur petit écran) */}
      <MobileSidebar />

      {/* Titre de la page */}
      <h1 className="font-semibold text-gray-900 text-base flex-1 truncate">
        {title}
      </h1>

      {/* Actions droite */}
      <div className="flex items-center gap-1">
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}
