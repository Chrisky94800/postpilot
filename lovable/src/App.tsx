// PostPilot — App.tsx
// React Router v6 : routes publiques, routes protégées avec layout.

import { Suspense, lazy, type ReactNode } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Sidebar } from '@/components/layout/Sidebar'
import { Navbar } from '@/components/layout/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'

// ─── Lazy imports (code splitting) ───────────────────────────────────────────

const Landing        = lazy(() => import('@/pages/Landing'))
const Login          = lazy(() => import('@/pages/Login'))
const Onboarding     = lazy(() => import('@/pages/Onboarding'))
const Dashboard      = lazy(() => import('@/pages/Dashboard'))
const Calendar       = lazy(() => import('@/pages/Calendar'))
const PostEditor     = lazy(() => import('@/pages/PostEditor'))
const Documents      = lazy(() => import('@/pages/Documents'))
const Analytics      = lazy(() => import('@/pages/Analytics'))
const Settings       = lazy(() => import('@/pages/Settings'))
const Notifications  = lazy(() => import('@/pages/Notifications'))
const Programs       = lazy(() => import('@/pages/Programs'))
const ProgramDetail  = lazy(() => import('@/pages/ProgramDetail'))

// ─── QueryClient ──────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000, // 1 min par défaut
      refetchOnWindowFocus: false,
    },
  },
})

// ─── Écrans utilitaires ───────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-[#0077B5]" />
    </div>
  )
}

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  )
}

// ─── Route protégée ───────────────────────────────────────────────────────────
// Redirige vers /login si l'utilisateur n'est pas connecté.
// Redirige vers /onboarding si l'utilisateur n'a pas encore d'organisation.

function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { session, loading } = useAuth()
  const { hasNoOrganization, loading: orgLoading } = useOrganization()

  if (loading || orgLoading) return <LoadingScreen />

  if (!session) return <Navigate to="/login" replace />

  // Nouvel utilisateur sans organisation → onboarding obligatoire
  if (hasNoOrganization && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return children ? <>{children}</> : <Outlet />
}

// ─── Layout de l'application (sidebar + navbar + contenu) ────────────────────

function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

// ─── Route publique — redirige si déjà connecté ───────────────────────────────

function PublicRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (session) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

// ─── App principale ───────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* ── Routes publiques ─────────────────────────────────────── */}
            <Route path="/" element={<Landing />} />

            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            {/* ── Onboarding — protégé mais sans layout ────────────────── */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />

            {/* ── Routes protégées avec layout ─────────────────────────── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard"        element={<Dashboard />} />
                <Route path="/calendar"         element={<Calendar />} />
                <Route path="/posts/new"        element={<PostEditor />} />
                <Route path="/posts/:id"        element={<PostEditor />} />
                <Route path="/documents"        element={<Documents />} />
                <Route path="/analytics"        element={<Analytics />} />
                <Route path="/settings"         element={<Settings />} />
                <Route path="/notifications"    element={<Notifications />} />
                <Route path="/programmes"       element={<Programs />} />
                <Route path="/programmes/:id"   element={<ProgramDetail />} />
              </Route>
            </Route>

            {/* ── 404 → dashboard si connecté, sinon landing ───────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>

        {/* Toast notifications (Sonner) */}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          duration={4000}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
