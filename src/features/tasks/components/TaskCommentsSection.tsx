import { useState, useEffect, useCallback } from 'react'
import type { FC, FormEvent } from 'react'
import {
  MessageSquare,
  Send,
  Loader2,
  Edit2,
  Trash2,
  AlertCircle,
  Check,
  X,
  User,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase.ts'
import { createDebounce } from '../../../lib/realtime.ts'
import { useAuth } from '../../auth/hooks/useAuth.ts'
import { useNotifications } from '../../notifications/index.ts'
import { formatRelativeTime, getActorDisplayName } from '../utils.ts'
import type { OrgMemberOption, TaskComment } from '../types.ts'

interface TaskCommentsSectionProps {
  taskId: string
  members: OrgMemberOption[]
  onCommentCountChange?: (count: number) => void
}

export const TaskCommentsSection: FC<TaskCommentsSectionProps> = ({
  taskId,
  members,
  onCommentCountChange,
}) => {
  const { user } = useAuth()
  const { refreshNotifications } = useNotifications()

  const [comments, setComments] = useState<TaskComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // New comment composer state
  const [newCommentBody, setNewCommentBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [composerError, setComposerError] = useState<string | null>(null)

  // Editing comment state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingBody, setEditingBody] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Deleting comment confirmation state
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch comments for this task
  const fetchComments = useCallback(async () => {
    try {
      const { data, error: queryError } = await supabase
        .from('comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

      if (queryError) {
        if (queryError.code === '42501' || queryError.message.includes('row-level security')) {
          setError('Permission denied: You cannot view comments for this task.')
        } else {
          setError(queryError.message || 'Failed to load comments.')
        }
        setComments([])
        return
      }

      const list = (data as TaskComment[]) || []
      setComments(list)
      onCommentCountChange?.(list.length)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setError(msg)
      setComments([])
    } finally {
      setLoading(false)
    }
  }, [taskId, onCommentCountChange])

  useEffect(() => {
    let isMounted = true

    const run = async () => {
      if (!isMounted) return
      await fetchComments()
    }

    void run()

    const debouncedRefetch = createDebounce(() => {
      void fetchComments()
    }, 250)

    const channel = supabase
      .channel(`realtime:task-comments:${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          debouncedRefetch.trigger()
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      debouncedRefetch.cancel()
      void supabase.removeChannel(channel)
    }
  }, [taskId, fetchComments])

  // Handle create comment
  const handleCreateComment = async (e: FormEvent) => {
    e.preventDefault()
    setComposerError(null)

    if (!user) {
      setComposerError('You must be logged in to comment.')
      return
    }

    const trimmed = newCommentBody.trim()
    if (!trimmed) {
      setComposerError('Comment cannot be empty.')
      return
    }

    setSubmitting(true)

    try {
      const { data, error: insertError } = await supabase
        .from('comments')
        .insert({
          task_id: taskId,
          user_id: user.id,
          body: trimmed,
        })
        .select('*')
        .single()

      if (insertError) {
        if (insertError.code === '42501' || insertError.message.includes('row-level security')) {
          setComposerError('Permission denied: You do not have permission to comment on this task.')
        } else {
          setComposerError(insertError.message || 'Failed to post comment.')
        }
        return
      }

      const newRecord = data as TaskComment
      setComments((prev) => {
        const next = [...prev, newRecord]
        onCommentCountChange?.(next.length)
        return next
      })
      setNewCommentBody('')
      void refreshNotifications()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setComposerError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Start editing a comment
  const handleStartEdit = (comment: TaskComment) => {
    setEditingCommentId(comment.id)
    setEditingBody(comment.body)
    setEditError(null)
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setEditingBody('')
    setEditError(null)
  }

  // Save edited comment
  const handleSaveEdit = async (commentId: string) => {
    setEditError(null)

    const trimmed = editingBody.trim()
    if (!trimmed) {
      setEditError('Comment cannot be empty.')
      return
    }

    setIsUpdating(true)

    try {
      const { data, error: updateError } = await supabase
        .from('comments')
        .update({
          body: trimmed,
        })
        .eq('id', commentId)
        .eq('task_id', taskId)
        .select('*')
        .single()

      if (updateError) {
        if (updateError.code === '42501' || updateError.message.includes('row-level security')) {
          setEditError('Permission denied: You can only edit your own comments.')
        } else {
          setEditError(updateError.message || 'Failed to update comment.')
        }
        return
      }

      const updated = data as TaskComment
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)))
      setEditingCommentId(null)
      setEditingBody('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setEditError(msg)
    } finally {
      setIsUpdating(false)
    }
  }

  // Delete a comment
  const handleDeleteComment = async (commentId: string) => {
    setIsDeleting(true)

    try {
      const { error: delError } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('task_id', taskId)

      if (delError) {
        if (delError.code === '42501' || delError.message.includes('row-level security')) {
          setError('Permission denied: You can only delete your own comments.')
        } else {
          setError(delError.message || 'Failed to delete comment.')
        }
        setDeletingCommentId(null)
        return
      }

      setComments((prev) => {
        const next = prev.filter((c) => c.id !== commentId)
        onCommentCountChange?.(next.length)
        return next
      })
      setDeletingCommentId(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setError(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4" aria-label="Task Comments Section">
      {/* General Error Notification */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center p-8 text-center text-xs text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-400 mr-2" />
          <span>Loading comments...</span>
        </div>
      ) : comments.length === 0 ? (
        /* Empty comments state */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/20 p-6 text-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/60 text-slate-500 mb-2">
            <MessageSquare className="h-4 w-4" />
          </div>
          <p className="text-xs font-medium text-slate-300">No comments yet</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Be the first to share an update, ask a question, or leave feedback.
          </p>
        </div>
      ) : (
        /* Comments list */
        <div className="space-y-3" role="feed" aria-label="Task comments list">
          {comments.map((comment) => {
            const isAuthor = user?.id === comment.user_id
            const isEditing = editingCommentId === comment.id
            const isConfirmingDelete = deletingCommentId === comment.id
            const authorDisplayName = getActorDisplayName(comment.user_id, user?.id, members)
            const wasEdited = comment.updated_at && comment.updated_at !== comment.created_at

            return (
              <div
                key={comment.id}
                className={`rounded-xl border p-3.5 transition-colors ${
                  isAuthor
                    ? 'border-slate-800 bg-slate-900/60'
                    : 'border-slate-800/70 bg-slate-900/30'
                }`}
                role="article"
                aria-label={`Comment by ${authorDisplayName}`}
              >
                {/* Comment Header: Author & Timestamp & Actions */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 text-[10px] font-semibold">
                      <User className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {authorDisplayName}
                    </span>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {formatRelativeTime(comment.created_at)}
                    </span>
                    {wasEdited && (
                      <span className="text-[9px] text-slate-500 italic shrink-0">
                        (edited)
                      </span>
                    )}
                  </div>

                  {/* Author-only Edit & Delete Actions */}
                  {isAuthor && !isEditing && !isConfirmingDelete && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(comment)}
                        className="rounded p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Edit comment"
                        aria-label="Edit this comment"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingCommentId(comment.id)}
                        className="rounded p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Delete comment"
                        aria-label="Delete this comment"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline Delete Confirmation */}
                {isConfirmingDelete && (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 my-2 text-xs text-rose-300 space-y-2">
                    <p className="text-[11px] font-medium text-rose-200">
                      Are you sure you want to delete this comment?
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleDeleteComment(comment.id)}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-1 rounded bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-500 cursor-pointer disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Delete'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingCommentId(null)}
                        disabled={isDeleting}
                        className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Comment Body / Edit Mode */}
                {isEditing ? (
                  <div className="space-y-2 mt-2">
                    <textarea
                      rows={2}
                      value={editingBody}
                      disabled={isUpdating}
                      onChange={(e) => setEditingBody(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none disabled:opacity-50"
                      aria-label="Edit comment text"
                    />
                    {editError && (
                      <p className="text-[10px] text-rose-400">{editError}</p>
                    )}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isUpdating}
                        className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer disabled:opacity-50"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveEdit(comment.id)}
                        disabled={isUpdating}
                        className="flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-indigo-500 cursor-pointer disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-3 w-3" />
                            <span>Save</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line break-words pl-8">
                    {comment.body}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Comment Composer */}
      <form onSubmit={handleCreateComment} className="pt-2 border-t border-slate-800/80 space-y-2">
        <label htmlFor="task-comment-input" className="sr-only">
          Add a comment
        </label>
        <div className="relative">
          <textarea
            id="task-comment-input"
            rows={3}
            placeholder="Write a comment..."
            value={newCommentBody}
            disabled={submitting}
            onChange={(e) => setNewCommentBody(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/60 p-3 pr-12 text-xs text-slate-200 placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50 resize-none"
          />
          <button
            type="submit"
            disabled={submitting || !newCommentBody.trim()}
            className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Post comment"
            title="Post comment"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {composerError && (
          <p className="text-[11px] text-rose-400">{composerError}</p>
        )}
      </form>
    </div>
  )
}
