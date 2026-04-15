-- FitCoach AI — Progress sessions (check-in buckets) + progress_photos.session_id
-- Run in Supabase SQL Editor after profiles + progress_photos exist.
-- Then re-run supabase-progress-photo-rpc.sql (updated signature with p_session_id).
--
-- If the app says "Could not find the table ... in the schema cache": after this script
-- finishes, run NOTIFY below, or Supabase Dashboard → Project Settings → API → Reload schema.

-- -----------------------------------------------------------------------------
-- progress_sessions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.progress_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date,
  label TEXT,
  notes TEXT,
  merged_analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_sessions_profile_date
  ON public.progress_sessions(profile_id, session_date DESC);

ALTER TABLE public.progress_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progress_sessions_select_own" ON public.progress_sessions;
DROP POLICY IF EXISTS "progress_sessions_insert_own" ON public.progress_sessions;
DROP POLICY IF EXISTS "progress_sessions_update_own" ON public.progress_sessions;
DROP POLICY IF EXISTS "progress_sessions_delete_own" ON public.progress_sessions;

CREATE POLICY "progress_sessions_select_own" ON public.progress_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = progress_sessions.profile_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "progress_sessions_insert_own" ON public.progress_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "progress_sessions_update_own" ON public.progress_sessions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = progress_sessions.profile_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "progress_sessions_delete_own" ON public.progress_sessions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = progress_sessions.profile_id AND p.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- progress_photos.session_id
-- -----------------------------------------------------------------------------
ALTER TABLE public.progress_photos
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.progress_sessions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_progress_photos_session
  ON public.progress_photos(session_id);

-- Backfill: one session per (profile_id, UTC calendar day) for rows missing session_id;
-- reuse an existing session if the user already has one for that day.
WITH groups AS (
  SELECT DISTINCT profile_id, (created_at AT TIME ZONE 'UTC')::date AS session_date
  FROM public.progress_photos
  WHERE session_id IS NULL
),
to_insert AS (
  SELECT g.profile_id, g.session_date
  FROM groups g
  WHERE NOT EXISTS (
    SELECT 1 FROM public.progress_sessions s
    WHERE s.profile_id = g.profile_id AND s.session_date = g.session_date
  )
)
INSERT INTO public.progress_sessions (profile_id, session_date)
SELECT profile_id, session_date FROM to_insert;

UPDATE public.progress_photos p
SET session_id = (
  SELECT s.id
  FROM public.progress_sessions s
  WHERE s.profile_id = p.profile_id AND s.session_date = (p.created_at AT TIME ZONE 'UTC')::date
  ORDER BY s.created_at ASC, s.id ASC
  LIMIT 1
)
WHERE p.session_id IS NULL;

-- Require session on all rows (safe after backfill; re-run migration only on DBs that need it)
ALTER TABLE public.progress_photos
  ALTER COLUMN session_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- INSERT policy: session must belong to same profile
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "progress_photos_insert_own" ON public.progress_photos;

CREATE POLICY "progress_photos_insert_own" ON public.progress_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.progress_sessions s
      WHERE s.id = session_id AND s.profile_id = progress_photos.profile_id
    )
  );

-- Refresh PostgREST schema cache so REST/API sees new tables immediately
NOTIFY pgrst, 'reload schema';
