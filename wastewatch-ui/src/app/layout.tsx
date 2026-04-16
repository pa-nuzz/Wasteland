import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WasteWatch - Public Health Wastewater Surveillance',
  description: 'Real-time wastewater surveillance dashboard for public health monitoring',
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
