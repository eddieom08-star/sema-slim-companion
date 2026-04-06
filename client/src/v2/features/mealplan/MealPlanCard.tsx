import { useState } from 'react'
import { ChevronDown, ChevronUp, Utensils } from 'lucide-react'

interface Meal {
  mealType: string
  name: string
  calories: number
  protein: number
  description: string
}

interface DayPlan {
  day: number
  dayName: string
  meals: Meal[]
}

interface MealPlanData {
  id?: string
  name: string
  days: DayPlan[]
  totalDailyCalories: number
  totalDailyProtein: number
}

interface MealPlanCardProps {
  plan: MealPlanData
  onSave?: () => void
  isSaved?: boolean
}

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
}

export default function MealPlanCard({ plan, onSave, isSaved }: MealPlanCardProps) {
  const [expandedDay, setExpandedDay] = useState<number | null>(0)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden w-full max-w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border-b border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          <Utensils className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-gray-900 truncate">{plan.name}</p>
        </div>
        <p className="text-[10px] text-gray-500 mt-0.5">
          ~{plan.totalDailyCalories} cal &middot; ~{plan.totalDailyProtein}g protein per day
        </p>
      </div>

      {/* Days */}
      <div className="divide-y divide-gray-50">
        {plan.days.map((day) => (
          <div key={day.day}>
            <button
              onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full w-6 h-6 flex items-center justify-center">
                  {day.day}
                </span>
                <span className="text-xs font-medium text-gray-800">{day.dayName}</span>
              </div>
              {expandedDay === day.day
                ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              }
            </button>
            {expandedDay === day.day && (
              <div className="px-4 pb-3 space-y-2">
                {day.meals.map((meal, i) => (
                  <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2 overflow-hidden">
                    <span className="text-sm mt-0.5 flex-shrink-0">{MEAL_EMOJI[meal.mealType] || '🍽'}</span>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-xs font-medium text-gray-800 capitalize">{meal.mealType}</p>
                      <p className="text-xs text-gray-600 break-words">{meal.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {meal.calories} cal &middot; {meal.protein}g protein
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      {onSave && (
        <div className="px-4 py-3 border-t border-gray-100">
          <button
            onClick={onSave}
            disabled={isSaved}
            className={`w-full text-xs font-medium py-2 rounded-xl transition-colors ${
              isSaved
                ? 'bg-gray-100 text-gray-400'
                : 'bg-emerald-600 text-white active:bg-emerald-700'
            }`}
          >
            {isSaved ? 'Plan saved' : 'Save this plan'}
          </button>
        </div>
      )}
    </div>
  )
}
