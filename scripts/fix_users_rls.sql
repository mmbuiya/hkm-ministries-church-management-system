
-- ============================================================
-- Fix RLS Policies for Users Table
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- Drop existing policies on users table
DROP POLICY IF EXISTS "Users can read all users" ON users;
DROP POLICY IF EXISTS "Users can upsert own record" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;
DROP POLICY IF EXISTS "Users can insert own record" ON users;
DROP POLICY IF EXISTS "Allow authenticated inserts for new users" ON users;
DROP POLICY IF EXISTS "Allow authenticated updates for all users" ON users;

-- Create a permissive policy to allow all operations on users table for now
CREATE POLICY "Allow all operations on users table" ON users FOR ALL USING (true);

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'users';
