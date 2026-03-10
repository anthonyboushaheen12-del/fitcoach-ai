-- Meal tracking table
CREATE TABLE IF NOT EXISTS meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  meal_name TEXT NOT NULL,
  food_items JSONB NOT NULL DEFAULT '[]',
  total_calories DECIMAL DEFAULT 0,
  total_protein DECIMAL DEFAULT 0,
  total_carbs DECIMAL DEFAULT 0,
  total_fats DECIMAL DEFAULT 0,
  meal_type TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policy
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own meal_logs" ON meal_logs;
CREATE POLICY "Users can manage own meal_logs" ON meal_logs 
  FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
