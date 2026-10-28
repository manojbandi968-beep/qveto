# ProjectFlow System Architecture

ProjectFlow is a collaborative, multi-tenant project and task management platform engineered for strict data isolation, real-time collaboration, and actionable team reporting. It couples a React 19 single-page application with a secure Supabase backend (PostgreSQL, Row-Level Security, GoTrue Auth, Realtime Postgres Changes, and Storage).

---

## 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph Client["React 19 SPA (Client Layer)"]
        UI["Tailwind CSS v4 & Lucide Icons"]
        Router["React Router v7 (Protected & Org Guards)"]
        State["Context Providers (Auth, Org, Notifications)"]
        RealtimeMgr["Realtime Subscription Manager (Debounced Refetch)"]
    end

    subgraph Supabase["Supabase Cloud Platform"]
        Auth["GoTrue Authentication (JWT Tokens)"]
        Storage["Private Storage Bucket (task-attachments)"]
        RealtimeServer["Realtime WebSocket Server (Postgres Changes)"]
        
        subgraph Postgres["PostgreSQL Database with Row-Level Security (RLS)"]
            Tables["Organizations, Members, Projects, Tasks, Comments, Activity, Notifications, Attachments"]
            RLS["Security Definer Helper Functions & RLS Policies"]
            Triggers["Audit Triggers & Notification Generators"]
            Cron["pg_cron (Automated Deadline Notification Daemon)"]
        end
    end

    UI --> Router
    Router --> State
    State --> RealtimeMgr
    State --> Auth
    State --> Tables
    RealtimeMgr <--> RealtimeServer
    RealtimeServer <--> Postgres
    UI --> Storage
```

---

## 2. Multi-Tenant Organization Isolation & Security Strategy

ProjectFlow enforces multi-tenant boundary isolation at the database engine level via PostgreSQL Row-Level Security (RLS). No client query can read or mutate records belonging to an organization where the authenticated user is not an active member.

### Organization Membership & Roles
Organizations contain members with one of three roles:
1. **`owner`**: Full administrative authority; manage workspace settings, invite members, create/edit/delete any project or task.
2. **`manager`**: Operational management; create/edit/delete projects and tasks, assign members, upload files.
3. **`member`**: Team contributor; view assigned projects and tasks, modify assigned task status, submit comments, and upload attachments to accessible tasks.

### Security Definer Helper Functions
To avoid recursive subqueries and ensure high performance without bypassing security checks, PostgreSQL `SECURITY DEFINER` functions evaluate permissions:
- `public.is_org_member(org_id UUID)`: Verifies if `auth.uid()` belongs to the specified organization.
- `public.get_org_role(org_id UUID)`: Returns the caller's role (`owner`, `manager`, `member`).
- `public.can_access_project(proj_id UUID)`: Validates that the project belongs to an organization where the user is an active member.
- `public.can_access_task(task_id UUID)`: Validates organization boundary for task operations.

### RLS Policies Matrix
| Table | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `organizations` | Org members only | Authenticated users (creator becomes owner) | Owners only | Owners only |
| `organization_members` | Org members only | Owners & Managers | Owners only | Owners (cannot remove last owner) |
| `projects` | Org members only | Owners & Managers | Owners & Managers | Owners & Managers |
| `tasks` | Org members only | Owners & Managers | Owners, Managers, or Assignee | Owners & Managers |
| `comments` | Org members only | Org members | Comment Author only | Comment Author, Owner, or Manager |
| `activity_events` | Org members only | Triggers & Org members | Disallowed (append-only ledger) | Disallowed (append-only ledger) |
| `notifications` | Recipient only (`recipient_id = auth.uid()`) | System triggers & Org members | Recipient only (`read_at` timestamps) | Recipient only |
| `task_attachments` | Org members with project access | Org members with task access | Disallowed (immutable metadata) | Attachment Uploader, Owner, or Manager |

---

## 3. Storage Architecture: Private File Attachments

Task file attachments are managed using Supabase Storage paired with database metadata records in `public.task_attachments`.

```mermaid
sequenceDiagram
    autonumber
    actor User as Authenticated Client
    participant App as React Frontend
    participant DB as Postgres (task_attachments)
    participant Storage as Supabase Storage (task-attachments)

    User->>App: Select file (PDF, PNG, JPG, TXT, DOCX <= 10MB)
    App->>App: Client validation (MIME, Extension, Size)
    App->>Storage: Upload binary to {org_id}/{task_id}/{uuid}.{ext}
    Storage-->>App: Upload confirmed (storage_path)
    App->>DB: INSERT into task_attachments (metadata)
    DB-->>App: Record created
    App->>DB: Trigger creates activity_event

    User->>App: Click Download Attachment
    App->>Storage: createSignedUrl(storage_path, 60 seconds)
    Storage-->>App: Short-lived Signed URL
    App->>User: Initiates secure browser download
