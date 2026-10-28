import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  isTaskOverdue,
  isTaskDueTomorrow,
  sortTasks,
  formatDueDate,
} from '../utils.ts'
import type { TaskRecord } from '../types.ts'

const createMockTask = (overrides: Partial<TaskRecord> = {}): TaskRecord => ({
  id: 'task-1',
  project_id: 'proj-1',
  title: 'Test Task',
  description: 'Test description',
  status: 'todo',
  priority: 'medium',
  assignee_id: null,
  due_date: null,
  completed_at: null,
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
  ...overrides,
})

describe('Task Utilities', () => {
  describe('isTaskOverdue', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-10-28T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns false when due date is null', () => {
      expect(isTaskOverdue(null, 'todo')).toBe(false)
    })

    it('returns false when task is already done, even if due date is in the past', () => {
      expect(isTaskOverdue('2026-10-20', 'done')).toBe(false)
    })

    it('returns false when task is cancelled, even if due date is in the past', () => {
      expect(isTaskOverdue('2026-10-20', 'cancelled')).toBe(false)
    })

    it('returns true when due date is in the past and task is pending', () => {
      expect(isTaskOverdue('2026-10-25', 'todo')).toBe(true)
      expect(isTaskOverdue('2026-10-27', 'in_progress')).toBe(true)
      expect(isTaskOverdue('2026-10-27', 'review')).toBe(true)
    })

    it('returns false when due date is today or in the future', () => {
      // Due date 2026-10-28 gives 23:59:59 end-of-day, which is after 12:00:00
      expect(isTaskOverdue('2026-10-28', 'todo')).toBe(false)
      expect(isTaskOverdue('2026-10-29', 'todo')).toBe(false)
      expect(isTaskOverdue('2026-11-05', 'in_progress')).toBe(false)
    })
  })

  describe('isTaskDueTomorrow', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-10-28T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns false when due date is null', () => {
      expect(isTaskDueTomorrow(null, 'todo')).toBe(false)
    })

    it('returns false when task is done or cancelled', () => {
      expect(isTaskDueTomorrow('2026-10-29', 'done')).toBe(false)
      expect(isTaskDueTomorrow('2026-10-29', 'cancelled')).toBe(false)
    })

    it('returns true when task due date is exactly tomorrow', () => {
      expect(isTaskDueTomorrow('2026-10-29', 'todo')).toBe(true)
      expect(isTaskDueTomorrow('2026-10-29', 'in_progress')).toBe(true)
    })

    it('returns false when task is due today, yesterday, or more than a day ahead', () => {
      expect(isTaskDueTomorrow('2026-10-28', 'todo')).toBe(false)
      expect(isTaskDueTomorrow('2026-10-27', 'todo')).toBe(false)
      expect(isTaskDueTomorrow('2026-10-30', 'todo')).toBe(false)
    })
  })

  describe('formatDueDate', () => {
    it('returns "No due date" for null or empty values', () => {
      expect(formatDueDate(null)).toBe('No due date')
      expect(formatDueDate('')).toBe('No due date')
    })

    it('formats valid ISO date strings in human readable format', () => {
      const formatted = formatDueDate('2026-10-31')
      expect(formatted).toContain('Oct')
      expect(formatted).toContain('31')
      expect(formatted).toContain('2026')
    })
  })

  describe('sortTasks', () => {
    const tasks: TaskRecord[] = [
      createMockTask({
        id: '1',
        created_at: '2026-10-01T10:00:00Z',
        priority: 'low',
        due_date: '2026-11-10',
      }),
      createMockTask({
        id: '2',
        created_at: '2026-10-05T10:00:00Z',
        priority: 'urgent',
        due_date: '2026-10-20',
      }),
      createMockTask({
        id: '3',
        created_at: '2026-10-03T10:00:00Z',
        priority: 'high',
        due_date: null,
      }),
      createMockTask({
        id: '4',
        created_at: '2026-10-02T10:00:00Z',
        priority: 'medium',
        due_date: '2026-10-25',
      }),
    ]

    it('sorts tasks by newest created_at date', () => {
      const sorted = sortTasks(tasks, 'newest')
      expect(sorted.map((t) => t.id)).toEqual(['2', '3', '4', '1'])
    })

    it('sorts tasks by oldest created_at date', () => {
      const sorted = sortTasks(tasks, 'oldest')
      expect(sorted.map((t) => t.id)).toEqual(['1', '4', '3', '2'])
    })

    it('sorts tasks by priority hierarchy (urgent > high > medium > low)', () => {
      const sorted = sortTasks(tasks, 'priority')
      expect(sorted.map((t) => t.priority)).toEqual(['urgent', 'high', 'medium', 'low'])
      expect(sorted[0].id).toBe('2')
    })

    it('sorts tasks by due date with earlier dates first and nulls at the end', () => {
      const sorted = sortTasks(tasks, 'due_date')
      expect(sorted.map((t) => t.id)).toEqual(['2', '4', '1', '3'])
      expect(sorted[3].due_date).toBeNull()
    })
  })
})
