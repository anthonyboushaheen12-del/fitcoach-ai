-- Run in Supabase SQL Editor to verify progress photos + profiles (fixes RLS debugging).
-- Safe: read-only checks.

-- 1) Policies on progress_photos (expect at least one "manage" policy for authenticated users)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'progress_photos';

-- 2) Orphaned profiles (no auth user link) — inserts will fail RLS without service role
SELECT id, user_id, name, created_at
FROM profiles
WHERE user_id IS NULL
ORDER BY created_at DESC
LIMIT 50;

-- 3) RLS enabled on progress_photos
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'progress_photos';
