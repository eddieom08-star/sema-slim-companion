import type { FoodResult } from './foodVariance'

interface NutritionCardProps {
  food: FoodResult
  quantity: number
  onLog: () => void
  onEdit: () => void
}

export default function NutritionCard({ food, quantity, onLog, onEdit }: NutritionCardProps) {
  const cal = Math.round(Number(food.calories) * quantity)
  const protein = Math.round(Number(food.protein) * quantity)
  const carbs = Math.round(Number(food.carbs) * quantity)
  const fat = Math.round(Number(food.fat) * quantity)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 p-4 space-y-3 shadow-md hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{food.name}</p>
          {food.brand && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{food.brand}</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">
            {food.servingSize} {food.servingUnit}{quantity > 1 ? ` x${quantity}` : ''}
          </p>
        </div>
        <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">{cal} cal</span>
      </div>

      <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-300">
        <MacroPill label="Protein" value={protein} color="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" />
        <MacroPill label="Carbs" value={carbs} color="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" />
        <MacroPill label="Fat" value={fat} color="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onLog}
          className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow-md active:bg-blue-700 active:shadow-sm transition-shadow duration-200"
        >
          Log this
        </button>
        <button
          onClick={onEdit}
          className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 rounded-lg active:bg-gray-50"
        >
          Edit
        </button>
      </div>
    </div>
  )
}

function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label} {value}g
    </span>
  )
}
