'use client'

import { useState, useMemo } from 'react'
import { X, MapPin, Users, Activity, TrendingUp, TrendingDown, Minus, Droplets, BarChart3, Calculator, Download } from 'lucide-react'
import type { Site } from '@/lib/api'
import { getRiskColor, getRiskBadgeClass, formatNumber } from '@/lib/utils'
import SparklineChart from './SparklineChart'

interface SiteCardProps {
  site: Site
  onClose: () => void
}

const pathogenTabs = [
  { id: 'sars-cov-2', label: 'COVID-19' },
  { id: 'influenza a', label: 'Influenza A' },
  { id: 'influenza b', label: 'Influenza B' },
  { id: 'norovirus gi', label: 'Norovirus' },
]

function TrendIndicator({ trend, zScore }: { trend: string | null; zScore: number | null }) {
  const color = trend === 'rising' ? '#f43f5e' : trend === 'falling' ? '#34d399' : '#6b8cae'
  const Icon = trend === 'rising' ? TrendingUp : trend === 'falling' ? TrendingDown : Minus
  
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-4 h-4" style={{ color }} />
      <span className="text-sm font-medium capitalize" style={{ color }}>
        {trend || 'Stable'}
      </span>
    </div>
  )
}

function StatMiniCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded-lg border border-[#1e3048] bg-[#0d1520]">
      <Icon className="w-4 h-4 mb-2" style={{ color }} />
      <p className="text-lg font-mono font-semibold text-[#e8f0fe]">{value}</p>
      <p className="text-xs text-[#6b8cae]">{label}</p>
    </div>
  )
}

function getAccentBorderClass(riskLevel: string): string {
  switch (riskLevel) {
    case 'critical': return 'accent-border-critical'
    case 'elevated': return 'accent-border-elevated'
    case 'moderate': return 'accent-border-moderate'
    case 'low': return 'accent-border-low'
    default: return 'accent-border-insufficient'
  }
}

export default function SiteCard({ site, onClose }: SiteCardProps) {
  const [selectedPathogen, setSelectedPathogen] = useState(site.pathogen)
  
  const riskColor = getRiskColor(site.risk_level)
  const accentClass = getAccentBorderClass(site.risk_level)
  
  // Calculate rough detection percentage from z-score
  const detectionPercent = useMemo(() => {
    if (!site.z_score) return 'N/A'
    // Rough estimate: higher z-score = higher detection
    const percent = Math.min(100, Math.max(0, 50 + site.z_score * 10))
    return `${percent.toFixed(1)}%`
  }, [site.z_score])

  return (
    <div className={`h-full bg-[#111c2d] border-l border-[#1e3048] ${accentClass}`}>
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-[#1e3048]">
        <div>
          <h3 className="text-lg font-mono font-semibold text-[#e8f0fe]">{site.wwtp_id}</h3>
          <div className="flex items-center gap-2 mt-1">
            <MapPin className="w-3 h-3 text-[#6b8cae]" />
            <span className="text-sm text-[#6b8cae]">{site.wwtp_jurisdiction || 'Unknown'}</span>
          </div>
          {site.county_names && (
            <p className="text-xs text-[#3d5a78] mt-0.5 ml-5">{site.county_names}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-[#1e3048] rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-[#6b8cae]" />
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto">
        {/* Risk Badge */}
        <div className="flex items-center gap-3">
          <span className={getRiskBadgeClass(site.risk_level)}>
            {site.risk_level.replace('_', ' ')}
          </span>
          <div 
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: riskColor, boxShadow: `0 0 8px ${riskColor}` }}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatMiniCard 
            icon={Users} 
            label="Population Served" 
            value={site.population_served?.toLocaleString() || 'N/A'}
            color="#22d3ee"
          />
          <StatMiniCard 
            icon={Droplets} 
            label="Detection Level" 
            value={detectionPercent}
            color="#fbbf24"
          />
          <StatMiniCard 
            icon={Calculator} 
            label="Z-Score" 
            value={formatNumber(site.z_score)}
            color="#a78bfa"
          />
          <div className="p-3 rounded-lg border border-[#1e3048] bg-[#0d1520]">
            <TrendIndicator trend={site.trend} zScore={site.z_score} />
            <p className="text-xs text-[#6b8cae] mt-2">Trend</p>
          </div>
        </div>

        {/* Pathogen Selector */}
        <div>
          <p className="text-xs text-[#6b8cae] uppercase tracking-wider mb-2">Pathogen</p>
          <div className="flex flex-wrap gap-1.5">
            {pathogenTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedPathogen(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                  tab.id === selectedPathogen
                    ? 'bg-[#2563eb] text-white'
                    : 'bg-[#0d1520] text-[#6b8cae] border border-[#1e3048] hover:border-[#2563eb]/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sparkline */}
        <div className="pt-2">
          <p className="text-xs text-[#6b8cae] uppercase tracking-wider mb-2">12-Week Trend</p>
          <div className="h-[160px]">
            <SparklineChart
              wwtpId={site.wwtp_id}
              pathogen={selectedPathogen}
              color={riskColor}
              height={160}
              showGradient={true}
              showAxis={true}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#1e3048] mt-auto">
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="text-[#3d5a78] font-mono">WWTP ID: {site.wwtp_id}</span>
          <span className="text-[#3d5a78]">
            Scored: {site.scored_at ? new Date(site.scored_at).toLocaleDateString() : 'N/A'}
          </span>
        </div>
        <button
          onClick={() => {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
            window.open(`${apiUrl}/api/sites/${site.wwtp_id}/history?pathogen=${selectedPathogen}&format=csv`)
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#0d1520] border border-[#1e3048] hover:border-[#2563eb]/50 text-xs text-[#6b8cae] hover:text-[#e8f0fe] transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>
    </div>
  )
}
