import { useCallback } from 'react'
import { createElement } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAgent } from '@/v2/agent/AgentContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { apiRequest } from '@/lib/queryClient'
import RecipeCard from './RecipeCard'
import SavedRecipesCarousel from './SavedRecipesCarousel'
import ProMomentCard from '@/v2/monetisation/ProMomentCard'

export function useRecipesFlow() {
  const { addAgentMessage } = useAgent()
  const { isPro, checkFeature, openCheckout, purchaseTokens } = useSubscription()
  const queryClient = useQueryClient()

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

    addAgentMessage('On it...', { isTemplated: true })

    try {
      const res = await apiRequest('POST', '/api/recipes/generate', {
          preferences: preferences || 'high protein, easy to digest, GLP-1 friendly',
        }, { timeout: 30000 })
      const recipe = await res.json()

      const handleSave = async () => {
        if (recipe.id) {
          try {
            await apiRequest('POST', `/api/recipes/${recipe.id}/favorite`)
            queryClient.invalidateQueries({ queryKey: ['recipes'] })
            addAgentMessage('Saved! Find it in your saved recipes anytime.', { isTemplated: true })
          } catch {
            addAgentMessage('Failed to save. Try again.', { isTemplated: true })
          }
        }
      }

      addAgentMessage("Here's one I think you'll like:", {
        isTemplated: true,
        component: createElement(RecipeCard, { recipe, onSave: handleSave, isSaved: false }),
        suggestions: ['Generate another', 'Something different', 'Show saved recipes'],
      })
    } catch {
      addAgentMessage('Recipe generation failed. Try again in a moment.', { isTemplated: true })
    }
  }, [addAgentMessage, checkFeature, openCheckout, purchaseTokens])

  const handleSavedRecipes = useCallback(async () => {
    try {
      const res = await apiRequest('GET', '/api/recipes/favorites')
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

  const handleRecipeFromImage = useCallback(async (base64: string) => {
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

    addAgentMessage('Scanning your photo for ingredients...', { isTemplated: true })

    try {
      const res = await apiRequest('POST', '/api/v2/recipe-from-image', { image: base64 }, { timeout: 30000 })
      const data = await res.json()

      if (data.error === 'no_ingredients') {
        addAgentMessage("I couldn't spot any ingredients in that photo. Try a clearer shot of your receipt or ingredients.", {
          isTemplated: true,
          suggestions: ['Try again', 'Generate a recipe instead'],
        })
        return
      }

      if (!data.recipe) {
        addAgentMessage('Failed to generate a recipe from that image. Try again.', { isTemplated: true })
        return
      }

      const handleImageSave = async () => {
        if (data.recipe.id) {
          try {
            await apiRequest('POST', `/api/recipes/${data.recipe.id}/favorite`)
            queryClient.invalidateQueries({ queryKey: ['recipes'] })
            addAgentMessage('Saved! Find it in your saved recipes anytime.', { isTemplated: true })
          } catch {
            addAgentMessage('Failed to save. Try again.', { isTemplated: true })
          }
        }
      }

      addAgentMessage(`Found ${data.ingredients.length} ingredients — here's what I came up with:`, {
        isTemplated: true,
        component: createElement(RecipeCard, { recipe: data.recipe, onSave: handleImageSave, isSaved: false }),
        suggestions: ['Generate another', 'Show saved recipes'],
      })
    } catch {
      addAgentMessage('Failed to process the image. Try again.', {
        isTemplated: true,
        suggestions: ['Try again', 'Generate a recipe instead'],
      })
    }
  }, [addAgentMessage, checkFeature, openCheckout, purchaseTokens])

  return { handleGenerateRecipe, handleSavedRecipes, handleRecipeFromImage }
}
