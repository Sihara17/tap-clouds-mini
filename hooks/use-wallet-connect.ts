
"use client"

import { useAccount, useConnect, useDisconnect } from "wagmi"

export function useWalletConnect() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  const handleConnect = async () => {
    const injected = connectors.find(c => c.id === "injected")
    if (injected) {
      await connect({ connector: injected })
    }
  }

  return {
    address,
    isConnected,
    handleConnect,
    disconnect,
    isPending,
  }
}
