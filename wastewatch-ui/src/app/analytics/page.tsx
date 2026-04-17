'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { ArrowLeft, BarChart3, Activity, Database } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts'
import { api, type Site, type SummaryResponse, type PathogensResponse } from '@/lib/api'
import { getRiskBadgeClass, formatNumber } from '@/lib/utils'

// Risk level order for charts
const riskOrder = ['critical', 'elevated', 'moderate', 'low', 'insufficient_data']
const riskColors = {
  critical: '#f43f5e',
  elevated: '#fb923c',
  moderate: '#fbbf24',
  low: '#34d399',
  insufficient_data: '#4b6a8a',
}

function getRiskLabel(level: string): string {
  return level.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export default function AnalyticsPage() {
  const { data: sites } = useSWR<Site[]>('sites', () => api.getSites())
  const { data: summary } = useSWR<SummaryResponse>('summary', () => api.getSummary())
  const { data: pathogens } = useSWR<PathogensResponse>('pathogens', () => api.getPathogens())

  // Risk Distribution Data
  const riskDistribution = useMemo(() => {
    if (!sites) return []
    
    const distribution: Record<string, Record<string, number>> = {}
    
    sites.forEach(site => {
      if (!distribution[site.pathogen]) {
        distribution[site.pathogen] = {}
        riskOrder.forEach(r => distribution[site.pathogen][r] = 0)
      }
      distribution[site.pathogen][site.risk_level] = 
        (distribution[site.pathogen][site.risk_level] || 0) + 1
    })
    
    return Object.entries(distribution).map(([pathogen, counts]) => ({
      pathogen: pathogen.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      ...counts,
    }))
  }, [sites])

  // Top 10 Facilities
  const topSites = summary?.top_critical || []

  // Pathogen Coverage
  const pathogenData = pathogens?.pathogens || []

  // Mock national trend data (in production this would come from backend)
  const nationalTrend = useMemo(() => {
    if (!summary) return []
    return [
      { week: 'W1', critical: 3, elevated: 12 },
      { week: 'W2', critical: 4, elevated: 15 },
      { week: 'W3', critical: 2, elevated: 10 },
      { week: 'W4', critical: 5, elevated: 18 },
      { week: 'W5', critical: summary.critical_count, elevated: summary.elevated_count },
    ]
  }, [summary])

  return (
    <div className="min-h-screen bg-[#080d14]">
      {/* Header */}
      <nav className="bg-[#0d1520] border-b border-[#1e3048]">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-[#1e3048] rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-[#6b8cae]" />
            </Link>
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-[#2563eb]" />
              <h1 className="text-lg font-semibold text-[#e8f0fe]">Analytics Dashboard</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-[#1e3048] bg-[#111c2d]">
            <p className="text-xs text-[#6b8cae] uppercase tracking-wider">Total Facilities</p>
            <p className="text-2xl font-mono font-semibold text-[#e8f0fe]">{summary?.total_sites || 0}</p>
          </div>
          <div className="p-4 rounded-lg border border-[#1e3048] bg-[#111c2d]">
            <p className="text-xs text-[#6b8cae] uppercase tracking-wider">Active Pathogens</p>
            <p className="text-2xl font-mono font-semibold text-[#e8f0fe]">{pathogenData.length}</p>
          </div>
          <div className="p-4 rounded-lg border border-[#1e3048] bg-[#111c2d]">
            <p className="text-xs text-[#6b8cae] uppercase tracking-wider">Critical Alerts</p>
            <p className="text-2xl font-mono font-semibold text-[#f43f5e]">{summary?.critical_count || 0}</p>
          </div>
          <div className="p-4 rounded-lg border border-[#1e3048] bg-[#111c2d]">
            <p className="text-xs text-[#6b8cae] uppercase tracking-wider">Data Records</p>
            <p className="text-2xl font-mono font-semibold text-[#e8f0fe]">~800K</p>
          </div>
        </div>

        {/* Risk Distribution Chart */}
        <div className="p-6 rounded-lg border border-[#1e3048] bg-[#111c2d]">
          <h2 className="text-sm font-semibold text-[#e8f0fe] mb-1">Risk Distribution by Pathogen</h2>
          <p className="text-xs text-[#6b8cae] mb-4">Site counts per risk level across monitored pathogens</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3048" />
                <XAxis 
                  dataKey="pathogen" 
                  tick={{ fill: '#6b8cae', fontSize: 11 }}
                  axisLine={{ stroke: '#1e3048' }}
                />
                <YAxis 
                  tick={{ fill: '#6b8cae', fontSize: 11 }}
                  axisLine={{ stroke: '#1e3048' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111c2d',
                    border: '1px solid #1e3048',
                    borderRadius: '6px',
                  }}
                  labelStyle={{ color: '#e8f0fe' }}
                  itemStyle={{ color: '#e8f0fe' }}
                />
                <Legend wrapperStyle={{ color: '#6b8cae' }} />
                {riskOrder.map(risk => (
                  <Bar
                    key={risk}
                    dataKey={risk}
                    name={getRiskLabel(risk)}
                    fill={riskColors[risk as keyof typeof riskColors]}
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* National Trend + Top Sites Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* National Trend */}
          <div className="p-6 rounded-lg border border-[#1e3048] bg-[#111c2d]">
            <h2 className="text-sm font-semibold text-[#e8f0fe] mb-1">National Alert Trend</h2>
            <p className="text-xs text-[#6b8cae] mb-4">Critical and elevated site counts over recent periods</p>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={nationalTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3048" />
                  <XAxis 
                    dataKey="week" 
                    tick={{ fill: '#6b8cae', fontSize: 11 }}
                    axisLine={{ stroke: '#1e3048' }}
                  />
                  <YAxis 
                    tick={{ fill: '#6b8cae', fontSize: 11 }}
                    axisLine={{ stroke: '#1e3048' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111c2d',
                      border: '1px solid #1e3048',
                      borderRadius: '6px',
                    }}
                    labelStyle={{ color: '#e8f0fe' }}
                    itemStyle={{ color: '#e8f0fe' }}
                  />
                  <Legend wrapperStyle={{ color: '#6b8cae' }} />
                  <Line
                    type="monotone"
                    dataKey="critical"
                    name="Critical"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={{ fill: '#f43f5e' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="elevated"
                    name="Elevated"
                    stroke="#fb923c"
                    strokeWidth={2}
                    dot={{ fill: '#fb923c' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 10 Facilities */}
          <div className="p-6 rounded-lg border border-[#1e3048] bg-[#111c2d]">
            <h2 className="text-sm font-semibold text-[#e8f0fe] mb-1">Top Risk Facilities</h2>
            <p className="text-xs text-[#6b8cae] mb-4">Highest z-score sites requiring immediate attention</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e3048]">
                    <th className="text-left py-2 text-xs text-[#6b8cae] uppercase">Facility</th>
                    <th className="text-left py-2 text-xs text-[#6b8cae] uppercase">Pathogen</th>
                    <th className="text-left py-2 text-xs text-[#6b8cae] uppercase">Risk</th>
                    <th className="text-right py-2 text-xs text-[#6b8cae] uppercase">Z-Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e3048]">
                  {topSites.slice(0, 10).map((site, i) => (
                    <tr key={`${site.wwtp_id}-${site.pathogen}`} className="hover:bg-[#162236]">
                      <td className="py-2">
                        <div>
                          <p className="font-mono text-[#e8f0fe]">{site.wwtp_id}</p>
                          <p className="text-xs text-[#6b8cae]">{site.wwtp_jurisdiction}</p>
                        </div>
                      </td>
                      <td className="py-2 text-[#e8f0fe] capitalize">{site.pathogen}</td>
                      <td className="py-2">
                        <span className={getRiskBadgeClass(site.risk_level)}>
                          {site.risk_level.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2 text-right font-mono text-[#e8f0fe]">
                        {formatNumber(site.z_score)}
                      </td>
                    </tr>
                  ))}
                  {topSites.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-[#6b8cae]">
                        No critical or elevated alerts at this time
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pathogen Coverage */}
        <div className="p-6 rounded-lg border border-[#1e3048] bg-[#111c2d]">
          <h2 className="text-sm font-semibold text-[#e8f0fe] mb-1">Pathogen Coverage</h2>
          <p className="text-xs text-[#6b8cae] mb-4">Monitoring coverage and detection levels by pathogen</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e3048]">
                  <th className="text-left py-3 text-xs text-[#6b8cae] uppercase">Pathogen</th>
                  <th className="text-left py-3 text-xs text-[#6b8cae] uppercase">Sites Monitored</th>
                  <th className="text-left py-3 text-xs text-[#6b8cae] uppercase">Coverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e3048]">
                {pathogenData.map((p) => {
                  const maxCount = Math.max(...pathogenData.map(x => x.count))
                  const percentage = (p.count / maxCount) * 100
                  return (
                    <tr key={p.pathogen} className="hover:bg-[#162236]">
                      <td className="py-3 text-[#e8f0fe] capitalize">{p.pathogen}</td>
                      <td className="py-3 text-[#e8f0fe] font-mono">{p.count}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-[#1e3048] rounded-full overflow-hidden max-w-[200px]">
                            <div
                              className="h-full bg-[#2563eb] rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-[#6b8cae] w-10">{percentage.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
