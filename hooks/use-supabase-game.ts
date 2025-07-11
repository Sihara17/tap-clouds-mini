"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase, type User, type GameStats, type ExtendedGameStats } from "@/lib/supabase"

interface GameState {
  user: User | null
  gameStats: ExtendedGameStats | null
  loading: boolean
  error: string | null
}

export function useSupabaseGame(lineUserId?: string, displayName?: string, pictureUrl?: string) {
  const [state, setState] = useState<GameState>({
    user: null,
    gameStats: null,
    loading: true,
    error: null,
  })

  // Load user and game stats
  const loadUserData = useCallback(async () => {
    if (!lineUserId) {
      setState((prev) => ({ ...prev, loading: false }))
      return
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      // First, try to find existing user
      let { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("line_user_id", lineUserId)
        .single()

      // If user doesn't exist, create them
      if (userError && userError.code === "PGRST116") {
        const { data: newUser, error: createUserError } = await supabase
          .from("users")
          .insert({
            line_user_id: lineUserId,
            name: displayName || "Anonymous",
            avatar: pictureUrl,
          })
          .select()
          .single()

        if (createUserError) throw createUserError
        user = newUser
      } else if (userError) {
        throw userError
      }

      // Now get or create game stats
      let { data: gameStats, error: statsError } = await supabase
        .from("game_stats")
        .select("*")
        .eq("user_id", user.id)
        .single()

      // If game stats don't exist, create them
      if (statsError && statsError.code === "PGRST116") {
        const { data: newStats, error: createStatsError } = await supabase
          .from("game_stats")
          .insert({
            user_id: user.id,
            points: 0,
            energy: 100,
          })
          .select()
          .single()

        if (createStatsError) throw createStatsError
        gameStats = newStats
      } else if (statsError) {
        throw statsError
      }

      // Load extended stats from localStorage
      const localKey = `tapcloud_extended_${user.id}`
      const localData = localStorage.getItem(localKey)
      const extended = localData ? JSON.parse(localData) : {}

      const extendedGameStats: ExtendedGameStats = {
        ...gameStats,
        maxEnergy: extended.maxEnergy || 100,
        autoPointsLevel: extended.autoPointsLevel || 1,
        energyPerDayLevel: extended.energyPerDayLevel || 1,
        pointsPerClickLevel: extended.pointsPerClickLevel || 1,
        tomorrowEnergyAvailable: extended.tomorrowEnergyAvailable || false,
        lastEnergyDepletionTime: extended.lastEnergyDepletionTime || null,
      }

      setState({
        user,
        gameStats: extendedGameStats,
        loading: false,
        error: null,
      })
    } catch (error) {
      console.error("Error loading user data:", error)
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load user data",
      }))
    }
  }, [lineUserId, displayName, pictureUrl])

  // Save game stats to Supabase and localStorage
  const saveGameStats = useCallback(
    async (updates: Partial<ExtendedGameStats>) => {
      if (!state.user || !state.gameStats) return

      try {
        // Separate core stats (for Supabase) from extended stats (for localStorage)
        const coreUpdates: Partial<GameStats> = {}
        const extendedUpdates: any = {}

        Object.entries(updates).forEach(([key, value]) => {
          if (["points", "energy"].includes(key)) {
            coreUpdates[key as keyof GameStats] = value
          } else {
            extendedUpdates[key] = value
          }
        })

        // Update core stats in Supabase
        if (Object.keys(coreUpdates).length > 0) {
          const { error } = await supabase
            .from("game_stats")
            .update({
              ...coreUpdates,
              updated_at: new Date().toISOString(),
            })
            .eq("id", state.gameStats.id)

          if (error) throw error
        }

        // Update extended stats in localStorage
        if (Object.keys(extendedUpdates).length > 0) {
          const localKey = `tapcloud_extended_${state.user.id}`
          const currentLocal = localStorage.getItem(localKey)
          const currentData = currentLocal ? JSON.parse(currentLocal) : {}
          const newData = { ...currentData, ...extendedUpdates }
          localStorage.setItem(localKey, JSON.stringify(newData))
        }

        // Update local state
        const newGameStats = {
          ...state.gameStats,
          ...updates,
          updated_at: new Date().toISOString(),
        }

        setState((prev) => ({
          ...prev,
          gameStats: newGameStats,
        }))
      } catch (error) {
        console.error("Error saving game stats:", error)
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Failed to save game stats",
        }))
      }
    },
    [state.user, state.gameStats],
  )

  // Click handler
  const handleClick = useCallback(async () => {
    if (!state.gameStats || state.gameStats.energy <= 0) return

    const pointsPerClick = state.gameStats.pointsPerClickLevel
    const newPoints = state.gameStats.points + pointsPerClick
    const newEnergy = Math.max(0, state.gameStats.energy - 1)

    await saveGameStats({
      points: newPoints,
      energy: newEnergy,
    })
  }, [state.gameStats, saveGameStats])

  // Upgrade functions
  const upgradeAutoPoints = useCallback(async () => {
    if (!state.gameStats) return

    const cost = state.gameStats.autoPointsLevel * 100
    if (state.gameStats.points < cost) return

    await saveGameStats({
      points: state.gameStats.points - cost,
      autoPointsLevel: state.gameStats.autoPointsLevel + 1,
    })
  }, [state.gameStats, saveGameStats])

  const upgradeEnergyPerDay = useCallback(async () => {
    if (!state.gameStats) return

    const cost = state.gameStats.energyPerDayLevel * 150
    if (state.gameStats.points < cost) return

    const newMaxEnergy = state.gameStats.maxEnergy + 10

    await saveGameStats({
      points: state.gameStats.points - cost,
      energyPerDayLevel: state.gameStats.energyPerDayLevel + 1,
      maxEnergy: newMaxEnergy,
    })
  }, [state.gameStats, saveGameStats])

  const upgradePointsPerClick = useCallback(async () => {
    if (!state.gameStats) return

    const cost = state.gameStats.pointsPerClickLevel * 50
    if (state.gameStats.points < cost) return

    await saveGameStats({
      points: state.gameStats.points - cost,
      pointsPerClickLevel: state.gameStats.pointsPerClickLevel + 1,
    })
  }, [state.gameStats, saveGameStats])

  // Claim tomorrow energy
  const claimTomorrowEnergy = useCallback(async () => {
    if (!state.gameStats || !state.gameStats.tomorrowEnergyAvailable) return

    await saveGameStats({
      energy: state.gameStats.maxEnergy,
      tomorrowEnergyAvailable: false,
      lastEnergyDepletionTime: null,
    })
  }, [state.gameStats, saveGameStats])

  // Auto-generate points effect
  useEffect(() => {
    if (!state.gameStats || state.gameStats.autoPointsLevel <= 1) return

    const interval = setInterval(() => {
      if (state.gameStats) {
        const autoPoints = (state.gameStats.autoPointsLevel - 1) * 2
        saveGameStats({
          points: state.gameStats.points + autoPoints,
        })
      }
    }, 5000) // Every 5 seconds

    return () => clearInterval(interval)
  }, [state.gameStats, saveGameStats])

  // Check for tomorrow energy availability
  useEffect(() => {
    if (!state.gameStats) return

    const checkTomorrowEnergy = () => {
      if (state.gameStats?.energy === 0 && state.gameStats.lastEnergyDepletionTime) {
        const depletionTime = new Date(state.gameStats.lastEnergyDepletionTime)
        const now = new Date()
        const hoursSinceDepletion = (now.getTime() - depletionTime.getTime()) / (1000 * 60 * 60)

        if (hoursSinceDepletion >= 24 && !state.gameStats.tomorrowEnergyAvailable) {
          saveGameStats({ tomorrowEnergyAvailable: true })
        }
      } else if (state.gameStats?.energy === 0 && !state.gameStats.lastEnergyDepletionTime) {
        saveGameStats({ lastEnergyDepletionTime: new Date().toISOString() })
      }
    }

    checkTomorrowEnergy()
    const interval = setInterval(checkTomorrowEnergy, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [state.gameStats, saveGameStats])

  // Load data on mount
  useEffect(() => {
    loadUserData()
  }, [loadUserData])

  return {
    ...state,
    handleClick,
    upgradeAutoPoints,
    upgradeEnergyPerDay,
    upgradePointsPerClick,
    claimTomorrowEnergy,
    saveGameStats,
    reload: loadUserData,
  }
}
