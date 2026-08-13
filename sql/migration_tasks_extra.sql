-- ============================================================================
-- MIGRATION — adds fields needed by the Tasks / Work Management module
-- (ported from the earlier "Skill Center Task Manager" localStorage app).
-- Run this AFTER schema.sql. Safe to re-run (uses IF NOT EXISTS).
-- ============================================================================

alter table tasks add column if not exists category text;
alter table tasks add column if not exists is_important boolean not null default false;

-- Recompute 'overdue' automatically is left to the app (it sets status to
-- 'overdue' when due_date has passed and status was 'pending'/'in_progress').
-- If you'd rather do this in the DB, you could add a scheduled function later.

create index if not exists idx_tasks_important on tasks(is_important);
create index if not exists idx_tasks_due_date on tasks(due_date);
