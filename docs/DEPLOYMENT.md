# ProjectFlow Production Deployment Guide

This guide details the step-by-step process for deploying the ProjectFlow single-page application (SPA) to production platforms such as Vercel, Netlify, or Cloudflare Pages, alongside configuring the Supabase backend.

---

## 1. Prerequisites & Environment Variables

### Required Production Environment Variables
Set the following environment variables in your hosting provider's dashboard (e.g. Vercel Project Settings → Environment Variables):

| Variable Name | Description | Example Placeholder |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Your Supabase project API URL | `https://your-project-id.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase Anon / Publishable key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

> [!CAUTION]
> **Never** expose the `service_role` key in frontend environment variables, client code, or static hosting configuration. ProjectFlow interacts with Supabase exclusively using the public/anon key; all authorization is strictly enforced by PostgreSQL Row-Level Security (RLS).

---

## 2. Static Hosting Configuration (SPA Fallback)

Because ProjectFlow uses client-side routing via React Router v7 (`/dashboard`, `/projects/:projectId`, etc.), web servers must rewrite all non-file route requests to `/index.html`.

### Vercel
A `vercel.json` file is included in the project root:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Netlify / Cloudflare Pages
A `public/_redirects` file is included and copied to `dist/` during the build:
```text
/*    /index.html   200
```

### Build Command & Output Directory
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node.js Version**: 20.x or higher

---

## 3. Supabase Auth Configuration

1. In the Supabase Dashboard, navigate to **Authentication** → **URL Configuration**.
2. **Site URL**: Set to your production domain, e.g.:
   ```text
   https://projectflow.yourdomain.com
   ```
3. **Redirect URLs**: Add your production domain and local development URLs:
   ```text
   https://projectflow.yourdomain.com/**
   http://localhost:5173/**
   ```
4. Verify that email provider settings (and optional confirmation emails) match your organizational policy.

---

## 4. Database Migrations Execution Order

When deploying to a new Supabase project, execute the SQL migration scripts in `supabase/migrations/` in the following sequence via the Supabase SQL Editor or Supabase CLI:

```text
1. 20261028_initial_projectflow_schema.sql
   - Core tables: organizations, organization_members, projects, tasks
   - Helper functions: is_org_member, get_org_role, can_access_project, can_access_task
   - Primary RLS policies and organization ownership triggers

2. 20261028_task_comments_and_activity.sql
   - Tables: comments, activity_events
   - Audit event triggers on task actions and status changes
   - Comments and activity RLS policies

3. 20261028_in_app_notifications.sql
   - Table: notifications
   - Notification generation triggers (task_assigned, comment_added)
   - Deduplication key constraints and recipient RLS

4. 20261028_automated_deadline_notifications.sql
   - Notification type extension: due_soon, overdue
   - Function: public.generate_deadline_notifications()
   - Execution grant to postgres / service_role only

5. 20261028_task_file_attachments.sql
   - Private bucket: task-attachments (public: false, 10MB limit, MIME checks)
   - Table: task_attachments
   - Storage RLS policies for org-scoped folder uploads and downloads

6. 20261028_enable_realtime_sync.sql
   - Configures REPLICA IDENTITY FULL on: tasks, comments, activity_events, notifications, task_attachments
   - Idempotently registers tables with supabase_realtime publication
```

---

## 5. Storage Bucket Verification

Verify the private attachment bucket in the Supabase Dashboard:
1. Navigate to **Storage** → **Buckets**.
2. Locate the bucket named `task-attachments`.
3. Confirm that **Public bucket** is toggled **OFF**.
4. Confirm maximum file size is set to **10 MB**.
5. Confirm allowed MIME types are limited to:
   - `application/pdf`
   - `image/png`
   - `image/jpeg`
   - `text/plain`
   - `application/msword`
   - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

---

## 6. Realtime Replication Verification

1. Navigate to **Database** → **Replication** (or **Realtime**).
2. Confirm that **Realtime** is enabled on the project.
3. Under the `supabase_realtime` publication, confirm these 5 tables are listed:
   - `public.tasks`
   - `public.comments`
   - `public.activity_events`
   - `public.notifications`
   - `public.task_attachments`

---

## 7. Scheduling Deadline Notifications (pg_cron)

To execute `public.generate_deadline_notifications()` automatically every day:

1. In Supabase Dashboard, navigate to **Database** → **Extensions** and ensure `pg_cron` is enabled.
2. In the **SQL Editor**, run the schedule command:
   ```sql
   select cron.schedule(
     'daily-deadline-notifications',
     '0 6 * * *', -- Runs every morning at 06:00 UTC
     $$ select public.generate_deadline_notifications(); $$
   );
   ```
3. To test execution manually at any time from SQL Editor:
   ```sql
   select public.generate_deadline_notifications();
   ```

---

## 8. Pre-Deployment Verification Checklist

Before directing production traffic:
- [ ] Run `npm run lint` and verify zero errors and warnings.
- [ ] Run `npm run test` and verify all unit and component tests pass.
- [ ] Run `npm run build` and ensure the production bundle builds without errors.
- [ ] Test a direct link navigation (e.g. reload on `/dashboard` or `/projects`) to ensure SPA fallback functions.
- [ ] Sign in as a test user, upload an attachment, and verify signed URL download succeeds.
- [ ] Verify that unread notifications increment and Realtime indicator shows "Live".

