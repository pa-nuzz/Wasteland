import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WasteWatch — Wastewater Epidemiological Surveillance',
  description: 'Enterprise-grade public health wastewater surveillance. Real-time pathogen monitoring across 800+ CDC NWSS facilities.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-white">
        {children}
      </body>
    </html>
  )
}
