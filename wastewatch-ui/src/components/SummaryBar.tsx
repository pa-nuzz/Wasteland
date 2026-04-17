'use client'

import useSWR from 'swr'
import { Activity, AlertTriangle, TrendingUp, Users, Clock } from 'lucide-react'
import { api, type SummaryResponse } from '@/lib/api'

function formatPopulation(pop: number | undefined): string {
  if (!pop) return 'N/A'
  const millions = pop / 1000000
  return `~${millions.toFixed(1)}M`
}

function formatTimeAgo(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown'
  const date = new Date(dateString)
  const now = new Date()
  const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours === 1) return '1h ago'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
  isLoading: boolean
  hasGlow?: boolean
}

function StatCard({ label, value, icon: Icon, color, isLoading, hasGlow }: StatCardProps) {
  return (
    <div className={`relative flex-1 min-w-[160px] p-4 rounded-lg border border-[#1e3048] bg-[#111c2d] ${hasGlow ? 'critical-glow' : ''}`}>
      {isLoading ? (
        <div className="animate-pulse">
          <div className="h-4 w-4 rounded bg-[#1e3048] mb-3"></div>
          <div className="h-7 w-16 rounded bg-[#1e3048] mb-1"></div>
          <div className="h-3 w-20 rounded bg-[#1e3048]"></div>
        </div>
      ) : (
        <>
          <Icon className={`w-4 h-4 ${color} mb-3`} />
          <p className="text-2xl font-mono font-semibold text-[#e8f0fe]">{value}</p>
          <p className="text-xs text-[#6b8cae] mt-1">{label}</p>
        </>
      )}
    </div>
  )
}

export default function SummaryBar() {
  const { data, isLoading } = useSWR<SummaryResponse>(
    'summary',
    () => api.getSummary(),
    { refreshInterval: 300000 }
  )

  // Use real population_total from API
  const populationTotal = data?.population_total

  const stats = [
    {
      label: 'Monitoring Sites',
      value: data?.total_sites || 0,
      icon: Activity,
      color: 'text-[#2563eb]',
      hasGlow: false,
    },
    {
      label: 'Critical Alerts',
      value: data?.critical_count || 0,
      icon: AlertTriangle,
      color: 'text-[#f43f5e]',
      hasGlow: (data?.critical_count || 0) > 0,
    },
    {
      label: 'Elevated',
      value: data?.elevated_count || 0,
      icon: TrendingUp,
      color: 'text-[#fb923c]',
      hasGlow: false,
    },
    {
      label: 'Population Covered',
      value: formatPopulation(populationTotal),
      icon: Users,
      color: 'text-[#22d3ee]',
      hasGlow: false,
    },
    {
      label: 'Data Freshness',
      value: formatTimeAgo(data?.last_updated),
      icon: Clock,
      color: 'text-[#6b8cae]',
      hasGlow: false,
    },
  ]

  return (
    <div className="flex flex-wrap gap-3">
      {stats.map((stat, i) => (
        <StatCard
          key={i}
          label={stat.label}
          value={stat.value}
          icon={stat.icon}
          color={stat.color}
          isLoading={isLoading}
          hasGlow={stat.hasGlow}
        />
      ))}
    </div>
  )
}
