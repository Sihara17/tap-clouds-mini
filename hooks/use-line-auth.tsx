"use client"

import { useState, useEffect, useCallback } from "react"

// Types for LINE user profile
interface LineProfile {
  userId: string
  displayName: string
  pictureUrl?: string
  statusMessage?: string
}

interface LineAuthState {
  isAuthenticated: boolean
  user: LineProfile | null
  isLoading: boolean
  error: string | null
}

export function useLineAuth() {
  const [authState, setAuthState] = useState<LineAuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
    error: null,
  })

  // Initialize LINE SDK
  useEffect(() => {
    const initializeLine = async () => {
      try {
        // Check if LINE SDK is available
        if (typeof window !== "undefined" && window.liff) {
          await window.liff.init({
            liffId: process.env.NEXT_PUBLIC_LINE_LIFF_ID || "your-liff-id",
          })

          // Check if user is already logged in
          if (window.liff.isLoggedIn()) {
            const profile = await window.liff.getProfile()
            setAuthState({
              isAuthenticated: true,
              user: {
                userId: profile.userId,
                displayName: profile.displayName,
                pictureUrl: profile.pictureUrl,
                statusMessage: profile.statusMessage,
              },
              isLoading: false,
              error: null,
            })
          } else {
            setAuthState((prev) => ({ ...prev, isLoading: false }))
          }
        } else {
          // Fallback for development/demo
          setAuthState((prev) => ({ ...prev, isLoading: false }))
        }
      } catch (error) {
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: "Failed to initialize LINE SDK",
        })
      }
    }

    initializeLine()
  }, [])

  const login = useCallback(async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }))

      if (typeof window !== "undefined" && window.liff) {
        if (!window.liff.isLoggedIn()) {
          window.liff.login()
        } else {
          const profile = await window.liff.getProfile()
          setAuthState({
            isAuthenticated: true,
            user: {
              userId: profile.userId,
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl,
              statusMessage: profile.statusMessage,
            },
            isLoading: false,
            error: null,
          })
        }
      } else {
        // Demo mode - simulate login
        setTimeout(() => {
          setAuthState({
            isAuthenticated: true,
            user: {
              userId: "demo-user-123",
              displayName: "Demo User",
              pictureUrl: "/placeholder-user.jpg",
              statusMessage: "Playing TapCloud!",
            },
            isLoading: false,
            error: null,
          })
        }, 1000)
      }
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Login failed",
      }))
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      if (typeof window !== "undefined" && window.liff && window.liff.isLoggedIn()) {
        window.liff.logout()
      }

      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        error: "Logout failed",
      }))
    }
  }, [])

  return {
    ...authState,
    login,
    logout,
  }
}

// Extend Window interface for LINE SDK
declare global {
  interface Window {
    liff: any
  }
}
