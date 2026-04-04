import { useEffect } from 'react'
import { useAgent } from '@/v2/agent/AgentContext'
import { useSubscription } from '@/contexts/SubscriptionContext'

export function useTrialBanner() {
  const { addAgentMessage } = useAgent()
  const { entitlements } = useSubscription()

  useEffect(() => {
    const key = 'glpfriend_v2_trial_shown'
    if (localStorage.getItem(key)) return
    if (!entitlements?.isTrialing || !entitlements?.trialDaysRemaining) return

    localStorage.setItem(key, '1')
    const days = entitlements.trialDaysRemaining
    addAgentMessage(
      `You're on a Pro preview — all features unlocked for ${days} more day${days !== 1 ? 's' : ''}. Try recipe generation, full history, and appetite insights.`,
      { isTemplated: true }
    )
  }, [entitlements])
}
