import { useEffect, useState, useRef } from 'react'
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
    { label: 'Photo of ingredients', send: '__recipe_photo__' },
    { label: 'Snap a receipt', send: '__recipe_camera__' },
    { label: 'Saved recipes', send: 'My saved recipes' },
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
  const { state, addUserMessage, addAgentMessage, clearMessages, setActiveFlow } = useAgent()
  const { handleFoodInput, handleBarcodeIntent } = useFoodFlow()
  const { checkAndAlertOverdue, quickLog, handleSideEffectMention, handleSeverityInput } = useMedicationFlow()
  const { handleGenerateRecipe, handleSavedRecipes, handleRecipeFromImage } = useRecipesFlow()
  const { handleWeightInput } = useWeightFlow()
  const { handleTrendsRequest } = useTrendsFlow()
  const panel = useHealthPanel()
  const { user, userId } = useAuth()
  const { isPro } = useSubscription()
  const [hasWelcomed, setHasWelcomed] = useState(false)
  const [awaitingInput, setAwaitingInput] = useState<'food' | 'weight' | 'appetite' | 'side_effect' | null>(null)
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

  // Overdue medication status is shown in HeaderStats cards (Dose → "Overdue").
  // Don't auto-add chat messages — keep the empty state clean until user interacts.

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

  const captureRecipeImage = async (source: 'Photos' | 'Camera') => {
    try {
      const { Camera: CapCamera, CameraResultType, CameraSource } = await import('@capacitor/camera')
      const photo = await CapCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: source === 'Camera' ? CameraSource.Camera : CameraSource.Photos,
      })
      if (photo.base64String) {
        addUserMessage(source === 'Camera' ? 'Snap a receipt' : 'Photo of ingredients')
        await handleRecipeFromImage(photo.base64String)
      }
    } catch (e: any) {
      if (e?.message?.includes('User cancelled')) return
      addAgentMessage('Camera is not available right now.', { isTemplated: true })
    }
  }

  // ── FOLLOWUP_LABELS: suggestion buttons that need direct handling (zero API cost)
  const FOLLOWUP_LABELS: Record<string, () => void> = {
    'Done': () => {
      addAgentMessage('All logged. Anything else?', {
        isTemplated: true, suggestions: getContextualChips(userContext),
      })
    },
    'Feeling good': () => {
      addAgentMessage('Great — no side effects logged. Keep it up.', {
        isTemplated: true, suggestions: getContextualChips(userContext),
      })
    },
    'Skip': () => {
      addAgentMessage('No worries. What else can I help with?', {
        isTemplated: true, suggestions: getContextualChips(userContext),
      })
    },
    'Log another symptom': () => {
      addAgentMessage('What are you experiencing?', {
        isTemplated: true,
        suggestions: ['Some nausea', 'Tired today', 'Injection site sore', 'Headache', 'Constipation', 'Heartburn'],
      })
    },
    'Try again': () => {
      addAgentMessage('What would you like to try?', {
        isTemplated: true, suggestions: getContextualChips(userContext),
      })
    },
    'Generate another': () => { handleGenerateRecipe() },
    'Something different': () => { handleGenerateRecipe('something different, surprise me') },
    'Update my dosage': () => {
      addAgentMessage('What is your new dose? (e.g. "0.5mg", "1mg")', { isTemplated: true })
    },
    'Go to settings': () => {
      addAgentMessage('Tap your avatar in the top right to open settings.', { isTemplated: true })
    },
    'Add notes to last dose': () => {
      addAgentMessage('Tell me about your dose — what medication, dosage, and any notes?', { isTemplated: true })
    },
  }

  // ── Resolve a sub-action label to its intent (zero API cost shortcut)
  const findSubAction = (text: string) => {
    for (const actions of Object.values(SUB_ACTIONS)) {
      const match = actions.find(a => a.label === text)
      if (match) return match
    }
    return null
  }

  // ── Classify text → intent, with Haiku fallback for unknown
  const classify = async (text: string): Promise<{ intent: string; entities?: Record<string, string | null> }> => {
    const intent = classifyIntent(text)
    if (intent !== 'general') return { intent }
    try {
      const res = await apiRequest('POST', '/api/v2/classify', { text })
      const data = await res.json()
      return { intent: data.intent ?? 'general', entities: data.entities }
    } catch {
      return { intent: 'general' }
    }
  }

  const handleSend = async (text: string) => {
    // ─── LAYER 1: Structured taps (buttons, pills, suggestions) ───
    // These always cancel any pending input prompt and route directly.

    // Camera/gallery shortcuts
    if (text === '__recipe_photo__' || text === 'Photo of ingredients') { setAwaitingInput(null); await captureRecipeImage('Photos'); return }
    if (text === '__recipe_camera__' || text === 'Snap a receipt') { setAwaitingInput(null); await captureRecipeImage('Camera'); return }

    // Parent quick action → show sub-menu
    const subActions = SUB_ACTIONS[text]
    if (subActions) {
      setAwaitingInput(null)
      addUserMessage(text)
      addAgentMessage('What would you like to do?', {
        isTemplated: true,
        suggestions: subActions.map(a => a.label),
      })
      return
    }

    // Sub-action label → route via its send text
    const subAction = findSubAction(text)
    if (subAction) {
      setAwaitingInput(null)
      if (subAction.send.startsWith('__recipe_')) {
        if (subAction.send === '__recipe_photo__') { await captureRecipeImage('Photos'); return }
        if (subAction.send === '__recipe_camera__') { await captureRecipeImage('Camera'); return }
      }
      addUserMessage(text)
      const { intent, entities } = await classify(subAction.send)
      await dispatchIntent(intent, subAction.send, entities)
      return
    }

    // Follow-up suggestion button → handle directly
    const followup = FOLLOWUP_LABELS[text]
    if (followup) {
      setAwaitingInput(null)
      addUserMessage(text)
      followup()
      return
    }

    // ─── LAYERS 2+3: Free text — classify first, then decide ───
    addUserMessage(text)

    // Always classify (keyword only — free, instant)
    const keywordIntent = classifyIntent(text)

    // If keywords found a clear intent, the user changed topic — cancel any pending flow
    if (keywordIntent !== 'general') {
      setAwaitingInput(null)
      await dispatchIntent(keywordIntent, text)
      return
    }

    // No keyword match — if a flow is waiting for input, route the answer there
    if (awaitingInput) {
      const pending = awaitingInput
      setAwaitingInput(null)
      switch (pending) {
        case 'food':
          await handleFoodInput(text)
          return
        case 'weight':
          await handleWeightInput(text)
          return
        case 'appetite': {
          const level = text.match(/\d/)?.[0] ? parseInt(text.match(/\d/)![0]) : 5
          try {
            await apiRequest('POST', '/api/hunger-logs', { hungerBefore: level, loggedAt: new Date().toISOString() })
            const tip = level <= 3 ? 'Try a high-protein snack to help with hunger.'
              : level <= 6 ? 'Moderate appetite is normal on GLP-1 medication.'
              : 'Feeling satisfied — your medication is working well.'
            addAgentMessage(`Logged hunger level ${level}/10. ${tip}`, {
              isTemplated: true, suggestions: ['Log a meal', 'How am I doing?'],
            })
          } catch {
            addAgentMessage('Failed to log appetite. Try again.', { isTemplated: true })
          }
          return
        }
        case 'side_effect':
          if (/^\d/.test(text.trim())) {
            await handleSeverityInput(text)
            return
          }
          break // not a number — fall through to Haiku
      }
    }

    // No keyword match, no pending flow (or side_effect didn't match) — escalate to Haiku
    const { intent, entities } = await classify(text)
    await dispatchIntent(intent, text, entities)
  }

  const dispatchIntent = async (intent: string, text: string, entities?: Record<string, string | null>) => {
    setActiveFlow(intent as any)
    switch (intent) {
      case 'food.search': {
        const genericTriggers = ['log a meal', 'log meal', 'log food', 'add food']
        if (genericTriggers.includes(text.toLowerCase().trim())) {
          setAwaitingInput('food')
          addAgentMessage('What did you have? e.g. "eggs and toast" or "chicken salad"', {
            isTemplated: true,
          })
        } else {
          await handleFoodInput(text, entities as any)
        }
        break
      }
      case 'food.barcode':
        await handleBarcodeIntent()
        break
      case 'food.appetite':
        setAwaitingInput('appetite')
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
        handleSideEffectMention(text, () => setAwaitingInput('side_effect'))
        break
      case 'recipe.generate':
        await handleGenerateRecipe()
        break
      case 'recipe.saved':
        await handleSavedRecipes()
        break
      case 'weight.log': {
        const { parseWeightFromText } = await import('@/v2/features/weight/weightParser')
        if (parseWeightFromText(text)) {
          await handleWeightInput(text)
        } else {
          setAwaitingInput('weight')
          addAgentMessage("What's your weight? e.g. '94kg', '210lbs', or '14st 8'", {
            isTemplated: true,
          })
        }
        break
      }
      case 'weight.progress':
        await handleTrendsRequest('weight')
        break
      case 'trends.general':
        await handleTrendsRequest('weight')
        break
      case 'medication.detailed':
        addAgentMessage('What would you like to update?', {
          isTemplated: true,
          suggestions: ['Update my dosage', 'Go to settings', 'Add notes to last dose'],
        })
        break
      case 'recipe.receipt':
        addAgentMessage('Take a photo of your receipt or ingredients and I\'ll create a recipe:', {
          isTemplated: true,
          suggestions: ['Photo of ingredients', 'Snap a receipt'],
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
    <div className="relative w-full max-w-[100vw] overflow-hidden" style={{ height: '100dvh' }}>
      {/* Fixed status bar strip for Dynamic Island */}
      <div className="fixed top-0 left-0 right-0 z-[80] bg-gradient-to-r from-blue-500 to-purple-600"
           style={{ height: 'env(safe-area-inset-top, 48px)' }} />
      {/* Panel outside overflow-hidden container */}
      <HealthPanel userInitials={initials} />
      {/* Main content */}
      <div className="flex flex-col w-full max-w-[100vw] h-full overflow-hidden overflow-x-hidden bg-white dark:bg-gray-900 touch-pan-y">
        <HeaderStats
          userContext={userContext}
          userInitials={initials}
          onMenuOpen={() => panel.setIsOpen(true)}
          onDoseTap={() => handleSend('Log my dose')}
          onHungerTap={() => handleSend('Log my hunger level')}
          onCalorieTap={() => handleSend('Show my food today')}
        />
        <ChatArea messages={state.messages} onSuggestionTap={handleSend} onClear={() => { setAwaitingInput(null); clearMessages() }} />
        {/* Persistent quick action pills — always visible above input */}
        <div className="flex-shrink-0 px-3 py-2 bg-white dark:bg-gray-900 flex gap-2 overflow-x-auto w-full">
          {[
            { label: 'Log food', emoji: '🍽' },
            { label: 'Log my dose', emoji: '💊' },
            { label: 'Log my weight', emoji: '⚖️' },
            { label: 'Need a recipe', emoji: '👨‍🍳' },
          ].map(({ label, emoji }) => (
            <button
              key={label}
              onClick={() => handleSend(label)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs text-gray-700 dark:text-gray-300 active:bg-gray-200 transition-colors"
            >
              <span>{emoji}</span>
              {label}
            </button>
          ))}
        </div>
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
              setAwaitingInput(null)
              addUserMessage('Scan my food')
              addAgentMessage('Scanning...', { isTemplated: true })
              try {
                const res = await apiRequest('POST', '/api/v2/scan-receipt', { image: photo.base64String })
                const data = await res.json()
                if (data.items?.length) {
                  for (const item of data.items) {
                    await handleFoodInput(item.food_name)
                  }
                } else {
                  addAgentMessage('No food items found. Try a clearer photo or tell me what you ate.', {
                    isTemplated: true,
                    suggestions: ['Log a meal', 'Need a recipe'],
                  })
                }
              } catch {
                addAgentMessage('Failed to scan. Try again or tell me what you ate.', {
                  isTemplated: true,
                  suggestions: ['Log a meal'],
                })
              }
            }
          } catch (e: any) {
            if (e?.message?.includes('User cancelled')) return
            addAgentMessage('Camera is not available.', { isTemplated: true })
          }
        }} />
      </div>
    </div>
  )
}

