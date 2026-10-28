-- ==============================================================================
-- PROJECTFLOW: COMMENTS AND ACTIVITY HISTORY MIGRATION
-- Migration: 20261028_task_comments_and_activity.sql
-- Description:
--   1. Adds public.comments table with author-only edit/delete RLS.
--   2. Adds public.activity_events table (append-only timeline, client-forge proof).
--   3. Adds security-definer helper functions for resolving task organization.
--   4. Adds triggers on tasks and comments for automated activity recording.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SECURITY DEFINER HELPER FUNCTIONS
-- ------------------------------------------------------------------------------

-- Resolves the organization_id for a given task_id
create or replace function public.get_task_org_id(t_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public, auth
as $$
  select p.organization_id
  from public.tasks t
  join public.projects p on p.id = t.project_id
  where t.id = t_id
  limit 1;
$$;

-- Resolves the project_id for a given task_id
create or replace function public.get_task_project_id(t_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public, auth
as $$
  select t.project_id
  from public.tasks t
  where t.id = t_id
  limit 1;
$$;

-- ------------------------------------------------------------------------------
-- 2. TABLE DEFINITIONS
-- ------------------------------------------------------------------------------

-- 2.1 Comments Table
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_comment_body_length check (char_length(trim(body)) > 0)
);

-- Comments updated_at trigger
drop trigger if exists tr_comments_updated_at on public.comments;
create trigger tr_comments_updated_at
before update on public.comments
for each row
execute function public.handle_updated_at();

-- 2.2 Activity Events Table (append-only audit log)
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------------------
-- 3. INDEXES FOR HIGH-PERFORMANCE TIMELINES
-- ------------------------------------------------------------------------------

-- Comments indexes
create index if not exists idx_comments_task_id on public.comments(task_id);
create index if not exists idx_comments_task_created on public.comments(task_id, created_at asc);
create index if not exists idx_comments_user_id on public.comments(user_id);

-- Activity Events indexes
create index if not exists idx_activity_events_task_created on public.activity_events(task_id, created_at desc);
create index if not exists idx_activity_events_org_id on public.activity_events(organization_id);
create index if not exists idx_activity_events_project_id on public.activity_events(project_id);
create index if not exists idx_activity_events_actor_id on public.activity_events(actor_id);

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

alter table public.comments enable row level security;
alter table public.activity_events enable row level security;

-- 4.1 Comments Policies

-- SELECT: Members can read comments on tasks in their organization
drop policy if exists "comments_select_org_member" on public.comments;
create policy "comments_select_org_member"
on public.comments
for select
to authenticated
using (
  public.is_org_member(public.get_task_org_id(task_id))
);

-- INSERT: Authenticated users can create comments as themselves on permitted tasks
drop policy if exists "comments_insert_author" on public.comments;
create policy "comments_insert_author"
on public.comments
for insert
to authenticated
with check (
  auth.uid() is not null
  and user_id = auth.uid()
  and public.is_org_member(public.get_task_org_id(task_id))
);

-- UPDATE: Comment author may edit only their own comments in their organization
drop policy if exists "comments_update_author" on public.comments;
create policy "comments_update_author"
on public.comments
for update
to authenticated
using (
  user_id = auth.uid()
  and public.is_org_member(public.get_task_org_id(task_id))
)
with check (
  user_id = auth.uid()
  and public.is_org_member(public.get_task_org_id(task_id))
);

-- DELETE: Comment author may delete only their own comments in their organization
drop policy if exists "comments_delete_author" on public.comments;
create policy "comments_delete_author"
on public.comments
for delete
to authenticated
using (
  user_id = auth.uid()
  and public.is_org_member(public.get_task_org_id(task_id))
);

-- 4.2 Activity Events Policies

-- SELECT: Members can read activity events for their organization
drop policy if exists "activity_events_select_org_member" on public.activity_events;
create policy "activity_events_select_org_member"
on public.activity_events
for select
to authenticated
using (
  public.is_org_member(organization_id)
);

-- NOTE ON ACTIVITY_EVENTS INTEGRITY:
-- No INSERT, UPDATE, or DELETE policies are granted to authenticated clients.
-- Because RLS is enabled, any client attempt to insert, update, or delete rows in
-- public.activity_events will be rejected. All activity records are created exclusively
-- by internal security-definer database triggers.

-- ------------------------------------------------------------------------------
-- 5. AUTOMATED ACTIVITY RECORDING TRIGGERS
-- ------------------------------------------------------------------------------

-- Task mutation activity trigger function
create or replace function public.record_task_activity()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_org_id uuid;
  v_actor_id uuid;
begin
  -- Resolve project organization
  v_org_id := public.get_project_org_id(new.project_id);
  if v_org_id is null then
    return new;
  end if;

  v_actor_id := auth.uid();

  -- Case 1: Task Insertion (task created)
  if tg_op = 'INSERT' then
    insert into public.activity_events (
      organization_id,
      project_id,
      task_id,
      actor_id,
      event_type,
      metadata
    ) values (
      v_org_id,
      new.project_id,
      new.id,
      coalesce(v_actor_id, new.created_by),
      'task_created',
      jsonb_build_object(
        'title', new.title,
        'status', new.status,
        'priority', new.priority
      )
    );
    return new;
  end if;

  -- Case 2: Task Update
  if tg_op = 'UPDATE' then
    -- Check Status Change
    if new.status is distinct from old.status then
      insert into public.activity_events (
        organization_id,
        project_id,
        task_id,
        actor_id,
        event_type,
        metadata
      ) values (
        v_org_id,
        new.project_id,
        new.id,
        v_actor_id,
        'task_status_changed',
        jsonb_build_object(
          'old_status', old.status,
          'new_status', new.status
        )
      );
    end if;

    -- Check Assignee Change
    if new.assignee_id is distinct from old.assignee_id then
      insert into public.activity_events (
        organization_id,
        project_id,
        task_id,
        actor_id,
        event_type,
        metadata
      ) values (
        v_org_id,
        new.project_id,
        new.id,
        v_actor_id,
        'task_assignee_changed',
        jsonb_build_object(
          'old_assignee_id', old.assignee_id,
          'new_assignee_id', new.assignee_id
        )
      );
    end if;

    -- Check Due Date Change
    if new.due_date is distinct from old.due_date then
      insert into public.activity_events (
        organization_id,
        project_id,
        task_id,
        actor_id,
        event_type,
        metadata
      ) values (
        v_org_id,
        new.project_id,
        new.id,
        v_actor_id,
        'task_due_date_changed',
        jsonb_build_object(
          'old_due_date', old.due_date,
          'new_due_date', new.due_date
        )
      );
    end if;

    -- Check Priority Change
    if new.priority is distinct from old.priority then
      insert into public.activity_events (
        organization_id,
        project_id,
        task_id,
        actor_id,
        event_type,
        metadata
      ) values (
        v_org_id,
        new.project_id,
        new.id,
        v_actor_id,
        'task_priority_changed',
        jsonb_build_object(
          'old_priority', old.priority,
          'new_priority', new.priority
        )
      );
    end if;

    -- Check Title or Description Change
    if (new.title is distinct from old.title) or (new.description is distinct from old.description) then
      insert into public.activity_events (
        organization_id,
        project_id,
        task_id,
        actor_id,
        event_type,
        metadata
      ) values (
        v_org_id,
        new.project_id,
        new.id,
        v_actor_id,
        'task_updated',
        jsonb_build_object(
          'title_changed', (new.title is distinct from old.title),
          'description_changed', (new.description is distinct from old.description)
        )
      );
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_record_task_activity on public.tasks;
create trigger tr_record_task_activity
after insert or update on public.tasks
for each row
execute function public.record_task_activity();

-- Comment insertion activity trigger function
create or replace function public.record_comment_activity()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_proj_id uuid;
  v_org_id uuid;
begin
  -- Resolve task project and organization
  v_proj_id := public.get_task_project_id(new.task_id);
  if v_proj_id is null then
    return new;
  end if;

  v_org_id := public.get_project_org_id(v_proj_id);
  if v_org_id is null then
    return new;
  end if;

  insert into public.activity_events (
    organization_id,
    project_id,
    task_id,
    actor_id,
    event_type,
    metadata
  ) values (
    v_org_id,
    v_proj_id,
    new.task_id,
    new.user_id,
    'comment_created',
    jsonb_build_object(
      'comment_id', new.id
    )
  );

  return new;
end;
$$;

drop trigger if exists tr_record_comment_activity on public.comments;
create trigger tr_record_comment_activity
after insert on public.comments
for each row
execute function public.record_comment_activity();
