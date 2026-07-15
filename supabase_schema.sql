-- ============================================================
-- HKM Ministries CMS — Supabase Schema
-- Run this entire script in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── ENUMS ──────────────────────────────────────────────────
do $$ begin
  create type member_status as enum ('Active', 'Inactive', 'Transferred', 'Pending Fee');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gender_type as enum ('Male', 'Female');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('Super Admin', 'Admin', 'Data Personnel', 'Member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type visitor_status as enum ('New', 'Follow-up', 'Converted', 'Inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type permission_status as enum ('pending', 'approved', 'denied', 'expired');
exception when duplicate_object then null; end $$;

-- ─── USERS (Clerk-synced) ────────────────────────────────────
create table if not exists users (
  id          text primary key,       -- Clerk user ID
  username    text,
  email       text unique not null,
  role        text not null default 'Member',
  avatar      text,
  last_login  timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table users enable row level security;
create policy "Users can read all users" on users for select using (true);
create policy "Users can upsert own record" on users for insert with check ((current_setting('request.jwt.claims', true)::json->>'sub')::text = id);
create policy "Users can update own record" on users for update using ((current_setting('request.jwt.claims', true)::json->>'sub')::text = id);

-- ─── MEMBERS ────────────────────────────────────────────────
create table if not exists members (
  id               text primary key default concat('HKM-', floor(extract(epoch from now()) * 1000)::text),
  first_name       text not null default '',
  last_name        text not null default '',
  title            text,
  email            text,
  phone            text,
  department       text,
  status           text not null default 'Pending Fee',
  dob              date,
  gender           text not null default 'Male',
  avatar_transform text,
  address          text,
  joined_at        date default current_date,
  occupation       text,
  marital_status   text,
  pin              text,
  is_portal_active boolean default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
alter table members enable row level security;
create policy "Authenticated users can read members" on members for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert members" on members for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update members" on members for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete members" on members for delete using (auth.role() = 'authenticated');

-- ─── BRANCHES ───────────────────────────────────────────────
create table if not exists branches (
  id         serial primary key,
  name       text not null,
  location   text,
  manager_id text references users(id) on delete set null,
  phone      text,
  email      text,
  is_active  boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table branches enable row level security;
create policy "Authenticated users can read branches" on branches for select using (auth.role() = 'authenticated');
create policy "Authenticated users can manage branches" on branches for all using (auth.role() = 'authenticated');

-- ─── GROUPS ─────────────────────────────────────────────────
create table if not exists groups (
  id           serial primary key,
  name         text not null,
  leader_id    text references members(id) on delete set null,
  member_count integer default 0,
  category     text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
alter table groups enable row level security;
create policy "Authenticated users can read groups" on groups for select using (auth.role() = 'authenticated');
create policy "Authenticated users can manage groups" on groups for all using (auth.role() = 'authenticated');

-- ─── TRANSACTIONS ───────────────────────────────────────────
create table if not exists transactions (
  id               serial primary key,
  date             date not null default current_date,
  category         text not null,
  type             text not null,
  amount           numeric(12,2) not null default 0,
  description      text,
  member_id        text references members(id) on delete set null,
  non_member_name  text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
alter table transactions enable row level security;
create policy "Authenticated users can read transactions" on transactions for select using (auth.role() = 'authenticated');
create policy "Authenticated users can manage transactions" on transactions for all using (auth.role() = 'authenticated');

-- ─── ATTENDANCE RECORDS ──────────────────────────────────────
create table if not exists attendance_records (
  id         serial primary key,
  date       date not null default current_date,
  service    text not null,
  member_id  text not null references members(id) on delete cascade,
  status     text not null default 'Present',
  created_at timestamptz default now()
);
create index if not exists attendance_date_idx on attendance_records(date);
alter table attendance_records enable row level security;
create policy "Authenticated users can read attendance" on attendance_records for select using (auth.role() = 'authenticated');
create policy "Authenticated users can manage attendance" on attendance_records for all using (auth.role() = 'authenticated');

-- ─── VISITORS ───────────────────────────────────────────────
create table if not exists visitors (
  id               serial primary key,
  name             text not null,
  initials         text,
  phone            text,
  email            text,
  heard_from       text,
  first_visit      date,
  registered_date  date default current_date,
  status           text default 'New',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
alter table visitors enable row level security;
create policy "Authenticated users can read visitors" on visitors for select using (auth.role() = 'authenticated');
create policy "Authenticated users can manage visitors" on visitors for all using (auth.role() = 'authenticated');

-- ─── FOLLOW UPS ─────────────────────────────────────────────
create table if not exists follow_ups (
  id                 serial primary key,
  visitor_id         integer not null references visitors(id) on delete cascade,
  date               date not null default current_date,
  interaction_type   text,
  notes              text,
  next_follow_up_date date,
  outcome            text,
  created_at         timestamptz default now()
);
alter table follow_ups enable row level security;
create policy "Authenticated users can read follow_ups" on follow_ups for select using (auth.role() = 'authenticated');
create policy "Authenticated users can manage follow_ups" on follow_ups for all using (auth.role() = 'authenticated');

-- ─── EQUIPMENT ──────────────────────────────────────────────
create table if not exists equipment (
  id              serial primary key,
  name            text not null,
  category        text,
  purchase_date   date,
  purchase_price  numeric(12,2),
  condition       text,
  location        text,
  description     text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table equipment enable row level security;
create policy "Authenticated users can read equipment" on equipment for select using (auth.role() = 'authenticated');
create policy "Authenticated users can manage equipment" on equipment for all using (auth.role() = 'authenticated');

-- ─── MAINTENANCE RECORDS ────────────────────────────────────
create table if not exists maintenance_records (
  id            serial primary key,
  equipment_id  integer not null references equipment(id) on delete cascade,
  date          date not null default current_date,
  type          text,
  cost          numeric(12,2),
  description   text,
  status        text,
  created_at    timestamptz default now()
);
alter table maintenance_records enable row level security;
create policy "Authenticated users can read maintenance_records" on maintenance_records for select using (auth.role() = 'authenticated');
create policy "Authenticated users can manage maintenance_records" on maintenance_records for all using (auth.role() = 'authenticated');

-- ─── SMS RECORDS ────────────────────────────────────────────
create table if not exists sms_records (
  id               serial primary key,
  recipient_count  integer default 0,
  message          text not null,
  status           text default 'sent',
  date             date not null default current_date,
  created_at       timestamptz default now()
);
alter table sms_records enable row level security;
create policy "Authenticated users can read sms_records" on sms_records for select using (auth.role() = 'authenticated');
create policy "Authenticated users can manage sms_records" on sms_records for all using (auth.role() = 'authenticated');

-- ─── MESSAGES (Internal) ────────────────────────────────────
create table if not exists messages (
  id          serial primary key,
  sender_id   text references users(id) on delete set null,
  receiver_id text references users(id) on delete set null,
  department  text,
  subject     text,
  body        text not null,
  status      text default 'unread',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table messages enable row level security;
create policy "Authenticated users can read messages" on messages for select using (auth.role() = 'authenticated');
create policy "Authenticated users can manage messages" on messages for all using (auth.role() = 'authenticated');

-- ─── RECYCLE BIN ────────────────────────────────────────────
create table if not exists recycle_bin (
  id          text primary key default gen_random_uuid()::text,
  original_id text not null,
  type        text not null,
  data        jsonb,
  deleted_by  text,
  deleted_at  timestamptz default now(),
  reason      text
);
alter table recycle_bin enable row level security;
create policy "Authenticated users can read recycle_bin" on recycle_bin for select using (auth.role() = 'authenticated');
create policy "Authenticated users can manage recycle_bin" on recycle_bin for all using (auth.role() = 'authenticated');

-- ─── PERMISSION REQUESTS ────────────────────────────────────
create table if not exists permission_requests (
  id              text primary key default gen_random_uuid()::text,
  requester_id    text,
  requester_name  text,
  requester_email text,
  request_type    text,
  data_type       text,
  data_id         text,
  data_name       text,
  reason          text,
  requested_at    timestamptz default now(),
  status          text default 'pending',
  reviewed_by     text,
  reviewed_at     timestamptz,
  review_notes    text,
  expires_at      timestamptz
);
alter table permission_requests enable row level security;
create policy "Authenticated users can read permission_requests" on permission_requests for select using (auth.role() = 'authenticated');
create policy "Authenticated users can manage permission_requests" on permission_requests for all using (auth.role() = 'authenticated');

-- ─── USER SESSIONS ──────────────────────────────────────────
create table if not exists user_sessions (
  id               text primary key default gen_random_uuid()::text,
  user_id          text,
  user_email       text,
  user_name        text,
  user_role        text,
  login_time       timestamptz default now(),
  logout_time      timestamptz,
  is_active        boolean default true,
  ip_address       text,
  user_agent       text,
  location         text,
  session_duration integer,
  last_activity    timestamptz default now()
);
alter table user_sessions enable row level security;
create policy "Authenticated users can read user_sessions" on user_sessions for select using (auth.role() = 'authenticated');
create policy "Authenticated users can manage user_sessions" on user_sessions for all using (auth.role() = 'authenticated');

-- ─── LOGIN ATTEMPTS ─────────────────────────────────────────
create table if not exists login_attempts (
  id             text primary key default gen_random_uuid()::text,
  email          text,
  timestamp      timestamptz default now(),
  success        boolean default false,
  failure_reason text,
  ip_address     text,
  user_agent     text,
  location       text
);
alter table login_attempts enable row level security;
create policy "Authenticated users can read login_attempts" on login_attempts for select using (auth.role() = 'authenticated');
create policy "Authenticated users can manage login_attempts" on login_attempts for all using (auth.role() = 'authenticated');

-- ─── DONE ───────────────────────────────────────────────────
-- All tables created successfully with RLS enabled.
-- Next: Enable pg_graphql in Extensions tab.
