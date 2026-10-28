import { useState, useEffect, useCallback } from 'react'
import type { FC } from 'react'
import { Link } from 'react-router-dom'
import {
  FolderKanban,
  Plus,
  Search,
  Calendar,
  User,
  CheckSquare,
  AlertCircle,
  RefreshCw,
  Edit3,
  Trash2,
  FolderOpen,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase.ts'
import { useAuth } from '../../auth/hooks/useAuth.ts'
import { useOrganization } from '../../organizations/hooks/useOrganization.ts'
import { CreateProjectModal } from '../components/CreateProjectModal.tsx'
import { EditProjectModal } from '../components/EditProjectModal.tsx'
import { DeleteProjectDialog } from '../components/DeleteProjectDialog.tsx'
import type { ProjectRecord } from '../types.ts'

export const ProjectsPage: FC = () => {
  const { user } = useAuth()
  const { currentOrganization, currentRole } = useOrganization()

  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [projectToEdit, setProjectToEdit] = useState<ProjectRecord | null>(null)
  const [projectToDelete, setProjectToDelete] = useState<ProjectRecord | null>(null)

  const canManage = currentRole === 'owner' || currentRole === 'manager'

  const loadProjects = useCallback(async () => {
    if (!currentOrganization) {
      setProjects([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setErrorMessage(null)

      // Query projects strictly scoped to currently selected organization
      const { data, error } = await supabase
        .from('projects')
        .select('id, organization_id, name, description, created_by, created_at, updated_at')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42501' || error.message.includes('row-level security')) {
          setErrorMessage('Permission denied: You cannot view projects for this organization.')
        } else {
          setErrorMessage(error.message || 'Failed to load projects.')
        }
        return
      }

      setProjects((data as ProjectRecord[]) || [])
    } catch {
      setErrorMessage('An unexpected error occurred while loading projects.')
    } finally {
      setLoading(false)
    }
  }, [currentOrganization])

  useEffect(() => {
    let isMounted = true

    const syncProjects = async () => {
      if (!currentOrganization) {
        if (isMounted) {
          setProjects([])
          setLoading(false)
        }
        return
      }

      await loadProjects()
    }

    void syncProjects()

    return () => {
      isMounted = false
    }
  }, [currentOrganization, loadProjects])

  // Filter projects by name search
  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleProjectCreated = (newProject: ProjectRecord) => {
    setProjects((prev) => [newProject, ...prev])
  }

  const handleProjectUpdated = (updatedProject: ProjectRecord) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
    )
  }

  const handleProjectDeleted = (deletedId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== deletedId))
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Projects
            </h1>
            <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 text-xs font-medium text-slate-400">
              {projects.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Workspaces for <span className="text-slate-300 font-medium">{currentOrganization?.name}</span>
          </p>
        </div>

        {/* Creation button: Only for owners & managers */}
        {canManage && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-indigo-500/30 hover:bg-indigo-500 hover:shadow-indigo-500/50 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Project</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by name..."
            className="h-9 w-full rounded-lg border border-slate-800 bg-slate-900/60 pl-8 pr-3 text-xs text-slate-200 placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
          />
        </div>

        <button
          type="button"
          onClick={loadProjects}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error State with Retry */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-300 space-y-3">
          <div className="flex items-center gap-2 font-medium text-sm text-rose-400">
            <AlertCircle className="h-4 w-4" />
            <span>Error loading projects</span>
          </div>
          <p className="text-xs text-rose-300/90">{errorMessage}</p>
          <button
            type="button"
            onClick={loadProjects}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600/30 border border-rose-500/40 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600/50 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton State */}
      {loading && !errorMessage && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-5 space-y-4 animate-pulse"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 bg-slate-800 rounded w-1/3" />
                <div className="h-4 bg-slate-800 rounded w-12" />
              </div>
              <div className="space-y-2">
                <div className="h-5 bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-800/60 rounded w-full" />
              </div>
              <div className="pt-4 border-t border-slate-800/60 flex justify-between">
                <div className="h-3 bg-slate-800/60 rounded w-20" />
                <div className="h-3 bg-slate-800/60 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !errorMessage && projects.length === 0 && (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/20 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 mb-3">
            <FolderOpen className="h-6 w-6" />
          </div>
          <h2 className="text-base font-semibold text-white">No projects yet</h2>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            {canManage
              ? 'Get started by creating your first project in this workspace.'
              : 'No projects have been created in this organization yet. Ask an owner or manager to add one.'}
          </p>

          {canManage && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-500/30 hover:bg-indigo-500 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create Project</span>
            </button>
          )}
        </div>
      )}

      {/* No search results state */}
      {!loading && !errorMessage && projects.length > 0 && filteredProjects.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-8 text-center">
          <p className="text-sm text-slate-300">
            No projects found matching <span className="font-semibold text-white">&ldquo;{searchQuery}&rdquo;</span>.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 underline"
          >
            Clear search filter
          </button>
        </div>
      )}

      {/* Real Projects Grid */}
      {!loading && !errorMessage && filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const isCreator = user?.id === project.created_by
            const createdDate = new Date(project.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })

            return (
              <div
                key={project.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-md hover:border-slate-700 hover:bg-slate-900/80 transition-all hover:shadow-xl hover:shadow-black/30"
              >
                <div className="space-y-3">
                  {/* Card Header & Controls */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                      <FolderKanban className="h-3 w-3" />
                      <span>Project</span>
                    </span>

                    {/* Manage Controls (Owners and Managers only) */}
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setProjectToEdit(project)}
                          title="Edit project"
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-800 hover:text-amber-400 transition-colors cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setProjectToDelete(project)}
                          title="Delete project"
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-800 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Description link to /projects/:id */}
                  <div>
                    <Link
                      to={`/projects/${project.id}`}
                      className="text-base font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-1"
                    >
                      {project.name}
                    </Link>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {project.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                {/* Card Footer: Metadata and task count placeholder */}
                <div className="mt-6 space-y-3 pt-4 border-t border-slate-800/60">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1 text-[11px]">
                      <CheckSquare className="h-3.5 w-3.5 text-indigo-400" />
                      <span>0 tasks</span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Calendar className="h-3 w-3" />
                      <span>{createdDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{isCreator ? 'You' : 'Member'}</span>
                    </span>

                    <Link
                      to={`/projects/${project.id}`}
                      className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                    >
                      View details &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Quick Create Card (Owners and Managers only) */}
          {canManage && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="group flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-800/80 bg-slate-950/40 p-6 text-center hover:border-indigo-500/40 hover:bg-indigo-950/10 transition-all cursor-pointer"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-slate-400 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 transition-colors">
                <Plus className="h-5 w-5" />
              </div>
              <span className="mt-3 text-xs font-semibold text-slate-300 group-hover:text-white">
                Create new project
              </span>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Add deliverables to {currentOrganization?.name}
              </p>
            </button>
          )}
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onProjectCreated={handleProjectCreated}
      />

      {/* Edit Project Modal (keyed by project ID so form initializes with target project) */}
      {projectToEdit && (
        <EditProjectModal
          key={projectToEdit.id}
          project={projectToEdit}
          isOpen={true}
          onClose={() => setProjectToEdit(null)}
          onProjectUpdated={handleProjectUpdated}
        />
      )}

      {/* Delete Project Dialog */}
      <DeleteProjectDialog
        project={projectToDelete}
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onProjectDeleted={handleProjectDeleted}
      />
    </div>
  )
}