```

### Key Attachment Security Rules
1. **Private Bucket**: The `task-attachments` bucket has `public = false`. Public URLs are never generated.
2. **Deterministic Private Path**: Files are keyed under `{organization_id}/{task_id}/{file_uuid}.{ext}`.
3. **Storage RLS Policies**: Storage objects inherit tenant isolation—a user can only upload or read files where their JWT belongs to the matching `{organization_id}` folder.
4. **Time-Limited Signed URLs**: Downloads request a 60-second authenticated pre-signed URL from Supabase Storage.

---

## 4. Realtime Synchronization Architecture

ProjectFlow implements scoped Realtime updates using Supabase Realtime Postgres Changes without public broadcast channels or unfiltered schema streams.

```mermaid
flowchart LR
    subgraph UI Components
        NC["NotificationCenter"]
        PDP["ProjectDetailsPage"]
        TD["TaskDrawer"]
        TCS["Comments & Timeline"]
        DASH["DashboardPage"]
    end

    subgraph Scoped Realtime Channels
        C1["realtime:notifications:{userId}<br/>(recipient_id = eq.{userId})"]
        C2["realtime:project-tasks:{projectId}<br/>(project_id = eq.{projectId})"]
        C3["realtime:task-detail:{taskId}<br/>(id = eq.{taskId})"]
        C4["realtime:task-comments:{taskId}<br/>(task_id = eq.{taskId})"]
        C5["realtime:dashboard:{orgId}<br/>(organization_id = eq.{orgId})"]
    end

    NC <--> C1
    PDP <--> C2
    TD <--> C3
    TCS <--> C4
    DASH <--> C5
```

### WAL Replica Identity Full
To allow column-equality filters (such as `project_id=eq...` or `task_id=eq...`) on `UPDATE` and `DELETE` events, PostgreSQL sets `REPLICA IDENTITY FULL` on all enabled tables. Without this, Postgres WAL streams only transmit the primary key on deletes, causing scoped filters to drop delete notifications.

### Debounced Authoritative Refetching
Client components avoid fragile optimistic state reconstruction by using a 250ms–350ms debounce utility (`createDebounce`). Multiple incoming WebSocket notifications within a short window trigger a single authoritative database query.

### Conflict Protection in Task Drawer
When editing a task while a remote update arrives:
- **Form Unmodified (`!isDirty`)**: Form fields automatically update to reflect the remote change.
- **Form Modified (`isDirty`)**: The user's in-progress changes are preserved, and a non-intrusive banner alerts the user: *"Remote update detected. Your active unsaved edits are preserved."*

---

## 5. Notification & Automated Deadline Alert Flow

Notifications alert users to assignments, discussions, and impending or past deadlines.

### Notification Generation Paths
1. **Instant Triggers**:
   - `task_assigned`: Triggered on `tasks.assignee_id` change.
   - `comment_added`: Triggered on `comments` insertion for all project members participating in the task.
2. **Automated Deadline Daemon (`pg_cron`)**:
   - `generate_deadline_notifications()` runs every morning (e.g. `0 6 * * *`).
   - Identifies active non-done/non-cancelled tasks due tomorrow (`due_soon`).
   - Identifies active non-done/non-cancelled tasks past due date (`overdue`).
   - Uses deterministic `dedupe_key` (`due_soon:{task_id}:{due_date}` and `overdue:{task_id}:{current_date}`) with `ON CONFLICT (dedupe_key) DO NOTHING` to guarantee zero duplicate alerts.

