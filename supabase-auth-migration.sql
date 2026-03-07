-- FitCoach AI — Supabase Auth Migration
-- Run this SQL manually in your Supabase SQL Editor (Dashboard → SQL Editor)
-- Use this when your tables (profiles, plans, chat_messages, weight_logs, photos) already exist.

-- =============================================================================
-- 1. Add user_id column to profiles table
-- =============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Optional: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- =============================================================================
-- 2. Update RLS policies to use auth
-- =============================================================================

-- Profiles: users can only manage their own profile
DROP POLICY IF EXISTS "Allow all on profiles" ON profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
CREATE POLICY "Users can manage own profile" ON profiles 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Plans: users can only manage plans linked to their profile
DROP POLICY IF EXISTS "Allow all on plans" ON plans;
DROP POLICY IF EXISTS "Users can manage own plans" ON plans;
CREATE POLICY "Users can manage own plans" ON plans 
  FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Chat messages: users can only manage messages linked to their profile
DROP POLICY IF EXISTS "Allow all on chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can manage own messages" ON chat_messages;
CREATE POLICY "Users can manage own messages" ON chat_messages 
  FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Weight logs: users can only manage weight logs linked to their profile
DROP POLICY IF EXISTS "Allow all on weight_logs" ON weight_logs;
DROP POLICY IF EXISTS "Users can manage own weight_logs" ON weight_logs;
CREATE POLICY "Users can manage own weight_logs" ON weight_logs 
  FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Photos: users can only manage photos linked to their profile
DROP POLICY IF EXISTS "Allow all on photos" ON photos;
DROP POLICY IF EXISTS "Users can manage own photos" ON photos;
CREATE POLICY "Users can manage own photos" ON photos 
  FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- =============================================================================
-- 3. Enable RLS on tables (if not already enabled)
-- =============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
