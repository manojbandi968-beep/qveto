import { useState, useEffect, useCallback, useRef } from 'react'
import type { FC, ChangeEvent, DragEvent } from 'react'
import {
  Paperclip,
  Upload,
  Download,
  Trash2,
  Loader2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  FileCode,
  File as FileGeneric,
  CheckCircle2,
  X,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase.ts'
import { createDebounce } from '../../../lib/realtime.ts'
import { useAuth } from '../../auth/hooks/useAuth.ts'
import { useOrganization } from '../../organizations/hooks/useOrganization.ts'
import {
  formatFileSize,
  formatRelativeTime,
  getActorDisplayName,
  validateAttachmentFile,
} from '../utils.ts'
import type { OrgMemberOption, TaskAttachmentRecord } from '../types.ts'

interface TaskAttachmentsSectionProps {
  taskId: string
  projectId: string
  organizationId: string
  canUpload: boolean
  members: OrgMemberOption[]
  onAttachmentCountChange?: (count: number) => void
  onActivityChanged?: () => void
}

const getFileIcon = (filename: string, mimeType: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg'].includes(ext)) {
    return <ImageIcon className="h-4 w-4 text-sky-400" />
  }
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return <FileText className="h-4 w-4 text-rose-400" />
  }
  if (['doc', 'docx'].includes(ext)) {
    return <FileCode className="h-4 w-4 text-blue-400" />
  }
  if (mimeType === 'text/plain' || ext === 'txt') {
    return <FileText className="h-4 w-4 text-slate-400" />
  }
  return <FileGeneric className="h-4 w-4 text-slate-400" />
}

