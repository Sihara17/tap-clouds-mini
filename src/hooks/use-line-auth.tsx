"use client"

import { useState, useEffect, useCallback } from "react"
import DappPortalSDK from "@linenext/dapp-portal-sdk"

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

  const [sdk, setSdk] = useState<any>(null)

  // Initialize Dapp SDK
  useEffect(() => {
    const init = async () => {
      try {
        const clientId = process.env.NEXT_PUBLIC_LINE_CLIENT_ID!
        const chainId = "1001" // default Kaia testnet

        const instance = await DappPortalSDK.init({ clientId, chainId })
        setSdk(instance)

        const isConnected = await instance.isAuthorized()

        if (isConnected) {
          const user = await instance.getUser()
          setAuthState({
            isAuthenticated: true,
            user: {
              userId: user.userId,
              displayName: user.displayName,
              pictureUrl: user.pictureUrl,
              statusMessage: "",
            },
            isLoading: false,
            error: null,
          })
        } else {
          setAuthState((prev) => ({ ...prev, isLoading: false }))
        }
      } catch (error) {
        console.error("Dapp SDK init failed:", error)
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: "Failed to initialize LINE Dapp SDK",
        })
      }
    }

    init()
  }, [])

  const login = useCallback(async () => {
    if (!sdk) return

    try {
      await sdk.connect()

      const user = await sdk.getUser()
      setAuthState({
        isAuthenticated: true,
        user: {
          userId: user.userId,
          displayName: user.displayName,
          pictureUrl: user.pictureUrl,
          statusMessage: "",
        },
        isLoading: false,
        error: null,
      })
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Login failed",
      }))
    }
  }, [sdk])

  const logout = useCallback(async () => {
    try {
      if (sdk) {
        await sdk.logout()
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
  }, [sdk])

  return {
    ...authState,
    login,
    logout,
  }
}
