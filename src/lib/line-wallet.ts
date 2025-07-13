"use client"

import DappPortalSDK from "@linenext/dapp-portal-sdk"

let sdkInstance: Awaited<ReturnType<typeof DappPortalSDK.init>> | null = null

export const getWalletProvider = async () => {
  if (!sdkInstance) {
    sdkInstance = await DappPortalSDK.init({
      clientId: process.env.NEXT_PUBLIC_LINE_CLIENT_ID!,
      chainId: "1001", // 1001 = testnet, 8217 = mainnet
    })
  }

  return sdkInstance.getWalletProvider()
}
