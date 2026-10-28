-- ==============================================================================
-- PROJECTFLOW: SECURE TASK FILE ATTACHMENTS MIGRATION
-- Migration: 20261028_task_file_attachments.sql
-- Description:
--   1. Creates private 'task-attachments' storage bucket (10MB limit, restricted mime types).
--   2. Creates public.task_attachments table with metadata and integrity constraints.
--   3. Enforces storage path format: {organization_id}/{task_id}/{unique_filename}.
--   4. Adds strict RLS policies on public.task_attachments and storage.objects.
--   5. Logs activity events for attachment uploads and deletions.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PRIVATE SUPABASE STORAGE BUCKET CONFIGURATION
-- ------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-attachments',
  'task-attachments',
  false,
  10485760, -- 10 MB limit in bytes
  array[
    'text/plain',
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'text/plain',
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

-- ------------------------------------------------------------------------------
-- 2. TASK ATTACHMENTS TABLE DEFINITION
-- ------------------------------------------------------------------------------

create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  storage_path text not null unique,
  original_filename text not null check (char_length(trim(original_filename)) > 0),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now()
);

-- Indexes for fast task attachment lookups and org isolation
create index if not exists idx_task_attachments_task_id on public.task_attachments(task_id);
create index if not exists idx_task_attachments_org_id on public.task_attachments(organization_id);
create index if not exists idx_task_attachments_uploaded_by on public.task_attachments(uploaded_by);

-- ------------------------------------------------------------------------------
-- 3. INTEGRITY VALIDATION TRIGGER
-- ------------------------------------------------------------------------------

create or replace function public.validate_task_attachment()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_expected_project_id uuid;
  v_expected_org_id uuid;
  v_path_parts text[];
begin
  -- 1. Ensure task exists and resolve its project and organization
  select t.project_id, p.organization_id
  into v_expected_project_id, v_expected_org_id
  from public.tasks t
  join public.projects p on p.id = t.project_id
  where t.id = new.task_id;

  if v_expected_project_id is null then
    raise exception 'Task does not exist.';
  end if;

  if new.project_id <> v_expected_project_id then
    raise exception 'Project ID mismatch for the specified task.';
  end if;

  if new.organization_id <> v_expected_org_id then
    raise exception 'Organization ID mismatch for the specified project.';
  end if;

  -- 2. Verify uploader is the authenticated user on insert
  if tg_op = 'INSERT' then
    if new.uploaded_by <> auth.uid() then
      raise exception 'uploaded_by must match authenticated user ID.';
    end if;
  end if;

  -- 3. Validate storage_path format: organization_id/task_id/unique_filename
  v_path_parts := string_to_array(new.storage_path, '/');
  if array_length(v_path_parts, 1) <> 3
     or v_path_parts[1] <> new.organization_id::text
     or v_path_parts[2] <> new.task_id::text
     or char_length(trim(v_path_parts[3])) = 0 then
    raise exception 'storage_path must strictly follow format: {organization_id}/{task_id}/{unique_filename}.';
  end if;

  return new;
end;
$$;

drop trigger if exists tr_validate_task_attachment on public.task_attachments;
create trigger tr_validate_task_attachment
before insert or update on public.task_attachments
for each row
execute function public.validate_task_attachment();

-- ------------------------------------------------------------------------------
-- 4. ACTIVITY AUDIT EVENTS TRIGGER
-- ------------------------------------------------------------------------------

