'use client'

import useSWR from 'swr'
import { Activity, AlertCircle, TrendingUp, Clock } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'

export default function SummaryBar() {
  const { data, error, isLoading } = useSWR(
    'summary',
    () => api.getSummary(),
    { refreshInterval: 300000 } // 5 minutes
  )

  const stats = [
    {
      label: 'Total Sites',
      value: data?.total_sites || 0,
      icon: Activity,
      color: 'text-blue-400',
    },
    {
      label: 'Critical',
      value: data?.critical_count || 0,
      icon: AlertCircle,
      color: 'text-red-400',
    },
    {
      label: 'Elevated',
      value: data?.risk_breakdown?.['sars-cov-2']?.elevated || 0,
      icon: TrendingUp,
      color: 'text-orange-400',
    },
    {
      label: 'Last Refreshed',
      value: data?.last_data_refresh ? formatDate(data.last_data_refresh).split(',')[0] : 'N/A',
      icon: Clock,
      color: 'text-slate-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-card rounded-lg">
      {stats.map((stat, i) => (
        <div key={i} className="flex items-center gap-3">
          {isLoading ? (
            <div className="animate-pulse bg-slate-700 h-10 w-10 rounded-lg" />
          ) : (
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          )}
          <div>
            <p className="text-xs text-slate-400">{stat.label}</p>
            {isLoading ? (
              <div className="animate-pulse bg-slate-700 h-5 w-16 rounded mt-1" />
            ) : (
              <p className="text-lg font-bold text-white">{stat.value}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
