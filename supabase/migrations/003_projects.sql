-- 003_projects.sql — project-based system (project-based-refactor plan).
-- Source of truth: docs/DESIGN.md §6 conventions. Old tasks without
-- project_id appear as "Unorganized" in UI.

-- 1. projects --------------------------------------------------------------
-- 1 project = 1 land (land_id NOT NULL); 1 land can have many projects.
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  land_id uuid not null references lands(id),
  name text not null check (char_length(name) <= 100),
  description text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_user_land on projects (user_id, land_id);
create index projects_user_status on projects (user_id, status);

-- 2. tasks: add project_id (nullable — old tasks stay NULL = "Unorganized") --
alter table tasks add column project_id uuid references projects(id);
create index tasks_project_id on tasks (project_id);

-- 3. recurring_task_templates ---------------------------------------------
-- Recurring tasks (penyiraman/pemupukan/perawatan/pestisida) live here, NOT
-- in `tasks`. Each template has its own reset cycle (interval_days).
create table recurring_task_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  category text not null check (category in ('penyiraman', 'pemupukan', 'perawatan', 'pestisida')),
  interval_days int not null check (interval_days > 0),
  time_of_day text check (time_of_day in ('pagi', 'siang', 'sore', 'malam')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recurring_templates_project on recurring_task_templates (project_id);

-- 4. recurring_task_logs ---------------------------------------------------
-- One row per completed cycle; UNIQUE (template_id, scheduled_date) prevents
-- double-check per day.
create table recurring_task_logs (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references recurring_task_templates(id) on delete cascade,
  user_id uuid not null references profiles(id),
  completed_at timestamptz not null default now(),
  scheduled_date date not null,
  created_at timestamptz not null default now()
);
create unique index recurring_logs_unique on recurring_task_logs (template_id, scheduled_date);

-- 5. notification_logs alteration -----------------------------------------
-- Recurring reminders have no task_id (they reference a template). Make
-- task_id nullable and add template_id + project_id. The existing
-- unique (user_id, task_id, type, sent_at) stays for one-time reminders;
-- a partial unique covers recurring dedup (NULL task_id rows must not
-- collide with the existing constraint).
alter table notification_logs alter column task_id drop not null;
alter table notification_logs add column template_id uuid references recurring_task_templates(id);
alter table notification_logs add column project_id uuid references projects(id);
create unique index notification_logs_recurring_unique
  on notification_logs (user_id, template_id, type, sent_at)
  where template_id is not null;

-- 6. updated_at bump triggers (reuse public.set_updated_at from 001_init.sql)
create trigger projects_updated_at
  before update on projects
  for each row execute function public.set_updated_at();
create trigger recurring_task_templates_updated_at
  before update on recurring_task_templates
  for each row execute function public.set_updated_at();

-- 7. RLS -------------------------------------------------------------------
alter table projects enable row level security;
create policy projects_all_own on projects for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table recurring_task_templates enable row level security;
create policy recurring_templates_all_own on recurring_task_templates for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table recurring_task_logs enable row level security;
create policy recurring_logs_all_own on recurring_task_logs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- notification_logs stays service-role only (no policies — matches 001_init.sql).