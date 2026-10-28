import { describe, it, expect } from 'vitest'
import {
  getDateRangeStart,
  isDateInRange,
  isTaskCompletedOnTime,
  calculateDashboardMetrics,
  calculateProjectProgress,
} from '../utils.ts'
import type { TaskRecord } from '../../tasks/types.ts'
import type { ProjectRecord } from '../../projects/types.ts'

const createMockProject = (id: string, name: string): ProjectRecord => ({
  id,
  organization_id: 'org-1',
  name,
  description: 'Project description',
  created_by: 'user-1',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
})

const createMockTask = (overrides: Partial<TaskRecord> = {}): TaskRecord => ({
  id: 'task-1',
  project_id: 'proj-1',
  title: 'Task Title',
  description: null,
  status: 'todo',
  priority: 'medium',
  assignee_id: null,
  due_date: null,
  completed_at: null,
  created_at: '2026-10-15T10:00:00Z',
  updated_at: '2026-10-15T10:00:00Z',
  ...overrides,
})

describe('Dashboard Reporting Utilities', () => {
  const mockNow = new Date('2026-10-28T12:00:00Z')

  describe('getDateRangeStart and isDateInRange', () => {
    it('calculates 7-day boundary correctly', () => {
      const start = getDateRangeStart('7d', mockNow)
      expect(start).not.toBeNull()
      expect(start?.toISOString().slice(0, 10)).toBe('2026-10-21')
    })

    it('calculates 30-day boundary correctly', () => {
      const start = getDateRangeStart('30d', mockNow)
      expect(start).not.toBeNull()
      expect(start?.toISOString().slice(0, 10)).toBe('2026-09-28')
    })

    it('returns null for "all" time range', () => {
      expect(getDateRangeStart('all', mockNow)).toBeNull()
    })

    it('determines whether a date falls within boundary', () => {
      const start7d = getDateRangeStart('7d', mockNow)
      expect(isDateInRange('2026-10-25T00:00:00Z', start7d)).toBe(true)
      expect(isDateInRange('2026-10-10T00:00:00Z', start7d)).toBe(false)
      expect(isDateInRange(null, start7d)).toBe(false)
      expect(isDateInRange('2026-01-01T00:00:00Z', null)).toBe(true)
    })
  })

  describe('isTaskCompletedOnTime', () => {
    it('returns false if completedAt or dueDate is missing', () => {
      expect(isTaskCompletedOnTime(null, '2026-10-25')).toBe(false)
      expect(isTaskCompletedOnTime('2026-10-25T14:00:00Z', null)).toBe(false)
    })

    it('returns true when completion is on or before end-of-day due date', () => {
      expect(isTaskCompletedOnTime('2026-10-25T18:00:00Z', '2026-10-25')).toBe(true)
      expect(isTaskCompletedOnTime('2026-10-24T10:00:00Z', '2026-10-25')).toBe(true)
    })

    it('returns false when completion is after the due date', () => {
      expect(isTaskCompletedOnTime('2026-10-26T00:00:01Z', '2026-10-25')).toBe(false)
    })
  })

  describe('calculateDashboardMetrics', () => {
    const projects: ProjectRecord[] = [
      createMockProject('proj-1', 'Alpha'),
      createMockProject('proj-2', 'Beta'),
    ]

    const tasks: TaskRecord[] = [
      // 1. Active task with assignee (created in 7d window)
      createMockTask({
        id: 't1',
        project_id: 'proj-1',
        status: 'in_progress',
        assignee_id: 'user-1',
        created_at: '2026-10-25T10:00:00Z',
      }),
      // 2. Active task unassigned, overdue
      createMockTask({
        id: 't2',
        project_id: 'proj-1',
        status: 'todo',
        assignee_id: null,
        due_date: '2026-10-20',
        created_at: '2026-10-22T10:00:00Z',
      }),
      // 3. Completed on time in period
      createMockTask({
        id: 't3',
        project_id: 'proj-2',
        status: 'done',
        assignee_id: 'user-2',
        due_date: '2026-10-25',
        completed_at: '2026-10-24T15:00:00Z',
        created_at: '2026-10-22T10:00:00Z',
      }),
      // 4. Completed late in period
      createMockTask({
        id: 't4',
        project_id: 'proj-2',
        status: 'done',
        assignee_id: 'user-1',
        due_date: '2026-10-23',
        completed_at: '2026-10-26T15:00:00Z',
        created_at: '2026-10-22T10:00:00Z',
      }),
      // 5. Cancelled task
      createMockTask({
        id: 't5',
        project_id: 'proj-1',
        status: 'cancelled',
        created_at: '2026-10-22T10:00:00Z',
      }),
    ]

    const notifications = [
      { id: 'n1', read_at: '2026-10-26T10:00:00Z', created_at: '2026-10-25T08:00:00Z' },
      { id: 'n2', read_at: null, created_at: '2026-10-26T08:00:00Z' },
      { id: 'n3', read_at: null, created_at: '2026-09-01T08:00:00Z' }, // Outside 7d/30d
    ]

    it('calculates active projects and active tasks counts correctly', () => {
      const metrics = calculateDashboardMetrics(projects, tasks, notifications, '7d', mockNow)
      expect(metrics.activeProjectsCount).toBe(2)
      // Active tasks: t1 (in_progress) and t2 (todo) = 2
      expect(metrics.activeTasksCount).toBe(2)
      expect(metrics.completedInPeriodCount).toBe(2) // t3 and t4
      expect(metrics.overdueTasksCount).toBe(1) // t2
    })

    it('calculates task completion rate correctly for eligible tasks', () => {
      const metrics = calculateDashboardMetrics(projects, tasks, notifications, '7d', mockNow)
      // Eligible tasks created in 7d (excluding cancelled): t1, t2, t3, t4 = 4
      // Done tasks: t3, t4 = 2 -> 50%
      expect(metrics.taskCompletionNumerator).toBe(2)
      expect(metrics.taskCompletionDenominator).toBe(4)
      expect(metrics.taskCompletionRate).toBe(50)
    })

    it('calculates on-time completion rate accurately', () => {
      const metrics = calculateDashboardMetrics(projects, tasks, notifications, '7d', mockNow)
      // Done with due date: t3 (on time) and t4 (late) = 2
      // On-time: t3 = 1 -> 50%
      expect(metrics.onTimeCompletionNumerator).toBe(1)
      expect(metrics.onTimeCompletionDenominator).toBe(2)
      expect(metrics.onTimeCompletionRate).toBe(50)
    })

    it('calculates assignment coverage across active tasks', () => {
      const metrics = calculateDashboardMetrics(projects, tasks, notifications, '7d', mockNow)
      // Active tasks: 2. Assigned: t1 (1) -> 50%
      expect(metrics.assignmentCoverageNumerator).toBe(1)
      expect(metrics.assignmentCoverageDenominator).toBe(2)
      expect(metrics.assignmentCoverageRate).toBe(50)
    })

    it('calculates notification read rate for period notifications', () => {
      const metrics = calculateDashboardMetrics(projects, tasks, notifications, '7d', mockNow)
      // Period notifications: n1 (read) and n2 (unread) = 2
      // Read: 1 -> 50%
      expect(metrics.notificationReadNumerator).toBe(1)
      expect(metrics.notificationReadDenominator).toBe(2)
      expect(metrics.notificationReadRate).toBe(50)
    })

    it('returns null rates when denominators are zero', () => {
      const emptyMetrics = calculateDashboardMetrics([], [], [], '7d', mockNow)
      expect(emptyMetrics.taskCompletionRate).toBeNull()
      expect(emptyMetrics.onTimeCompletionRate).toBeNull()
      expect(emptyMetrics.assignmentCoverageRate).toBeNull()
      expect(emptyMetrics.notificationReadRate).toBeNull()
    })
  })

  describe('calculateProjectProgress', () => {
    const projects: ProjectRecord[] = [
      createMockProject('proj-1', 'Project with tasks'),
      createMockProject('proj-2', 'Project without tasks'),
      createMockProject('proj-3', 'Project with only cancelled tasks'),
    ]

    const tasks: TaskRecord[] = [
      createMockTask({ id: 't1', project_id: 'proj-1', status: 'done' }),
      createMockTask({ id: 't2', project_id: 'proj-1', status: 'todo' }),
      createMockTask({ id: 't3', project_id: 'proj-1', status: 'cancelled' }),
      createMockTask({ id: 't4', project_id: 'proj-3', status: 'cancelled' }),
    ]

    it('calculates progress percentage as completed / non-cancelled', () => {
      const progress = calculateProjectProgress(projects, tasks)

      // Project 1: 1 done / 2 non-cancelled = 50%
      expect(progress[0].completedTasks).toBe(1)
      expect(progress[0].totalNonCancelled).toBe(2)
      expect(progress[0].progressPercentage).toBe(50)

      // Project 2: 0 tasks -> progressPercentage is null
      expect(progress[1].completedTasks).toBe(0)
      expect(progress[1].totalNonCancelled).toBe(0)
      expect(progress[1].progressPercentage).toBeNull()

      // Project 3: only cancelled tasks -> progressPercentage is null
      expect(progress[2].completedTasks).toBe(0)
      expect(progress[2].totalNonCancelled).toBe(0)
      expect(progress[2].progressPercentage).toBeNull()
    })
  })
})

