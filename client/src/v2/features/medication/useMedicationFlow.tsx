import { useState, useCallback } from 'react'
import { useAgent } from '@/v2/agent/AgentContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { apiRequest } from '@/lib/queryClient'
import ProMomentCard from '@/v2/monetisation/ProMomentCard'

const FIELD_MAP: Record<string, string> = {
  'some nausea': 'nausea', 'nausea': 'nausea',
  'vomiting': 'vomiting', 'threw up': 'vomiting',
  'tired today': 'notes', 'injection site sore': 'notes', 'headache': 'notes',
  'constipation': 'constipation', 'heartburn': 'heartburn',
}

const TIPS: Record<string, string> = {
  nausea: 'Try small slow meals, avoid fatty food, stay hydrated. Mention to your prescriber if it continues.',
  vomiting: 'Rest and hydrate. Don\'t take your next dose until settled. Contact your prescriber if it continues.',
  constipation: 'Increase fibre and water. Light walking helps. Speak to your pharmacist if it continues.',
  heartburn: 'Avoid late meals. Elevate your head when sleeping. Antacids may help short-term.',
  notes: 'Noted — worth mentioning at your next appointment.',
}

export function useMedicationFlow() {
  const { addAgentMessage } = useAgent()
  const { isPro, openCheckout, purchaseTokens } = useSubscription()
  const [lastLogId, setLastLogId] = useState<string | null>(null)
  const [activeSideEffect, setActiveSideEffect] = useState<string | null>(null)

  const checkAndAlertOverdue = useCallback(async (medications: any[]) => {
    if (!medications?.length) return
    const med = medications[0]
    if (!med.nextDueDate) return
    const due = new Date(med.nextDueDate)
    if (due >= new Date()) return

    const hoursOverdue = Math.round((Date.now() - due.getTime()) / 3600000)
    const label = hoursOverdue < 24
      ? `${hoursOverdue}h ago`
      : `${Math.round(hoursOverdue / 24)} day${Math.round(hoursOverdue / 24) > 1 ? 's' : ''} ago`

    addAgentMessage(
      `Your ${med.medicationType || 'GLP-1'} ${med.dosage || ''} dose was due ${label}.`,
      {
        isTemplated: true,
        suggestions: ['Log it now', 'I took it earlier', 'Remind me later'],
        actions: [{
          label: 'Quick log dose',
          onClick: () => quickLog(med),
        }]
      }
    )
  }, [addAgentMessage])

  const quickLog = useCallback(async (medication: any) => {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

    try {
      const res = await apiRequest('POST', '/api/medication-logs', {
        medicationId: medication.id,
        takenAt: now.toISOString(),
        dosage: medication.dosage,
        notes: '',
      })
      const data = await res.json()
      setLastLogId(data.id)

      addAgentMessage(
        `Done. Logged your ${medication.dosage || ''} ${medication.medicationType || 'dose'} at ${timeStr}. Any side effects today?`,
        {
          isTemplated: true,
          suggestions: ['Feeling good', 'Some nausea', 'Tired today', 'Injection site sore', 'Headache']
        }
      )
    } catch {
      addAgentMessage('Failed to log your dose. Check your connection and try again.', {
        isTemplated: true, suggestions: ['Try again'],
      })
    }
  }, [addAgentMessage])

  const handleSideEffectMention = useCallback((sideEffect: string) => {
    if (sideEffect === 'Feeling good' || sideEffect === 'No issues') {
      addAgentMessage('Great — no side effects logged. Keep it up.', { isTemplated: true })
      return
    }
    setActiveSideEffect(sideEffect)
    addAgentMessage(
      `How bad is the ${sideEffect.toLowerCase()}? (1–5)`,
      {
        isTemplated: true,
        suggestions: ['1 – barely noticeable', '2 – mild', '3 – moderate', '4 – quite bad', '5 – severe']
      }
    )
  }, [addAgentMessage])

  const handleSeverityInput = useCallback(async (text: string) => {
    const numMatch = text.match(/^(\d)/)
    const severity = numMatch ? parseInt(numMatch[1]) : null
    if (!severity || severity < 1 || severity > 5) {
      addAgentMessage('Just reply with a number from 1 to 5.', { isTemplated: true })
      return
    }

    const field = activeSideEffect ? FIELD_MAP[activeSideEffect.toLowerCase()] : 'notes'

    if (lastLogId && field && field !== 'notes') {
      try {
        await apiRequest('PATCH', `/api/medication-logs/${lastLogId}`, { [field]: severity })
      } catch { /* non-critical */ }
    }

    const tip = TIPS[field || 'notes'] || TIPS.notes
    const nextSuggestions = severity >= 4
      ? ['Share with doctor', 'Log another symptom', 'Done']
      : ['Log another symptom', 'Done']

    addAgentMessage(tip, { isTemplated: true, suggestions: nextSuggestions })

    if (severity >= 4 && !isPro) {
      addAgentMessage('With that severity, it\'s worth sharing with your prescriber.', {
        isTemplated: true,
        component: (
          <ProMomentCard
            trigger="pdf_export"
            onUpgrade={openCheckout}
            onBuyTokens={purchaseTokens}
            onDismiss={() => {}}
          />
        )
      })
    }

    setActiveSideEffect(null)
  }, [lastLogId, activeSideEffect, addAgentMessage, isPro, openCheckout, purchaseTokens])

  return { checkAndAlertOverdue, quickLog, handleSideEffectMention, handleSeverityInput, lastLogId, activeSideEffect }
}
