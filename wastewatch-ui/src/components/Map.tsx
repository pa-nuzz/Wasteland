'use client'

import { useMemo, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Site } from '@/lib/api'
import { getJurisdictionCoords } from '@/lib/jurisdictionCoords'

interface MapProps {
  sites: Site[]
  onSiteClick: (site: Site) => void
}

const riskColors: Record<string, string> = {
  critical: '#f43f5e',
  elevated: '#fb923c',
  moderate: '#fbbf24',
  low: '#34d399',
  insufficient_data: '#4b6a8a',
}

const riskLabels: Record<string, string> = {
  critical: 'Critical',
  elevated: 'Elevated',
  moderate: 'Moderate',
  low: 'Low',
  insufficient_data: 'Insufficient Data',
}

function getRadius(population: number | null): number {
  if (!population || population <= 0) return 6
  const radius = Math.log(population) / 2
  return Math.max(6, Math.min(24, radius))
}

interface SiteWithCoords extends Site {
  coords: [number, number]
}

// Custom marker component using DivIcon
function CustomMarker({ site, onClick }: { site: SiteWithCoords; onClick: (site: Site) => void }) {
  const map = useMap()
  const markerRef = useRef<L.Marker | null>(null)
  
  useEffect(() => {
    const color = riskColors[site.risk_level] || riskColors.insufficient_data
    const radius = getRadius(site.population_served)
    const isCritical = site.risk_level === 'critical'
    
    const markerHtml = isCritical 
      ? `<div class="marker-wrapper" style="position: relative; width: ${radius * 4}px; height: ${radius * 4}px; display: flex; align-items: center; justify-content: center;">
          <div class="marker-pulse" style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${color}40; animation: marker-pulse 2s ease-in-out infinite;"></div>
          <div style="width: ${radius}px; height: ${radius}px; border-radius: 50%; background: ${color}; border: 2px solid rgba(255,255,255,0.3); box-shadow: 0 2px 8px rgba(0,0,0,0.4); z-index: 1;"></div>
         </div>`
      : `<div style="width: ${radius}px; height: ${radius}px; border-radius: 50%; background: ${color}; border: 2px solid rgba(255,255,255,0.3); box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>`
    
    const icon = L.divIcon({
      className: 'custom-marker',
      html: markerHtml,
      iconSize: [radius * (isCritical ? 4 : 1), radius * (isCritical ? 4 : 1)],
      iconAnchor: [radius * (isCritical ? 2 : 0.5), radius * (isCritical ? 2 : 0.5)],
    })
    
    const marker = L.marker(site.coords, { icon })
    marker.on('click', () => onClick(site))
    marker.addTo(map)
    markerRef.current = marker
    
    return () => {
      marker.removeFrom(map)
    }
  }, [map, site, onClick])
  
  return null
}

// Site count overlay
function SiteCountOverlay({ count }: { count: number }) {
  return (
    <div className="absolute top-4 left-4 z-[400] bg-[#111c2d]/90 backdrop-blur-sm border border-[#1e3048] rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-[#6b8cae]">Facilities Monitored</p>
      <p className="text-lg font-mono font-semibold text-[#e8f0fe]">{count.toLocaleString()}</p>
    </div>
  )
}

// Legend component
function MapLegend() {
  return (
    <div className="absolute bottom-4 right-4 z-[400] bg-[#111c2d]/90 backdrop-blur-sm border border-[#1e3048] rounded-lg p-3 shadow-lg">
      <p className="text-xs text-[#6b8cae] mb-2 font-medium">Risk Level</p>
      <div className="space-y-1.5">
        {Object.entries(riskLabels).map(([level, label]) => (
          <div key={level} className="flex items-center gap-2">
            <div 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: riskColors[level] }}
            />
            <span className="text-xs text-[#e8f0fe]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Map({ sites, onSiteClick }: MapProps) {
  const sitesWithCoords = useMemo<SiteWithCoords[]>(() => {
    return sites
      .map(site => {
        const coords = getJurisdictionCoords(site.wwtp_jurisdiction)
        return coords ? { ...site, coords } : null
      })
      .filter((site): site is SiteWithCoords => site !== null)
  }, [sites])
  
  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[39.5, -98.35]}
        zoom={4}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <ZoomControl position="bottomleft" />
        {sitesWithCoords.map((site) => (
          <CustomMarker key={`${site.wwtp_id}-${site.pathogen}`} site={site} onClick={onSiteClick} />
        ))}
      </MapContainer>
      
      <SiteCountOverlay count={sitesWithCoords.length} />
      <MapLegend />
    </div>
  )
}

// Zoom control component
function ZoomControl({ position }: { position: 'bottomleft' | 'bottomright' | 'topleft' | 'topright' }) {
  const map = useMap()
  
  const zoomIn = () => map.zoomIn()
  const zoomOut = () => map.zoomOut()
  
  return (
    <div className={`absolute ${position} z-[400] flex flex-col gap-1 m-4`}>
      <button 
        onClick={zoomIn}
        className="w-8 h-8 bg-[#111c2d]/90 backdrop-blur-sm border border-[#1e3048] rounded text-[#e8f0fe] hover:bg-[#162236] transition-colors flex items-center justify-center text-lg font-medium"
      >
        +
      </button>
      <button 
        onClick={zoomOut}
        className="w-8 h-8 bg-[#111c2d]/90 backdrop-blur-sm border border-[#1e3048] rounded text-[#e8f0fe] hover:bg-[#162236] transition-colors flex items-center justify-center text-lg font-medium"
      >
        -
      </button>
    </div>
  )
}
