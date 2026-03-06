// PostPilot — Layout du back-office admin
// Sidebar sombre séparée de l'app principale.

import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Building2, ArrowLeft, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const NAV = [
  { to: '/admin',               label: 'Vue d\'ensemble', icon: LayoutDashboard, end: true },
  { to: '/admin/organizations', label: 'Organisations',   icon: Building2 },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">

      {/* ── Sidebar admin ────────────────────────────────────────────────── */}
      <aside className="w-56 bg-[#0F172A] flex flex-col shrink-0">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#2563EB] flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-[12px]">in</span>
            </div>
            <div>
              <p className="text-white font-bold text-[14px] leading-none">PostPilot</p>
              <p className="text-[10px] text-white/40 mt-0.5 font-medium uppercase tracking-wider">
                Admin
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors
                ${isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Pied de sidebar */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px]
                       text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Retour à l'app
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px]
                       text-white/50 hover:text-red-400 hover:bg-white/5 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Déconnexion
          </button>
          <p className="px-3 pt-1 text-[11px] text-white/30 truncate">
            {user?.email}
          </p>
        </div>
      </aside>

      {/* ── Contenu ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
