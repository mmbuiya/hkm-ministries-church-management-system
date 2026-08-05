-- ============================================================
-- HKM Ministries: Raise pg_graphql max_rows on ALL tables
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tkzxzriivbbzdvjgrdhk/sql
-- ============================================================
--
-- Problem: pg_graphql caps every collection at max_rows (default 30)
-- server-side. The client-side `first:` argument is silently capped at
-- max_rows, so even with `first: 10000` only 30 rows are returned.
--
-- The dashboard and list pages aggregate over the FULL table (financial
-- balance, totals, counts). With transactions capped at 30, the dashboard
-- showed only a fraction of the 825+ transactions in the database and the
-- financial balance did not reflect the real records.
--
-- Fix: Raise max_rows to 10000 on every table the app reads, via the
-- documented pg_graphql comment directive. 10000 covers any realistic
-- dataset while remaining a single round-trip.
-- ============================================================

COMMENT ON TABLE users                IS e'@graphql({"max_rows": 10000})';
COMMENT ON TABLE members              IS e'@graphql({"max_rows": 10000})';
COMMENT ON TABLE branches             IS e'@graphql({"max_rows": 10000})';
COMMENT ON TABLE groups               IS e'@graphql({"max_rows": 10000})';
COMMENT ON TABLE transactions         IS e'@graphql({"max_rows": 10000})';
COMMENT ON TABLE attendance_records   IS e'@graphql({"max_rows": 10000})';
COMMENT ON TABLE visitors             IS e'@graphql({"max_rows": 10000})';
COMMENT ON TABLE follow_ups           IS e'@graphql({"max_rows": 10000})';
COMMENT ON TABLE equipment            IS e'@graphql({"max_rows": 10000})';
COMMENT ON TABLE maintenance_records  IS e'@graphql({"max_rows": 10000})';
COMMENT ON TABLE sms_records          IS e'@graphql({"max_rows": 10000})';
COMMENT ON TABLE messages             IS e'@graphql({"max_rows": 10000})';
COMMENT ON TABLE recycle_bin          IS e'@graphql({"max_rows": 10000})';
COMMENT ON TABLE permission_requests  IS e'@graphql({"max_rows": 10000})';
COMMENT ON TABLE user_sessions        IS e'@graphql({"max_rows": 10000})';
COMMENT ON TABLE login_attempts       IS e'@graphql({"max_rows": 10000})';
COMMENT ON TABLE provisioning_queue   IS e'@graphql({"max_rows": 10000})';
