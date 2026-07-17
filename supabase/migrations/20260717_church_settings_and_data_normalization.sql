-- ============================================================
-- HKM Ministries: Church Settings Table Migration
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tkzxzriivbbzdvjgrdhk/sql
-- ============================================================

-- 1. Create the church_settings singleton table
CREATE TABLE IF NOT EXISTS church_settings (
  id          INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- enforces only 1 row
  name        TEXT NOT NULL DEFAULT '',
  address     TEXT,
  phone       TEXT,
  email       TEXT,
  website     TEXT,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert the default empty row if it doesn't exist yet
INSERT INTO church_settings (id, name, address, phone, email)
VALUES (1, 'HKM Ministries', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- 3. Enable Row Level Security
ALTER TABLE church_settings ENABLE ROW LEVEL SECURITY;

-- 4. Allow anyone (authenticated admins via anon key) to read
CREATE POLICY "Anyone can read church_settings"
  ON church_settings FOR SELECT
  USING (true);

-- 5. Allow admins to update (anon key + service role both work)
CREATE POLICY "Admins can update church_settings"
  ON church_settings FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 6. Allow upsert (insert + update via GraphQL upsert)
CREATE POLICY "Admins can insert church_settings"
  ON church_settings FOR INSERT
  WITH CHECK (true);

-- 7. Auto-update updated_at timestamp on every save
CREATE OR REPLACE FUNCTION update_church_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER church_settings_updated_at
  BEFORE UPDATE ON church_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_church_settings_updated_at();

-- ============================================================
-- PART 2: Standardize existing data to Title Case
-- Run these UPDATE statements to normalize all existing records
-- ============================================================

-- Normalize members
UPDATE members
SET
  first_name    = INITCAP(first_name),
  last_name     = INITCAP(last_name),
  title         = INITCAP(title),
  department    = INITCAP(department),
  address       = INITCAP(address),
  occupation    = INITCAP(occupation),
  marital_status= INITCAP(marital_status),
  email         = LOWER(TRIM(email))
WHERE
  first_name IS NOT NULL
  OR last_name IS NOT NULL
  OR email IS NOT NULL;

-- Normalize transactions
UPDATE transactions
SET
  description      = INITCAP(description),
  non_member_name  = INITCAP(non_member_name)
WHERE description IS NOT NULL OR non_member_name IS NOT NULL;

-- Normalize branches
UPDATE branches
SET
  name     = INITCAP(name),
  location = INITCAP(location),
  email    = LOWER(TRIM(email))
WHERE name IS NOT NULL;

-- Normalize groups
UPDATE groups
SET
  name     = INITCAP(name),
  category = INITCAP(category)
WHERE name IS NOT NULL;

-- Normalize equipment
UPDATE equipment
SET
  name        = INITCAP(name),
  location    = INITCAP(location),
  description = INITCAP(description)
WHERE name IS NOT NULL;

-- Normalize visitors
UPDATE visitors
SET
  name       = INITCAP(name),
  heard_from = INITCAP(heard_from),
  email      = LOWER(TRIM(email))
WHERE name IS NOT NULL;

-- ============================================================
-- Done! Go to Settings > General in the admin panel and
-- fill in your church name, address, phone and email, then
-- click Save to push it to the DB and make it live.
-- ============================================================
