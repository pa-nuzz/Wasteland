'use client'

import useSWR from 'swr'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { api } from '@/lib/api'

interface HistoryPoint {
  date_start: string
  detect_prop_15d: number | null
  percentile: number | null
}

interface SparklineChartProps {
  wwtpId: string
  pathogen: string
  color: string
}

export default function SparklineChart({ wwtpId, pathogen, color }: SparklineChartProps) {
  const { data, error, isLoading } = useSWR(
    `history-${wwtpId}-${pathogen}`,
    () => api.getSiteHistory(wwtpId, pathogen),
    { refreshInterval: 300000 } // 5 minutes
  )

  if (isLoading) {
    return (
      <div className="animate-pulse bg-slate-700 h-32 rounded" />
    )
  }

  if (error || !data?.history?.length) {
    return (
      <div className="h-32 flex items-center justify-center text-slate-500 text-sm">
        No history data available
      </div>
    )
  }

  const chartData = data.history
    .slice()
    .reverse()
    .map((h: HistoryPoint) => ({
      date: new Date(h.date_start).toLocaleDateString(),
      value: h.detect_prop_15d ?? 0,
    }))

  const avg = chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length

  return (
    <div>
      <p className="text-xs text-slate-400 mb-2">12-Week Trend</p>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="date"
            tick={false}
            axisLine={{ stroke: '#475569' }}
          />
          <YAxis
            hide
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '4px',
            }}
            labelStyle={{ color: '#94a3b8' }}
            itemStyle={{ color: '#fff' }}
            formatter={(value: number) => [value.toFixed(2), 'Detection %']}
          />
          <ReferenceLine
            y={avg}
            stroke="#94a3b8"
            strokeDasharray="3 3"
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
