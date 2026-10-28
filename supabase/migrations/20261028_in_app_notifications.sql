-- ==============================================================================
-- PROJECTFLOW: IN-APP NOTIFICATIONS MIGRATION
-- Migration: 20261028_in_app_notifications.sql
-- Description:
--   1. Adds public.notifications table with strict recipient-only access.
--   2. Enforces recipient-only update strictly for the `read_at` column.
--   3. Adds indexes for recipient, unread state, task, and newest-first sorting.
--   4. Adds triggers on tasks and comments for automated notification generation.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. NOTIFICATIONS TABLE DEFINITION
-- ------------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  type text not null check (type in ('task_assigned', 'comment_added')),
  title text not null check (char_length(trim(title)) > 0),
  body text not null check (char_length(trim(body)) > 0),
  dedupe_key text not null unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------------------
-- 2. INDEXES FOR FAST UNREAD QUERIES & CHRONOLOGICAL LOOKUPS
-- ------------------------------------------------------------------------------

create index if not exists idx_notifications_recipient_created
  on public.notifications(recipient_id, created_at desc);

create index if not exists idx_notifications_recipient_unread
  on public.notifications(recipient_id, read_at)
  where read_at is null;

create index if not exists idx_notifications_org_id
  on public.notifications(organization_id);

create index if not exists idx_notifications_task_id
  on public.notifications(task_id);

-- ------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

alter table public.notifications enable row level security;

-- SELECT: A user can read only notifications addressed directly to them
drop policy if exists "notifications_select_recipient" on public.notifications;
create policy "notifications_select_recipient"
on public.notifications
for select
to authenticated
using (
  recipient_id = auth.uid()
);

-- UPDATE: A user can update only their own notifications
drop policy if exists "notifications_update_recipient" on public.notifications;
create policy "notifications_update_recipient"
on public.notifications
for update
to authenticated
using (
  recipient_id = auth.uid()
)
with check (
  recipient_id = auth.uid()
);

-- NOTE ON INSERT & DELETE:
-- No client-side INSERT or DELETE policies are granted to authenticated users.
-- Notifications are generated exclusively by trusted security-definer database triggers.

-- ------------------------------------------------------------------------------
-- 4. VALIDATION TRIGGER: ENFORCE ONLY read_at CAN BE UPDATED
-- ------------------------------------------------------------------------------

create or replace function public.validate_notification_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.id <> old.id
     or new.organization_id <> old.organization_id
     or new.recipient_id <> old.recipient_id
     or new.actor_id is distinct from old.actor_id
     or new.project_id is distinct from old.project_id
     or new.task_id is distinct from old.task_id
     or new.type <> old.type
     or new.title <> old.title
     or new.body <> old.body
     or new.dedupe_key <> old.dedupe_key
     or new.created_at <> old.created_at then
    raise exception 'Only read_at may be updated on notifications.';
  end if;

  return new;
end;
$$;

drop trigger if exists tr_validate_notification_update on public.notifications;
create trigger tr_validate_notification_update
before update on public.notifications
for each row
execute function public.validate_notification_update();

-- ------------------------------------------------------------------------------
-- 5. TRIGGER: TASK ASSIGNMENT NOTIFICATIONS
-- ------------------------------------------------------------------------------

create or replace function public.record_task_assignment_notification()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid;
  v_project_name text;
  v_org_id uuid;
  v_dedupe_key text;
begin
  -- Only proceed if task has an assignee
  if new.assignee_id is null then
    return new;
  end if;

  -- On update, only notify if the assignee has actually changed
  if tg_op = 'UPDATE' and (new.assignee_id is not distinct from old.assignee_id) then
    return new;
  end if;

  v_actor_id := auth.uid();

  -- Do not notify if the user is assigning the task to themselves
  if new.assignee_id = coalesce(v_actor_id, new.created_by) then
    return new;
  end if;

  -- Resolve project name and organization_id
  select p.name, p.organization_id
  into v_project_name, v_org_id
  from public.projects p
  where p.id = new.project_id;

  if v_org_id is null then
    return new;
  end if;

  -- Construct deterministic dedupe key for this assignment mutation
  v_dedupe_key := 'task_assigned:' || new.id || ':' || new.assignee_id || ':' || to_char(coalesce(new.updated_at, new.created_at, now()), 'YYYYMMDDHH24MISSMS');

  insert into public.notifications (
    organization_id,
    recipient_id,
    actor_id,
    project_id,
    task_id,
    type,
    title,
    body,
    dedupe_key
  ) values (
    v_org_id,
    new.assignee_id,
    v_actor_id,
    new.project_id,
    new.id,
    'task_assigned',
    'Assigned to task',
    'You were assigned to "' || new.title || '" in project "' || coalesce(v_project_name, 'Project') || '".',
    v_dedupe_key
  )
  on conflict (dedupe_key) do nothing;

  return new;
end;
$$;

drop trigger if exists tr_task_assignment_notification on public.tasks;
create trigger tr_task_assignment_notification
after insert or update on public.tasks
for each row
execute function public.record_task_assignment_notification();

-- ------------------------------------------------------------------------------
-- 6. TRIGGER: COMMENT ADDED NOTIFICATIONS
-- ------------------------------------------------------------------------------

create or replace function public.record_comment_notification()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_task_title text;
  v_task_assignee_id uuid;
  v_project_id uuid;
  v_project_name text;
  v_org_id uuid;
  v_dedupe_key text;
begin
  -- Resolve task title, assignee, and project information
  select t.title, t.assignee_id, t.project_id, p.name, p.organization_id
  into v_task_title, v_task_assignee_id, v_project_id, v_project_name, v_org_id
  from public.tasks t
  join public.projects p on p.id = t.project_id
  where t.id = new.task_id;

  -- Only notify if the task has an assigned member
  if v_task_assignee_id is null then
    return new;
  end if;

  -- Do not notify someone about their own comment
  if v_task_assignee_id = new.user_id then
    return new;
  end if;

  if v_org_id is null then
    return new;
  end if;

  -- Guarantee single notification per comment per recipient
  v_dedupe_key := 'comment_added:' || new.id || ':' || v_task_assignee_id;

  insert into public.notifications (
    organization_id,
    recipient_id,
    actor_id,
    project_id,
    task_id,
    type,
    title,
    body,
    dedupe_key
  ) values (
    v_org_id,
    v_task_assignee_id,
    new.user_id,
    v_project_id,
    new.task_id,
    'comment_added',
    'New comment on task',
    'A new comment was added to "' || v_task_title || '" in project "' || coalesce(v_project_name, 'Project') || '".',
    v_dedupe_key
  )
  on conflict (dedupe_key) do nothing;

  return new;
end;
$$;

drop trigger if exists tr_comment_notification on public.comments;
create trigger tr_comment_notification
after insert on public.comments
for each row
execute function public.record_comment_notification();
