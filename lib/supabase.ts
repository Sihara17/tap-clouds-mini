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

// Database types matching your existing schema
export interface User {
  id: string
  line_user_id: string
  name: string
  avatar?: string
  created_at: string
}

export interface GameStats {
  id: string
  user_id: string
  points: number
  energy: number
  updated_at: string
}

// Extended game state interface for the app
export interface ExtendedGameStats extends GameStats {
  maxEnergy: number
  autoPointsLevel: number
  energyPerDayLevel: number
  pointsPerClickLevel: number
  tomorrowEnergyAvailable: boolean
  lastEnergyDepletionTime: string | null
}
