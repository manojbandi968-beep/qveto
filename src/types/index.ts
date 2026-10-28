export interface NavItem {
  label: string
  path: string
  icon: string
  badge?: string | number
}

export interface Project {
  id: string
  name: string
  description: string
  status: 'planning' | 'in_progress' | 'review' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  progress: number
  dueDate: string
  teamMembers: Array<{
    name: string
    avatar?: string
    role: string
  }>
  tasksCount: {
    total: number
    completed: number
  }
}

export interface MetricCardData {
  title: string
  value: string | number
  change: string
  isPositive: boolean
  description: string
}
