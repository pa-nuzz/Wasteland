'use client'

import useSWR from 'swr'
import { AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'

interface Alert {
  wwtp_id: string
  wwtp_jurisdiction: string | null
  pathogen: string
  risk_level: string
  z_score: number | null
}

export default function AlertBanner() {
  const { data, error } = useSWR(
    'alerts',
    () => api.getAlerts(),
    { refreshInterval: 120000 } // 2 minutes
  )

  if (error) return null
  if (!data?.alerts?.length) return null

  const criticalCount = data.alerts.filter((a: Alert) => a.risk_level === 'critical').length
  const topJurisdictions = data.alerts
    .slice(0, 3)
    .map((a: Alert) => a.wwtp_jurisdiction || a.wwtp_id)
    .join(', ')

  return (
    <div className="sticky top-0 z-50 bg-red-500/90 backdrop-blur-sm text-white px-4 py-3">
      <div className="flex items-center gap-3 max-w-7xl mx-auto">
        <AlertTriangle className="w-5 h-5" />
        <span className="font-semibold">
          ⚠ {criticalCount} critical site{criticalCount !== 1 ? 's' : ''} detected
        </span>
        <span className="text-red-100 text-sm">
          {topJurisdictions}
        </span>
      </div>
    </div>
  )
}
