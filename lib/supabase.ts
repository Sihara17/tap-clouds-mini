import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey)
}

export interface User {
  id: string
  line_user_id: string
  name: string
  avatar: string | null
  created_at: string
}

export interface GameStats {
  id: string
  user_id: string
  points: number
  energy: number
  updated_at: string
}

export interface ExtendedGameStats extends GameStats {
  maxEnergy: number
  autoPointsLevel: number
  energyPerDayLevel: number
  pointsPerClickLevel: number
  tomorrowEnergyAvailable: boolean
  lastEnergyDepletionTime: string | null
}
