-- Workout logs table (for logging workouts without a plan)
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  exercises JSONB NOT NULL DEFAULT '[]',
  notes TEXT
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workout_logs_profile_id ON workout_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_logged_at ON workout_logs(logged_at);

-- RLS policy
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own workout_logs" ON workout_logs;
CREATE POLICY "Users can manage own workout_logs" ON workout_logs
  FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
