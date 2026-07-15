-- ============================================================
-- HKM Ministries CMS — Registration Logging Schema Update
-- Run this script in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── NOTIFICATION LOGS ──────────────────────────────────────
create table if not exists notification_logs (
  id             serial primary key,
  member_id      text references members(id) on delete set null,
  channel        text not null, -- 'sms' or 'email'
  recipient      text not null,
  status         text not null, -- 'success' or 'failed'
  error_message  text,
  created_at     timestamptz default now()
);
alter table notification_logs enable row level security;
create policy "Authenticated users can read notification_logs" on notification_logs for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert notification_logs" on notification_logs for insert with check (auth.role() = 'authenticated');

-- ─── AUDIT LOGS ─────────────────────────────────────────────
create table if not exists audit_logs (
  id             serial primary key,
  action         text not null,
  entity_type    text not null,
  entity_id      text not null,
  details        jsonb,
  user_email     text, -- The admin who performed the action
  created_at     timestamptz default now()
);
alter table audit_logs enable row level security;
create policy "Authenticated users can read audit_logs" on audit_logs for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert audit_logs" on audit_logs for insert with check (auth.role() = 'authenticated');

-- Enable pg_graphql reflection for the new tables
comment on table notification_logs is e'@graphql({"name": "notification_logs"})';
comment on table audit_logs is e'@graphql({"name": "audit_logs"})';
