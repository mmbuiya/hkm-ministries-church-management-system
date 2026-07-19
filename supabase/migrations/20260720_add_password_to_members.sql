-- ============================================================
-- HKM Ministries: Add Password Support for Member Portal
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tkzxzriivbbzdvjgrdhk/sql
-- ============================================================

-- Add password columns to members table
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE;

-- Index for password lookup (only members with password_hash set)
CREATE INDEX IF NOT EXISTS members_password_hash_idx ON members(password_hash)
  WHERE password_hash IS NOT NULL;

-- ============================================================
-- Done! Members can now set a secure password after first PIN login.
-- PIN remains for offline identification purposes only.
-- ============================================================
