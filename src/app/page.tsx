"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Cloud, Home, Loader2, Database, AlertTriangle } from "lucide-react"
import { useLineAuth } from "@/hooks/use-line-auth"
import { useSupabaseGame } from "@/hooks/use-supabase-game"
import { UserProfile } from "@/components/user-profile"
import { ConnectWalletBox } from "@/components/ConnectWalletBox"

export default function TapCloudApp() {
  const { isAuthenticated, user, login, isLoading: authLoading, error: authError } = useLineAuth()
  const [currentScreen, setCurrentScreen] = useState("main")
  const {
    points,
    energy,
    maxEnergy,
    autoPointsLevel,
    energyPerDayLevel,
    pointsPerClickLevel,
    tomorrowEnergyAvailable,
    isLoading: gameLoading,
    error: gameError,
    isSupabaseConfigured,
    updatePoints,
    updateEnergy,
    upgradeLevel,
    claimTomorrowEnergy,
    startGameSession,
    endGameSession,
  } = useSupabaseGame()

  const [sessionStats, setSessionStats] = useState({
    sessionId: null as string | null,
    pointsEarned: 0,
    clicksMade: 0,
    energyUsed: 0,
  })

  // Use refs to track values without causing re-renders
  const sessionStatsRef = useRef(sessionStats)
  const pointsRef = useRef(points)

  // Update refs when state changes
  useEffect(() => {
    sessionStatsRef.current = sessionStats
  }, [sessionStats])

  useEffect(() => {
    pointsRef.current = points
  }, [points])

  // Memoize the update functions to prevent infinite loops
  const updatePointsCallback = useCallback(
    (newPoints: number) => {
      updatePoints(newPoints)
    },
    [updatePoints],
  )

  const updateEnergyCallback = useCallback(
    (newEnergy: number) => {
      updateEnergy(newEnergy)
    },
    [updateEnergy],
  )

  // Auto points generation - fixed infinite loop
  useEffect(() => {
    if (!isAuthenticated || autoPointsLevel <= 1) return

    const interval = setInterval(() => {
      const currentPoints = pointsRef.current
      const newPoints = currentPoints + 0.1
      updatePointsCallback(newPoints)

      setSessionStats((prev) => ({
        ...prev,
        pointsEarned: prev.pointsEarned + 0.1,
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [autoPointsLevel, isAuthenticated, updatePointsCallback]) // Removed points dependency

  // Start game session - fixed infinite loop
  useEffect(() => {
    if (isAuthenticated && user && !sessionStats.sessionId && isSupabaseConfigured) {
      startGameSession()
        .then((sessionId) => {
          if (sessionId) {
            setSessionStats((prev) => ({ ...prev, sessionId }))
          }
        })
        .catch((error) => {
          console.error("Failed to start game session:", error)
        })
    }
  }, [isAuthenticated, user, isSupabaseConfigured, startGameSession]) // Use user object instead of user.id

  // Cleanup session on unmount
  useEffect(() => {
    return () => {
      const currentStats = sessionStatsRef.current
      if (currentStats.sessionId && isSupabaseConfigured) {
        endGameSession(
          currentStats.sessionId,
          currentStats.pointsEarned,
          currentStats.clicksMade,
          currentStats.energyUsed,
        ).catch((error) => {
          console.error("Failed to end game session:", error)
        })
      }
    }
  }, [endGameSession, isSupabaseConfigured])

  const handleCloudClick = useCallback(async () => {
    if (energy > 0) {
      const pointsToAdd = pointsPerClickLevel > 1 ? 2.0 : 1.0
      const newPoints = points + pointsToAdd
      const newEnergy = energy - 1

      try {
        await Promise.all([updatePointsCallback(newPoints), updateEnergyCallback(newEnergy)])

        setSessionStats((prev) => ({
          ...prev,
          pointsEarned: prev.pointsEarned + pointsToAdd,
          clicksMade: prev.clicksMade + 1,
          energyUsed: prev.energyUsed + 1,
        }))
      } catch (error) {
        console.error("Failed to update game state:", error)
      }
    }
  }, [energy, points, pointsPerClickLevel, updatePointsCallback, updateEnergyCallback])

  const handleClaimTomorrowEnergy = useCallback(async () => {
    try {
      await claimTomorrowEnergy()
    } catch (error) {
      console.error("Failed to claim tomorrow energy:", error)
    }
  }, [claimTomorrowEnergy])

  const MainScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 text-white p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="z-10 flex flex-col items-center space-y-8 w-full max-w-md">
        <h1 className="text-4xl font-bold text-cyan-400 mb-4">TapCloud</h1>

        <div className="flex items-center space-x-2 text-sm">
          {isSupabaseConfigured ? (
            <>
              <Database className="h-4 w-4 text-green-400" />
              <span className="text-green-400">{gameLoading ? "Syncing..." : "Cloud Saved"}</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <span className="text-yellow-400">Local Storage Mode</span>
            </>
          )}
        </div>

        {!isSupabaseConfigured && (
          <Card className="bg-yellow-900/50 border-yellow-500/30 w-full">
            <CardContent className="p-4 text-yellow-200 text-xs">
              <p>
                <strong>⚠️ Supabase not configured:</strong> Game data is saved locally and will be lost when you clear
                browser data.
              </p>
            </CardContent>
          </Card>
        )}

        {isAuthenticated && (
          <>
            <UserProfile />
            <ConnectWalletBox />
          </>
        )}

        <div className="text-center space-y-2">
          <div className="text-2xl text-cyan-300">Points: {points.toFixed(2)}</div>
          <div className="text-lg text-gray-300">
            Energy: {energy} / {maxEnergy}
          </div>
          {gameError && <div className="text-red-400 text-sm">⚠️ {gameError}</div>}
        </div>

        <div
          className="relative w-64 h-64 cursor-pointer transform transition-transform hover:scale-105 active:scale-95"
          onClick={handleCloudClick}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-purple-800 rounded-full opacity-80" />
          <div className="absolute inset-0 bg-[url('/placeholder.svg?height=256&width=256')] bg-cover bg-center rounded-full opacity-20" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Cloud className="w-16 h-16 text-cyan-400 mb-2" />
            <span className="text-xl font-bold text-cyan-300">TapCloud</span>
          </div>
        </div>

        {tomorrowEnergyAvailable && (
          <Button
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 rounded-full text-lg font-semibold animate-pulse"
            onClick={handleClaimTomorrowEnergy}
          >
            🌅 Get Tomorrow Energy! ({maxEnergy})
          </Button>
        )}

        {isAuthenticated && sessionStats.sessionId && isSupabaseConfigured && (
          <Card className="bg-slate-800/50 border-cyan-500/30 w-full">
            <CardContent className="p-4">
              <h3 className="text-cyan-400 font-semibold mb-2">Session Stats</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-gray-400">Points</div>
                  <div className="text-white font-semibold">+{sessionStats.pointsEarned.toFixed(1)}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">Clicks</div>
                  <div className="text-white font-semibold">{sessionStats.clicksMade}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">Energy</div>
                  <div className="text-white font-semibold">-{sessionStats.energyUsed}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isAuthenticated ? (
          <Button
            className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-lg font-semibold flex items-center gap-2"
            onClick={login}
            disabled={authLoading}
          >
            {authLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                Login with LINE
              </>
            )}
          </Button>
        ) : (
          <div className="text-center">
            <p className="text-green-400 text-sm">
              ✅ Connected to LINE {isSupabaseConfigured ? "& Supabase" : "(Local Mode)"}
            </p>
            <p className="text-gray-400 text-xs mt-1">Welcome, {user?.displayName}!</p>
          </div>
        )}

        {authError && <p className="text-red-400 text-sm text-center">{authError}</p>}
      </div>
    </div>
  )

  return (
    <div className="relative">
      {currentScreen === "main" && <MainScreen />}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800/90 backdrop-blur-sm border-t border-slate-700">
        <div className="flex justify-around items-center py-3">
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center space-y-1 ${currentScreen === "main" ? "text-cyan-400" : "text-gray-400"}`}
            onClick={() => setCurrentScreen("main")}
          >
            <Home className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}
