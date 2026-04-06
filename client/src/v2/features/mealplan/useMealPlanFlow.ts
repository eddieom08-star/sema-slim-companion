import { useCallback, createElement } from 'react'
import { useAgent } from '@/v2/agent/AgentContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { apiRequest } from '@/lib/queryClient'
import MealPlanCard from './MealPlanCard'
import ProMomentCard from '@/v2/monetisation/ProMomentCard'

export function useMealPlanFlow() {
  const { addAgentMessage } = useAgent()
  const { checkFeature, openCheckout, purchaseTokens } = useSubscription()

  const handleGenerateMealPlan = useCallback(async () => {
    const gate = await checkFeature('ai_meal_plan', 1)

    if (!gate.allowed) {
      addAgentMessage('', {
        isTemplated: true,
        component: createElement(ProMomentCard, {
          trigger: 'meal_plan_limit' as const,
          onUpgrade: openCheckout,
          onBuyTokens: purchaseTokens,
          onDismiss: () => {},
        }),
      })
      return
    }

    if (gate.remaining !== undefined && gate.remaining <= 2 && gate.remaining > 0) {
      addAgentMessage(
        `Generating your meal plan — you have ${gate.remaining} left this month.`,
        { isTemplated: true }
      )
    }

    addAgentMessage('Creating your 7-day GLP-1 friendly meal plan...', { isTemplated: true })

    try {
      const res = await apiRequest('POST', '/api/v2/generate-meal-plan', {}, { timeout: 60000 })
      const data = await res.json()

      if (data.error) {
        addAgentMessage(`Meal plan generation failed: ${data.message || data.error}`, { isTemplated: true })
        return
      }

      addAgentMessage('Here\'s your personalised 7-day meal plan:', {
        isTemplated: true,
        component: createElement(MealPlanCard, { plan: data.plan }),
        suggestions: ['Generate another', 'Need a recipe', 'How am I doing?'],
      })
    } catch (err: any) {
      const detail = err?.message || 'Unknown error'
      console.error('Meal plan generation error:', detail)
      addAgentMessage('Failed to generate meal plan. Try again.', {
        isTemplated: true,
        suggestions: ['Try again', 'Need a recipe'],
      })
    }
  }, [addAgentMessage, checkFeature, openCheckout, purchaseTokens])

  return { handleGenerateMealPlan }
}
