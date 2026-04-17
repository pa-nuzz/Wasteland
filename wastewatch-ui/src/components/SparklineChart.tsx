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
  Area,
} from 'recharts'
import { api } from '@/lib/api'

interface HistoryPoint {
  week_start: string
  detection_count: number
}

interface SparklineChartProps {
  wwtpId: string
  pathogen: string
  color: string
  height?: number
  showGradient?: boolean
  showAxis?: boolean
}

export default function SparklineChart({ 
  wwtpId, 
  pathogen, 
  color,
  height = 120,
  showGradient = false,
  showAxis = false
}: SparklineChartProps) {
  const { data, error, isLoading } = useSWR<HistoryPoint[]>(
    `history-${wwtpId}-${pathogen}`,
    () => api.getSiteHistory(wwtpId, pathogen),
    { refreshInterval: 300000 }
  )

  if (isLoading) {
    return (
      <div className="animate-pulse bg-[#1e3048] rounded" style={{ height }} />
    )
  }

  if (error || !data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-[#6b8cae] text-sm" style={{ height }}>
        No history data available
      </div>
    )
  }

  const chartData = data.map((h, i) => ({
    week: `W${i + 1}`,
    value: h.detection_count ?? 0,
  }))

  const avg = chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        {showAxis && (
          <XAxis
            dataKey="week"
            tick={{ fill: '#6b8cae', fontSize: 10 }}
            axisLine={{ stroke: '#1e3048' }}
            tickLine={false}
          />
        )}
        <YAxis hide domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#111c2d',
            border: '1px solid #1e3048',
            borderRadius: '6px',
          }}
          labelStyle={{ color: '#6b8cae' }}
          itemStyle={{ color: '#e8f0fe' }}
          formatter={(value: number) => [value.toFixed(2), 'Detection']}
        />
        <ReferenceLine
          y={avg}
          stroke="#6b8cae"
          strokeDasharray="3 3"
          label={{ value: 'Mean', fill: '#6b8cae', fontSize: 10, position: 'right' }}
        />
        {showGradient && (
          <Area
            type="monotone"
            dataKey="value"
            stroke="none"
            fill={color}
            fillOpacity={0.1}
          />
        )}
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: color, stroke: '#fff', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
