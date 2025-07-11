"use client"

import { useAccount, useConnect, useDisconnect } from "wagmi"
import { InjectedConnector } from "wagmi/connectors/injected"

export function useWalletConnect() {
  const { address, isConnected } = useAccount()
  const { connect, isLoading: isConnecting, error } = useConnect({
    connector: new InjectedConnector(),
  })
  const { disconnect } = useDisconnect()

  const handleConnect = async () => {
    try {
      await connect()
    } catch (e) {
      console.error("Wallet connection error:", e)
    }
  }

  return {
    isConnected,
    address,
    connect: handleConnect,
    disconnect,
    isConnecting,
    error,
  }
}
