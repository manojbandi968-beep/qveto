-- ==============================================================================
-- ProjectFlow Initial Database Schema & Row Level Security (RLS) Policies
-- Migration: 20261028_initial_projectflow_schema.sql
-- Description: Sets up organizations, organization_members, projects, and tasks
--              with strict Row Level Security, indexes, and automated triggers.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. UTILITY TRIGGERS & FUNCTIONS
-- ------------------------------------------------------------------------------

-- Generic updated_at timestamp trigger function
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------------------------
-- 2. TABLE DEFINITIONS
-- ------------------------------------------------------------------------------

-- 2.1 Organizations Table
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_org_name_length check (char_length(trim(name)) > 0)
);

-- 2.2 Organization Members Table
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'member')),
  created_at timestamptz not null default now(),
  constraint uq_org_member unique (organization_id, user_id)
);

-- 2.3 Projects Table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_project_name_length check (char_length(trim(name)) > 0)
);

-- 2.4 Tasks Table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'review', 'done', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assignee_id uuid references auth.users(id) on delete set null,
  due_date date,
  completed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_task_title_length check (char_length(trim(title)) > 0)
);

-- ------------------------------------------------------------------------------
-- 3. UPDATED_AT TRIGGERS
-- ------------------------------------------------------------------------------

drop trigger if exists tr_organizations_updated_at on public.organizations;
create trigger tr_organizations_updated_at
before update on public.organizations
for each row
execute function public.handle_updated_at();

drop trigger if exists tr_projects_updated_at on public.projects;
create trigger tr_projects_updated_at
before update on public.projects
for each row
execute function public.handle_updated_at();

drop trigger if exists tr_tasks_updated_at on public.tasks;
create trigger tr_tasks_updated_at
before update on public.tasks
for each row
execute function public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 4. PERFORMANCE & LOOKUP INDEXES
-- ------------------------------------------------------------------------------

-- Organizations
create index if not exists idx_organizations_owner_id on public.organizations(owner_id);

-- Organization Members
create index if not exists idx_org_members_user_id on public.organization_members(user_id);
create index if not exists idx_org_members_org_role on public.organization_members(organization_id, role);

-- Projects
create index if not exists idx_projects_org_id on public.projects(organization_id);
create index if not exists idx_projects_created_by on public.projects(created_by);

-- Tasks
create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_tasks_assignee_id on public.tasks(assignee_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_priority on public.tasks(priority);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_tasks_project_status on public.tasks(project_id, status);

-- ------------------------------------------------------------------------------
-- 5. SAFE SECURITY-DEFINER HELPER FUNCTIONS (AVOID POLICY RECURSION)
-- ------------------------------------------------------------------------------

-- Checks whether auth.uid() is an active member of the specified organization
create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = org_id
      and user_id = auth.uid()
  );
$$;

