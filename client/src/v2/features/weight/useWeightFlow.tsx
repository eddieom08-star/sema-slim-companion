import { useCallback } from 'react'
import { useAgent } from '@/v2/agent/AgentContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { apiRequest } from '@/lib/queryClient'
import { parseWeightFromText } from './weightParser'
import WeightSparkline from './WeightSparkline'
import ProMomentCard from '@/v2/monetisation/ProMomentCard'

export function useWeightFlow() {
  const { addAgentMessage } = useAgent()
  const { isPro, openCheckout, purchaseTokens } = useSubscription()

  const handleWeightInput = useCallback(async (text: string) => {
    const weight = parseWeightFromText(text)
    if (!weight) {
      addAgentMessage(
        "What's your weight? You can say it in kg, lbs, or stone — for example '94kg' or '14st 8'.",
        { isTemplated: true }
      )
      return
    }

    // Fetch recent logs for delta
    const logsRes = await apiRequest('GET', '/api/weight-logs?limit=8')
    const logs = await logsRes.json()

    // Log the new weight
    await apiRequest('POST', '/api/weight-logs', { weight: weight.kg, loggedAt: new Date().toISOString() })

    const startWeight = logs?.length ? parseFloat(logs[logs.length - 1].weight) : weight.kg
    const delta = Math.round((weight.kg - startWeight) * 10) / 10
    const recentLogs = [...(logs || []), { weight: weight.kg, loggedAt: new Date().toISOString() }].slice(-7)

    const msg = delta < 0
      ? `Logged ${weight.display}. You're down ${Math.abs(delta)}kg since you started. Great progress.`
      : delta === 0
      ? `Logged ${weight.display}. Holding steady.`
      : `Logged ${weight.display}. Up ${delta}kg — fluctuations are normal. Stay consistent.`

    addAgentMessage(msg, {
      isTemplated: true,
      component: <WeightSparkline logs={recentLogs} delta={delta} />,
      suggestions: delta < 0 ? ['View my trends', 'Set a goal'] : ['View my trends', 'How am I doing?']
    })

    // History upsell on significant weight loss
    if (delta <= -2 && !isPro) {
      addAgentMessage(`You've lost ${Math.abs(delta).toFixed(1)}kg — that's a real milestone.`, {
        isTemplated: true,
        component: (
          <ProMomentCard
            trigger="history_limit"
            onUpgrade={openCheckout}
            onDismiss={() => {}}
          />
        )
      })
    }

    // Streak milestone upsell
    try {
      const streakRes = await apiRequest('GET', '/api/streaks')
      const streaks = await streakRes.json()
      if (Array.isArray(streaks)) {
        const best = streaks.find((s: any) => [7, 14, 30].includes(s.currentStreak))
        if (best && !isPro) {
          addAgentMessage(`${best.currentStreak}-day streak! Streak Shields protect your progress on off-days.`, {
            isTemplated: true,
            component: (
              <ProMomentCard
                trigger="streak_shields"
                onUpgrade={openCheckout}
                onBuyTokens={purchaseTokens}
                onDismiss={() => {}}
              />
            )
          })
        }
      }
    } catch { /* streaks non-critical */ }
  }, [addAgentMessage, isPro, openCheckout, purchaseTokens])

  return { handleWeightInput }
}
