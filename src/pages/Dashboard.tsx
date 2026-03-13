// PostPilot — Dashboard V2
// Layout : Top Bar · Nom entreprise · 4 KPIs · [Actions | Prochains posts] · Programmes
// Chat IA disponible via un drawer glissant depuis la droite.

import { useState, useCallback } from 'react'
import { useOrganization } from '@/hooks/useOrganization'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardKPIs } from '@/hooks/useDashboardKPIs'
import { useOnboardingTour } from '@/hooks/useOnboardingTour'
import KPICards from '@/components/dashboard/KPICards'
import QuickActions from '@/components/dashboard/QuickActions'
import NextPosts from '@/components/dashboard/NextPosts'
import ProgramsPreview from '@/components/dashboard/ProgramsPreview'
import ChatDrawer from '@/components/dashboard/ChatDrawer'
import { OnboardingTour } from '@/components/onboarding/OnboardingTour'

export default function Dashboard() {
  const { organization, organizationId } = useOrganization()
  const { user } = useAuth()
  const kpis = useDashboardKPIs(organizationId)
  const { shouldShow: showTour, markSeen: markTourSeen } = useOnboardingTour()

  // ── Chat drawer ────────────────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false)
  const [chatPrefill, setChatPrefill] = useState<string | null>(null)

  const openChat = useCallback((prefill?: string) => {
    setChatPrefill(prefill ?? null)
    setChatOpen(true)
  }, [])

  const closeChat = useCallback(() => {
    setChatOpen(false)
  }, [])

  // ── Infos utilisateur ─────────────────────────────────────────────────────
  const userName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split('@')[0] ??
    undefined

  const firstName = userName?.split(' ')[0]

  return (
    <>
      <div className="space-y-5 min-h-full bg-[#F8F9FB] -m-6 p-6">

        {/* ── Tour guidé (1ère visite) ──────────────────────────────────────── */}
        {showTour && <OnboardingTour onDone={markTourSeen} />}

        {/* ── Greeting ─────────────────────────────────────────────────────── */}
        <div>
          <p className="text-[18px] font-bold text-gray-900">
            {firstName ? `Bonjour ${firstName} 👋` : 'Bonjour 👋'}
          </p>
          <p className="text-[13px] text-gray-400 mt-px">
            Ton assistant PostPilot est disponible pour ton prochain post LinkedIn
          </p>
        </div>

        {/* ── 4 KPI Cards ──────────────────────────────────────────────────── */}
        <div id="tour-kpi">
          <KPICards kpis={kpis} />
        </div>

        {/* ── 2 colonnes : Actions rapides | Prochains posts ───────────────── */}
        {organizationId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <QuickActions
              organizationId={organizationId}
              onOpenChat={openChat}
            />
            <NextPosts
              organizationId={organizationId}
              onCreateProgram={() =>
                openChat('Je voudrais créer un nouveau programme de communication')
              }
            />
          </div>
        )}

        {/* ── Mes programmes ───────────────────────────────────────────────── */}
        {organizationId && (
          <ProgramsPreview
            organizationId={organizationId}
            onOpenChat={openChat}
          />
        )}

      </div>

      {/* ── Chat Drawer (position fixed, hors flux) ───────────────────────── */}
      {organizationId && (
        <ChatDrawer
          isOpen={chatOpen}
          onClose={closeChat}
          organizationId={organizationId}
          userName={userName}
          toWriteThisWeek={kpis.toWriteThisWeek}
          initialMessage={chatPrefill}
        />
      )}
    </>
  )
}