-- Checks whether auth.uid() is an owner of the specified organization
create or replace function public.is_org_owner(org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

-- Checks whether auth.uid() is an owner or manager in the specified organization
create or replace function public.is_org_admin(org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and role in ('owner', 'manager')
  );
$$;

-- Resolves the organization_id for a given project_id
create or replace function public.get_project_org_id(proj_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public, auth
as $$
  select organization_id
  from public.projects
  where id = proj_id
  limit 1;
$$;

-- Checks if a specific user is a member of the organization hosting a project
create or replace function public.is_user_in_project_org(proj_id uuid, check_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.projects p
    join public.organization_members om on om.organization_id = p.organization_id
    where p.id = proj_id
      and om.user_id = check_user_id
  );
$$;

-- Automatically ensures that when an organization is created, the creator is added as an owner member
create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (organization_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists tr_auto_create_org_owner on public.organizations;
create trigger tr_auto_create_org_owner
after insert on public.organizations
for each row
execute function public.handle_new_organization();

-- Validates task mutations: ensures assignee is in org, and prevents members from altering immutable fields
create or replace function public.validate_task_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_org_id uuid;
  v_is_admin boolean;
begin
  -- Resolve project organization
  v_org_id := public.get_project_org_id(new.project_id);

  if v_org_id is null then
    raise exception 'Project does not exist or has no valid organization.';
  end if;

  -- Verify task assignee is a member of this project's organization
  if new.assignee_id is not null then
    if not exists (
      select 1
      from public.organization_members
      where organization_id = v_org_id
        and user_id = new.assignee_id
    ) then
      raise exception 'Task assignee must be an existing member of the project organization.';
    end if;
  end if;

  -- On UPDATE: prevent non-admins from changing project_id, created_by, or organization
  if tg_op = 'UPDATE' then
    v_is_admin := public.is_org_admin(v_org_id);

    if not v_is_admin then
      if new.project_id <> old.project_id then
        raise exception 'Non-admin members cannot move tasks to another project.';
      end if;
      if new.created_by <> old.created_by then
        raise exception 'Non-admin members cannot modify task created_by.';
      end if;
    end if;

    -- Automatically handle completed_at timestamp
    if new.status = 'done' and (old.status is distinct from 'done') and new.completed_at is null then
      new.completed_at := now();
    elsif new.status <> 'done' and (old.status = 'done') then
      new.completed_at := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_validate_task_mutation on public.tasks;
create trigger tr_validate_task_mutation
before insert or update on public.tasks
for each row
execute function public.validate_task_mutation();

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS on all 4 tables
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;

-- ==============================================================================
-- 6.1 ORGANIZATIONS POLICIES
-- ==============================================================================

-- SELECT: A user can only read organizations where they are an active member (or owner)
create policy "organizations_select_member"
on public.organizations
for select
to authenticated
using (
  public.is_org_member(id)
  or owner_id = auth.uid()
);

-- INSERT: A signed-in user can create an organization only when owner_id = auth.uid()
create policy "organizations_insert_owner"
on public.organizations
for insert
to authenticated
with check (
  auth.uid() is not null
  and owner_id = auth.uid()
);

-- UPDATE: Owners can update organization details
create policy "organizations_update_owner"
on public.organizations
for update
to authenticated
using (
  owner_id = auth.uid()
  or public.is_org_owner(id)
)
with check (
  owner_id = auth.uid()
  or public.is_org_owner(id)
);

-- DELETE: Owners can delete their organization
create policy "organizations_delete_owner"
on public.organizations
for delete
to authenticated
using (
  owner_id = auth.uid()
  or public.is_org_owner(id)
);

-- ==============================================================================
-- 6.2 ORGANIZATION_MEMBERS POLICIES
-- ==============================================================================

-- SELECT: Owners and managers can view all members in their organization.
-- Members can view their own membership row to resolve their status.
create policy "org_members_select_authorized"
on public.organization_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_org_admin(organization_id)
);

-- INSERT: A user can create their own initial owner membership upon org creation,
-- or existing organization owners can invite/add new members.
create policy "org_members_insert_authorized"
on public.organization_members
for insert
to authenticated
with check (
  -- Initial owner self-membership for a newly registered organization
  (
    user_id = auth.uid()
    and role = 'owner'
    and exists (
      select 1
      from public.organizations o
      where o.id = organization_id
        and o.owner_id = auth.uid()
    )
  )
  -- Or existing owners managing memberships
  or public.is_org_owner(organization_id)
);

-- UPDATE: Only owners can manage memberships and roles
create policy "org_members_update_owner"
on public.organization_members
for update
to authenticated
using (
  public.is_org_owner(organization_id)
)
with check (
  public.is_org_owner(organization_id)
);

-- DELETE: Only owners can delete memberships (or remove members)
create policy "org_members_delete_owner"
on public.organization_members
for delete
to authenticated
using (
  public.is_org_owner(organization_id)
);

-- ==============================================================================
-- 6.3 PROJECTS POLICIES
-- ==============================================================================

-- SELECT: Members can view projects only in their own organization
create policy "projects_select_member"
on public.projects
for select
to authenticated
using (
  public.is_org_member(organization_id)
);

-- INSERT: Owners and managers can create projects in their organization
create policy "projects_insert_admin"
on public.projects
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_org_admin(organization_id)
);

-- UPDATE: Owners and managers can edit projects in their organization
create policy "projects_update_admin"
on public.projects
for update
to authenticated
using (
  public.is_org_admin(organization_id)
)
with check (
  public.is_org_admin(organization_id)
);

-- DELETE: Owners and managers can delete projects in their organization
create policy "projects_delete_admin"
on public.projects
for delete
to authenticated
using (
  public.is_org_admin(organization_id)
);

-- ==============================================================================
-- 6.4 TASKS POLICIES
-- ==============================================================================

-- SELECT: Members can read tasks in projects belonging to their organization
create policy "tasks_select_org_member"
on public.tasks
for select
to authenticated
using (
  public.is_org_member(public.get_project_org_id(project_id))
);

-- INSERT: Owners and managers can create tasks in their organization
create policy "tasks_insert_admin"
on public.tasks
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_org_admin(public.get_project_org_id(project_id))
);

-- UPDATE (Owners & Managers): Can manage/update any task in their organization
create policy "tasks_update_admin"
on public.tasks
for update
to authenticated
using (
  public.is_org_admin(public.get_project_org_id(project_id))
)
with check (
  public.is_org_admin(public.get_project_org_id(project_id))
);

-- UPDATE (Assigned Members): Can update tasks assigned to themselves within their organization
create policy "tasks_update_assignee"
on public.tasks
for update
to authenticated
using (
  assignee_id = auth.uid()
  and public.is_org_member(public.get_project_org_id(project_id))
)
with check (
  assignee_id = auth.uid()
  and public.is_org_member(public.get_project_org_id(project_id))
);

-- DELETE: Owners and managers can delete tasks in their organization
create policy "tasks_delete_admin"
on public.tasks
for delete
to authenticated
using (
  public.is_org_admin(public.get_project_org_id(project_id))
);
