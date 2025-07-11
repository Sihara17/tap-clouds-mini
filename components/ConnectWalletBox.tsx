// components/ConnectWalletBox.tsx
"use client"

import { useWalletConnect } from "@/hooks/use-wallet-connect"
import { useLineAuth } from "@/hooks/use-line-auth"
import { useState } from "react"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { createClient } from "@/lib/supabase"

export function ConnectWalletBox() {
  const { user, isAuthenticated } = useLineAuth()
  const { walletAddress, walletType, connectWallet } = useWalletConnect()
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    if (!user) return
    setLoading(true)

    const message = `Connect TapCloud Wallet for ${user.displayName}`
    const result = await connectWallet(message)

    if (result) {
      const supabase = createClient()
      await supabase
        .from("user_profiles")
        .update({
          wallet_address: result.account,
          wallet_type: result.type,
        })
        .eq("line_user_id", user.lineUserId)
    }

    setLoading(false)
  }

  if (!isAuthenticated || !user) return null

  return (
    <Card className="bg-slate-800/50 border-cyan-500/30 mt-4">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-2">
          {walletAddress ? (
            <>
              <p className="text-white text-sm">Connected Wallet:</p>
              <p className="text-cyan-400 text-xs break-all">{walletAddress}</p>
              <p className="text-gray-400 text-xs">Type: {walletType}</p>
            </>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={loading}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {loading ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
