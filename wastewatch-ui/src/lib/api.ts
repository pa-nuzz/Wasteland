const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = {
  getHealth: () => fetch(`${API_URL}/health`).then(r => r.json()),
  getSites: (params?: { pathogen?: string; risk_level?: string; jurisdiction?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.pathogen) searchParams.set('pathogen', params.pathogen)
    if (params?.risk_level) searchParams.set('risk_level', params.risk_level)
    if (params?.jurisdiction) searchParams.set('jurisdiction', params.jurisdiction)
    return fetch(`${API_URL}/api/sites?${searchParams}`).then(r => r.json())
  },
  getSiteHistory: (wwtpId: string, pathogen: string) =>
    fetch(`${API_URL}/api/sites/${wwtpId}/history?pathogen=${pathogen}`).then(r => r.json()),
  getSummary: () => fetch(`${API_URL}/api/summary`).then(r => r.json()),
  getAlerts: () => fetch(`${API_URL}/api/alerts`).then(r => r.json()),
  getPathogens: () => fetch(`${API_URL}/api/pathogens`).then(r => r.json()),
}
