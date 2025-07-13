"use client"

import { useEffect, useState } from "react"
import { getWalletProvider } from "@/lib/line-wallet"

export const useLineWallet = () => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [walletType, setWalletType] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)

  const connectAndSign = async (message = "Sign to TapCloud") => {
    try {
      const walletProvider = await getWalletProvider()

      // Request wallet connect & signature
      const [account, sig] = await walletProvider.request({
        method: "kaia_connectAndSign",
        params: [message],
      }) as [string, string]

      setWalletAddress(account)
      setSignature(sig)
      setWalletType(walletProvider.getWalletType())
    } catch (err) {
      console.error("Wallet connect/sign error:", err)
    }
  }

  const disconnect = async () => {
    const walletProvider = await getWalletProvider()
    await walletProvider.disconnectWallet()
    window.location.reload()
  }

  return {
    walletAddress,
    walletType,
    signature,
    connectAndSign,
    disconnect,
  }
}
