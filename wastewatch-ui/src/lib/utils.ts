import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const riskColors = {
  critical: '#f43f5e',
  elevated: '#fb923c',
  moderate: '#fbbf24',
  low: '#34d399',
  insufficient_data: '#4b6a8a',
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
