// PostPilot — Guard admin : redirige les non-admins vers /dashboard

import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useIsAdmin } from '@/hooks/useIsAdmin'

export default function AdminGuard() {
  const { isAdmin, isLoading } = useIsAdmin()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
