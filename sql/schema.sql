-- ============================================================================
-- SKILL DEVELOPMENT CENTER MANAGEMENT ERP — SUPABASE SCHEMA
-- Run this in Supabase SQL Editor (Project -> SQL Editor -> New query)
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1. PROFILES  (extends Supabase auth.users)
-- ============================================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'admin' check (role in ('admin','project_head','center_incharge','trainer','staff')),
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 2. CENTERS
-- ============================================================================
create table if not exists centers (
  id uuid primary key default uuid_generate_v4(),
  center_code text unique not null,
  center_name text not null,
  center_type text,
  address text,
  village text,
  mandal text,
  city text,
  district text,
  state text,
  pincode text,
  contact_number text,
  email text,
  center_incharge text,
  center_coordinator text,
  establishment_date date,
  status text not null default 'active' check (status in ('active','inactive','under_verification','temporarily_closed')),
  landmark text,
  latitude numeric(10,6),
  longitude numeric(10,6),
  nearby_bus_station text,
  nearby_railway_station text,
  approved_strength int default 0,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists center_infrastructure (
  id uuid primary key default uuid_generate_v4(),
  center_id uuid not null references centers(id) on delete cascade,
  classrooms int default 0,
  labs int default 0,
  computers int default 0,
  working_computers int default 0,
  non_working_computers int default 0,
  projectors int default 0,
  smart_tvs int default 0,
  printers int default 0,
  cctv boolean default false,
  internet boolean default false,
  power_backup boolean default false,
  drinking_water boolean default false,
  washrooms int default 0,
  other_equipment text,
  updated_at timestamptz not null default now()
);

create table if not exists center_documents (
  id uuid primary key default uuid_generate_v4(),
  center_id uuid not null references centers(id) on delete cascade,
  document_name text not null,
  document_type text not null,
  document_number text,
  issue_date date,
  expiry_date date,
  remarks text,
  file_path text,          -- storage path in Supabase Storage bucket 'center-documents'
  status text not null default 'valid' check (status in ('valid','expiring_soon','expired','pending')),
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now()
);

-- ============================================================================
-- 3. EMPLOYEES
-- ============================================================================
create table if not exists employees (
  id uuid primary key default uuid_generate_v4(),
  employee_code text unique not null,
  full_name text not null,
  photo_url text,
  designation text not null,
  department text,
  center_id uuid references centers(id),
  mobile text,
  email text,
  qualification text,
  experience_years numeric(4,1),
  date_of_joining date,
  employee_type text check (employee_type in ('full_time','part_time','contract','intern')),
  reporting_manager uuid references employees(id),
  status text not null default 'active' check (status in ('active','inactive','on_leave','terminated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists employee_documents (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  document_name text not null,
  document_type text,
  file_path text,           -- storage path in bucket 'employee-documents'
  uploaded_at timestamptz not null default now()
);

create table if not exists employee_attendance (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  center_id uuid references centers(id),
  attendance_date date not null default current_date,
  check_in_time timestamptz,
  check_out_time timestamptz,
  total_hours numeric(5,2),
  status text not null default 'present' check (status in ('present','absent','half_day','leave','wfh','late')),
  created_at timestamptz not null default now(),
  unique (employee_id, attendance_date)
);

create table if not exists employee_leaves (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  leave_type text,
  start_date date not null,
  end_date date not null,
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  approved_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 4. BATCHES
-- ============================================================================
create table if not exists batches (
  id uuid primary key default uuid_generate_v4(),
  batch_code text unique not null,
  batch_name text not null,
  center_id uuid not null references centers(id),
  course_name text,
  qp_code text,
  sector text,
  scheme text,
  start_date date,
  end_date date,
  duration text,
  timing text,
  trainer_id uuid references employees(id),
  approved_strength int default 0,
  enrolled_strength int default 0,
  status text not null default 'upcoming' check (status in ('upcoming','mobilization','active','ongoing','completed','frozen','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 5. STUDENTS
-- ============================================================================
create table if not exists students (
  id uuid primary key default uuid_generate_v4(),
  student_code text unique not null,
  candidate_name text not null,
  photo_url text,
  parent_name text,
  mobile text,
  email text,
  gender text check (gender in ('male','female','other')),
  dob date,
  qualification text,
  address text,
  village text,
  mandal text,
  district text,
  state text,
  pincode text,
  center_id uuid references centers(id),
  batch_id uuid references batches(id),
  course_name text,
  enrollment_date date,
  training_status text default 'enrolled' check (training_status in ('enrolled','training','ojt','assessment_pending','completed','placed','dropped','absconded')),
  ojt_status text,
  assessment_status text,
  placement_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists student_attendance (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references students(id) on delete cascade,
  center_id uuid references centers(id),
  batch_id uuid references batches(id),
  attendance_date date not null default current_date,
  status text not null default 'present' check (status in ('present','absent','leave')),
  created_at timestamptz not null default now(),
  unique (student_id, attendance_date)
);

-- ============================================================================
-- 6. TASKS
-- ============================================================================
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  task_title text not null,
  description text,
  center_id uuid references centers(id),
  assigned_employee_id uuid references employees(id),
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  due_date date,
  status text not null default 'pending' check (status in ('pending','in_progress','completed','overdue')),
  remarks text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 7. MOBILIZATION
-- ============================================================================
create table if not exists mobilization_leads (
  id uuid primary key default uuid_generate_v4(),
  candidate_name text not null,
  mobile text,
  center_id uuid references centers(id),
  course_name text,
  mobilizer_id uuid references employees(id),
  lead_source text,
  follow_up_date date,
  status text not null default 'lead' check (status in ('lead','contacted','counselling','interested','documents_collected','enrolled','rejected','follow_up')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 8. TRAINING
-- ============================================================================
create table if not exists training_schedule (
  id uuid primary key default uuid_generate_v4(),
  batch_id uuid not null references batches(id) on delete cascade,
  session_type text check (session_type in ('theory','practical','lab','ojt','assessment','certification')),
  trainer_id uuid references employees(id),
  session_date date,
  start_time time,
  end_time time,
  topic text,
  status text default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 9. PLACEMENTS
-- ============================================================================
create table if not exists placements (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references students(id) on delete cascade,
  center_id uuid references centers(id),
  batch_id uuid references batches(id),
  course_name text,
  company_name text,
  job_role text,
  salary numeric(10,2),
  interview_date date,
  joining_date date,
  placement_status text not null default 'not_placed' check (placement_status in ('not_placed','interview_scheduled','selected','joined','rejected','dropout')),
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 10. NOTIFICATIONS & ACTIVITY LOG
-- ============================================================================
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  message text,
  category text check (category in ('employee_absent','student_attendance_low','task_pending','task_overdue','document_expiring','document_expired','batch_ending','assessment_pending','ojt_pending','placement_pending','general')),
  center_id uuid references centers(id),
  is_read boolean default false,
  created_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
create index if not exists idx_employees_center on employees(center_id);
create index if not exists idx_students_center on students(center_id);
create index if not exists idx_students_batch on students(batch_id);
create index if not exists idx_batches_center on batches(center_id);
create index if not exists idx_emp_att_date on employee_attendance(attendance_date);
create index if not exists idx_stu_att_date on student_attendance(attendance_date);
create index if not exists idx_tasks_center on tasks(center_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_center_docs_expiry on center_documents(expiry_date);
create index if not exists idx_mobilization_center on mobilization_leads(center_id);
create index if not exists idx_placements_student on placements(student_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- Simple policy set: any authenticated user (i.e. any logged-in admin/staff)
-- can read/write. Tighten per-role later if you add non-admin logins.
-- ============================================================================
alter table profiles enable row level security;
alter table centers enable row level security;
alter table center_infrastructure enable row level security;
alter table center_documents enable row level security;
alter table employees enable row level security;
alter table employee_documents enable row level security;
alter table employee_attendance enable row level security;
alter table employee_leaves enable row level security;
alter table batches enable row level security;
alter table students enable row level security;
alter table student_attendance enable row level security;
alter table tasks enable row level security;
alter table mobilization_leads enable row level security;
alter table training_schedule enable row level security;
alter table placements enable row level security;
alter table notifications enable row level security;
alter table activity_logs enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'profiles','centers','center_infrastructure','center_documents',
    'employees','employee_documents','employee_attendance','employee_leaves',
    'batches','students','student_attendance','tasks','mobilization_leads',
    'training_schedule','placements','notifications','activity_logs'
  ])
  loop
    execute format(
      'create policy "auth_all_%1$s" on %1$s for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'');',
      t
    );
  end loop;
end $$;

-- ============================================================================
-- AUTO updated_at TRIGGER
-- ============================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  for t in select unnest(array['centers','employees','batches','students','tasks','mobilization_leads','placements'])
  loop
    execute format('drop trigger if exists trg_%1$s_updated_at on %1$s;', t);
    execute format('create trigger trg_%1$s_updated_at before update on %1$s for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- ============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'admin');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
