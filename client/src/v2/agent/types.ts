import type { ReactNode } from 'react'

export type Intent =
  | 'food.search' | 'food.barcode' | 'food.appetite'
  | 'medication.quick_log' | 'medication.detailed' | 'medication.side_effect'
  | 'recipe.generate' | 'recipe.saved' | 'recipe.receipt'
  | 'weight.log' | 'weight.progress'
  | 'trends.general' | 'general'
  | 'export.data' | 'mealplan.generate'

export interface ActionButton {
  label: string
  icon?: ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export interface Message {
  id: string
  role: 'agent' | 'user'
  content: string
  suggestions?: string[]
  actions?: ActionButton[]
  component?: ReactNode
  timestamp: Date
  isTemplated?: boolean
}

export interface UserContext {
  medicationType: string | null
  dosage: string | null
  medicationStatus: 'overdue' | 'due-today' | 'on-track' | 'unknown'
  lastDoseLabel: string
  hungerLevel: number | null
  todayCalories: number
  currentWeight: number | null
  targetWeight: number | null
  startDate: string | null
  subscriptionTier: 'free' | 'pro'
  userId: string
}

export interface APIMessage {
  role: 'user' | 'assistant'
  content: string
}
