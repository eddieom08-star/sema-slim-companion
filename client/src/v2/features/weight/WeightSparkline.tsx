interface WeightSparklineProps {
  logs: { weight: string | number; loggedAt: string }[]
  delta: number
}

export default function WeightSparkline({ logs, delta }: WeightSparklineProps) {
  const values = logs.map(l => parseFloat(String(l.weight))).filter(Boolean)
  if (!values.length) return null

  const w = 260, h = 60
  const min = Math.min(...values), max = Math.max(...values)
  const range = Math.max(max - min, 0.5)
  const pts = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * w
    const y = h - 8 - ((v - min) / range) * (h - 16)
    return `${Math.round(x)},${Math.round(y)}`
  }).join(' ')

  const color = delta <= 0 ? '#1D9E75' : '#E24B4A'
  const label = delta < 0 ? `▼ ${Math.abs(delta).toFixed(1)}kg` : `▲ ${Math.abs(delta).toFixed(1)}kg`

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 w-full">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500">Weight trend</p>
        <p className="text-sm font-bold" style={{ color }}>{label}</p>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '60px', display: 'block' }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {values.length > 0 && (
          <circle
            cx={w}
            cy={h - 8 - ((values[values.length - 1] - min) / range) * (h - 16)}
            r="3.5" fill={color}
          />
        )}
      </svg>
    </div>
  )
}
