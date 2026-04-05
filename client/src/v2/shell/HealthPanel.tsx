import { useHealthPanel } from '@/v2/agent/HealthPanelContext'
import { useHealthPanelData } from './useHealthPanelData'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import TrendFullView from './TrendFullView'
import ReportsSection from './ReportsSection'

interface InlineSparkProps { data: number[]; color: string }
function InlineSpark({ data, color }: InlineSparkProps) {
  if (!data.length) return null
  const w = 260, h = 28
  const min = Math.min(...data), max = Math.max(...data)
  const range = Math.max(max - min, 1)
  const pts = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w
    const y = h - 4 - ((v - min) / range) * (h - 8)
    return `${Math.round(x)},${Math.round(y)}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: '100%', height: '28px', display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={h - 4 - ((data[data.length-1] - min) / range) * (h - 8)} r="2.5" fill={color} />
    </svg>
  )
}

// Build daily calorie totals for the last N days from food entries
function buildDailyTotals(entries: any[] | undefined, field: string, days: number): number[] {
  if (!entries?.length) return []
  const result: number[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - i)
    const next = new Date(d); next.setDate(next.getDate() + 1)
    const dayTotal = entries
      .filter((e: any) => { const t = new Date(e.consumedAt || e.loggedAt); return t >= d && t < next })
      .reduce((s: number, e: any) => s + (Number(e[field]) || 0), 0)
    result.push(dayTotal)
  }
  return result
}

// Build daily hunger averages for the last N days
function buildDailyAverages(logs: any[] | undefined, days: number): number[] {
  if (!logs?.length) return []
  const result: number[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - i)
    const next = new Date(d); next.setDate(next.getDate() + 1)
    const dayLogs = logs.filter((l: any) => { const t = new Date(l.loggedAt); return t >= d && t < next })
    if (dayLogs.length) {
      result.push(dayLogs.reduce((s: number, l: any) => s + (l.hungerAfter || l.hungerBefore || 5), 0) / dayLogs.length)
    }
  }
  return result
}

export default function HealthPanel({ userInitials }: { userInitials: string }) {
  const { isOpen, setIsOpen, section, setSection, openTrend } = useHealthPanel()
  const { dashboard, foodToday, foodWeek, weightLogs, hungerToday, hungerWeek } = useHealthPanelData()
  const { user } = useAuth()
  const { isPro } = useSubscription()

  const wtData = (weightLogs || []).slice(-7).map((l: any) => Number(l.weight)).filter((v: number) => !isNaN(v))
  const calData = (foodToday || []).reduce((s: number, e: any) => s + (Number(e.calories) || 0), 0)
  const proteinData = (foodToday || []).reduce((s: number, e: any) => s + (Number(e.protein) || 0), 0)
  const avgHunger = hungerToday?.length
    ? (hungerToday.reduce((s: number, l: any) => s + (l.hungerAfter || l.hungerBefore || 5), 0) / hungerToday.length)
    : null

  // Build real 7-day sparkline data from actual logs
  const calWeekData = buildDailyTotals(foodWeek, 'calories', 7)
  const hungerWeekData = buildDailyAverages(hungerWeek, 7)

  // Weight display — fallback to profile weight if no logs
  const latestWeight = weightLogs?.length ? Number(weightLogs[weightLogs.length - 1].weight) : null
  const displayWeight = latestWeight ?? dashboard?.currentWeight ?? null

  return (
    <>
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/45 z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Panel */}
      <div className={`absolute top-0 bottom-0 left-0 w-full bg-white z-[70] flex flex-col overflow-x-hidden transition-transform duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 pb-3 flex-shrink-0 w-full max-w-full overflow-x-hidden" style={{ paddingTop: 'max(env(safe-area-inset-top), 48px)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center text-white text-sm font-semibold">
                {userInitials}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">
                  {[(user as any)?.firstName, (user as any)?.lastName].filter(Boolean).join(' ') || 'User'}
                </p>
                <p className="text-white/60 text-[10px]">
                  {isPro ? '\uD83D\uDFE3 Pro' : 'Free plan'}
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-lg">&times;</button>
          </div>

          {/* Nav tabs */}
          <div className="flex bg-white/15 rounded-xl p-0.5">
            {(['dashboard', 'reports'] as const).map(s => (
              <button key={s} onClick={() => setSection(s)}
                className={`flex-1 text-center py-1.5 text-[10px] font-medium rounded-[10px] transition-all capitalize ${section === s ? 'bg-white/95 text-purple-800' : 'text-white/65'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto -webkit-overflow-scrolling-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
          {section === 'dashboard' && (
            <div className="p-4 space-y-3">
              {/* Today snapshot */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Calories', value: calData.toString(), sub: 'today' },
                  { label: 'Protein', value: `${Math.round(proteinData)}g`, sub: 'today' },
                  { label: 'Dose', value: dashboard?.medicationStatus === 'on-track' ? 'On track' : dashboard?.medicationStatus || '\u2014', sub: dashboard?.lastDoseLabel || '' },
                  { label: 'Weight', value: displayWeight ? `${displayWeight.toFixed(1)}kg` : '\u2014', sub: latestWeight ? '\u25BC logging' : 'from profile' },
                ].map(tile => (
                  <div key={tile.label} className="bg-white rounded-2xl p-3 shadow-md border border-gray-100/80 hover:shadow-lg transition-shadow duration-200">
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">{tile.label}</p>
                    <p className="text-lg font-bold text-gray-900">{tile.value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{tile.sub}</p>
                  </div>
                ))}
              </div>

              {/* Weight sparkline */}
              <div className="bg-white rounded-2xl p-3 shadow-md border border-gray-100/80 cursor-pointer hover:shadow-lg active:shadow-sm transition-shadow duration-200" onClick={() => openTrend('weight')}>
                <div className="flex justify-between items-start mb-2">
                  <div><p className="text-sm font-semibold text-gray-900">Weight</p><p className="text-[10px] text-gray-400">Last 7 days</p></div>
                  <p className="text-[9px] text-blue-500 font-medium">Full graph &rarr;</p>
                </div>
                <InlineSpark data={wtData} color="#1D9E75" />
              </div>

              {/* Calories sparkline */}
              <div className="bg-white rounded-2xl p-3 shadow-md border border-gray-100/80 cursor-pointer hover:shadow-lg active:shadow-sm transition-shadow duration-200" onClick={() => openTrend('calories')}>
                <div className="flex justify-between items-start mb-2">
                  <div><p className="text-sm font-semibold text-gray-900">Calories</p><p className="text-[10px] text-gray-400">{calData} cal today</p></div>
                  <p className="text-[9px] text-blue-500 font-medium">Full graph &rarr;</p>
                </div>
                <InlineSpark data={calWeekData.length ? calWeekData : (calData ? [calData] : [])} color="#3B82F6" />
              </div>

              {/* Appetite sparkline */}
              <div className="bg-white rounded-2xl p-3 shadow-md border border-gray-100/80 cursor-pointer hover:shadow-lg active:shadow-sm transition-shadow duration-200" onClick={() => openTrend('appetite')}>
                <div className="flex justify-between items-start mb-2">
                  <div><p className="text-sm font-semibold text-gray-900">Appetite</p><p className="text-[10px] text-gray-400">{avgHunger ? `${avgHunger.toFixed(1)}/10 avg` : 'No logs today'}</p></div>
                  <p className="text-[9px] text-blue-500 font-medium">Full graph &rarr;</p>
                </div>
                <InlineSpark data={hungerWeekData.length ? hungerWeekData : (avgHunger ? [avgHunger] : [])} color="#8B5CF6" />
              </div>

              {/* Adherence sparkline */}
              <div className="bg-white rounded-2xl p-3 shadow-md border border-gray-100/80 cursor-pointer hover:shadow-lg active:shadow-sm transition-shadow duration-200" onClick={() => openTrend('adherence')}>
                <div className="flex justify-between items-start mb-2">
                  <div><p className="text-sm font-semibold text-gray-900">Adherence</p><p className="text-[10px] text-gray-400">Dose tracking</p></div>
                  <p className="text-[9px] text-blue-500 font-medium">Full graph &rarr;</p>
                </div>
                <InlineSpark data={[]} color="#1D9E75" />
              </div>
            </div>
          )}
          {section === 'reports' && <ReportsSection />}
        </div>

        {/* TrendFullView inside the panel */}
        <TrendFullView />
      </div>
    </>
  )
}
