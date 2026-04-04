import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/queryClient'
import { useAgent } from '@/v2/agent/AgentContext'
import { useHealthPanel } from '@/v2/agent/HealthPanelContext'
import { classifyIntent, getContextualChips } from '@/v2/agent/agentRouter'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { useFoodFlow } from '@/v2/features/food/useFoodFlow'
import { useMedicationFlow } from '@/v2/features/medication/useMedicationFlow'
import { useRecipesFlow } from '@/v2/features/recipes/useRecipesFlow'
import { useWeightFlow } from '@/v2/features/weight/useWeightFlow'
import { useTrendsFlow } from '@/v2/features/trends/useTrendsFlow'
import { useTrialBanner } from '@/v2/monetisation/TrialBanner'
import HeaderStats from './HeaderStats'
import ChatArea from './ChatArea'
import InputBar from './InputBar'
import HealthPanel from './HealthPanel'
import type { UserContext } from '@/v2/agent/types'

export default function AgentShell() {
  return <AgentShellInner />
}

function AgentShellInner() {
  const { state, addUserMessage, addAgentMessage, setActiveFlow } = useAgent()
  const { handleFoodInput, handleBarcodeIntent } = useFoodFlow()
  const { checkAndAlertOverdue, quickLog, handleSideEffectMention, handleSeverityInput, activeSideEffect } = useMedicationFlow()
  const { handleGenerateRecipe, handleSavedRecipes } = useRecipesFlow()
  const { handleWeightInput } = useWeightFlow()
  const { handleTrendsRequest } = useTrendsFlow()
  const panel = useHealthPanel()
  const { user, userId } = useAuth()
  const { isPro } = useSubscription()
  const [hasWelcomed, setHasWelcomed] = useState(false)
  useTrialBanner()

  const initials = [
    (user as any)?.firstName?.[0],
    (user as any)?.lastName?.[0],
  ].filter(Boolean).join('') || 'U'

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiRequest('GET', '/api/dashboard').then(r => r.json()),
    staleTime: 60 * 1000,
  })

  const { data: medications } = useQuery({
    queryKey: ['medications'],
    queryFn: () => apiRequest('GET', '/api/medications').then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  })

  // Build UserContext from dashboard data
  const userContext: UserContext = {
    medicationType: dashboard?.medicationType ?? null,
    dosage: dashboard?.dosage ?? null,
    medicationStatus: dashboard?.medicationStatus ?? 'unknown',
    lastDoseLabel: dashboard?.lastDoseLabel ?? '',
    hungerLevel: dashboard?.avgHungerLevel ?? null,
    todayCalories: dashboard?.todayCalories ?? 0,
    subscriptionTier: isPro ? 'pro' : 'free',
    userId: userId ?? '',
  }

  // Welcome message on mount
  useEffect(() => {
    if (!hasWelcomed && dashboard) {
      setHasWelcomed(true)
      const chips = getContextualChips(userContext)
      const calStr = dashboard.todayCalories > 0
        ? ` You've logged ${dashboard.todayCalories} calories today.`
        : ''
      addAgentMessage(
        `Good ${getTimeOfDay()}!${calStr} How can I help?`,
        { isTemplated: true, suggestions: chips }
      )
    }
  }, [dashboard, hasWelcomed])

  // Check overdue medication after welcome
  useEffect(() => {
    if (hasWelcomed && medications?.length) {
      checkAndAlertOverdue(medications)
    }
  }, [hasWelcomed, medications])

  // Edge swipe to open panel
  useEffect(() => {
    let startX = 0
    const ts = (e: TouchEvent) => { startX = e.touches[0].clientX }
    const te = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX
      if (startX < 20 && dx > 60) panel.setIsOpen(true)
    }
    window.addEventListener('touchstart', ts, { passive: true })
    window.addEventListener('touchend', te, { passive: true })
    return () => {
      window.removeEventListener('touchstart', ts)
      window.removeEventListener('touchend', te)
    }
  }, [panel.isOpen])

  const handleSend = async (text: string) => {
    addUserMessage(text)
    const intent = classifyIntent(text)

    if (intent === 'general') {
      // Escalate to Haiku classify
      try {
        const res = await apiRequest('POST', '/api/v2/classify', { text })
        const data = await res.json()
        dispatchIntent(data.intent ?? 'general', text, data.entities)
      } catch {
        dispatchIntent('general', text)
      }
    } else {
      dispatchIntent(intent, text)
    }
  }

  const dispatchIntent = async (intent: string, text: string, entities?: Record<string, string | null>) => {
    // If we're awaiting severity input (activeSideEffect is set), intercept numeric replies
    if (activeSideEffect && /^\d/.test(text.trim())) {
      await handleSeverityInput(text)
      return
    }

    setActiveFlow(intent as any)
    switch (intent) {
      case 'food.search':
        await handleFoodInput(text, entities as any)
        break
      case 'food.barcode':
        await handleBarcodeIntent()
        break
      case 'food.appetite':
        addAgentMessage('How hungry are you feeling right now? Rate from 1-10:', {
          isTemplated: true,
          suggestions: ['1-3 Very hungry', '4-6 Moderate', '7-10 Satisfied'],
        })
        break
      case 'medication.quick_log':
        if (medications?.[0]) await quickLog(medications[0])
        else addAgentMessage('No medication configured yet.', { isTemplated: true })
        break
      case 'medication.side_effect':
        handleSideEffectMention(text)
        break
      case 'recipe.generate':
        await handleGenerateRecipe()
        break
      case 'recipe.saved':
        await handleSavedRecipes()
        break
      case 'weight.log':
        await handleWeightInput(text)
        break
      case 'weight.progress':
        await handleTrendsRequest('weight')
        break
      case 'trends.general':
        await handleTrendsRequest('weight')
        break
      case 'medication.detailed':
        addAgentMessage('What would you like to update?', {
          isTemplated: true,
          suggestions: ['Change my dose', 'Switch medication', 'Log a detailed entry'],
        })
        break
      case 'recipe.receipt':
        addAgentMessage('Receipt scanning is coming soon! For now, I can help you:', {
          isTemplated: true,
          suggestions: ['Log a meal manually', 'Generate a recipe', 'Show saved recipes'],
        })
        break
      default:
        addAgentMessage("I'm not sure how to help with that yet. Try one of these:", {
          isTemplated: true,
          suggestions: getContextualChips(userContext),
        })
    }
  }

  return (
    <div className="flex flex-col w-full max-w-full overflow-hidden bg-white dark:bg-gray-900 relative touch-pan-y" style={{ height: '100dvh' }}>
      <HealthPanel userInitials={initials} />
      <HeaderStats
        userContext={userContext}
        userInitials={initials}
        onMenuOpen={() => panel.setIsOpen(true)}
        onDoseTap={() => handleSend('Log my dose')}
        onHungerTap={() => handleSend('Log my hunger level')}
        onCalorieTap={() => handleSend('Show my food today')}
      />
      <ChatArea messages={state.messages} onSuggestionTap={handleSend} />
      <InputBar onSend={handleSend} onCamera={() => {
        addAgentMessage('Camera coming soon.', { isTemplated: true })
      }} />
    </div>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
