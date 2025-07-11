-- This script sets up the database to work with your existing schema
-- Run this if you need to add any missing columns or indexes

-- Add indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_user_id ON game_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_updated_at ON game_stats(updated_at);

-- Enable Row Level Security if needed
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON users
  FOR SELECT USING (line_user_id = current_setting('app.current_user_id', true));

CREATE POLICY IF NOT EXISTS "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (line_user_id = current_setting('app.current_user_id', true));

CREATE POLICY IF NOT EXISTS "Users can update own profile" ON users
  FOR UPDATE USING (line_user_id = current_setting('app.current_user_id', true));

-- Create policies for game_stats table
CREATE POLICY IF NOT EXISTS "Users can view own stats" ON game_stats
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users 
      WHERE line_user_id = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY IF NOT EXISTS "Users can insert own stats" ON game_stats
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users 
      WHERE line_user_id = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY IF NOT EXISTS "Users can update own stats" ON game_stats
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM users 
      WHERE line_user_id = current_setting('app.current_user_id', true)
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at on game_stats
DROP TRIGGER IF EXISTS update_game_stats_updated_at ON game_stats;
CREATE TRIGGER update_game_stats_updated_at 
  BEFORE UPDATE ON game_stats 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
