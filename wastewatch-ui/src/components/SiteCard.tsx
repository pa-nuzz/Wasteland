'use client'

import { X, MapPin, Users, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { getRiskColor, getRiskBadgeClass, formatNumber } from '@/lib/utils'
import SparklineChart from './SparklineChart'

interface Site {
  wwtp_id: string
  wwtp_jurisdiction: string | null
  county_names: string | null
  population_served: number | null
  pathogen: string
  risk_level: string
  z_score: number | null
  trend: string | null
  latest_value: number | null
  scored_at: string | null
}

interface SiteCardProps {
  site: Site
  onClose: () => void
}

const pathogenTabs = [
  { id: 'sars-cov-2', label: 'COVID' },
  { id: 'influenza a', label: 'Flu A' },
  { id: 'influenza b', label: 'Flu B' },
  { id: 'norovirus gi', label: 'Norovirus' },
]

function TrendIcon({ trend }: { trend: string | null }) {
  if (trend === 'rising') return <TrendingUp className="w-4 h-4 text-red-400" />
  if (trend === 'falling') return <TrendingDown className="w-4 h-4 text-green-400" />
  return <Minus className="w-4 h-4 text-slate-400" />
}

export default function SiteCard({ site, onClose }: SiteCardProps) {
  const [selectedPathogen, setSelectedPathogen] = site.pathogen

  return (
    <div className="bg-card border border-slate-700 rounded-lg p-4 w-full max-w-md">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">{site.wwtp_id}</h3>
          <div className="flex items-center gap-1 text-slate-400 text-sm">
            <MapPin className="w-3 h-3" />
            <span>{site.wwtp_jurisdiction || 'Unknown'}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-700 rounded transition-colors"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <div className="mb-4">
        <span className={getRiskBadgeClass(site.risk_level)}>
          {site.risk_level}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="flex items-center gap-2 text-slate-300">
          <Users className="w-4 h-4" />
          <span>{site.population_served?.toLocaleString() || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <Activity className="w-4 h-4" />
          <span>Z: {formatNumber(site.z_score)}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <TrendIcon trend={site.trend} />
          <span className="capitalize">{site.trend || 'N/A'}</span>
        </div>
        <div className="text-slate-300">
          {site.county_names || 'N/A'}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs text-slate-400 mb-2">Pathogen</p>
        <div className="flex flex-wrap gap-2">
          {pathogenTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {}}
              disabled={tab.id !== site.pathogen}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                tab.id === site.pathogen
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                  : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-700 pt-4">
        <SparklineChart
          wwtpId={site.wwtp_id}
          pathogen={site.pathogen}
          color={getRiskColor(site.risk_level)}
        />
      </div>
    </div>
  )
}
