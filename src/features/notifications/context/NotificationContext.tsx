import { useState, useEffect, useCallback, useMemo } from 'react'
import type { FC, ReactNode } from 'react'
import { supabase } from '../../../lib/supabase.ts'
import { createDebounce } from '../../../lib/realtime.ts'
import type { RealtimeConnectionStatus } from '../../../lib/realtime.ts'
import { useAuth } from '../../auth/hooks/useAuth.ts'
import { useOrganization } from '../../organizations/hooks/useOrganization.ts'
import { NotificationContext } from './notification-context-def.ts'
import type { NotificationRecord } from '../types.ts'

export const NotificationProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const { currentOrganization } = useOrganization()

  const userId = user?.id
  const orgId = currentOrganization?.id

  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionStatus>('connecting')

  const fetchNotifications = useCallback(
    async (showLoading = false) => {
      if (!userId || !orgId) {
        setNotifications([])
        setLoading(false)
        setError(null)
        return
      }

      if (showLoading) {
        setLoading(true)
      }

      try {
        const { data, error: queryError } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_id', userId)
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })

        if (queryError) {
          setError(queryError.message)
        } else {
          setNotifications((data as NotificationRecord[]) || [])
          setError(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notifications')
      } finally {
        setLoading(false)
      }
    },
    [userId, orgId]
  )

  useEffect(() => {
    let isMounted = true

    const run = async () => {
      if (!userId || !orgId) {
        if (isMounted) {
          setNotifications([])
          setLoading(false)
          setError(null)
          setRealtimeStatus('unavailable')
        }
        return
      }
      await fetchNotifications(true)
    }

    void run()

    const handleFocus = () => {
      void fetchNotifications(false)
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void fetchNotifications(false)
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    // Scoped Realtime Subscription: filter strictly by recipient_id = current user
    if (!userId || !orgId) {
      return () => {
        isMounted = false
        window.removeEventListener('focus', handleFocus)
        document.removeEventListener('visibilitychange', handleVisibility)
      }
    }

    const channelName = `realtime:notifications:${userId}`
    const { trigger: debouncedSync, cancel: cancelDebounce } = createDebounce(() => {
      void fetchNotifications(false)
    }, 250)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          debouncedSync()
        }
      )
      .subscribe((status) => {
        if (!isMounted) return
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeStatus('unavailable')
        }
      })

    return () => {
      isMounted = false
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
      cancelDebounce()
      void supabase.removeChannel(channel)
    }
  }, [userId, orgId, fetchNotifications])

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read_at).length
  }, [notifications])

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!userId) return

      const nowIso = new Date().toISOString()

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read_at: n.read_at || nowIso } : n))
      )

      try {
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ read_at: nowIso })
          .eq('id', notificationId)
          .eq('recipient_id', userId)

        if (updateError) {
          void fetchNotifications(false)
        }
      } catch {
        void fetchNotifications(false)
      }
    },
    [userId, fetchNotifications]
  )

  const markAllAsRead = useCallback(async () => {
    if (!userId || !orgId) return

    const nowIso = new Date().toISOString()

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: nowIso }))
    )

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read_at: nowIso })
        .eq('recipient_id', userId)
        .eq('organization_id', orgId)
        .is('read_at', null)

      if (updateError) {
        void fetchNotifications(false)
      }
    } catch {
      void fetchNotifications(false)
    }
  }, [userId, orgId, fetchNotifications])

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications(false)
  }, [fetchNotifications])

  const contextValue = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      realtimeStatus,
      markAsRead,
      markAllAsRead,
      refreshNotifications,
    }),
    [notifications, unreadCount, loading, error, realtimeStatus, markAsRead, markAllAsRead, refreshNotifications]
  )

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  )
}
