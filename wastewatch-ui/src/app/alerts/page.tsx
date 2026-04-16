'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, ArrowUpDown } from 'lucide-react'
import { api } from '@/lib/api'
import { getRiskColor, getRiskBadgeClass, formatNumber } from '@/lib/utils'
import SparklineChart from '@/components/SparklineChart'

interface Alert {
  wwtp_id: string
  wwtp_jurisdiction: string | null
  county_names: string | null
  population_served: number | null
  pathogen: string
  risk_level: string
  z_score: number | null
  trend: string | null
  latest_value: number | null
}

type SortField = 'z_score' | 'jurisdiction' | 'pathogen'
type SortOrder = 'asc' | 'desc'

export default function AlertsPage() {
  const [sortField, setSortField] = useState<SortField>('z_score')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const { data, isLoading } = useSWR(
    'alerts',
    () => api.getAlerts(),
    { refreshInterval: 120000 }
  )

  const alerts = data?.alerts || []

  const sortedAlerts = [...alerts].sort((a, b) => {
    let aVal: string | number | null
    let bVal: string | number | null

    switch (sortField) {
      case 'z_score':
        aVal = a.z_score ?? -Infinity
        bVal = b.z_score ?? -Infinity
        break
      case 'jurisdiction':
        aVal = a.wwtp_jurisdiction || ''
        bVal = b.wwtp_jurisdiction || ''
        break
      case 'pathogen':
        aVal = a.pathogen
        bVal = b.pathogen
        break
      default:
        return 0
    }

    if (aVal === bVal) return 0
    if (aVal === null || aVal === undefined) return 1
    if (bVal === null || bVal === undefined) return -1

    const result = aVal < bVal ? -1 : 1
    return sortOrder === 'asc' ? result : -result
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading alerts...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="bg-card border-b border-slate-700 px-4 py-3">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          <Link href="/" className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h1 className="text-xl font-bold">Active Alerts</h1>
            <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-sm">
              {alerts.length} sites
            </span>
          </div>
        </div>
      </nav>

      {/* Table */}
      <div className="p-4 max-w-7xl mx-auto">
        <div className="bg-card rounded-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium text-slate-400 cursor-pointer hover:text-white"
                    onClick={() => handleSort('jurisdiction')}
                  >
                    <div className="flex items-center gap-1">
                      Jurisdiction
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium text-slate-400 cursor-pointer hover:text-white"
                    onClick={() => handleSort('pathogen')}
                  >
                    <div className="flex items-center gap-1">
                      Pathogen
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">
                    Risk Level
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium text-slate-400 cursor-pointer hover:text-white"
                    onClick={() => handleSort('z_score')}
                  >
                    <div className="flex items-center gap-1">
                      Z-Score
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {sortedAlerts.map((alert) => (
                  <>
                    <tr
                      key={alert.wwtp_id}
                      className="hover:bg-slate-800/30 cursor-pointer"
                      onClick={() => toggleRow(alert.wwtp_id)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{alert.wwtp_jurisdiction || 'Unknown'}</p>
                          <p className="text-xs text-slate-400">{alert.county_names}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="capitalize">{alert.pathogen}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={getRiskBadgeClass(alert.risk_level)}>
                          {alert.risk_level}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {formatNumber(alert.z_score)}
                      </td>
                      <td className="px-4 py-3 text-sm capitalize">
                        {alert.trend || 'N/A'}
                      </td>
                    </tr>
                    {expandedRow === alert.wwtp_id && (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 bg-slate-800/30">
                          <div className="max-w-md">
                            <p className="text-sm text-slate-400 mb-2">12-Week Trend</p>
                            <SparklineChart
                              wwtpId={alert.wwtp_id}
                              pathogen={alert.pathogen}
                              color={getRiskColor(alert.risk_level)}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {alerts.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              <p>No critical or elevated alerts at this time.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
