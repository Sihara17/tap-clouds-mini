// components/ConnectWalletBox.tsx
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useAccount, useConnect } from "wagmi"
import { injected } from "@wagmi/connectors"
import { supabase } from "@/lib/supabase"

export function ConnectWalletBox() {
  const { connect } = useConnect()
  const { address, isConnected } = useAccount()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (isConnected) {
      setConnected(true)
      saveWalletToSupabase(address!)
    }
  }, [isConnected, address])

  const saveWalletToSupabase = async (walletAddress: string) => {
    const { data, error } = await supabase
      .from("wallets") // pastikan tabel "wallets" ada di Supabase
      .upsert({ address: walletAddress })

    if (error) console.error("Supabase save error:", error)
  }

  if (connected) {
    return <p className="text-sm">Wallet Connected: {address}</p>
  }

  return (
    <Button onClick={() => connect({ connector: injected() })}>
      Connect Wallet
    </Button>
  )
}
