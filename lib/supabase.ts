import { createClient } from "@supabase/supabase-js"

// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create a mock client for development when env vars are missing
const createMockClient = () => ({
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () =>
          Promise.resolve({ data: null, error: { code: "MOCK_ERROR", message: "Supabase not configured" } }),
      }),
    }),
    insert: () => ({
      select: () => ({ single: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }) }),
    }),
    update: () => ({ eq: () => Promise.resolve({ error: { message: "Supabase not configured" } }) }),
    upsert: () => Promise.resolve({ error: { message: "Supabase not configured" } }),
  }),
  rpc: () => Promise.resolve({ error: { message: "Supabase not configured" } }),
})

// Export either real client or mock client
export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : (createMockClient() as any)

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => !!(supabaseUrl && supabaseAnonKey)

// Database types
export interface UserProfile {
  id: string
  line_user_id: string
  display_name: string
  picture_url?: string
  points: number
  energy: number
  max_energy: number
  auto_points_level: number
  energy_per_day_level: number
  points_per_click_level: number
  last_energy_depletion_time?: string
  tomorrow_energy_available: boolean
  created_at: string
  updated_at: string
}

export interface GameSession {
  id: string
  user_id: string
  session_start: string
  session_end?: string
  points_earned: number
  clicks_made: number
  energy_used: number
  created_at: string
}
