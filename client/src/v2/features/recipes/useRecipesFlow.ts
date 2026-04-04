import { useCallback } from 'react'
import { createElement } from 'react'
import { useAgent } from '@/v2/agent/AgentContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { getApiBaseUrl } from '@/lib/queryClient'
import RecipeCard from './RecipeCard'
import SavedRecipesCarousel from './SavedRecipesCarousel'
import ProMomentCard from '@/v2/monetisation/ProMomentCard'

const API = getApiBaseUrl()

export function useRecipesFlow() {
  const { addAgentMessage } = useAgent()
  const { isPro, checkFeature, consumeFeature, openCheckout, purchaseTokens } = useSubscription()

  const handleGenerateRecipe = useCallback(async (preferences?: string) => {
    const gate = await checkFeature('ai_recipe', 1)

    if (!gate.allowed) {
      addAgentMessage('', {
        isTemplated: true,
        component: createElement(ProMomentCard, {
          trigger: 'recipe_limit',
          onUpgrade: openCheckout,
          onBuyTokens: purchaseTokens,
          onDismiss: () => {},
        }),
      })
      return
    }

    if (gate.remaining !== undefined && gate.remaining <= 3 && gate.remaining > 0) {
      addAgentMessage(
        `Generating a recipe — you have ${gate.remaining} left this month.`,
        { isTemplated: true }
      )
    }

    await consumeFeature('ai_recipe', 1)

    addAgentMessage('On it...', { isTemplated: true })

    try {
      const res = await fetch(`${API}/api/recipes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          preferences: preferences || 'high protein, easy to digest, GLP-1 friendly',
        }),
      })
      const recipe = await res.json()

      let saved = false
      const handleSave = async () => {
        if (recipe.id) {
          await fetch(`${API}/api/recipes/${recipe.id}/favorite`, {
            method: 'POST',
            credentials: 'include',
          })
          saved = true
          addAgentMessage('Saved! Find it in your saved recipes anytime.', { isTemplated: true })
        }
      }

      addAgentMessage("Here's one I think you'll like:", {
        isTemplated: true,
        component: createElement(RecipeCard, { recipe, onSave: handleSave, isSaved: saved }),
        suggestions: ['Generate another', 'Something different', 'Show saved recipes'],
      })
    } catch {
      addAgentMessage('Recipe generation failed. Try again in a moment.', { isTemplated: true })
    }
  }, [addAgentMessage, checkFeature, consumeFeature])

  const handleSavedRecipes = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/recipes/favorites`, { credentials: 'include' })
      const recipes = await res.json()

      if (!recipes.length) {
        addAgentMessage("You haven't saved any recipes yet. Want me to generate one?", {
          isTemplated: true,
          suggestions: ['Yes, generate a recipe'],
        })
        return
      }

      addAgentMessage('Your saved recipes:', {
        isTemplated: true,
        component: createElement(SavedRecipesCarousel, {
          recipes,
          isPro,
          onUpgrade: () => openCheckout('annual'),
        }),
      })
    } catch {
      addAgentMessage('Could not load saved recipes.', { isTemplated: true })
    }
  }, [addAgentMessage, isPro, openCheckout])

  return { handleGenerateRecipe, handleSavedRecipes }
}
