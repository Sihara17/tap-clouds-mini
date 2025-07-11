-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create users table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  line_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  picture_url TEXT,
  points DECIMAL(10,2) DEFAULT 2.25,
  energy INTEGER DEFAULT 200,
  max_energy INTEGER DEFAULT 200,
  auto_points_level INTEGER DEFAULT 1,
  energy_per_day_level INTEGER DEFAULT 1,
  points_per_click_level INTEGER DEFAULT 1,
  last_energy_depletion_time TIMESTAMPTZ,
  tomorrow_energy_available BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create game sessions table for analytics
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  points_earned DECIMAL(10,2) DEFAULT 0,
  clicks_made INTEGER DEFAULT 0,
  energy_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_line_user_id ON user_profiles(line_user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (line_user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (line_user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (line_user_id = current_setting('app.current_user_id', true));

-- Create policies for game_sessions
CREATE POLICY "Users can view own sessions" ON game_sessions
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE line_user_id = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "Users can insert own sessions" ON game_sessions
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE line_user_id = current_setting('app.current_user_id', true)
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for energy regeneration
CREATE OR REPLACE FUNCTION regenerate_energy()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles 
  SET energy = LEAST(energy + 1, max_energy),
      updated_at = NOW()
  WHERE energy < max_energy;
END;
$$ LANGUAGE plpgsql;

-- Create function to reset tomorrow energy availability
CREATE OR REPLACE FUNCTION reset_tomorrow_energy()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles 
  SET tomorrow_energy_available = FALSE,
      last_energy_depletion_time = NULL,
      updated_at = NOW()
  WHERE tomorrow_energy_available = TRUE 
    AND last_energy_depletion_time < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;
