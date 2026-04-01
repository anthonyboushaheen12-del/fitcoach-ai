-- =============================================================================
-- progress_photos already exists? (ERROR 42P07)
-- -----------------------------------------------------------------------------
-- Do NOT paste a bare "CREATE TABLE progress_photos (...)" again unless it
-- matches the full schema (profile_id, storage_path, etc.) and uses IF NOT EXISTS.
--
-- Safe approach:
-- 1) Run THIS file to repair missing columns, storage bucket, and RLS policies.
-- 2) Then run supabase-progress-photo-rpc.sql (insert_owned_progress_photo RPC).
--
-- Full greenfield setup (new project): use supabase-progress-photos-migration.sql
-- =============================================================================

-- --- Storage bucket + object policies (idempotent) ---------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own progress photos" ON storage.objects;
CREATE POLICY "Users upload own progress photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users read own progress photos" ON storage.objects;
CREATE POLICY "Users read own progress photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users update own progress photos" ON storage.objects;
CREATE POLICY "Users update own progress photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users delete own progress photos" ON storage.objects;
CREATE POLICY "Users delete own progress photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- --- Table: add any columns missing (idempotent) ------------------------------
-- If you accidentally created a tiny table, these ALTERs extend it to match the app.
ALTER TABLE public.progress_photos
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS analysis JSONB,
  ADD COLUMN IF NOT EXISTS body_fat_estimate TEXT,
  ADD COLUMN IF NOT EXISTS weight_at_time DECIMAL,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS photo_type TEXT DEFAULT 'front',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_progress_photos_profile_created
  ON public.progress_photos(profile_id, created_at ASC);

ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

-- --- Split RLS policies (replace single FOR ALL policy) -----------------------
DROP POLICY IF EXISTS "Users can manage own progress_photos" ON public.progress_photos;

DROP POLICY IF EXISTS "progress_photos_select_own" ON public.progress_photos;
DROP POLICY IF EXISTS "progress_photos_insert_own" ON public.progress_photos;
DROP POLICY IF EXISTS "progress_photos_update_own" ON public.progress_photos;
DROP POLICY IF EXISTS "progress_photos_delete_own" ON public.progress_photos;

CREATE POLICY "progress_photos_select_own" ON public.progress_photos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = progress_photos.profile_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "progress_photos_insert_own" ON public.progress_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "progress_photos_update_own" ON public.progress_photos
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = progress_photos.profile_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "progress_photos_delete_own" ON public.progress_photos
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = progress_photos.profile_id AND p.user_id = auth.uid()
    )
  );
