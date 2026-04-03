-- FitCoach AI — Goals history (Objective-Based Planning)
-- Run in Supabase SQL Editor after profiles exists.

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_text TEXT NOT NULL,
  plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  target_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  started_weight_kg DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS idx_goals_profile_id ON goals(profile_id);
CREATE INDEX IF NOT EXISTS idx_goals_profile_status ON goals(profile_id, status);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own goals" ON goals;
CREATE POLICY "Users can manage own goals" ON goals
  FOR ALL
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
