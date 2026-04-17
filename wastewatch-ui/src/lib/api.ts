const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`)
  return res.json() as Promise<T>
}

export interface HealthResponse {
  status: string
  db_last_updated: string
  total_records: number
}

export interface Site {
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

export interface HistoryPoint {
  week_start: string
  detection_count: number
}

export interface SummaryResponse {
  total_sites: number
  critical_count: number
  elevated_count: number
  moderate_count: number
  low_count: number
  last_updated: string
  top_critical: Site[]
  population_total?: number
}

export interface AlertsResponse {
  alerts: Site[]
  total: number
  critical_count: number
  elevated_count: number
}

export interface PathogenCount {
  pathogen: string
  count: number
}

export interface PathogensResponse {
  pathogens: PathogenCount[]
}

export const api = {
  getHealth: (): Promise<HealthResponse> => apiFetch(`${API_URL}/health`),
  getSites: (params?: { pathogen?: string; risk_level?: string; jurisdiction?: string }): Promise<Site[]> => {
    const searchParams = new URLSearchParams()
    if (params?.pathogen) searchParams.set('pathogen', params.pathogen)
    if (params?.risk_level) searchParams.set('risk_level', params.risk_level)
    if (params?.jurisdiction) searchParams.set('jurisdiction', params.jurisdiction)
    return apiFetch(`${API_URL}/api/sites?${searchParams}`)
  },
  getSiteHistory: (wwtpId: string, pathogen: string): Promise<HistoryPoint[]> =>
    apiFetch(`${API_URL}/api/sites/${wwtpId}/history?pathogen=${pathogen}`),
  getSummary: (): Promise<SummaryResponse> => apiFetch(`${API_URL}/api/summary`),
  getAlerts: (): Promise<AlertsResponse> => apiFetch(`${API_URL}/api/alerts`),
  getPathogens: (): Promise<PathogensResponse> => apiFetch(`${API_URL}/api/pathogens`),
}