export const TaskAttachmentsSection: FC<TaskAttachmentsSectionProps> = ({
  taskId,
  projectId,
  organizationId,
  canUpload,
  members,
  onAttachmentCountChange,
  onActivityChanged,
}) => {
  const { user } = useAuth()
  const { currentRole } = useOrganization()

  const [attachments, setAttachments] = useState<TaskAttachmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Upload states
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Download / Delete states
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const canManageAll = currentRole === 'owner' || currentRole === 'manager'

  // Fetch attachments for this task
  const fetchAttachments = useCallback(async () => {
    try {
      const { data, error: queryError } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      if (queryError) {
        setError(queryError.message || 'Failed to load task attachments.')
        setAttachments([])
      } else {
        const list = (data as TaskAttachmentRecord[]) || []
        setAttachments(list)
        onAttachmentCountChange?.(list.length)
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error loading attachments.')
      setAttachments([])
    } finally {
      setLoading(false)
    }
  }, [taskId, onAttachmentCountChange])

  useEffect(() => {
    let isMounted = true

    const run = async () => {
      if (!isMounted) return
      await fetchAttachments()
    }

    void run()

    const debouncedRefetch = createDebounce(() => {
      void fetchAttachments()
    }, 250)

    const channel = supabase
      .channel(`realtime:task-attachments:${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_attachments',
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
  }, [taskId, fetchAttachments])

  // Process a selected file for upload
  const handleUploadFile = async (file: File) => {
    setUploadError(null)
    setUploadSuccess(null)

    if (!user) {
      setUploadError('You must be signed in to upload attachments.')
      return
    }

    if (!canUpload) {
      setUploadError('You do not have permission to upload attachments to this task.')
      return
    }

    // 1. Client-side validation (Size & Type)
    const validation = validateAttachmentFile(file)
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file.')
      return
    }

    setUploading(true)

    // 2. Generate predictable private storage path: {org_id}/{task_id}/{unique_filename}
    const extension = file.name.split('.').pop()?.toLowerCase() || 'dat'
    const uniqueFilename = `${Date.now()}-${crypto.randomUUID()}.${extension}`
    const storagePath = `${organizationId}/${taskId}/${uniqueFilename}`

    try {
      // 3. Upload to private Supabase Storage bucket 'task-attachments'
      const { error: storageError } = await supabase.storage
        .from('task-attachments')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (storageError) {
        throw new Error(`Storage upload failed: ${storageError.message}`)
      }

      // 4. Create task_attachments record in database
      const { data: dbData, error: dbError } = await supabase
        .from('task_attachments')
        .insert({
          organization_id: organizationId,
          project_id: projectId,
          task_id: taskId,
          uploaded_by: user.id,
          storage_path: storagePath,
          original_filename: file.name,
          mime_type: file.type || 'application/octet-stream',
          size_bytes: file.size,
        })
        .select('*')
        .single()

      if (dbError) {
        // Rollback: delete uploaded file from storage if DB insert fails
        await supabase.storage.from('task-attachments').remove([storagePath])
        throw new Error(`Database record creation failed: ${dbError.message}`)
      }

      // 5. Success: update local state & activity
      const newAttachment = dbData as TaskAttachmentRecord
      setAttachments((prev) => {
        const next = [newAttachment, ...prev]
        onAttachmentCountChange?.(next.length)
        return next
      })
      setUploadSuccess(`"${file.name}" uploaded successfully.`)
      onActivityChanged?.()

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed.'
      setUploadError(msg)
    } finally {
      setUploading(false)
    }
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      void handleUploadFile(file)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    if (!canUpload || uploading) return
    const file = e.dataTransfer.files?.[0]
    if (file) {
      void handleUploadFile(file)
    }
  }

  // Generate short-lived signed URL for download / view
  const handleDownload = async (attachment: TaskAttachmentRecord) => {
    setDownloadingId(attachment.id)
    try {
      // 60-second valid short-lived signed URL with content-disposition
      const { data, error: signedUrlError } = await supabase.storage
        .from('task-attachments')
        .createSignedUrl(attachment.storage_path, 60, {
          download: attachment.original_filename,
        })

      if (signedUrlError) {
        throw signedUrlError
      }

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate download URL.'
      setError(msg)
    } finally {
      setDownloadingId(null)
    }
  }

  // Delete attachment from storage and database
  const handleDelete = async (attachment: TaskAttachmentRecord) => {
    setDeletingId(attachment.id)
    setConfirmDeleteId(null)
    setError(null)

    try {
      // 1. Remove storage object
      const { error: storageError } = await supabase.storage
        .from('task-attachments')
        .remove([attachment.storage_path])

      if (storageError) {
        // Log warning but continue to delete DB record if missing from storage
      }

      // 2. Remove database record
      const { error: dbError } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', attachment.id)

      if (dbError) {
        throw dbError
      }

      // 3. Update local state & activity
      setAttachments((prev) => {
        const next = prev.filter((a) => a.id !== attachment.id)
        onAttachmentCountChange?.(next.length)
        return next
      })
      onActivityChanged?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete attachment.'
      setError(msg)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4" aria-label="Task attachments">
      {/* Upload Dropzone & Button */}
      {canUpload && (
        <div className="space-y-2">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center ${
              isDragOver
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/50'
            } ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              disabled={uploading}
              onChange={handleFileInputChange}
              accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx,application/pdf,image/png,image/jpeg,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
            />

            {uploading ? (
              <div className="flex items-center gap-2 text-xs text-indigo-400 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Uploading and encrypting attachment...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Upload className="h-4 w-4" />
                </div>
                <div className="text-xs text-slate-300 font-medium">
                  <span className="text-indigo-400 font-semibold">Click to upload</span> or drag and drop
                </div>
                <p className="text-[10px] text-slate-500">
                  PDF, PNG, JPEG, TXT, DOC, DOCX up to 10 MB
                </p>
              </div>
            )}
          </div>

          {/* Validation / Upload Error Alert */}
          {uploadError && (
            <div className="flex items-start justify-between gap-2 p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{uploadError}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="text-rose-400 hover:text-rose-200"
                aria-label="Dismiss error"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Upload Success Alert */}
          {uploadSuccess && (
            <div className="flex items-start justify-between gap-2 p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 animate-in fade-in">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                <span>{uploadSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadSuccess(null)}
                className="text-emerald-400 hover:text-emerald-200"
                aria-label="Dismiss message"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* General Error Banner */}
      {error && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Attachments List */}
      {loading ? (
        <div className="flex items-center justify-center p-6 text-xs text-slate-500 gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
          <span>Loading attachments...</span>
        </div>
      ) : attachments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/20 p-6 text-center text-slate-500">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-500 mb-2">
            <Paperclip className="h-4 w-4" />
          </div>
          <p className="text-xs font-medium text-slate-400">No attachments yet</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Attach specs, mockups, or documents relevant to this task.
          </p>
        </div>
      ) : (
        <div className="space-y-2" role="list" aria-label="Task attachments list">
          {attachments.map((attachment) => {
            const isUploader = user?.id === attachment.uploaded_by
            const canDeleteThis = isUploader || canManageAll
            const isDeleting = deletingId === attachment.id
            const isDownloading = downloadingId === attachment.id
            const isConfirming = confirmDeleteId === attachment.id
            const uploaderName = getActorDisplayName(attachment.uploaded_by, user?.id, members)

            return (
              <div
                key={attachment.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-800/80 bg-slate-900/40 hover:border-slate-700/80 hover:bg-slate-900/70 transition-all"
                role="listitem"
              >
                {/* File info */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/80">
                    {getFileIcon(attachment.original_filename, attachment.mime_type)}
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p
                      className="text-xs font-semibold text-slate-200 truncate"
                      title={attachment.original_filename}
                    >
                      {attachment.original_filename}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-wrap">
                      <span className="font-mono text-slate-400">
                        {formatFileSize(attachment.size_bytes)}
                      </span>
                      <span>•</span>
                      <span>By {uploaderName}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(attachment.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                  {/* Download / Open signed URL */}
                  <button
                    type="button"
                    onClick={() => handleDownload(attachment)}
                    disabled={isDownloading}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                    title="Download private file via signed URL"
                  >
                    {isDownloading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">Download</span>
                  </button>

                  {/* Delete Button */}
                  {canDeleteThis && (
                    <>
                      {isConfirming ? (
                        <div className="flex items-center gap-1 animate-in fade-in">
                          <button
                            type="button"
                            onClick={() => handleDelete(attachment)}
                            disabled={isDeleting}
                            className="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-500 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isDeleting ? 'Deleting...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-lg border border-slate-800 bg-slate-900 px-1.5 py-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(attachment.id)}
                          disabled={isDeleting}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:border-slate-700 hover:bg-slate-800 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete attachment"
                          aria-label={`Delete ${attachment.original_filename}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
