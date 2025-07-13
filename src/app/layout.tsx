// app/layout.tsx
import "./globals.css"
import type { Metadata } from "next"
import Script from "next/script"
import { WagmiConfig } from "wagmi"
import { config } from "@/lib/wagmi"

export const metadata: Metadata = {
  title: "TapCloud - LINE Mini App",
  description: "A fun clicker game integrated with LINE",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* LINE LIFF SDK */}
        <Script
          src="https://static.line-scdn.net/liff/edge/2/sdk.js"
          strategy="beforeInteractive"
        />
      </head>
      <body suppressHydrationWarning={true}>
        <WagmiConfig config={config}>
          {children}
        </WagmiConfig>
      </body>
    </html>
  )
}
