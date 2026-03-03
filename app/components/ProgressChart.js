'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
} from 'recharts'

const formatDate = (d) => {
  const date = new Date(d)
  const now = new Date()
  const diff = now - date
  if (diff < 86400000) return 'Today'
  if (diff < 172800000) return 'Yesterday'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function ProgressChart({ data, targetWeight, height = 180 }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.map((d) => ({
      ...d,
      dateLabel: formatDate(d.date),
    }))
  }, [data])

  const hasData = chartData.length > 0
  const minW = hasData ? Math.min(...chartData.map((d) => d.weight_kg)) - 2 : 0
  const maxW = hasData ? Math.max(...chartData.map((d) => d.weight_kg), targetWeight || 0) + 2 : 100
  const domain = [Math.floor(minW), Math.ceil(maxW)]

  if (!hasData) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#2D5B3F',
          fontSize: 14,
          textAlign: 'center',
        }}
      >
        Log your weight to see progress
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradientFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6EE7B7" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#6EE7B7" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradientLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#6EE7B7" />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="dateLabel"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#2D5B3F', fontSize: 10 }}
        />
        <YAxis
          domain={domain}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#2D5B3F', fontSize: 10 }}
          width={32}
        />
        {targetWeight && (
          <ReferenceLine
            y={targetWeight}
            stroke="#F97316"
            strokeDasharray="4 4"
            strokeOpacity={0.8}
          />
        )}
        <Tooltip
          contentStyle={{
            background: 'rgba(14,20,14,0.95)',
            border: '1px solid rgba(110,231,183,0.15)',
            borderRadius: 12,
          }}
          labelStyle={{ color: '#2D5B3F' }}
          formatter={(value) => [`${value} kg`, 'Weight']}
          labelFormatter={(label) => label}
        />
        <Area
          type="monotone"
          dataKey="weight_kg"
          stroke="url(#gradientLine)"
          strokeWidth={2.5}
          fill="url(#gradientFill)"
          isAnimationActive
          animationDuration={600}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
