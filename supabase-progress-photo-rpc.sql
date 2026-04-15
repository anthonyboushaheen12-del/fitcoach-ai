-- FitCoach AI — RPC to insert progress_photos without relying on server service_role.
-- Run in Supabase SQL Editor after progress_photos + progress_sessions exist.
-- Signature includes p_session_id (required).

DROP FUNCTION IF EXISTS public.insert_owned_progress_photo(uuid, text, text, jsonb, text, numeric, text, text);

CREATE OR REPLACE FUNCTION public.insert_owned_progress_photo(
  p_profile_id uuid,
  p_session_id uuid,
  p_storage_path text,
  p_image_url text,
  p_analysis jsonb,
  p_body_fat_estimate text,
  p_weight_at_time numeric,
  p_notes text,
  p_photo_type text
)
RETURNS progress_photos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result progress_photos;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_profile_id AND p.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'session required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.progress_sessions s
    WHERE s.id = p_session_id AND s.profile_id = p_profile_id
  ) THEN
    RAISE EXCEPTION 'invalid session';
  END IF;

  PERFORM set_config('row_security', 'off', true);

  INSERT INTO public.progress_photos (
    profile_id,
    session_id,
    storage_path,
    image_url,
    analysis,
    body_fat_estimate,
    weight_at_time,
    notes,
    photo_type
  ) VALUES (
    p_profile_id,
    p_session_id,
    p_storage_path,
    p_image_url,
    p_analysis,
    p_body_fat_estimate,
    p_weight_at_time,
    p_notes,
    COALESCE(NULLIF(btrim(COALESCE(p_photo_type, '')), ''), 'front')
  )
  RETURNING * INTO result;

  RETURN result;
END;
$$;

ALTER FUNCTION public.insert_owned_progress_photo(
  uuid, uuid, text, text, jsonb, text, numeric, text, text
) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.insert_owned_progress_photo(
  uuid, uuid, text, text, jsonb, text, numeric, text, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.insert_owned_progress_photo(
  uuid, uuid, text, text, jsonb, text, numeric, text, text
) TO authenticated;
