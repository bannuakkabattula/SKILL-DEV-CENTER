# Skill Development Center Management ERP

A static admin dashboard (HTML/CSS/JS + Bootstrap) backed entirely by **Supabase**
(PostgreSQL + Auth + Storage). No separate backend server. Deployable directly to
**GitHub Pages**.

> **This build merges two earlier projects:** the Supabase-backed ERP scaffold
> (auth, dashboard, Centers, Employees) and the standalone "Skill Center Task
> Manager" (Centers/Employees/Works/Reports, previously localStorage-only).
> The Task Manager's Work Management and Reports screens have been ported onto
> the Supabase `tasks` table (see `sql/migration_tasks_extra.sql`), so there is
> now **one single database** and **one single login** behind everything —
> nothing here relies on browser localStorage.

## What's included in this scaffold

- **Full database schema** for all 17 tables in the spec (`sql/schema.sql`)
- **Storage bucket setup** for all 5 document/image buckets (`sql/storage_setup.sql`)
- **Sample seed data** for 4 centers with employees, a batch, students, a task,
  a mobilization lead, and expiring documents (`sql/seed_sample_data.sql`)
- **Working auth** — login, forgot password, logout, session guard
- **Working dashboard** — 12 live stat cards + 3 charts + quick actions
- **Every module in the sidebar is now a real, working page**, backed by Supabase:
  - Centers, Center Documents (file upload/download), Infrastructure, Locations
  - Employees, Employee Attendance (check-in/out), Employee Documents (upload/download)
  - Students, Student Attendance (mark by batch + date)
  - Batches, Mobilization (kanban funnel board), Training, Placements
  - Tasks / Work Management (assign, complete, ⭐ important, filters), Reports (4 charts), Calendar, Notifications, Settings
- The only remaining placeholder is the generic **"Documents"** sidebar entry —
  document management is fully implemented per-context instead (Center
  Documents and Employee Documents), which is the more useful shape for this
  workflow.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Note your **Project URL** and **anon/public API key** (Project Settings → API).
   **Never use the `service_role` key in frontend code.**

## 2. Run the database schema

In Supabase Dashboard → **SQL Editor** → New query, run in this order:

1. `sql/schema.sql` — creates all tables, indexes, RLS policies, triggers
2. `sql/migration_tasks_extra.sql` — adds the `category` and `is_important`
   columns the Tasks module needs (ported from the old Task Manager project)
3. `sql/storage_setup.sql` — creates the 5 storage buckets + access policies
4. `sql/seed_sample_data.sql` *(optional)* — populates 4 sample centers so the
   dashboard looks alive immediately. Run this **after** you've logged in once
   (see step 4), since a couple of demo rows reference nothing else that needs it.

## 3. Configure authentication

1. Supabase Dashboard → **Authentication → Providers** → make sure Email is enabled.
2. Supabase Dashboard → **Authentication → Users** → **Add user** → create your
   first admin login (email + password). A `profiles` row is auto-created for
   every new user via a database trigger.
3. If you want self-serve "Forgot password" emails to work, set your **Site URL**
   and **Redirect URLs** under Authentication → URL Configuration to match wherever
   you deploy (e.g. `https://yourusername.github.io/your-repo/`).

## 4. Add your Supabase keys to the app

Edit `js/config.js`:

```javascript
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_ANON_PUBLIC_KEY";
```

That's the only configuration file — everything else reads from it.

## 5. Run locally (optional, before deploying)

This is a static site, so any static file server works:

```bash
cd erp
python3 -m http.server 8080
# open http://localhost:8080
```

## 6. Deploy to GitHub Pages

1. Create a new GitHub repository and push the contents of this `erp/` folder
   to it (the repo root should contain `index.html`).
2. GitHub repo → **Settings → Pages** → Source: **Deploy from a branch** →
   Branch: `main` (or `master`) → folder: `/ (root)` → Save.
3. Your app will be live at `https://yourusername.github.io/your-repo-name/`.
4. Go back to Supabase → Authentication → URL Configuration and set your Site URL
   to that GitHub Pages URL so password-reset links work correctly.

## File structure

```
erp/
├── index.html              Login page
├── dashboard.html           Main dashboard (stats + charts)
├── centers.html               Centers list + add/edit
├── center-documents.html        Center document upload/download
├── infrastructure.html            Per-center infrastructure form
├── locations.html                   Center addresses + map links
├── employees.html                     Employees list + add/edit + attendance
├── employee-documents.html              Employee document upload/download
├── students.html                          Students list + add/edit
├── student-attendance.html                  Mark attendance by batch + date
├── batches.html                               Batches list + add/edit
├── mobilization.html                            Lead funnel kanban board
├── training.html                                  Training session schedule
├── placements.html                                  Placement tracking
├── tasks.html                                         Work management
├── reports.html                                         Charts + summary
├── notifications.html                                     Alerts center
├── calendar.html                                            Month view of works/batches
├── settings.html                                              Profile + password
├── coming-soon.html                                             Generic placeholder
├── css/
│   └── style.css     Design tokens + all component styles
└── js/                One file per module, same CRUD pattern throughout
    ├── config.js              ← put your Supabase URL + anon key here
    ├── supabase-client.js, auth.js, layout.js   Shared shell
    ├── dashboard.js, centers.js, center-documents.js, infrastructure.js, locations.js
    ├── employees.js, employee-documents.js
    ├── students.js, student-attendance.js
    ├── batches.js, mobilization.js, training.js, placements.js
    ├── tasks.js, reports.js, notifications.js, calendar.js, settings.js
sql/
├── schema.sql                       Full database schema (17 tables)
├── migration_tasks_extra.sql          Adds category/is_important to tasks
├── storage_setup.sql                    Storage buckets + policies
└── seed_sample_data.sql                   Sample data (4 centers)
```

## Extending further

The only intentionally-generic placeholder left is the top-level **Documents**
sidebar link — real document handling lives in Center Documents and Employee
Documents instead, which map cleanly to the `center-documents` and
`employee-documents` Storage buckets. If you want a unified cross-module
document search later, follow the same pattern as `center-documents.js`: query
across both tables and merge the results client-side.

## Security notes

- Row Level Security is enabled on every table. The default policy allows any
  **authenticated** user full read/write — tighten this per-role later if you
  add non-admin logins (e.g. restrict trainers to their own center's data).
- Storage buckets are private; the app should use `createSignedUrl()` when you
  add document preview/download so files aren't publicly guessable.
- The `service_role` key must never appear in any file that gets pushed to
  GitHub or served to the browser.
