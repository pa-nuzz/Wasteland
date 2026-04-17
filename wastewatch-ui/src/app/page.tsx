'use client'

import { useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import Link from 'next/link'
import { Activity, Menu, X, Bell, Radio, Waves, BarChart3, Database } from 'lucide-react'
import { api, type Site, type SummaryResponse } from '@/lib/api'
import SummaryBar from '@/components/SummaryBar'
import SiteCard from '@/components/SiteCard'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

const pathogenTabs = [
  { id: 'all', label: 'All Pathogens' },
  { id: 'sars-cov-2', label: 'COVID-19' },
  { id: 'influenza a', label: 'Influenza A' },
  { id: 'influenza b', label: 'Influenza B' },
  { id: 'norovirus gi', label: 'Norovirus' },
]

function formatTimeAgo(dateString: string | null): string {
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

export default function Dashboard() {
  const [selectedPathogen, setSelectedPathogen] = useState('all')
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: sites, isLoading } = useSWR<Site[]>(
    ['sites', selectedPathogen],
    () => api.getSites(selectedPathogen === 'all' ? undefined : { pathogen: selectedPathogen }),
    { refreshInterval: 300000 }
  )

  const { data: summary } = useSWR<SummaryResponse>(
    'summary',
    () => api.getSummary(),
    { refreshInterval: 300000 }
  )

  const handleSiteClick = useCallback((site: Site) => {
    setSelectedSite(site)
    setSidebarOpen(true)
  }, [])

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
    setTimeout(() => setSelectedSite(null), 300)
  }, [])

  const uniqueStates = useMemo(() => {
    if (!sites) return 0
    const states = new Set(sites.map(s => s.wwtp_jurisdiction).filter(Boolean))
    return states.size
  }, [sites])

  return (
    <div className="min-h-screen bg-background">
      {/* Enterprise Navigation */}
      <nav className="bg-[#0d1520] border-b border-[#1e3048]">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Wordmark */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-[#2563eb]/20 to-[#1e40af]/20 border border-[#2563eb]/30">
                <Waves className="w-5 h-5 text-[#2563eb]" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-[#e8f0fe] tracking-tight">WasteWatch</h1>
                <p className="text-[10px] text-[#6b8cae] uppercase tracking-wider">Wastewater Epidemiological Surveillance</p>
              </div>
            </div>

            {/* Center: Pathogen Tabs */}
            <div className="hidden lg:flex items-center gap-1 bg-[#111c2d] rounded-full p-1 border border-[#1e3048]">
              {pathogenTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedPathogen(tab.id)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                    selectedPathogen === tab.id
                      ? 'bg-[#2563eb] text-white shadow-lg shadow-[#2563eb]/25'
                      : 'text-[#6b8cae] hover:text-[#e8f0fe]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right: Live indicator + Alerts */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34d399] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34d399]"></span>
                </span>
                <span className="text-[#34d399] font-medium text-xs uppercase tracking-wider">Live</span>
                <span className="text-[#3d5a78] text-xs">{formatTimeAgo(summary?.last_updated || null)}</span>
              </div>
              
              <Link 
                href="/analytics" 
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111c2d] border border-[#1e3048] hover:border-[#2563eb]/50 transition-colors"
              >
                <BarChart3 className="w-4 h-4 text-[#6b8cae]" />
                <span className="text-xs text-[#6b8cae]">Analytics</span>
              </Link>

              <Link 
                href="/status" 
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111c2d] border border-[#1e3048] hover:border-[#34d399]/50 transition-colors"
              >
                <Database className="w-4 h-4 text-[#6b8cae]" />
                <span className="text-xs text-[#6b8cae]">Status</span>
              </Link>

              <Link 
                href="/alerts" 
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111c2d] border border-[#1e3048] hover:border-[#f43f5e]/50 transition-colors"
              >
                <Bell className="w-4 h-4 text-[#6b8cae]" />
                {summary && summary.critical_count > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-[#f43f5e]/20 text-[#f43f5e]">
                    {summary.critical_count}
                  </span>
                )}
              </Link>

              <button
                className="lg:hidden p-2 text-[#6b8cae] hover:text-[#e8f0fe]"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Pathogen Tabs */}
          <div className="flex lg:hidden items-center gap-1 mt-3 overflow-x-auto pb-1">
            {pathogenTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedPathogen(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
                  selectedPathogen === tab.id
                    ? 'bg-[#2563eb] text-white'
                    : 'bg-[#111c2d] text-[#6b8cae] border border-[#1e3048]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Context Strip */}
      <div className="bg-[#111c2d] border-b border-[#1e3048]">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center gap-6 text-xs text-[#6b8cae]">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3 h-3" />
              CDC NWSS
            </span>
            <span className="w-px h-3 bg-[#1e3048]"></span>
            <span>{sites?.length || 0} wastewater treatment facilities</span>
            <span className="w-px h-3 bg-[#1e3048]"></span>
            <span>Updated every 6 hours</span>
            <span className="w-px h-3 bg-[#1e3048]"></span>
            <span>Covering {uniqueStates} jurisdictions</span>
          </div>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="px-4 py-3">
        <SummaryBar />
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-200px)]">
        {/* Map - 60% on desktop */}
        <div className="flex-1 lg:w-3/5 p-4">
          <div className="bg-card rounded-lg overflow-hidden h-full border border-slate-700">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-pulse text-slate-400">Loading map...</div>
              </div>
            ) : sites && sites.length > 0 ? (
              <Map sites={sites} onSiteClick={handleSiteClick} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md px-4">
                  <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Data Available</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    The risk scoring engine needs to run first. 
                    Run the pipeline scheduler to populate the database.
                  </p>
                  <code className="block bg-slate-800 px-3 py-2 rounded text-xs text-slate-300">
                    python -m pipeline.scheduler
                  </code>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - 40% on desktop */}
        <div
          className={`lg:w-2/5 bg-card border-l border-slate-700 p-4 overflow-y-auto transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:hidden'
          } ${selectedSite ? 'block' : 'hidden lg:block'}`}
        >
          {selectedSite ? (
            <SiteCard site={selectedSite} onClose={closeSidebar} />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              <div className="text-center">
                <p className="text-lg font-medium mb-2">Select a site</p>
                <p className="text-sm">Click on a map marker to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
