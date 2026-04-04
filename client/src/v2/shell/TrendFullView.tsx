import { useState, useEffect } from 'react'
import { useHealthPanel, type TrendTab, type Period } from '@/v2/agent/HealthPanelContext'
import { useHealthPanelData } from './useHealthPanelData'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { apiRequest } from '@/lib/queryClient'
import {
  LineChart, Line, BarChart, Bar, XAxis, ReferenceLine,
  ResponsiveContainer, Tooltip
} from 'recharts'

function buildDailyCalories(entries: any[], days: number) {
  const result: { label: string; calories: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('en-GB', { weekday: 'short' })
    const calories = (entries || [])
      .filter((e: any) => e.consumedAt?.startsWith(key))
      .reduce((s: number, e: any) => s + (e.calories || 0), 0)
    result.push({ label, calories })
  }
  return result
}

function buildWeeklyAdherence(logs: any[], days: number) {
  const weeks = Math.ceil(days / 7)
  const result: { week: string; pct: number }[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(Date.now() - (i + 1) * 7 * 86400000)
    const weekEnd = new Date(Date.now() - i * 7 * 86400000)
    const taken = (logs || []).filter((l: any) => {
      const d = new Date(l.takenAt)
      return d >= weekStart && d < weekEnd
    }).length
    result.push({ week: `W${weeks - i}`, pct: taken > 0 ? 100 : 0 })
  }
  return result
}

function buildWeightSeries(logs: any[], days: number) {
  const cutoff = new Date(Date.now() - days * 86400000)
  return (logs || [])
    .filter((l: any) => new Date(l.loggedAt) >= cutoff)
    .sort((a: any, b: any) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime())
    .map((l: any) => ({
      date: new Date(l.loggedAt).toLocaleDateString('en-GB', { weekday: 'short' }),
      weight: parseFloat(l.weight),
    }))
}

