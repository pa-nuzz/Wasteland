'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Database, 
  Activity, 
  Clock, 
  Server,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Radio
} from 'lucide-react'
import { api, type HealthResponse, type SummaryResponse } from '@/lib/api'

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Unknown'
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m`
  return `${seconds}s`
}

function getNextRunTime(lastFetched: string | null): string {
  if (!lastFetched) return 'Unknown'
  const last = new Date(lastFetched)
  const next = new Date(last.getTime() + 6 * 60 * 60 * 1000) // 6 hours
  const now = new Date()
  const diff = next.getTime() - now.getTime()
  
  if (diff < 0) return 'Overdue'
  return formatDuration(diff)
}

interface StatusCardProps {
  title: string
  status: 'healthy' | 'warning' | 'error'
  icon: React.ElementType
  children: React.ReactNode
}

function StatusCard({ title, status, icon: Icon, children }: StatusCardProps) {
  const statusColors = {
    healthy: 'border-[#34d399]',
    warning: 'border-[#fbbf24]',
    error: 'border-[#f43f5e]',
  }
  
  const iconColors = {
    healthy: 'text-[#34d399]',
    warning: 'text-[#fbbf24]',
    error: 'text-[#f43f5e]',
  }

  return (
    <div className={`p-4 rounded-lg border bg-[#111c2d] ${statusColors[status]}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${iconColors[status]}`} />
        <h3 className="text-sm font-semibold text-[#e8f0fe]">{title}</h3>
        {status === 'healthy' && <CheckCircle2 className="w-4 h-4 text-[#34d399] ml-auto" />}
        {status === 'warning' && <AlertCircle className="w-4 h-4 text-[#fbbf24] ml-auto" />}
        {status === 'error' && <AlertCircle className="w-4 h-4 text-[#f43f5e] ml-auto" />}
      </div>
      {children}
    </div>
  )
}

