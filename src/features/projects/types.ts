export interface ProjectRecord {
  id: string
  organization_id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateProjectInput {
  name: string
  description?: string
}

export interface UpdateProjectInput {
  name: string
  description?: string
}
