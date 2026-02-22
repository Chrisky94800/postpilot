// PostPilot — Hook de notifications
// Charge les notifications + souscrit au Realtime Supabase pour les nouvelles.

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Notification } from '@/types/database'

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  /** Marque une notification comme lue */
  markAsRead: (notificationId: string) => Promise<void>
  /** Marque toutes les notifications comme lues */
  markAllAsRead: () => Promise<void>
}

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // ── Chargement initial ────────────────────────────────────────────────────
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as Notification[]
    },
    enabled: !!user,
    staleTime: 30_000, // 30 s — sera de toute façon invalidé par le Realtime
  })

  // ── Realtime : écoute des nouvelles notifications ─────────────────────────
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`notifications:user:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Ajoute la nouvelle notification en tête de liste sans refetch
          queryClient.setQueryData<Notification[]>(
            ['notifications', user.id],
            (prev = []) => [payload.new as Notification, ...prev],
          )
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.setQueryData<Notification[]>(
            ['notifications', user.id],
            (prev = []) =>
              prev.map((n) =>
                n.id === (payload.new as Notification).id
                  ? (payload.new as Notification)
                  : n,
              ),
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, queryClient])

  // ── Mutations ─────────────────────────────────────────────────────────────
  const { mutateAsync: markAsRead } = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user!.id)
      if (error) throw error
    },
    onSuccess: (_, notificationId) => {
      queryClient.setQueryData<Notification[]>(
        ['notifications', user?.id],
        (prev = []) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n,
          ),
      )
    },
  })

  const { mutateAsync: markAllAsRead } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user!.id)
        .eq('is_read', false)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.setQueryData<Notification[]>(
        ['notifications', user?.id],
        (prev = []) => prev.map((n) => ({ ...n, is_read: true })),
      )
    },
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return {
    notifications,
    unreadCount,
    loading: isLoading,
    markAsRead,
    markAllAsRead,
  }
}
