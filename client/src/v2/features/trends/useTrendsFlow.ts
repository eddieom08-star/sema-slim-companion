import { useAgent } from '@/v2/agent/AgentContext'
import { useHealthPanel, type TrendTab } from '@/v2/agent/HealthPanelContext'

export function useTrendsFlow() {
  const { addAgentMessage } = useAgent()
  const { setIsOpen, openTrend } = useHealthPanel()

  const handleTrendsRequest = (tab: TrendTab = 'weight') => {
    setIsOpen(true)
    openTrend(tab)
    addAgentMessage(
      `Opening your ${tab} trends in the health panel. Use the Chat button at the bottom to ask me questions about what you see.`,
      {
        isTemplated: true,
        suggestions: ['Set a new goal', 'Generate a report', 'Tell me about adherence']
      }
    )
  }

  return { handleTrendsRequest }
}
