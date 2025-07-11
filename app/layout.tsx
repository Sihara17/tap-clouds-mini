import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import Script from "next/script"

export const metadata: Metadata = {
  title: "TapCloud - LINE Mini App",
  description: "A fun clicker game integrated with LINE",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* LINE SDK */}
        <Script src="https://static.line-scdn.net/liff/edge/2/sdk.js" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  )
}
