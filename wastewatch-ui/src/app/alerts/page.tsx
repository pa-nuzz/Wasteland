'use client'

import React, { useState, useMemo } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, ArrowUpDown, CheckCircle2, Waves, Filter } from 'lucide-react'
import { api, Site, AlertsResponse } from '@/lib/api'
import { getRiskColor, getRiskBadgeClass, formatNumber } from '@/lib/utils'
import SparklineChart from '@/components/SparklineChart'

type SortField = 'z_score' | 'jurisdiction' | 'pathogen' | 'risk_level'
type SortOrder = 'asc' | 'desc'
type RiskFilter = 'all' | 'critical' | 'elevated'

function getAccentBorderClass(riskLevel: string): string {
  switch (riskLevel) {
    case 'critical': return 'accent-border-critical'
    case 'elevated': return 'accent-border-elevated'
    case 'moderate': return 'accent-border-moderate'
    case 'low': return 'accent-border-low'
    default: return 'accent-border-insufficient'
  }
}

export default function AlertsPage() {
  const [sortField, setSortField] = useState<SortField>('z_score')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all')
  const [stateFilter, setStateFilter] = useState<string>('all')

  const { data, isLoading } = useSWR<AlertsResponse>(
    'alerts',
    () => api.getAlerts(),
    { refreshInterval: 120000 }
  )

  const alerts = data?.alerts || []

  // Get unique states for filter dropdown
  const uniqueStates = useMemo(() => {
    const states = new Set(alerts.map(a => a.wwtp_jurisdiction).filter(Boolean))
    return Array.from(states).sort()
  }, [alerts])

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      if (riskFilter !== 'all' && alert.risk_level !== riskFilter) return false
      if (stateFilter !== 'all' && alert.wwtp_jurisdiction !== stateFilter) return false
      return true
    })
  }, [alerts, riskFilter, stateFilter])

  // Sort alerts
  const sortedAlerts = useMemo(() => {
    return [...filteredAlerts].sort((a, b) => {
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
        case 'risk_level':
          const riskOrder = { critical: 4, elevated: 3, moderate: 2, low: 1, insufficient_data: 0 }
          aVal = riskOrder[a.risk_level as keyof typeof riskOrder] ?? -1
          bVal = riskOrder[b.risk_level as keyof typeof riskOrder] ?? -1
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
  }, [filteredAlerts, sortField, sortOrder])

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

  const criticalCount = alerts.filter(a => a.risk_level === 'critical').length
  const elevatedCount = alerts.filter(a => a.risk_level === 'elevated').length

  return (
    <div className="min-h-screen bg-[#080d14]">
      {/* Enterprise Header */}
      <nav className="bg-[#0d1520] border-b border-[#1e3048]">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-[#1e3048] rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-[#6b8cae]" />
            </Link>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute inline-flex h-2 w-2 top-0 right-0 -mt-0.5 -mr-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f43f5e] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f43f5e]"></span>
                </span>
                <AlertTriangle className="w-6 h-6 text-[#f43f5e]" />
              </div>
              <h1 className="text-lg font-semibold text-[#e8f0fe]">Active Surveillance Alerts</h1>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#f43f5e]/15 text-[#f43f5e] border border-[#f43f5e]/30">
                {alerts.length} active
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Stats Bar */}
      <div className="bg-[#111c2d] border-b border-[#1e3048]">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center gap-6 text-xs">
            <span className="flex items-center gap-1.5 text-[#f43f5e]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e]"></span>
              {criticalCount} Critical
            </span>
            <span className="flex items-center gap-1.5 text-[#fb923c]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#fb923c]"></span>
              {elevatedCount} Elevated
            </span>
            <span className="w-px h-3 bg-[#1e3048]"></span>
            <span className="text-[#6b8cae]">Auto-refresh every 2 minutes</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-[#6b8cae]">
            <Filter className="w-4 h-4" />
            <span>Filters:</span>
          </div>
          
          {/* Risk Level Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}
            className="px-3 py-1.5 text-sm rounded-lg bg-[#111c2d] border border-[#1e3048] text-[#e8f0fe] focus:outline-none focus:border-[#2563eb]"
          >
            <option value="all">All Risk Levels</option>
            <option value="critical">Critical Only</option>
            <option value="elevated">Elevated Only</option>
          </select>

          {/* State Filter */}
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg bg-[#111c2d] border border-[#1e3048] text-[#e8f0fe] focus:outline-none focus:border-[#2563eb]"
          >
            <option value="all">All Jurisdictions</option>
            {uniqueStates.map(state => state && (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>

          {(riskFilter !== 'all' || stateFilter !== 'all') && (
            <button
              onClick={() => { setRiskFilter('all'); setStateFilter('all') }}
              className="text-xs text-[#6b8cae] hover:text-[#e8f0fe] underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="bg-[#111c2d] rounded-lg border border-[#1e3048] overflow-hidden">
          {isLoading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="animate-pulse text-[#6b8cae]">Loading alerts...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0d1520]">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-[#6b8cae] uppercase tracking-wider cursor-pointer hover:text-[#e8f0fe] transition-colors"
                      onClick={() => handleSort('jurisdiction')}
                    >
                      <div className="flex items-center gap-1">
                        Jurisdiction
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-[#6b8cae] uppercase tracking-wider cursor-pointer hover:text-[#e8f0fe] transition-colors"
                      onClick={() => handleSort('pathogen')}
                    >
                      <div className="flex items-center gap-1">
                        Pathogen
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-[#6b8cae] uppercase tracking-wider cursor-pointer hover:text-[#e8f0fe] transition-colors"
                      onClick={() => handleSort('risk_level')}
                    >
                      <div className="flex items-center gap-1">
                        Risk Level
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-[#6b8cae] uppercase tracking-wider cursor-pointer hover:text-[#e8f0fe] transition-colors"
                      onClick={() => handleSort('z_score')}
                    >
                      <div className="flex items-center gap-1">
                        Z-Score
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#6b8cae] uppercase tracking-wider">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e3048]">
                  {sortedAlerts.map((alert) => (
                    <React.Fragment key={`${alert.wwtp_id}-${alert.pathogen}`}>
                      <tr
                        className={`hover:bg-[#162236] cursor-pointer transition-colors ${getAccentBorderClass(alert.risk_level)}`}
                        onClick={() => toggleRow(alert.wwtp_id)}
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-[#e8f0fe]">{alert.wwtp_jurisdiction || 'Unknown'}</p>
                            <p className="text-xs text-[#6b8cae]">{alert.county_names}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-[#e8f0fe] capitalize">{alert.pathogen}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={getRiskBadgeClass(alert.risk_level)}>
                            {alert.risk_level.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[#e8f0fe]">
                          {formatNumber(alert.z_score)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-[#6b8cae] capitalize">{alert.trend || 'N/A'}</span>
                        </td>
                      </tr>
                      {expandedRow === alert.wwtp_id && (
                        <tr>
                          <td colSpan={5} className="px-4 py-4 bg-[#0d1520]">
                            <div className="h-[200px]">
                              <p className="text-xs text-[#6b8cae] uppercase tracking-wider mb-2">12-Week Trend</p>
                              <SparklineChart
                                wwtpId={alert.wwtp_id}
                                pathogen={alert.pathogen}
                                color={getRiskColor(alert.risk_level)}
                                height={160}
                                showGradient={true}
                                showAxis={true}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {sortedAlerts.length === 0 && !isLoading && (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#34d399]/10 mb-4">
                <CheckCircle2 className="w-8 h-8 text-[#34d399]" />
              </div>
              <h3 className="text-lg font-medium text-[#e8f0fe] mb-2">
                No active alerts
              </h3>
              <p className="text-sm text-[#6b8cae]">
                All facilities are operating within normal parameters
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
