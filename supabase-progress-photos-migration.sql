-- FitCoach AI — Progress photos (body timeline + AI analysis)
-- Run in Supabase SQL Editor after `profiles` exists.
-- Object key format from app: {auth_uid}/{profile_id}/{timestamp}.jpg
-- Images are shown via signed URLs from /api/progress-photo (private bucket).

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

CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  image_url TEXT,
  analysis JSONB,
  body_fat_estimate TEXT,
  weight_at_time DECIMAL,
  notes TEXT,
  photo_type TEXT DEFAULT 'front',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_photos_profile_created
  ON progress_photos(profile_id, created_at ASC);

ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own progress_photos" ON progress_photos;
CREATE POLICY "Users can manage own progress_photos" ON progress_photos
  FOR ALL
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
