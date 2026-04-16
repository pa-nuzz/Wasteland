'use client'

import { useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

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

interface MapProps {
  sites: Site[]
  onSiteClick: (site: Site) => void
}

const riskColors: Record<string, string> = {
  critical: '#ef4444',
  elevated: '#f97316',
  moderate: '#facc15',
  low: '#22c55e',
  insufficient_data: '#94a3b8',
}

function getRadius(population: number | null): number {
  if (!population || population <= 0) return 4
  const radius = Math.log(population) / 2
  return Math.max(4, Math.min(20, radius))
}

function MapController({ sites }: { sites: Site[] }) {
  const map = useMap()
  
  useMemo(() => {
    if (sites.length > 0) {
      const validSites = sites.filter(s => s.population_served)
      if (validSites.length > 0) {
        const bounds = L.latLngBounds(
          validSites.map(s => [39.5, -98.35] as L.LatLngExpression)
        )
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }
  }, [sites, map])
  
  return null
}

export default function Map({ sites, onSiteClick }: MapProps) {
  return (
    <MapContainer
      center={[39.5, -98.35]}
      zoom={4}
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />
      <MapController sites={sites} />
      {sites.map((site) => (
        <CircleMarker
          key={`${site.wwtp_id}-${site.pathogen}`}
          center={[39.5 + (Math.random() - 0.5) * 10, -98.35 + (Math.random() - 0.5) * 20]}
          radius={getRadius(site.population_served)}
          fillColor={riskColors[site.risk_level] || riskColors.insufficient_data}
          color={riskColors[site.risk_level] || riskColors.insufficient_data}
          fillOpacity={0.7}
          stroke={true}
          weight={2}
          eventHandlers={{
            click: () => onSiteClick(site),
          }}
        >
          <Popup>
            <div className="p-2 min-w-[200px]">
              <h3 className="font-bold text-slate-900">{site.wwtp_id}</h3>
              <p className="text-sm text-slate-600">{site.wwtp_jurisdiction || 'Unknown'}</p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="px-2 py-1 rounded text-xs font-semibold"
                  style={{
                    backgroundColor: riskColors[site.risk_level] + '20',
                    color: riskColors[site.risk_level],
                    border: `1px solid ${riskColors[site.risk_level]}`,
                  }}
                >
                  {site.risk_level}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Z-score: {site.z_score?.toFixed(2) || 'N/A'}
              </p>
              <p className="text-sm text-slate-600">
                Trend: {site.trend || 'N/A'}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