export default function TrendFullView() {
  const { trendOpen, trendTab, setTrendTab, period, setPeriod, closeTrend, goToChat, goToGoals, goToReport } = useHealthPanel()
  const { foodRange, weightLogs, hungerLogs, medLogs } = useHealthPanelData()
  const { isPro } = useSubscription()
  const [aiInsight, setAiInsight] = useState<string | null>(null)

  useEffect(() => {
    if (!trendOpen || !isPro) return
    setAiInsight(null)
    const stats = { tab: trendTab, period }
    apiRequest('POST', '/api/v2/appetite-insight', { stats, tab: trendTab })
      .then(r => r.json()).then(d => setAiInsight(d.insight)).catch(() => {})
  }, [trendOpen, trendTab, isPro])

  const tabs: TrendTab[] = ['weight', 'calories', 'appetite', 'adherence']
  const calData = buildDailyCalories(foodRange, period)
  const wtData = buildWeightSeries(weightLogs, period)

  return (
    <div className={`absolute inset-0 bg-white z-30 flex flex-col transition-transform duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${trendOpen ? 'translate-y-0' : 'translate-y-full'}`}>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 pt-12 px-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <button onClick={closeTrend} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm">&larr;</button>
          <div className="text-center">
            <p className="text-white text-sm font-semibold capitalize">{trendTab} trend</p>
            <p className="text-white/60 text-[10px]">42 days on GLP-1</p>
          </div>
          <div className="w-8" />
        </div>
      </div>

      {/* Chart tabs */}
      <div className="flex border-b border-gray-100 bg-white flex-shrink-0 overflow-x-auto">
        {tabs.map(t => (
          <button key={t} onClick={() => setTrendTab(t)}
            className={`px-4 py-2.5 text-[10px] font-medium whitespace-nowrap border-b-2 transition-colors capitalize ${trendTab === t ? 'text-blue-500 border-blue-500' : 'text-gray-400 border-transparent'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Period pills */}
      <div className="flex gap-2 px-4 py-2.5 bg-white flex-shrink-0">
        {([7, 30, 90] as Period[]).map(p => (
          <button key={p} onClick={() => { if (p === 90 && !isPro) return; setPeriod(p) }}
            className={`px-3 py-1 text-[10px] rounded-full ${period === p && !(p === 90 && !isPro) ? 'bg-blue-500 text-white' : p === 90 && !isPro ? 'bg-gray-100 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
            {p}d{p === 90 && !isPro ? ' \uD83D\uDD12' : ''}
          </button>
        ))}
      </div>

      {/* Chart content */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {trendTab === 'calories' && (
          <div className="bg-gray-50 rounded-2xl p-3 mb-3" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={calData} margin={{ top: 4, right: 4, bottom: 16, left: 0 }}>
                <Bar dataKey="calories" fill="#3B82F6" radius={[3, 3, 0, 0]} maxBarSize={period === 7 ? 28 : 14} />
                <ReferenceLine y={1400} stroke="#E0DDD6" strokeDasharray="4 3" />
                <XAxis dataKey="label" tick={{ fontSize: 8, fill: '#bbb' }} tickLine={false} axisLine={false} interval={period === 7 ? 0 : 'preserveStartEnd'} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {trendTab === 'weight' && (
          <div className="bg-gray-50 rounded-2xl p-3 mb-3" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={wtData} margin={{ top: 8, right: 4, bottom: 16, left: 0 }}>
                <Line type="monotone" dataKey="weight" stroke="#1D9E75" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#bbb' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)}kg`]} contentStyle={{ fontSize: 10, borderRadius: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {trendTab === 'appetite' && (
          <div className="bg-gray-50 rounded-2xl p-3 mb-3" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={(hungerLogs || [])
                  .sort((a: any, b: any) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime())
                  .map((l: any) => ({
                    date: new Date(l.loggedAt).toLocaleDateString('en-GB', { weekday: 'short' }),
                    before: l.hungerBefore,
                    after: l.hungerAfter,
                  }))}
                margin={{ top: 4, right: 4, bottom: 16, left: 0 }}
              >
                <Line type="monotone" dataKey="before" stroke="#D85A30" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="after" stroke="#3B82F6" strokeWidth={1.5} dot={false} />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#bbb' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {trendTab === 'adherence' && (
          <div className="bg-gray-50 rounded-2xl p-3 mb-3" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={buildWeeklyAdherence(medLogs, period)}
                margin={{ top: 4, right: 4, bottom: 16, left: 0 }}
              >
                <Bar dataKey="pct" fill="#1D9E75" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <ReferenceLine y={100} stroke="#E0DDD6" strokeDasharray="4 3" />
                <XAxis dataKey="week" tick={{ fontSize: 8, fill: '#bbb' }} tickLine={false} axisLine={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Insight */}
        <div className="bg-green-50 rounded-xl p-3 mb-2">
          <p className="text-[9px] text-green-600 font-semibold mb-1">Insight</p>
          <p className="text-[10px] text-green-700 leading-relaxed">
            {trendTab === 'weight' && 'Weight trending consistently downward. Keep logging daily for better accuracy.'}
            {trendTab === 'calories' && `Averaging ${Math.round(calData.reduce((s, d) => s + d.calories, 0) / Math.max(calData.length, 1))} cal/day \u2014 consistent with GLP-1 appetite suppression.`}
            {trendTab === 'appetite' && 'Keep logging hunger before and after meals for pattern insights.'}
            {trendTab === 'adherence' && 'Consistent dosing maximises GLP-1 effectiveness.'}
          </p>
        </div>

        {isPro && aiInsight && (
          <div className="bg-purple-50 rounded-xl p-3 mb-2">
            <p className="text-[9px] text-purple-500 font-semibold mb-1">AI insight · Pro</p>
            <p className="text-[10px] text-purple-700 leading-relaxed">{aiInsight}</p>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="bg-white border-t border-gray-100 px-4 py-2 pb-safe flex gap-2 flex-shrink-0">
        <button onClick={goToChat} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border border-gray-200">
          <span className="text-base">{'\uD83D\uDCAC'}</span>
          <span className="text-[9px] text-gray-500 font-medium">Chat</span>
        </button>
        <button onClick={goToGoals} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border border-gray-200">
          <span className="text-base">{'\uD83C\uDFAF'}</span>
          <span className="text-[9px] text-gray-500 font-medium">Goals</span>
        </button>
        <button onClick={goToReport} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-gray-900 border border-gray-900">
          <span className="text-sm">{'\uD83D\uDCC4'}</span>
          <span className="text-[9px] text-white font-medium">Report</span>
        </button>
      </div>
    </div>
  )
}
