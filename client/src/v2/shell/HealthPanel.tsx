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
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '28px' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={h - 4 - ((data[data.length-1] - min) / range) * (h - 8)} r="2.5" fill={color} />
    </svg>
  )
}

export default function HealthPanel({ userInitials }: { userInitials: string }) {
  const { isOpen, setIsOpen, section, setSection, openTrend } = useHealthPanel()
  const { dashboard, foodToday, weightLogs, hungerToday } = useHealthPanelData()
  const { user } = useAuth()
  const { isPro } = useSubscription()

  const wtData = (weightLogs || []).slice(-7).map((l: any) => parseFloat(l.weight))
  const calData = (foodToday || []).reduce((s: number, e: any) => s + (e.calories || 0), 0)
  const avgHunger = hungerToday?.length
    ? (hungerToday.reduce((s: number, l: any) => s + (l.hungerAfter || l.hungerBefore || 5), 0) / hungerToday.length)
    : null

  return (
    <>
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/45 z-10 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Panel */}
      <div className={`absolute top-0 bottom-0 left-0 w-[90%] bg-white z-20 flex flex-col overflow-hidden transition-transform duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 pt-12 px-4 pb-3 flex-shrink-0">
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
        <div className="flex-1 overflow-y-auto">
          {section === 'dashboard' && (
            <div className="p-4 space-y-3">
              {/* Today snapshot */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Calories', value: calData.toString(), sub: 'today' },
                  { label: 'Protein', value: `${Math.round(((foodToday || []).reduce((s: number, e: any) => s + (e.protein || 0), 0)))}g`, sub: 'today' },
                  { label: 'Dose', value: dashboard?.medicationStatus === 'on-track' ? 'On track' : dashboard?.medicationStatus || '\u2014', sub: dashboard?.lastDoseLabel || '' },
                  { label: 'Weight', value: weightLogs?.length ? `${parseFloat(weightLogs[weightLogs.length-1].weight).toFixed(1)}kg` : '\u2014', sub: '\u25BC logging' },
                ].map(tile => (
                  <div key={tile.label} className="bg-gray-50 rounded-2xl p-3">
                    <p className="text-[10px] text-gray-400 mb-1">{tile.label}</p>
                    <p className="text-lg font-bold text-gray-900">{tile.value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{tile.sub}</p>
                  </div>
                ))}
              </div>

              {/* Weight sparkline */}
              <div className="bg-gray-50 rounded-2xl p-3 cursor-pointer active:bg-gray-100" onClick={() => openTrend('weight')}>
                <div className="flex justify-between items-start mb-2">
                  <div><p className="text-sm font-semibold text-gray-900">Weight</p><p className="text-[10px] text-gray-400">Last 7 days</p></div>
                  <p className="text-[9px] text-blue-500 font-medium">Full graph &rarr;</p>
                </div>
                <InlineSpark data={wtData} color="#1D9E75" />
              </div>

              {/* Calories sparkline */}
              <div className="bg-gray-50 rounded-2xl p-3 cursor-pointer active:bg-gray-100" onClick={() => openTrend('calories')}>
                <div className="flex justify-between items-start mb-2">
                  <div><p className="text-sm font-semibold text-gray-900">Calories</p><p className="text-[10px] text-gray-400">{calData} cal today</p></div>
                  <p className="text-[9px] text-blue-500 font-medium">Full graph &rarr;</p>
                </div>
                <InlineSpark data={[820,790,850,810,780,830,calData].filter(Boolean)} color="#3B82F6" />
              </div>

              {/* Appetite sparkline */}
              <div className="bg-gray-50 rounded-2xl p-3 cursor-pointer active:bg-gray-100" onClick={() => openTrend('appetite')}>
                <div className="flex justify-between items-start mb-2">
                  <div><p className="text-sm font-semibold text-gray-900">Appetite</p><p className="text-[10px] text-gray-400">{avgHunger ? `${avgHunger.toFixed(1)}/10 avg` : 'No logs today'}</p></div>
                  <p className="text-[9px] text-blue-500 font-medium">Full graph &rarr;</p>
                </div>
                <InlineSpark data={[6.8,6.2,5.8,5.5,5.2,5.0,avgHunger||5.2]} color="#8B5CF6" />
              </div>

              {/* Adherence sparkline */}
              <div className="bg-gray-50 rounded-2xl p-3 cursor-pointer active:bg-gray-100" onClick={() => openTrend('adherence')}>
                <div className="flex justify-between items-start mb-2">
                  <div><p className="text-sm font-semibold text-gray-900">Adherence</p><p className="text-[10px] text-gray-400">92% overall</p></div>
                  <p className="text-[9px] text-blue-500 font-medium">Full graph &rarr;</p>
                </div>
                <InlineSpark data={[100,100,100,100,85]} color="#1D9E75" />
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
