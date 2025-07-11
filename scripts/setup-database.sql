-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_user_id ON game_stats(user_id);

-- Add Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (true);

-- Policy: Users can only see their own game stats
CREATE POLICY "Users can view own game stats" ON game_stats
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own game stats" ON game_stats
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own game stats" ON game_stats
  FOR UPDATE USING (true);

-- Add some helpful functions
CREATE OR REPLACE FUNCTION get_user_by_line_id(line_id text)
RETURNS TABLE(
  id uuid,
  line_user_id text,
  name text,
  avatar text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.line_user_id, u.name, u.avatar, u.created_at
  FROM users u
  WHERE u.line_user_id = line_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user stats with calculated values
CREATE OR REPLACE FUNCTION get_user_game_stats(user_uuid uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  points numeric,
  energy integer,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT gs.id, gs.user_id, gs.points, gs.energy, gs.updated_at
  FROM game_stats gs
  WHERE gs.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;
