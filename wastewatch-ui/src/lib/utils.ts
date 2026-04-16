import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const riskColors = {
  critical: '#ef4444',
  elevated: '#f97316',
  moderate: '#facc15',
  low: '#22c55e',
  insufficient_data: '#94a3b8',
}

export const riskLabels = {
  critical: 'Critical',
  elevated: 'Elevated',
  moderate: 'Moderate',
  low: 'Low',
  insufficient_data: 'Insufficient Data',
}

export function getRiskColor(level: string): string {
  return riskColors[level as keyof typeof riskColors] || riskColors.insufficient_data
}

export function getRiskBadgeClass(level: string): string {
  const classes: Record<string, string> = {
    critical: 'badge-critical',
    elevated: 'badge-elevated',
    moderate: 'badge-moderate',
    low: 'badge-low',
    insufficient_data: 'badge-insufficient',
  }
  return classes[level] || classes.insufficient_data
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'N/A'
  return num.toFixed(2)
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleString()
}