create or replace function public.record_task_attachment_activity()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid;
begin
  v_actor_id := auth.uid();

  if tg_op = 'INSERT' then
    insert into public.activity_events (
      organization_id,
      project_id,
      task_id,
      actor_id,
      event_type,
      metadata
    ) values (
      new.organization_id,
      new.project_id,
      new.task_id,
      coalesce(v_actor_id, new.uploaded_by),
      'attachment_uploaded',
      jsonb_build_object(
        'attachment_id', new.id,
        'filename', new.original_filename,
        'size_bytes', new.size_bytes,
        'mime_type', new.mime_type
      )
    );
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.activity_events (
      organization_id,
      project_id,
      task_id,
      actor_id,
      event_type,
      metadata
    ) values (
      old.organization_id,
      old.project_id,
      old.task_id,
      coalesce(v_actor_id, old.uploaded_by),
      'attachment_deleted',
      jsonb_build_object(
        'attachment_id', old.id,
        'filename', old.original_filename,
        'size_bytes', old.size_bytes
      )
    );
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists tr_record_task_attachment_activity on public.task_attachments;
create trigger tr_record_task_attachment_activity
after insert or delete on public.task_attachments
for each row
execute function public.record_task_attachment_activity();

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) FOR TASK_ATTACHMENTS
-- ------------------------------------------------------------------------------

alter table public.task_attachments enable row level security;

-- SELECT: Organization members can read attachments only for tasks in their organization
drop policy if exists "task_attachments_select_org_member" on public.task_attachments;
create policy "task_attachments_select_org_member"
on public.task_attachments
for select
to authenticated
using (
  public.is_org_member(organization_id)
);

-- INSERT: Users may upload attachments only to tasks they can access in their organization
drop policy if exists "task_attachments_insert_member" on public.task_attachments;
create policy "task_attachments_insert_member"
on public.task_attachments
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and public.is_org_member(organization_id)
);

-- DELETE: Only the uploader can delete their own attachment; organization owners/managers can delete any attachment in their organization
drop policy if exists "task_attachments_delete_permitted" on public.task_attachments;
create policy "task_attachments_delete_permitted"
on public.task_attachments
for delete
to authenticated
using (
  uploaded_by = auth.uid()
  or public.is_org_admin(organization_id)
);

-- ------------------------------------------------------------------------------
-- 6. STORAGE HELPERS AND RLS FOR 'task-attachments' BUCKET
-- ------------------------------------------------------------------------------

-- Helper function to validate storage read/upload access based on {org_id}/{task_id}/path
create or replace function public.can_access_storage_attachment(obj_name text)
returns boolean
language plpgsql
security definer
stable
set search_path = public, auth
as $$
declare
  v_parts text[];
  v_org_id uuid;
  v_task_id uuid;
begin
  v_parts := string_to_array(obj_name, '/');
  if array_length(v_parts, 1) <> 3 then
    return false;
  end if;

  begin
    v_org_id := v_parts[1]::uuid;
    v_task_id := v_parts[2]::uuid;
  exception when others then
    return false;
  end;

  -- Verify the organization matches the task and the user is an active org member
  return public.is_org_member(v_org_id)
    and exists (
      select 1
      from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id = v_task_id
        and p.organization_id = v_org_id
    );
end;
$$;

-- Helper function to validate storage deletion
create or replace function public.can_delete_storage_attachment(obj_name text, obj_owner uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public, auth
as $$
declare
  v_parts text[];
  v_org_id uuid;
begin
  v_parts := string_to_array(obj_name, '/');
  if array_length(v_parts, 1) <> 3 then
    return false;
  end if;

  begin
    v_org_id := v_parts[1]::uuid;
  exception when others then
    return false;
  end;

  -- Permitted if user is the object owner (uploader) or an org admin (owner/manager)
  return (obj_owner = auth.uid() and public.is_org_member(v_org_id))
    or public.is_org_admin(v_org_id);
end;
$$;

-- Storage RLS on storage.objects for 'task-attachments' bucket
drop policy if exists "task_attachments_storage_select" on storage.objects;
create policy "task_attachments_storage_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'task-attachments'
  and public.can_access_storage_attachment(name)
);

drop policy if exists "task_attachments_storage_insert" on storage.objects;
create policy "task_attachments_storage_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'task-attachments'
  and public.can_access_storage_attachment(name)
);

drop policy if exists "task_attachments_storage_delete" on storage.objects;
create policy "task_attachments_storage_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'task-attachments'
  and public.can_delete_storage_attachment(name, owner)
);

