import { useCallback } from 'react'
import { createElement } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAgent } from '@/v2/agent/AgentContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { needsDisambiguation, inferMealType, type FoodResult } from './foodVariance'
import { apiRequest } from '@/lib/queryClient'
import NutritionCard from './NutritionCard'
import DisambiguationCard from './DisambiguationCard'
import ProMomentCard from '@/v2/monetisation/ProMomentCard'

export function useFoodFlow() {
  const { addAgentMessage } = useAgent()
  const { isPro, openCheckout } = useSubscription()
  const queryClient = useQueryClient()

  const logAndConfirm = useCallback(async (food: FoodResult, qty: number, mealType: string) => {
    addAgentMessage('Here\'s what I found:', {
      isTemplated: true,
      component: createElement(NutritionCard, {
        food,
        quantity: qty,
        onLog: async () => {
          try {
            await apiRequest('POST', '/api/food-entries', {
                foodName: food.name,
                calories: Math.round(Number(food.calories) * qty),
                protein: String(Math.round(Number(food.protein) * qty)),
                carbs: String(Math.round(Number(food.carbs) * qty)),
                fat: String(Math.round(Number(food.fat) * qty)),
                quantity: String(food.servingSize * qty),
                unit: food.servingUnit,
                mealType,
                consumedAt: new Date().toISOString(),
              })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
            queryClient.invalidateQueries({ queryKey: ['panel-dashboard'] })
            queryClient.invalidateQueries({ queryKey: ['panel-food-today'] })
            queryClient.invalidateQueries({ queryKey: ['panel-food-week'] })
            addAgentMessage(
              `Logged! ${Math.round(Number(food.calories) * qty)} calories for ${mealType}. How full are you feeling?`,
              { isTemplated: true, suggestions: ['Still hungry', 'Satisfied', 'Very full', 'Skip'] }
            )

            if (!isPro) {
              try {
                const countRes = await apiRequest('GET', '/api/hunger-logs?limit=1')
                const countData = await countRes.json()
                if (Array.isArray(countData) && countData.length >= 3) {
                  addAgentMessage('You\'ve logged enough data for appetite intelligence:', {
                    isTemplated: true,
                    component: createElement(ProMomentCard, {
                      trigger: 'satiety_intel',
                      onUpgrade: openCheckout,
                      onDismiss: () => {},
                    }),
                  })
                }
              } catch { /* non-critical upsell */ }
            }
          } catch {
            addAgentMessage('Failed to log food. Check your connection and try again.', {
              isTemplated: true, suggestions: ['Try again', 'Log food'],
            })
          }
        },
        onEdit: () => addAgentMessage('What would you like to change?', { isTemplated: true }),
      }),
    })
  }, [addAgentMessage, isPro, openCheckout])

  const handleFoodInput = useCallback(async (
    text: string,
    entities?: { food_name?: string; meal_type?: string }
  ) => {
    let items: { food_name: string; quantity?: string }[] = []

    if (entities?.food_name) {
      items = [{ food_name: entities.food_name }]
    } else {
      try {
        const res = await apiRequest('POST', '/api/v2/extract-food-entity', { text }, { timeout: 30000 })
        const data = await res.json()
        items = data.items?.length ? data.items : [{ food_name: text }]
      } catch {
        items = [{ food_name: text }]
      }
    }

    const mealType = entities?.meal_type || inferMealType()

    const searches = await Promise.all(
      items.map(async (item) => {
        try {
          const res = await apiRequest(
            'GET',
            `/api/food-database/search?q=${encodeURIComponent(item.food_name)}`
          )
          const data = await res.json()
          const results: FoodResult[] = (Array.isArray(data) ? data : []).slice(0, 3)
          return { item, results }
        } catch {
          return { item, results: [] as FoodResult[] }
        }
      })
    )

    for (const { item, results } of searches) {
      if (!results.length) {
        addAgentMessage(
          `I couldn't find "${item.food_name}" — try describing it differently.`,
          { isTemplated: true }
        )
        continue
      }

      if (needsDisambiguation(results)) {
        addAgentMessage(`Which type of ${item.food_name}?`, {
          isTemplated: true,
          component: createElement(DisambiguationCard, {
            itemName: item.food_name,
            options: results,
            onSelect: (food: FoodResult, qty: number) => logAndConfirm(food, qty, mealType),
          }),
        })
      } else {
        logAndConfirm(results[0], 1, mealType)
      }
    }
  }, [addAgentMessage, logAndConfirm])

  const handleBarcodeIntent = useCallback(async () => {
    try {
      const res = await apiRequest('POST', '/api/features/check', { feature: 'barcode_scan' })
      const gate = await res.json()

      if (!gate.allowed) {
        addAgentMessage('You\'ve used your barcode scans for today.', {
          isTemplated: true,
          component: createElement(ProMomentCard, {
            trigger: 'barcode_limit',
            onUpgrade: openCheckout,
            onDismiss: () => {},
          }),
        })
        return
      }
      addAgentMessage('Barcode scanner coming soon.', { isTemplated: true })
    } catch {
      addAgentMessage('Barcode scanner coming soon.', { isTemplated: true })
    }
  }, [addAgentMessage, openCheckout])

  return { handleFoodInput, handleBarcodeIntent }
}
