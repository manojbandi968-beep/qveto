-- ==============================================================================
-- PROJECTFLOW: AUTOMATED DEADLINE NOTIFICATIONS MIGRATION
-- Migration: 20261028_automated_deadline_notifications.sql
-- Description:
--   1. Extends the notifications table type constraint to support 'due_soon' and 'overdue'.
--   2. Creates security-definer function public.generate_deadline_notifications().
--   3. Restricts execution to postgres/service_role (inaccessible to browser roles).
--   4. Schedules daily execution at 08:00 UTC via pg_cron with clean unschedule logic.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTEND NOTIFICATION TYPES
-- ------------------------------------------------------------------------------

-- Update existing check constraint to support due_soon and overdue
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('task_assigned', 'comment_added', 'due_soon', 'overdue'));

-- ------------------------------------------------------------------------------
-- 2. AUTOMATED DEADLINE NOTIFICATIONS FUNCTION
-- ------------------------------------------------------------------------------

create or replace function public.generate_deadline_notifications()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_due_soon_count int := 0;
  v_overdue_count int := 0;
begin
  -- ----------------------------------------------------------------------------
  -- Step 1: Generate 'due_soon' notifications for active assigned tasks due tomorrow
  -- ----------------------------------------------------------------------------
  with inserted_due_soon as (
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
    )
    select
      p.organization_id,
      t.assignee_id,
      null,
      t.project_id,
      t.id,
      'due_soon',
      'Task due tomorrow',
      'Task "' || t.title || '" in project "' || coalesce(p.name, 'Project') || '" is due tomorrow (' || to_char(t.due_date, 'Mon DD, YYYY') || ').',
      'due_soon:' || t.id || ':' || t.assignee_id || ':' || to_char(t.due_date, 'YYYY-MM-DD')
    from public.tasks t
    join public.projects p on p.id = t.project_id
    where t.assignee_id is not null
      and t.due_date = (current_date + 1)
      and t.status not in ('done', 'cancelled')
    on conflict (dedupe_key) do nothing
    returning 1
  )
  select count(*) into v_due_soon_count from inserted_due_soon;

  -- ----------------------------------------------------------------------------
  -- Step 2: Generate 'overdue' notifications for active assigned tasks due before today
  -- ----------------------------------------------------------------------------
  with inserted_overdue as (
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
    )
    select
      p.organization_id,
      t.assignee_id,
      null,
      t.project_id,
      t.id,
      'overdue',
      'Task overdue',
      'Task "' || t.title || '" in project "' || coalesce(p.name, 'Project') || '" was due on ' || to_char(t.due_date, 'Mon DD, YYYY') || ' and is overdue.',
      'overdue:' || t.id || ':' || t.assignee_id || ':' || to_char(t.due_date, 'YYYY-MM-DD')
    from public.tasks t
    join public.projects p on p.id = t.project_id
    where t.assignee_id is not null
      and t.due_date < current_date
      and t.status not in ('done', 'cancelled')
    on conflict (dedupe_key) do nothing
    returning 1
  )
  select count(*) into v_overdue_count from inserted_overdue;

  return jsonb_build_object(
    'due_soon_created', v_due_soon_count,
    'overdue_created', v_overdue_count,
    'executed_at', now()
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 3. ACCESS CONTROLS: BLOCK FRONTEND CALLS, PERMIT SYSTEM & CRON
-- ------------------------------------------------------------------------------

-- Ensure anonymous and regular authenticated web browser users cannot execute this function
revoke all on function public.generate_deadline_notifications() from public;
revoke all on function public.generate_deadline_notifications() from anon;
revoke all on function public.generate_deadline_notifications() from authenticated;

-- Allow superuser (postgres cron) and trusted backend service role to execute
grant execute on function public.generate_deadline_notifications() to postgres, service_role;

-- ------------------------------------------------------------------------------
-- 4. SUPABASE CRON (pg_cron) SCHEDULING (DAILY AT 08:00 UTC)
-- ------------------------------------------------------------------------------
-- pg_cron can be enabled in Supabase via Dashboard -> Database -> Extensions
-- or by running `create extension if not exists pg_cron;`.

create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    -- Remove any pre-existing job with the same name to allow safe re-runs
    if exists (select 1 from cron.job where jobname = 'projectflow-generate-deadline-notifications') then
      perform cron.unschedule('projectflow-generate-deadline-notifications');
    end if;

    -- Schedule daily job at 08:00 UTC
    perform cron.schedule(
      'projectflow-generate-deadline-notifications',
      '0 8 * * *',
      'select public.generate_deadline_notifications();'
    );
  end if;
exception
  when others then
    -- If pg_cron requires dashboard activation on hosted tier, log notice gracefully
    raise notice 'pg_cron notice: %. To schedule automatically, enable pg_cron in Supabase Dashboard (Database -> Extensions).', sqlerrm;
end;
$$;

