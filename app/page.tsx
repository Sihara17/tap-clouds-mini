"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Cloud, Home, Zap, Target, Loader2, Database, AlertTriangle } from "lucide-react"
import { useLineAuth } from "@/hooks/use-line-auth"
import { useSupabaseGame } from "@/hooks/use-supabase-game"
import { UserProfile } from "@/components/user-profile"

export default function TapCloudApp() {
  const [currentScreen, setCurrentScreen] = useState("main")
  const { isAuthenticated, user, login, isLoading: authLoading, error: authError } = useLineAuth()

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
  } = useSupabaseGame(user?.userId || null)

  const [sessionStats, setSessionStats] = useState({
    sessionId: null as string | null,
    pointsEarned: 0,
    clicksMade: 0,
    energyUsed: 0,
  })

  // Auto points generation
  useEffect(() => {
    if (!isAuthenticated || autoPointsLevel <= 1) return

    const interval = setInterval(() => {
      updatePoints(points + 0.1)
      setSessionStats((prev) => ({
        ...prev,
        pointsEarned: prev.pointsEarned + 0.1,
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [autoPointsLevel, points, updatePoints, isAuthenticated])

  // Start game session when user logs in (only if Supabase is configured)
  useEffect(() => {
    if (isAuthenticated && user && !sessionStats.sessionId && isSupabaseConfigured) {
      startGameSession().then((sessionId) => {
        if (sessionId) {
          setSessionStats((prev) => ({ ...prev, sessionId }))
        }
      })
    }
  }, [isAuthenticated, user, sessionStats.sessionId, startGameSession, isSupabaseConfigured])

  // End session on unmount
  useEffect(() => {
    return () => {
      if (sessionStats.sessionId && isSupabaseConfigured) {
        endGameSession(
          sessionStats.sessionId,
          sessionStats.pointsEarned,
          sessionStats.clicksMade,
          sessionStats.energyUsed,
        )
      }
    }
  }, [sessionStats, endGameSession, isSupabaseConfigured])

  const handleCloudClick = async () => {
    if (energy > 0) {
      const pointsToAdd = pointsPerClickLevel > 1 ? 2.0 : 1.0
      const newPoints = points + pointsToAdd
      const newEnergy = energy - 1

      await updatePoints(newPoints)
      await updateEnergy(newEnergy)

      setSessionStats((prev) => ({
        ...prev,
        pointsEarned: prev.pointsEarned + pointsToAdd,
        clicksMade: prev.clicksMade + 1,
        energyUsed: prev.energyUsed + 1,
      }))
    }
  }

  const handleUpgrade = async (type: "auto" | "energy" | "click") => {
    if (points >= 5000) {
      await upgradeLevel(type)
      setSessionStats((prev) => ({
        ...prev,
        pointsEarned: prev.pointsEarned - 5000,
      }))
    }
  }

  const handleClaimTomorrowEnergy = async () => {
    await claimTomorrowEnergy()
  }

  const MainScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 text-white p-4 relative overflow-hidden">
      {/* Background stars effect */}
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

        {/* Configuration Status */}
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

        {/* Configuration Warning */}
        {!isSupabaseConfigured && (
          <Card className="bg-yellow-900/50 border-yellow-500/30 w-full">
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-yellow-400 font-semibold text-sm">Demo Mode</h3>
                  <p className="text-yellow-200 text-xs mt-1">
                    Supabase not configured. Game data is saved locally and will be lost when you clear browser data.
                  </p>
                  <p className="text-yellow-200 text-xs mt-1">Add Supabase integration for cloud saves.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Profile Section */}
        {isAuthenticated && <UserProfile />}

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

        {/* Session Stats - only show if Supabase is configured */}
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

        {/* LINE Login/Logout Button */}
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
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.628-.629.628M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
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

  const UpgradeScreen = () => (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 text-white p-4">
      <div className="max-w-md mx-auto space-y-4 pt-8">
        {/* User Profile in Upgrade Screen */}
        {isAuthenticated && <UserProfile />}

        {/* Configuration Status */}
        <div className="flex items-center justify-center space-x-2 text-sm mb-4">
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

        <Card className="bg-slate-800/50 border-cyan-500/30">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-cyan-400 mb-2">Auto Points</h3>
                <p className="text-gray-300">
                  Level {autoPointsLevel} → {autoPointsLevel === 1 ? "0.00" : "0.10"} → 0.10 per sec
                </p>
              </div>
              <Button
                className="bg-cyan-600 hover:bg-cyan-700"
                onClick={() => handleUpgrade("auto")}
                disabled={points < 5000 || gameLoading}
              >
                {gameLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upgrade (5000 pts)"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-cyan-500/30">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-cyan-400 mb-2">Energy Per Day</h3>
                <p className="text-gray-300">
                  Level {energyPerDayLevel} → {maxEnergy - 100}.00 → {maxEnergy}.00 max/day
                </p>
              </div>
              <Button
                className="bg-cyan-600 hover:bg-cyan-700"
                onClick={() => handleUpgrade("energy")}
                disabled={points < 5000 || gameLoading}
              >
                {gameLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upgrade (5000 pts)"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-cyan-500/30">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-cyan-400 mb-2">Points Per Click</h3>
                <p className="text-gray-300">
                  Level {pointsPerClickLevel} → {pointsPerClickLevel === 1 ? "0.00" : "1.00"} → 2.00 per click
                </p>
              </div>
              <Button
                className="bg-cyan-600 hover:bg-cyan-700"
                onClick={() => handleUpgrade("click")}
                disabled={points < 5000 || gameLoading}
              >
                {gameLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upgrade (5000 pts)"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {gameError && (
          <Card className="bg-red-900/50 border-red-500/30">
            <CardContent className="p-4">
              <p className="text-red-400 text-center">⚠️ {gameError}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )

  const QuestScreen = () => (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        {isAuthenticated && <UserProfile />}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-400 mb-8">Daily Login Quest</h1>
          <p className="text-gray-400 text-lg italic">coming Soon ....</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="relative">
      {currentScreen === "main" && <MainScreen />}
      {currentScreen === "upgrades" && <UpgradeScreen />}
      {currentScreen === "quest" && <QuestScreen />}

      {/* Bottom Navigation */}
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
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center space-y-1 ${currentScreen === "upgrades" ? "text-cyan-400" : "text-gray-400"}`}
            onClick={() => setCurrentScreen("upgrades")}
          >
            <Zap className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center space-y-1 ${currentScreen === "quest" ? "text-cyan-400" : "text-gray-400"}`}
            onClick={() => setCurrentScreen("quest")}
          >
            <Target className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}
