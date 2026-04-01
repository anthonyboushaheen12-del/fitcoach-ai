-- FitCoach AI — Split RLS policies on progress_photos (INSERT vs FOR ALL edge cases).
-- Run in Supabase SQL Editor if inserts still fail with "row-level security policy"
-- after progress_photos table and "Users can manage own progress_photos" exist.

DROP POLICY IF EXISTS "Users can manage own progress_photos" ON public.progress_photos;

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