export default function StatusPage() {
  const { data: health } = useSWR<HealthResponse>('health', () => api.getHealth())
  const { data: summary } = useSWR<SummaryResponse>('summary', () => api.getSummary())

  const isHealthy = health?.status === 'ok'
  const lastUpdated = health?.db_last_updated || null
  const recordCount = health?.total_records || 0

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
              <Server className="w-6 h-6 text-[#2563eb]" />
              <h1 className="text-lg font-semibold text-[#e8f0fe]">System Status</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Overview */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[#e8f0fe] mb-2">Pipeline Overview</h2>
          <p className="text-xs text-[#6b8cae]">Real-time status of the WasteWatch data ingestion and processing pipeline</p>
        </div>

        {/* Status Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Database Status */}
          <StatusCard 
            title="Database" 
            status={isHealthy ? 'healthy' : 'error'}
            icon={Database}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-[#34d399]' : 'bg-[#f43f5e]'}`} />
                <span className="text-sm text-[#e8f0fe]">
                  {isHealthy ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <p className="text-xs text-[#6b8cae]">SQLite — {recordCount.toLocaleString()} records</p>
            </div>
          </StatusCard>

          {/* API Status */}
          <StatusCard 
            title="API Service" 
            status={isHealthy ? 'healthy' : 'error'}
            icon={Activity}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-[#34d399]' : 'bg-[#f43f5e]'}`} />
                <span className="text-sm text-[#e8f0fe]">
                  {isHealthy ? 'Operational' : 'Degraded'}
                </span>
              </div>
              <p className="text-xs text-[#6b8cae]">FastAPI — Port 8000</p>
            </div>
          </StatusCard>

          {/* Last Ingestion */}
          <StatusCard 
            title="Last Ingestion" 
            status={isHealthy ? 'healthy' : 'warning'}
            icon={RefreshCw}
          >
            <div className="space-y-2">
              <p className="text-sm text-[#e8f0fe]">{formatTimeAgo(lastUpdated)}</p>
              <p className="text-xs text-[#6b8cae]">
                {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'No data'}
              </p>
            </div>
          </StatusCard>

          {/* Next Scheduled Run */}
          <StatusCard 
            title="Next Scheduled Run" 
            status={isHealthy ? 'healthy' : 'warning'}
            icon={Clock}
          >
            <div className="space-y-2">
              <p className="text-sm text-[#e8f0fe]">{getNextRunTime(lastUpdated)}</p>
              <p className="text-xs text-[#6b8cae]">Every 6 hours via APScheduler</p>
            </div>
          </StatusCard>

          {/* Data Source */}
          <StatusCard 
            title="Data Source" 
            status="healthy"
            icon={Radio}
          >
            <div className="space-y-2">
              <p className="text-sm text-[#e8f0fe]">CDC NWSS API</p>
              <p className="text-xs text-[#6b8cae] font-mono">dataset 2ew6-ywp6</p>
            </div>
          </StatusCard>

          {/* Risk Score Status */}
          <StatusCard 
            title="Risk Scoring" 
            status={summary ? 'healthy' : 'warning'}
            icon={Activity}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${summary ? 'bg-[#34d399]' : 'bg-[#fbbf24]'}`} />
                <span className="text-sm text-[#e8f0fe]">
                  {summary ? 'Active' : 'Pending'}
                </span>
              </div>
              <p className="text-xs text-[#6b8cae]">
                {summary ? `${summary.total_sites} sites scored` : 'Waiting for data'}
              </p>
            </div>
          </StatusCard>
        </div>

        {/* Pipeline Details */}
        <div className="p-6 rounded-lg border border-[#1e3048] bg-[#111c2d]">
          <h2 className="text-sm font-semibold text-[#e8f0fe] mb-4">Pipeline Architecture</h2>
          
          <div className="grid md:grid-cols-4 gap-4 text-center">
            <div className="p-3 rounded-lg bg-[#0d1520] border border-[#1e3048]">
              <Radio className="w-5 h-5 text-[#2563eb] mx-auto mb-2" />
              <p className="text-xs font-medium text-[#e8f0fe]">CDC NWSS API</p>
              <p className="text-[10px] text-[#6b8cae]">Socrata / JSON</p>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="w-full h-px bg-[#1e3048] hidden md:block" />
              <div className="w-px h-4 bg-[#1e3048] md:hidden" />
            </div>
            
            <div className="p-3 rounded-lg bg-[#0d1520] border border-[#1e3048]">
              <RefreshCw className="w-5 h-5 text-[#fbbf24] mx-auto mb-2" />
              <p className="text-xs font-medium text-[#e8f0fe]">Pipeline</p>
              <p className="text-[10px] text-[#6b8cae]">Ingest + Score</p>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="w-full h-px bg-[#1e3048] hidden md:block" />
              <div className="w-px h-4 bg-[#1e3048] md:hidden" />
            </div>
            
            <div className="p-3 rounded-lg bg-[#0d1520] border border-[#1e3048]">
              <Database className="w-5 h-5 text-[#34d399] mx-auto mb-2" />
              <p className="text-xs font-medium text-[#e8f0fe]">SQLite</p>
              <p className="text-[10px] text-[#6b8cae]">wastewatch.db</p>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="w-full h-px bg-[#1e3048] hidden md:block" />
              <div className="w-px h-4 bg-[#1e3048] md:hidden" />
            </div>
            
            <div className="p-3 rounded-lg bg-[#0d1520] border border-[#1e3048]">
              <Activity className="w-5 h-5 text-[#a78bfa] mx-auto mb-2" />
              <p className="text-xs font-medium text-[#e8f0fe]">FastAPI</p>
              <p className="text-[10px] text-[#6b8cae]">REST + Cache</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#1e3048]">
            <h3 className="text-xs font-medium text-[#6b8cae] uppercase tracking-wider mb-3">
              Processing Schedule
            </h3>
            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#6b8cae]" />
                <span className="text-[#e8f0fe]">Every 6 hours</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#6b8cae]" />
                <span className="text-[#e8f0fe]">~800k records</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#6b8cae]" />
                <span className="text-[#e8f0fe]">Z-score calculation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-[#3d5a78]">
            System status updates automatically. Last checked: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  )
}
