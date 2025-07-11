-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_user_id ON game_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_updated_at ON game_stats(updated_at);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_stats ENABLE ROW LEVEL SECURITY;

-- Tambah kolom wallet_address
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS wallet_address TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS wallet_type TEXT;

-- Create policies for users table
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own data" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (true);

-- Create policies for game_stats table
CREATE POLICY "Users can view their own game stats" ON game_stats
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own game stats" ON game_stats
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own game stats" ON game_stats
  FOR UPDATE USING (true);

-- Add helpful functions
CREATE OR REPLACE FUNCTION get_user_by_line_id(line_id text)
RETURNS TABLE(id uuid, line_user_id text, name text, avatar text, created_at timestamptz)
LANGUAGE sql
AS $$
  SELECT id, line_user_id, name, avatar, created_at
  FROM users
  WHERE line_user_id = line_id;
$$;

CREATE OR REPLACE FUNCTION get_game_stats_by_user_id(user_uuid uuid)
RETURNS TABLE(id uuid, user_id uuid, points numeric, energy integer, updated_at timestamptz)
LANGUAGE sql
AS $$
  SELECT id, user_id, points, energy, updated_at
  FROM game_stats
  WHERE user_id = user_uuid;
$$;
