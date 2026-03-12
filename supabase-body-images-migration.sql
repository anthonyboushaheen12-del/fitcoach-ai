-- Body image columns on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS body_image_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_body_image_url TEXT;

-- Create storage bucket for body images (public read for display)
INSERT INTO storage.buckets (id, name, public)
VALUES ('body-images', 'body-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload/update/select only in their own folder (path: {user_id}/...)
DROP POLICY IF EXISTS "Users can manage own body images" ON storage.objects;
CREATE POLICY "Users can manage own body images"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'body-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'body-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
