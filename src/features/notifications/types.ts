export type NotificationType = 'task_assigned' | 'comment_added' | 'due_soon' | 'overdue'

export interface NotificationRecord {
  id: string
  organization_id: string
  recipient_id: string
  actor_id: string | null
  project_id: string | null
  task_id: string | null
  type: NotificationType
  title: string
  body: string
  dedupe_key: string
  read_at: string | null
  created_at: string
}

export interface NotificationContextValue {
  notifications: NotificationRecord[]
  unreadCount: number
  loading: boolean
  error: string | null
  realtimeStatus?: 'connecting' | 'connected' | 'unavailable'
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refreshNotifications: () => Promise<void>
}

