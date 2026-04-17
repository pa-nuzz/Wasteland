'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import { Activity, Menu, X } from 'lucide-react'
import { api, type Site } from '@/lib/api'
import AlertBanner from '@/components/AlertBanner'
import SummaryBar from '@/components/SummaryBar'
import SiteCard from '@/components/SiteCard'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

const pathogenTabs = [
  { id: 'all', label: 'All' },
  { id: 'sars-cov-2', label: 'COVID' },
  { id: 'influenza a', label: 'Flu A' },
  { id: 'influenza b', label: 'Flu B' },
  { id: 'norovirus gi', label: 'Norovirus' },
]

export default function Dashboard() {
  const [selectedPathogen, setSelectedPathogen] = useState('all')
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: sites, isLoading } = useSWR<Site[]>(
    ['sites', selectedPathogen],
    () => api.getSites(selectedPathogen === 'all' ? undefined : { pathogen: selectedPathogen }),
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

  return (
    <div className="min-h-screen bg-background">
      <AlertBanner />

      {/* Top Navigation */}
      <nav className="bg-card border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold">WasteWatch</h1>
          </div>

          {/* Pathogen Tabs - Desktop */}
          <div className="hidden md:flex items-center gap-1">
            {pathogenTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedPathogen(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  selectedPathogen === tab.id
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Pathogen Tabs - Mobile */}
        <div className="flex md:hidden items-center gap-1 mt-3 overflow-x-auto">
          {pathogenTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedPathogen(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedPathogen === tab.id
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Summary Bar */}
      <div className="px-4 py-2">
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
