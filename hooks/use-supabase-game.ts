"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface GameState {
  points: number
  energy: number
  maxEnergy: number
  autoPointsLevel: number
  energyPerDayLevel: number
  pointsPerClickLevel: number
  tomorrowEnergyAvailable: boolean
  lastEnergyDepletionTime: string | null
}

interface UseSupabaseGameReturn extends GameState {
  isLoading: boolean
  error: string | null
  isSupabaseConfigured: boolean
  saveGameState: () => Promise<void>
  updatePoints: (newPoints: number) => Promise<void>
  updateEnergy: (newEnergy: number) => Promise<void>
  upgradeLevel: (type: "auto" | "energy" | "click") => Promise<void>
  claimTomorrowEnergy: () => Promise<void>
  startGameSession: () => Promise<string | null>
  endGameSession: (sessionId: string, pointsEarned: number, clicksMade: number, energyUsed: number) => Promise<void>
}

export function useSupabaseGame(lineUserId: string | null): UseSupabaseGameReturn {
  const [gameState, setGameState] = useState<GameState>({
    points: 2.25,
    energy: 200,
    maxEnergy: 200,
    autoPointsLevel: 1,
    energyPerDayLevel: 1,
    pointsPerClickLevel: 1,
    tomorrowEnergyAvailable: false,
    lastEnergyDepletionTime: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  const supabaseConfigured = isSupabaseConfigured()

  // Load user profile from Supabase or localStorage
  const loadUserProfile = useCallback(async () => {
    if (!lineUserId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      if (supabaseConfigured) {
        // Try to load from Supabase
        const { data, error } = await supabase.from("user_profiles").select("*").eq("line_user_id", lineUserId).single()

        if (error && error.code !== "PGRST116") {
          throw error
        }

        if (data) {
          setGameState({
            points: Number.parseFloat(data.points.toString()),
            energy: data.energy,
            maxEnergy: data.max_energy,
            autoPointsLevel: data.auto_points_level,
            energyPerDayLevel: data.energy_per_day_level,
            pointsPerClickLevel: data.points_per_click_level,
            tomorrowEnergyAvailable: data.tomorrow_energy_available,
            lastEnergyDepletionTime: data.last_energy_depletion_time,
          })
        }
      } else {
        // Load from localStorage as fallback
        const savedData = localStorage.getItem(`tapcloud_game_${lineUserId}`)
        if (savedData) {
          const parsed = JSON.parse(savedData)
          setGameState(parsed)
        }
      }
    } catch (err) {
      console.error("Error loading user profile:", err)
      setError(supabaseConfigured ? "Failed to load game data from cloud" : "Using local storage")
    } finally {
      setIsLoading(false)
    }
  }, [lineUserId, supabaseConfigured])

  // Save to Supabase or localStorage
  const saveGameState = useCallback(async () => {
    if (!lineUserId) return

    try {
      setError(null)

      if (supabaseConfigured) {
        const profileData = {
          line_user_id: lineUserId,
          points: gameState.points,
          energy: gameState.energy,
          max_energy: gameState.maxEnergy,
          auto_points_level: gameState.autoPointsLevel,
          energy_per_day_level: gameState.energyPerDayLevel,
          points_per_click_level: gameState.pointsPerClickLevel,
          tomorrow_energy_available: gameState.tomorrowEnergyAvailable,
          last_energy_depletion_time: gameState.lastEnergyDepletionTime,
        }

        const { error } = await supabase.from("user_profiles").upsert(profileData, {
          onConflict: "line_user_id",
        })

        if (error) throw error
      } else {
        // Save to localStorage as fallback
        localStorage.setItem(`tapcloud_game_${lineUserId}`, JSON.stringify(gameState))
      }
    } catch (err) {
      console.error("Error saving game state:", err)
      setError(supabaseConfigured ? "Failed to save to cloud" : "Saved locally")
    }
  }, [lineUserId, gameState, supabaseConfigured])

  // Update points
  const updatePoints = useCallback(
    async (newPoints: number) => {
      setGameState((prev) => ({ ...prev, points: newPoints }))

      if (!lineUserId) return

      try {
        if (supabaseConfigured) {
          const { error } = await supabase
            .from("user_profiles")
            .update({ points: newPoints })
            .eq("line_user_id", lineUserId)

          if (error) throw error
        } else {
          // Update localStorage
          const savedData = localStorage.getItem(`tapcloud_game_${lineUserId}`)
          if (savedData) {
            const parsed = JSON.parse(savedData)
            parsed.points = newPoints
            localStorage.setItem(`tapcloud_game_${lineUserId}`, JSON.stringify(parsed))
          }
        }
      } catch (err) {
        console.error("Error updating points:", err)
        setError("Failed to update points")
      }
    },
    [lineUserId, supabaseConfigured],
  )

  // Update energy
  const updateEnergy = useCallback(
    async (newEnergy: number) => {
      const updates: Partial<GameState> = { energy: newEnergy }

      // Check if energy just reached 0
      if (newEnergy === 0 && gameState.energy > 0 && !gameState.tomorrowEnergyAvailable) {
        updates.tomorrowEnergyAvailable = true
        updates.lastEnergyDepletionTime = new Date().toISOString()
      }

      setGameState((prev) => ({ ...prev, ...updates }))

      if (!lineUserId) return

      try {
        if (supabaseConfigured) {
          const updateData: any = { energy: newEnergy }
          if (updates.tomorrowEnergyAvailable) {
            updateData.tomorrow_energy_available = true
            updateData.last_energy_depletion_time = updates.lastEnergyDepletionTime
          }

          const { error } = await supabase.from("user_profiles").update(updateData).eq("line_user_id", lineUserId)

          if (error) throw error
        } else {
          // Update localStorage
          const savedData = localStorage.getItem(`tapcloud_game_${lineUserId}`)
          if (savedData) {
            const parsed = JSON.parse(savedData)
            parsed.energy = newEnergy
            if (updates.tomorrowEnergyAvailable) {
              parsed.tomorrowEnergyAvailable = true
              parsed.lastEnergyDepletionTime = updates.lastEnergyDepletionTime
            }
            localStorage.setItem(`tapcloud_game_${lineUserId}`, JSON.stringify(parsed))
          }
        }
      } catch (err) {
        console.error("Error updating energy:", err)
        setError("Failed to update energy")
      }
    },
    [lineUserId, gameState.energy, gameState.tomorrowEnergyAvailable, supabaseConfigured],
  )

  // Upgrade levels
  const upgradeLevel = useCallback(
    async (type: "auto" | "energy" | "click") => {
      if (gameState.points < 5000) return

      const newPoints = gameState.points - 5000
      const updates: Partial<GameState> = { points: newPoints }

      switch (type) {
        case "auto":
          updates.autoPointsLevel = gameState.autoPointsLevel + 1
          break
        case "energy":
          updates.energyPerDayLevel = gameState.energyPerDayLevel + 1
          updates.maxEnergy = gameState.maxEnergy + 100
          break
        case "click":
          updates.pointsPerClickLevel = gameState.pointsPerClickLevel + 1
          break
      }

      setGameState((prev) => ({ ...prev, ...updates }))

      if (!lineUserId) return

      try {
        if (supabaseConfigured) {
          const updateData: any = { points: newPoints }

          switch (type) {
            case "auto":
              updateData.auto_points_level = updates.autoPointsLevel
              break
            case "energy":
              updateData.energy_per_day_level = updates.energyPerDayLevel
              updateData.max_energy = updates.maxEnergy
              break
            case "click":
              updateData.points_per_click_level = updates.pointsPerClickLevel
              break
          }

          const { error } = await supabase.from("user_profiles").update(updateData).eq("line_user_id", lineUserId)

          if (error) throw error
        } else {
          // Update localStorage
          const savedData = localStorage.getItem(`tapcloud_game_${lineUserId}`)
          if (savedData) {
            const parsed = JSON.parse(savedData)
            Object.assign(parsed, updates)
            localStorage.setItem(`tapcloud_game_${lineUserId}`, JSON.stringify(parsed))
          }
        }
      } catch (err) {
        console.error("Error upgrading level:", err)
        setError("Failed to upgrade")
      }
    },
    [lineUserId, gameState, supabaseConfigured],
  )

  // Claim tomorrow energy
  const claimTomorrowEnergy = useCallback(async () => {
    const updates = {
      energy: gameState.maxEnergy,
      tomorrowEnergyAvailable: false,
      lastEnergyDepletionTime: null,
    }

    setGameState((prev) => ({ ...prev, ...updates }))

    if (!lineUserId) return

    try {
      if (supabaseConfigured) {
        const { error } = await supabase
          .from("user_profiles")
          .update({
            energy: gameState.maxEnergy,
            tomorrow_energy_available: false,
            last_energy_depletion_time: null,
          })
          .eq("line_user_id", lineUserId)

        if (error) throw error
      } else {
        // Update localStorage
        const savedData = localStorage.getItem(`tapcloud_game_${lineUserId}`)
        if (savedData) {
          const parsed = JSON.parse(savedData)
          Object.assign(parsed, updates)
          localStorage.setItem(`tapcloud_game_${lineUserId}`, JSON.stringify(parsed))
        }
      }
    } catch (err) {
      console.error("Error claiming tomorrow energy:", err)
      setError("Failed to claim energy")
    }
  }, [lineUserId, gameState.maxEnergy, supabaseConfigured])

  // Start game session (only if Supabase is configured)
  const startGameSession = useCallback(async (): Promise<string | null> => {
    if (!lineUserId || !supabaseConfigured) return null

    try {
      // Get user profile ID
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("line_user_id", lineUserId)
        .single()

      if (!profile) return null

      const { data, error } = await supabase
        .from("game_sessions")
        .insert({
          user_id: profile.id,
          session_start: new Date().toISOString(),
        })
        .select("id")
        .single()

      if (error) throw error

      setCurrentSessionId(data.id)
      return data.id
    } catch (err) {
      console.error("Error starting game session:", err)
      return null
    }
  }, [lineUserId, supabaseConfigured])

  // End game session (only if Supabase is configured)
  const endGameSession = useCallback(
    async (sessionId: string, pointsEarned: number, clicksMade: number, energyUsed: number) => {
      if (!supabaseConfigured) return

      try {
        const { error } = await supabase
          .from("game_sessions")
          .update({
            session_end: new Date().toISOString(),
            points_earned: pointsEarned,
            clicks_made: clicksMade,
            energy_used: energyUsed,
          })
          .eq("id", sessionId)

        if (error) throw error

        if (currentSessionId === sessionId) {
          setCurrentSessionId(null)
        }
      } catch (err) {
        console.error("Error ending game session:", err)
      }
    },
    [currentSessionId, supabaseConfigured],
  )

  // Load profile when lineUserId changes
  useEffect(() => {
    loadUserProfile()
  }, [loadUserProfile])

  // Auto-save game state periodically
  useEffect(() => {
    if (!lineUserId || isLoading) return

    const interval = setInterval(() => {
      saveGameState()
    }, 30000) // Save every 30 seconds

    return () => clearInterval(interval)
  }, [lineUserId, isLoading, saveGameState])

  // Energy regeneration
  useEffect(() => {
    const interval = setInterval(() => {
      setGameState((prev) => {
        if (prev.energy < prev.maxEnergy) {
          const newEnergy = Math.min(prev.energy + 1, prev.maxEnergy)
          // Update in database/localStorage
          if (lineUserId) {
            if (supabaseConfigured) {
              supabase
                .from("user_profiles")
                .update({ energy: newEnergy })
                .eq("line_user_id", lineUserId)
                .then(({ error }) => {
                  if (error) console.error("Error updating energy:", error)
                })
            } else {
              const savedData = localStorage.getItem(`tapcloud_game_${lineUserId}`)
              if (savedData) {
                const parsed = JSON.parse(savedData)
                parsed.energy = newEnergy
                localStorage.setItem(`tapcloud_game_${lineUserId}`, JSON.stringify(parsed))
              }
            }
          }
          return { ...prev, energy: newEnergy }
        }
        return prev
      })

      // Check tomorrow energy reset
      setGameState((prev) => {
        if (prev.tomorrowEnergyAvailable && prev.lastEnergyDepletionTime) {
          const depletionTime = new Date(prev.lastEnergyDepletionTime).getTime()
          const now = Date.now()
          if (now - depletionTime > 24 * 60 * 60 * 1000) {
            // Reset tomorrow energy
            const updates = {
              ...prev,
              tomorrowEnergyAvailable: false,
              lastEnergyDepletionTime: null,
            }

            if (lineUserId) {
              if (supabaseConfigured) {
                supabase
                  .from("user_profiles")
                  .update({
                    tomorrow_energy_available: false,
                    last_energy_depletion_time: null,
                  })
                  .eq("line_user_id", lineUserId)
                  .then(({ error }) => {
                    if (error) console.error("Error resetting tomorrow energy:", error)
                  })
              } else {
                const savedData = localStorage.getItem(`tapcloud_game_${lineUserId}`)
                if (savedData) {
                  const parsed = JSON.parse(savedData)
                  parsed.tomorrowEnergyAvailable = false
                  parsed.lastEnergyDepletionTime = null
                  localStorage.setItem(`tapcloud_game_${lineUserId}`, JSON.stringify(parsed))
                }
              }
            }

            return updates
          }
        }
        return prev
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [lineUserId, supabaseConfigured])

  return {
    ...gameState,
    isLoading,
    error,
    isSupabaseConfigured: supabaseConfigured,
    saveGameState,
    updatePoints,
    updateEnergy,
    upgradeLevel,
    claimTomorrowEnergy,
    startGameSession,
    endGameSession,
  }
}
