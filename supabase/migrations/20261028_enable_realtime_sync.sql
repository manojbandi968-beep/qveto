-- ==============================================================================
-- PROJECTFLOW: SUPABASE REALTIME SYNCHRONIZATION MIGRATION
-- Migration: 20261028_enable_realtime_sync.sql
-- Description:
--   1. Ensures the `supabase_realtime` publication exists without dropping/recreating it.
--   2. Adds only the required ProjectFlow tables: tasks, comments, activity_events,
--      notifications, and task_attachments (if not already included).
--   3. Sets REPLICA IDENTITY FULL on these tables so that UPDATE/DELETE payloads
--      contain full row data needed for scoped Realtime filters.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SET REPLICA IDENTITY FULL FOR REALTIME ROW-FILTER SUPPORT
-- ------------------------------------------------------------------------------

alter table public.tasks replica identity full;
alter table public.comments replica identity full;
alter table public.activity_events replica identity full;
alter table public.notifications replica identity full;
alter table public.task_attachments replica identity full;

-- ------------------------------------------------------------------------------
-- 2. ADD REQUIRED TABLES TO SUPABASE_REALTIME PUBLICATION SAFELY
-- ------------------------------------------------------------------------------

do $$
begin
  -- Ensure publication exists
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  -- Add public.tasks
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;

  -- Add public.comments
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comments'
  ) then
    alter publication supabase_realtime add table public.comments;
  end if;

  -- Add public.activity_events
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'activity_events'
  ) then
    alter publication supabase_realtime add table public.activity_events;
  end if;

  -- Add public.notifications
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;

  -- Add public.task_attachments
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'task_attachments'
  ) then
    alter publication supabase_realtime add table public.task_attachments;
  end if;
end;
$$;

