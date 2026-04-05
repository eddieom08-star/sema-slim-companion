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

const SUB_ACTIONS: Record<string, { label: string; send: string }[]> = {
  'Log food': [
    { label: 'Add food', send: 'Log a meal' },
    { label: 'Barcode scan', send: 'Scan barcode' },
    { label: 'Appetite & Satiety intel', send: 'How am I doing with appetite' },
    { label: 'Log appetite', send: 'Log my appetite level' },
  ],
  'Log my dose': [
    { label: 'Quick log', send: 'Log my dose now' },
    { label: 'Detailed log', send: 'Change dose' },
    { label: 'Side effect log', send: 'I have a side effect' },
  ],
  'Need a recipe': [
    { label: 'Generate instant recipe', send: 'Generate a recipe' },
    { label: 'Saved recipes', send: 'My saved recipes' },
    { label: 'Scan receipt', send: 'Scan receipt' },
  ],
  'Log my weight': [
    { label: 'Log weight', send: 'I weighed myself' },
    { label: 'Weight progress', send: 'Weight trend' },
  ],
}

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

  // Mark welcomed once dashboard loads (no message — empty state IS the welcome)
  useEffect(() => {
    if (!hasWelcomed && dashboard) {
      setHasWelcomed(true)
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
    // Parent action -> show sub-actions
    const subActions = SUB_ACTIONS[text]
    if (subActions) {
      addUserMessage(text)
      addAgentMessage('What would you like to do?', {
        isTemplated: true,
        suggestions: subActions.map(a => a.label),
      })
      return
    }

    // Sub-action label -> route to correct intent
    for (const actions of Object.values(SUB_ACTIONS)) {
      const match = actions.find(a => a.label === text)
      if (match) {
        addUserMessage(text)
        const intent = classifyIntent(match.send)
        await dispatchIntent(intent, text)
        return
      }
    }

    addUserMessage(text)
    const intent = classifyIntent(text)

    if (intent === 'general') {
      // Escalate to Haiku classify
      try {
        const res = await apiRequest('POST', '/api/v2/classify', { text })
        const data = await res.json()
        await dispatchIntent(data.intent ?? 'general', text, data.entities)
      } catch {
        addAgentMessage("I didn't catch that — could you rephrase?", {
          isTemplated: true,
          suggestions: getContextualChips(userContext),
        })
      }
    } else {
      await dispatchIntent(intent, text)
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
    <div className="relative w-full" style={{ height: '100dvh' }}>
      {/* Fixed status bar strip for Dynamic Island */}
      <div className="fixed top-0 left-0 right-0 z-[80] bg-gradient-to-r from-blue-500 to-purple-600"
           style={{ height: 'env(safe-area-inset-top, 48px)' }} />
      {/* Panel outside overflow-hidden container */}
      <HealthPanel userInitials={initials} />
      {/* Main content */}
      <div className="flex flex-col w-full h-full overflow-hidden bg-white dark:bg-gray-900 touch-pan-y">
        <HeaderStats
          userContext={userContext}
          userInitials={initials}
          onMenuOpen={() => panel.setIsOpen(true)}
          onDoseTap={() => handleSend('Log my dose')}
          onHungerTap={() => handleSend('Log my hunger level')}
          onCalorieTap={() => handleSend('Show my food today')}
        />
        <ChatArea messages={state.messages} onSuggestionTap={handleSend} />
        <InputBar onSend={handleSend} onCamera={async () => {
          try {
            const { Camera: CapCamera, CameraResultType, CameraSource } = await import('@capacitor/camera')
            const photo = await CapCamera.getPhoto({
              quality: 80,
              allowEditing: false,
              resultType: CameraResultType.Base64,
              source: CameraSource.Camera,
            })
            if (photo.base64String) {
              addAgentMessage('Analyzing your receipt...', { isTemplated: true })
              try {
                const res = await apiRequest('POST', '/api/v2/scan-receipt', { image: photo.base64String })
                const data = await res.json()
                if (data.items?.length) {
                  for (const item of data.items) {
                    await handleFoodInput(item.food_name)
                  }
                } else {
                  addAgentMessage('No food items found in the image. Try a clearer photo or tell me what you ate.', {
                    isTemplated: true,
                    suggestions: ['Log a meal manually', 'Try again'],
                  })
                }
              } catch {
                addAgentMessage('Failed to scan the receipt. Try again or log manually.', {
                  isTemplated: true,
                  suggestions: ['Log a meal manually'],
                })
              }
            }
          } catch (e: any) {
            if (e?.message?.includes('User cancelled')) return
            addAgentMessage('Camera is not available right now.', { isTemplated: true })
          }
        }} />
      </div>
    </div>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
