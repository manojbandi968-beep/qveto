# ProjectFlow Demonstration & Presentation Guide

A structured, 5–7 minute walkthrough script demonstrating the core capabilities, security model, and collaborative workflows of ProjectFlow.

---

## Preparation Checklist

- [ ] Vite development server running: `npm run dev` at `http://localhost:5173`.
- [ ] Browser window ready (two windows or one normal and one incognito if demonstrating multi-user Realtime synchronization).
- [ ] Seed data present in at least one organization (or follow the onboarding steps live).

---

## Demo Script (5–7 Minutes)

### Phase 1: Introduction & Architecture Overview (0:00 – 0:45)
**Speaker Notes:**
> "Welcome! Today I'm presenting ProjectFlow, a full-stack, multi-tenant project and task management platform built with React 19, TypeScript, Tailwind CSS v4, and a secure Supabase PostgreSQL backend.
>
> What sets ProjectFlow apart is its enterprise-grade multi-tenancy: every project, task, comment, notification, and file attachment is strictly isolated by organization at the database engine level via PostgreSQL Row-Level Security (RLS). There are no shared data leaks, and all live updates operate over scoped channels."

---

### Phase 2: Sign-In & Multi-Tenant Onboarding (0:45 – 1:30)
**Action:**
1. Navigate to `/login`.
2. Enter your credentials and sign in.
3. Show the Workspace Switcher in the sidebar or top navigation.
4. *(Optional)* Click "Create Workspace" or navigate to `/onboarding` to show how a new tenant workspace is provisioned with the creator automatically assigned as `owner`.

**Speaker Notes:**
> "Upon signing in, ProjectFlow validates the active session. If a user is invited to multiple organizations, they can instantly toggle workspaces from the navigation bar. The active workspace ID scopes every downstream query, state store, and WebSocket subscription."

---

### Phase 3: Project Creation & Role-Based Access Controls (1:30 – 2:15)
**Action:**
1. Navigate to the **Projects** view (`/projects`).
2. Point out the role badge (`Owner` or `Manager`).
3. Click **"New Project"**, enter `Mobile App Redesign`, provide a description, and submit.
4. Point out that members without owner/manager privileges have a read-only view and cannot see administrative controls.

**Speaker Notes:**
> "Under the Projects tab, role-based controls dynamically adapt the UI. Owners and managers can create, edit, and delete projects. Non-manager members enjoy a focused view without destructive capabilities. All actions are redundantly protected by database RLS policies."

---

### Phase 4: Task Management — List & Kanban Board (2:15 – 3:30)
**Action:**
1. Click into the newly created project to enter `ProjectDetailsPage`.
2. Click **"Create Task"**, specify title `Design Authentication Screen`, set priority to `High`, set due date to tomorrow, and assign to a team member.
3. Toggle between the **Board** (Kanban) and **List** views using the view switcher in the header.
4. Drag and drop the task card from **To Do** to **In Progress**, then to **Done**.
5. Point out the live status indicator (`Live` green pill) showing scoped Realtime channel connectivity.

**Speaker Notes:**
> "In the project details view, users can alternate seamlessly between an accessible Kanban board and a sortable, filterable task list. Drag-and-drop updates task status with optimistic UI feedback backed by authoritative database mutations. Notice the view preference is remembered per-project."

---

### Phase 5: Task Drawer — Comments, Activity Timeline & Private Attachments (3:30 – 4:30)
**Action:**
1. Click on the task card to open the slide-over **TaskDrawer**.
2. **Form Protection**: Explain that if another user updates the task remotely while you are editing, in-progress unsaved changes will not be overwritten.
3. Switch to the **Comments** tab, enter a note (`"Wireframes uploaded for review"`), and click Send.
4. Switch to the **Attachments** tab, drag and drop or select a PDF or image file (under 10 MB).
5. Click the download button to demonstrate the generation of a secure, 60-second time-limited signed URL from private Supabase Storage.
6. Switch to the **Activity** tab to show the immutable audit event log (`task_created`, `task_status_changed`, `attachment_uploaded`).

**Speaker Notes:**
> "The Task Drawer brings collaboration into a unified view. Team members can post comments, view an immutable activity log, and upload task attachments. Files are stored in a private bucket with strict file-type and size checks, and downloads use short-lived signed URLs rather than public endpoints."

---

### Phase 6: In-App Notifications & Automated Due-Date Alerts (4:30 – 5:15)
**Action:**
1. Direct attention to the bell icon in the top header.
2. Click the bell to open the **NotificationCenter** panel.
3. Point out recent alerts: task assignments, comment mentions, and automated deadline warnings (`Due Tomorrow` and `Overdue`).
4. Click **"Mark all as read"** to update unread counts with live badge feedback.

**Speaker Notes:**
> "ProjectFlow's in-app notification center keeps team members informed. Beyond real-time event triggers, a scheduled database daemon runs daily to evaluate impending deadlines and generate non-duplicating 'Due Tomorrow' and 'Overdue' notices with deterministic deduplication keys."

---

### Phase 7: Organization-Scoped Reporting Dashboard (5:15 – 6:15)
**Action:**
1. Navigate to **Dashboard** (`/dashboard`).
2. Show the summary metric cards:
   - Active Projects & Active Tasks
   - Tasks Completed in Period
   - Overdue Task Count
   - Task Completion Rate
   - On-Time Completion Rate
   - Assignment Coverage
   - Notification Read Rate
3. Toggle the date range filter (**7 Days**, **30 Days**, **All Time**) and show dynamic metric re-calculation.
4. Scroll to **Project Progress** bars, **Task Status Distribution**, and **Team Workload Overview**.

**Speaker Notes:**
> "The Dashboard delivers organization-wide visibility. Rather than arbitrary totals, it measures meaningful team efficiency: On-Time Completion Rate, Assignment Coverage, and Notification Responsiveness. When a project has no tasks, it displays clear 'No eligible tasks' states rather than misleading zeros."

---

### Phase 8: Security & Architecture Summary (6:15 – 7:00)
**Speaker Notes:**
> "To summarize: ProjectFlow achieves multi-tenant safety by combining PostgreSQL Row-Level Security, private signed storage, scoped Realtime synchronization with conflict protection, and an automated deadline notification engine.
>
> The codebase is fully type-safe in TypeScript, verified by automated unit, component, and E2E tests, and ready for static production deployment. Thank you!"

