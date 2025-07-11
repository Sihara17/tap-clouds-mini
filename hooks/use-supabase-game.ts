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
  const [userId, setUserId] = useState<string | null>(null)

  const supabaseConfigured = isSupabaseConfigured()

  // Load or create user and game stats
  const loadUserProfile = useCallback(async () => {
    if (!lineUserId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      if (supabaseConfigured) {
        // First, get or create user
        let { data: user, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("line_user_id", lineUserId)
          .single()

        if (userError && userError.code === "PGRST116") {
          // User doesn't exist, create one
          const { data: newUser, error: createError } = await supabase
            .from("users")
            .insert({
              line_user_id: lineUserId,
              name: "TapCloud Player",
              avatar: null,
            })
            .select()
            .single()

          if (createError) throw createError
          user = newUser
        } else if (userError) {
          throw userError
        }

        if (user) {
          setUserId(user.id)

          // Now get or create game stats
          let { data: gameStats, error: statsError } = await supabase
            .from("game_stats")
            .select("*")
            .eq("user_id", user.id)
            .single()

          if (statsError && statsError.code === "PGRST116") {
            // Game stats don't exist, create them
            const { data: newStats, error: createStatsError } = await supabase
              .from("game_stats")
              .insert({
                user_id: user.id,
                points: 2.25,
                energy: 200,
              })
              .select()
              .single()

            if (createStatsError) throw createStatsError
            gameStats = newStats
          } else if (statsError) {
            throw statsError
          }

          if (gameStats) {
            // Load extended game state from localStorage (for features not in DB)
            const localKey = `tapcloud_extended_${user.id}`
            const localData = localStorage.getItem(localKey)
            const extended = localData ? JSON.parse(localData) : {}

            setGameState({
              points: Number(gameStats.points) || 2.25,
              energy: Number(gameStats.energy) || 200,
              maxEnergy: extended.maxEnergy || 200,
              autoPointsLevel: extended.autoPointsLevel || 1,
              energyPerDayLevel: extended.energyPerDayLevel || 1,
              pointsPerClickLevel: extended.pointsPerClickLevel || 1,
              tomorrowEnergyAvailable: extended.tomorrowEnergyAvailable || false,
              lastEnergyDepletionTime: extended.lastEnergyDepletionTime || null,
            })
          }
        }
      } else {
        // Load from localStorage as fallback
        const savedData = localStorage.getItem(`tapcloud_game_${lineUserId}`)
        if (savedData) {
          const parsed = JSON.parse(savedData)
          setGameState({
            points: Number(parsed.points) || 2.25,
            energy: Number(parsed.energy) || 200,
            maxEnergy: Number(parsed.maxEnergy) || 200,
            autoPointsLevel: Number(parsed.autoPointsLevel) || 1,
            energyPerDayLevel: Number(parsed.energyPerDayLevel) || 1,
            pointsPerClickLevel: Number(parsed.pointsPerClickLevel) || 1,
            tomorrowEnergyAvailable: Boolean(parsed.tomorrowEnergyAvailable),
            lastEnergyDepletionTime: parsed.lastEnergyDepletionTime || null,
          })
        }
      }
    } catch (err) {
      console.error("Error loading user profile:", err)
      setError(supabaseConfigured ? "Failed to load game data from cloud" : "Using local storage")
    } finally {
      setIsLoading(false)
    }
  }, [lineUserId, supabaseConfigured])

  // Save to Supabase and localStorage
  const saveGameState = useCallback(async () => {
    if (!lineUserId) return

    try {
      setError(null)

      if (supabaseConfigured && userId) {
        // Update game stats in Supabase
        const { error: statsError } = await supabase
          .from("game_stats")
          .update({
            points: gameState.points,
            energy: gameState.energy,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)

        if (statsError) throw statsError

        // Save extended data to localStorage
        const extendedData = {
          maxEnergy: gameState.maxEnergy,
          autoPointsLevel: gameState.autoPointsLevel,
          energyPerDayLevel: gameState.energyPerDayLevel,
          pointsPerClickLevel: gameState.pointsPerClickLevel,
          tomorrowEnergyAvailable: gameState.tomorrowEnergyAvailable,
          lastEnergyDepletionTime: gameState.lastEnergyDepletionTime,
        }
        localStorage.setItem(`tapcloud_extended_${userId}`, JSON.stringify(extendedData))
      } else {
        // Save to localStorage as fallback
        localStorage.setItem(`tapcloud_game_${lineUserId}`, JSON.stringify(gameState))
      }
    } catch (err) {
      console.error("Error saving game state:", err)
      setError(supabaseConfigured ? "Failed to save to cloud" : "Saved locally")
    }
  }, [lineUserId, gameState, supabaseConfigured, userId])

  // Update points
  const updatePoints = useCallback(
    async (newPoints: number) => {
      const safePoints = Number(newPoints) || 0
      setGameState((prev) => ({ ...prev, points: safePoints }))

      if (!lineUserId) return

      try {
        if (supabaseConfigured && userId) {
          const { error } = await supabase
            .from("game_stats")
            .update({
              points: safePoints,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)

          if (error) throw error
        } else {
          // Update localStorage
          const savedData = localStorage.getItem(`tapcloud_game_${lineUserId}`)
          if (savedData) {
            const parsed = JSON.parse(savedData)
            parsed.points = safePoints
            localStorage.setItem(`tapcloud_game_${lineUserId}`, JSON.stringify(parsed))
          }
        }
      } catch (err) {
        console.error("Error updating points:", err)
        setError("Failed to update points")
      }
    },
    [lineUserId, supabaseConfigured, userId],
  )

  // Update energy
  const updateEnergy = useCallback(
    async (newEnergy: number) => {
      const safeEnergy = Math.max(0, Number(newEnergy) || 0)
      const updates: Partial<GameState> = { energy: safeEnergy }

      // Check if energy just reached 0
      if (safeEnergy === 0 && gameState.energy > 0 && !gameState.tomorrowEnergyAvailable) {
        updates.tomorrowEnergyAvailable = true
        updates.lastEnergyDepletionTime = new Date().toISOString()
      }

      setGameState((prev) => ({ ...prev, ...updates }))

      if (!lineUserId) return

      try {
        if (supabaseConfigured && userId) {
          const { error } = await supabase
            .from("game_stats")
            .update({
              energy: safeEnergy,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)

          if (error) throw error

          // Update extended data in localStorage
          if (updates.tomorrowEnergyAvailable) {
            const extendedData = JSON.parse(localStorage.getItem(`tapcloud_extended_${userId}`) || "{}")
            extendedData.tomorrowEnergyAvailable = true
            extendedData.lastEnergyDepletionTime = updates.lastEnergyDepletionTime
            localStorage.setItem(`tapcloud_extended_${userId}`, JSON.stringify(extendedData))
          }
        } else {
          // Update localStorage
          const savedData = localStorage.getItem(`tapcloud_game_${lineUserId}`)
          if (savedData) {
            const parsed = JSON.parse(savedData)
            parsed.energy = safeEnergy
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
    [lineUserId, gameState.energy, gameState.tomorrowEnergyAvailable, supabaseConfigured, userId],
  )

  // Upgrade levels
  const upgradeLevel = useCallback(
    async (type: "auto" | "energy" | "click") => {
      if (gameState.points < 5000) return

      const newPoints = Math.max(0, gameState.points - 5000)
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
        if (supabaseConfigured && userId) {
          // Update points in Supabase
          const { error } = await supabase
            .from("game_stats")
            .update({
              points: newPoints,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)

          if (error) throw error

          // Update extended data in localStorage
          const extendedData = JSON.parse(localStorage.getItem(`tapcloud_extended_${userId}`) || "{}")
          Object.assign(extendedData, updates)
          localStorage.setItem(`tapcloud_extended_${userId}`, JSON.stringify(extendedData))
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
    [lineUserId, gameState, supabaseConfigured, userId],
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
      if (supabaseConfigured && userId) {
        const { error } = await supabase
          .from("game_stats")
          .update({
            energy: gameState.maxEnergy,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)

        if (error) throw error

        // Update extended data in localStorage
        const extendedData = JSON.parse(localStorage.getItem(`tapcloud_extended_${userId}`) || "{}")
        extendedData.tomorrowEnergyAvailable = false
        extendedData.lastEnergyDepletionTime = null
        localStorage.setItem(`tapcloud_extended_${userId}`, JSON.stringify(extendedData))
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
  }, [lineUserId, gameState.maxEnergy, supabaseConfigured, userId])

  // Start game session (simplified - just return a mock ID since we don't have sessions table)
  const startGameSession = useCallback(async (): Promise<string | null> => {
    if (!lineUserId || !supabaseConfigured) return null
    // Return a simple session ID for tracking
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [lineUserId, supabaseConfigured])

  // End game session (simplified - just log for now)
  const endGameSession = useCallback(
    async (sessionId: string, pointsEarned: number, clicksMade: number, energyUsed: number) => {
      if (!supabaseConfigured) return
      // Log session data (could be extended to save to a sessions table later)
      console.log("Session ended:", { sessionId, pointsEarned, clicksMade, energyUsed })
    },
    [supabaseConfigured],
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
            if (supabaseConfigured && userId) {
              supabase
                .from("game_stats")
                .update({
                  energy: newEnergy,
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", userId)
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
              if (supabaseConfigured && userId) {
                // Update extended data in localStorage
                const extendedData = JSON.parse(localStorage.getItem(`tapcloud_extended_${userId}`) || "{}")
                extendedData.tomorrowEnergyAvailable = false
                extendedData.lastEnergyDepletionTime = null
                localStorage.setItem(`tapcloud_extended_${userId}`, JSON.stringify(extendedData))
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
  }, [lineUserId, supabaseConfigured, userId])

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
