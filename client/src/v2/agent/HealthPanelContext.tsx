import { createContext, useContext, useState, useCallback, type PropsWithChildren } from 'react'
import { useAgent } from './AgentContext'

export type TrendTab = 'weight' | 'calories' | 'appetite' | 'adherence'
export type PanelSection = 'dashboard' | 'reports'
export type Period = 7 | 30 | 90

interface HealthPanelContextValue {
  isOpen: boolean
  section: PanelSection
  trendOpen: boolean
  trendTab: TrendTab
  period: Period
  setIsOpen: (v: boolean) => void
  setSection: (s: PanelSection) => void
  openTrend: (tab: TrendTab) => void
  closeTrend: () => void
  goToChat: () => void
  goToGoals: () => void
  goToReport: () => void
  setPeriod: (p: Period) => void
  setTrendTab: (t: TrendTab) => void
}

const HealthPanelContext = createContext<HealthPanelContextValue | null>(null)

export function HealthPanelProvider({ children }: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false)
  const [section, setSection] = useState<PanelSection>('dashboard')
  const [trendOpen, setTrendOpen] = useState(false)
  const [trendTab, setTrendTab] = useState<TrendTab>('weight')
  const [period, setPeriodState] = useState<Period>(7)
  const { addUserMessage } = useAgent()

  const openTrend = useCallback((tab: TrendTab) => {
    setTrendTab(tab)
    setTrendOpen(true)
  }, [])

  const closeTrend = useCallback(() => setTrendOpen(false), [])

  const goToReport = useCallback(() => {
    setTrendOpen(false)
    setSection('reports')
  }, [])

  const goToChat = useCallback(() => {
    setTrendOpen(false)
    setIsOpen(false)
    const msgs: Record<TrendTab, string> = {
      weight: 'Tell me more about my weight trend',
      calories: 'Why are my calories trending the way they are?',
      appetite: 'Explain my appetite patterns in more detail',
      adherence: 'How does my medication adherence affect my results?',
    }
    addUserMessage(msgs[trendTab])
  }, [trendTab, addUserMessage])

  const goToGoals = useCallback(() => {
    setTrendOpen(false)
    setIsOpen(false)
    addUserMessage(`Help me set a new ${trendTab} goal`)
  }, [trendTab, addUserMessage])

  const setPeriod = useCallback((p: Period) => {
    setPeriodState(p)
  }, [])

  return (
    <HealthPanelContext.Provider value={{
      isOpen, section, trendOpen, trendTab, period,
      setIsOpen, setSection, openTrend, closeTrend,
      goToChat, goToGoals, goToReport, setPeriod, setTrendTab,
    }}>
      {children}
    </HealthPanelContext.Provider>
  )
}

export function useHealthPanel() {
  const ctx = useContext(HealthPanelContext)
  if (!ctx) throw new Error('useHealthPanel must be within HealthPanelProvider')
  return ctx
}
