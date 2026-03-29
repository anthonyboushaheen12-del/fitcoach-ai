'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { parseBodyFatLower } from '../../lib/progress-compare'

const formatShort = (iso) => {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function BodyFatLineChart({ photos, height = 160 }) {
  const data = useMemo(() => {
    if (!photos?.length) return []
    return photos
      .map((p) => {
        const y = parseBodyFatLower(p.body_fat_estimate || p.analysis?.bodyFatEstimate)
        if (y == null) return null
        return {
          dateLabel: formatShort(p.created_at),
          bf: y,
          sort: new Date(p.created_at).getTime(),
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.sort - b.sort)
  }, [photos])

  if (data.length < 2) {
    return (
      <div style={{ fontSize: 12, color: '#2D5B3F', padding: '12px 0' }}>
        Add at least two progress photos with body-fat estimates to see this trend.
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
          <XAxis dataKey="dateLabel" tick={{ fill: '#2D5B3F', fontSize: 10 }} />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: '#2D5B3F', fontSize: 10 }}
            label={{ value: '%', angle: 0, position: 'insideLeft', fill: '#2D5B3F', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(14,20,14,0.95)',
              border: '1px solid rgba(110,231,183,0.2)',
              borderRadius: 10,
              color: '#E2FBE8',
            }}
          />
          <Line
            type="monotone"
            dataKey="bf"
            stroke="url(#bfGrad)"
            strokeWidth={2}
            dot={{ fill: '#6EE7B7', r: 3 }}
            name="Body fat (est.)"
          />
          <defs>
            <linearGradient id="bfGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#6EE7B7" />
            </linearGradient>
          </defs>
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
