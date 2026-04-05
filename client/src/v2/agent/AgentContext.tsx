import { createContext, useContext, useState, useCallback, type PropsWithChildren } from 'react'
import type { Message, Intent, ActionButton } from './types'
import type { ReactNode } from 'react'

interface ConversationState {
  messages: Message[]
  activeFlow: Intent | null
  flowStep: number
  pendingData: Record<string, unknown>
}

interface AgentContextValue {
  state: ConversationState
  addUserMessage: (content: string) => void
  addAgentMessage: (content: string, opts?: {
    suggestions?: string[]
    actions?: ActionButton[]
    component?: ReactNode
    isTemplated?: boolean
  }) => void
  clearMessages: () => void
  setActiveFlow: (intent: Intent | null) => void
  advanceStep: () => void
  resetFlow: () => void
  updatePendingData: (key: string, value: unknown) => void
}

const AgentContext = createContext<AgentContextValue | null>(null)

export function AgentProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<ConversationState>({
    messages: [], activeFlow: null, flowStep: 0, pendingData: {},
  })

  const addUserMessage = useCallback((content: string) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, {
        id: crypto.randomUUID(), role: 'user', content, timestamp: new Date(),
      }],
    }))
  }, [])

  const addAgentMessage = useCallback((content: string, opts?: {
    suggestions?: string[]; actions?: ActionButton[]; component?: ReactNode; isTemplated?: boolean
  }) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, {
        id: crypto.randomUUID(), role: 'agent', content, timestamp: new Date(), ...opts,
      }],
    }))
  }, [])

  const clearMessages = useCallback(() => {
    setState({ messages: [], activeFlow: null, flowStep: 0, pendingData: {} })
  }, [])

  const setActiveFlow = useCallback((intent: Intent | null) => {
    setState(prev => ({ ...prev, activeFlow: intent, flowStep: 0, pendingData: {} }))
  }, [])

  const advanceStep = useCallback(() => {
    setState(prev => ({ ...prev, flowStep: prev.flowStep + 1 }))
  }, [])

  const resetFlow = useCallback(() => {
    setState(prev => ({ ...prev, activeFlow: null, flowStep: 0, pendingData: {} }))
  }, [])

  const updatePendingData = useCallback((key: string, value: unknown) => {
    setState(prev => ({ ...prev, pendingData: { ...prev.pendingData, [key]: value } }))
  }, [])

  return (
    <AgentContext.Provider value={{
      state, addUserMessage, addAgentMessage, clearMessages,
      setActiveFlow, advanceStep, resetFlow, updatePendingData,
    }}>
      {children}
    </AgentContext.Provider>
  )
}

export function useAgent() {
  const ctx = useContext(AgentContext)
  if (!ctx) throw new Error('useAgent must be within AgentProvider')
  return ctx
}
