// PostPilot — NotificationBell
// Cloche avec badge de non-lus + dropdown des dernières notifications.

import { Bell, CheckCheck, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn, formatRelative } from '@/lib/utils'
import { NOTIFICATION_TYPES, NOTIFICATION_PREVIEW_COUNT } from '@/lib/constants'
import { useNotifications } from '@/hooks/useNotifications'
import type { Notification } from '@/types/database'

// ─── Composant ligne de notification ─────────────────────────────────────────

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification
  onRead: (id: string) => void
}) {
  const meta = NOTIFICATION_TYPES[notification.type] ?? { label: notification.type, icon: '💬' }
  const postId = (notification.metadata as Record<string, unknown> | null)?.post_id as
    | string
    | undefined

  const handleClick = () => {
    if (!notification.is_read) onRead(notification.id)
  }

  const inner = (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer',
        !notification.is_read && 'bg-blue-50/50',
      )}
      onClick={handleClick}
    >
      <span className="text-xl mt-0.5 shrink-0">{meta.icon}</span>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm leading-snug',
            !notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-700',
          )}
        >
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {formatRelative(notification.created_at)}
        </p>
      </div>
      {!notification.is_read && (
        <span className="h-2 w-2 rounded-full bg-blue-500 mt-1 shrink-0" />
      )}
    </div>
  )

  // Lien vers le post si disponible
  if (postId) {
    return (
      <Link to={`/posts/${postId}`} className="block no-underline">
        {inner}
      </Link>
    )
  }

  return inner
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications()

  const preview = notifications.slice(0, NOTIFICATION_PREVIEW_COUNT)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`${unreadCount} notification${unreadCount !== 1 ? 's' : ''} non lue${unreadCount !== 1 ? 's' : ''}`}
        >
          <Bell className="h-5 w-5 text-gray-600" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] font-bold bg-red-500 hover:bg-red-500 border-2 border-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs text-blue-600 hover:text-blue-700"
              onClick={() => markAllAsRead()}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Tout marquer lu
            </Button>
          )}
        </div>

        {/* Liste */}
        {preview.length === 0 ? (
          <div className="py-10 text-center">
            <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Aucune notification</p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="divide-y divide-gray-100">
              {preview.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={markAsRead}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Link to="/notifications">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-gray-600"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Voir toutes les notifications
                </Button>
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
