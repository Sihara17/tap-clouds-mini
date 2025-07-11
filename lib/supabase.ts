import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://eumqhcelzschlofoauac.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bXFoY2VsenNjaGxvZm9hdWFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MDQzNDEsImV4cCI6MjA2NDI4MDM0MX0.T2MYJCMmIqRsg53R5BQYjF4VS6kpkI5Lm4cIaoLfvuM"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => true

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
