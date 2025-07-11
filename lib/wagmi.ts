// lib/wagmi.ts
"use client"

import { createConfig, http } from "wagmi"
import { mainnet } from "wagmi/chains"
import { InjectedConnector } from "wagmi/connectors/injected"

export const config = createConfig({
  chains: [mainnet],
  connectors: [
    new InjectedConnector({
      chains: [mainnet],
    }),
  ],
  transports: {
    [mainnet.id]: http(),
  },
})
