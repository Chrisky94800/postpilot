// PostPilot — Page Notifications (liste complète)

import { Bell, CheckCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/hooks/useNotifications'
import { NOTIFICATION_TYPES } from '@/lib/constants'
import { formatRelative } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Notification } from '@/types/database'

export default function Notifications() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user!.id)
    if (error) { toast.error(error.message); return }
    queryClient.setQueryData<Notification[]>(
      ['notifications', user?.id],
      (prev = []) => prev.filter((n) => n.id !== id),
    )
  }

  const getPostId = (n: Notification): string | undefined =>
    (n.metadata as Record<string, unknown> | null)?.post_id as string | undefined

  return (
    <div className="max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          {unreadCount > 0 && (
            <Badge className="bg-red-100 text-red-700">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => markAllAsRead()} className="text-blue-600">
            <CheckCheck className="h-4 w-4 mr-1" />
            Tout marquer lu
          </Button>
        )}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="h-10 w-10 mx-auto mb-3 text-gray-200" />
            <p className="font-medium text-gray-700">Aucune notification</p>
            <p className="text-sm text-gray-500 mt-1">
              Vous serez notifié lorsqu'un post est généré, publié ou qu'une action est requise.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const meta = NOTIFICATION_TYPES[n.type] ?? { label: n.type, icon: '💬' }
            const postId = getPostId(n)

            return (
              <Card
                key={n.id}
                className={cn(
                  'transition-colors',
                  !n.is_read && 'border-blue-200 bg-blue-50/30',
                )}
              >
                <CardContent className="py-3 px-4 flex items-start gap-3">
                  <span className="text-xl mt-0.5 shrink-0">{meta.icon}</span>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      if (!n.is_read) markAsRead(n.id)
                      if (postId) navigate(`/posts/${postId}`)
                    }}
                  >
                    <p className={cn('text-sm leading-snug', !n.is_read ? 'font-semibold text-gray-900' : 'text-gray-700')}>
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatRelative(n.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.is_read && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500" onClick={() => markAsRead(n.id)} title="Marquer comme lu">
                        <CheckCheck className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => handleDelete(n.id)} title="Supprimer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
