/** Root HTML shell — sets document metadata and loads global stylesheets. */

import type { Metadata } from "next"
import "./globals.css"
import "./icons.css"

export const metadata: Metadata = {
  title: "VNDB",
  description: "Visual Novel Database",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full overflow-x-hidden">
      <body className="min-h-full overflow-x-hidden bg-background text-foreground antialiased">{children}</body>
    </html>
  )
}
