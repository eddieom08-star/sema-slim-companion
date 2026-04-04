import { useAgent } from '@/v2/agent/AgentContext'
import { useHealthPanel, type TrendTab } from '@/v2/agent/HealthPanelContext'
import { apiRequest } from '@/lib/queryClient'

export function useTrendsFlow() {
  const { addAgentMessage } = useAgent()
  const { setIsOpen, openTrend } = useHealthPanel()

  const handleTrendsRequest = async (tab: TrendTab = 'weight') => {
    setIsOpen(true)
    openTrend(tab)
    addAgentMessage(
      `Opening your ${tab} trends in the health panel. Use the Chat button at the bottom to ask me questions about what you see.`,
      {
        isTemplated: true,
        suggestions: ['Set a new goal', 'Generate a report', 'Tell me about adherence']
      }
    )

    try {
      const res = await apiRequest('POST', '/api/v2/appetite-insight', { tab })
      const data = await res.json()
      if (data.insight) {
        addAgentMessage(data.insight, { isTemplated: true })
      }
    } catch {
      // Non-critical — insight is supplementary
    }
  }

  return { handleTrendsRequest }
}
