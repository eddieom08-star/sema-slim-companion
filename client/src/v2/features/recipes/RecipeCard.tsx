import { useState } from 'react'
import { ChevronDown, ChevronUp, Bookmark } from 'lucide-react'

interface Ingredient { name: string; quantity: string; unit: string }
interface Recipe {
  id?: string; name: string; prepTime: number; cookTime: number
  servings: number; ingredients: Ingredient[]; instructions: string
  calories: number; protein: number; carbs: number; fat: number; tags?: string[]
}

interface RecipeCardProps {
  recipe: Recipe
  onSave: () => void
  isSaved?: boolean
}

export default function RecipeCard({ recipe, onSave, isSaved }: RecipeCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-3">
        <p className="text-white font-semibold text-sm">{recipe.name}</p>
        <p className="text-white/70 text-[10px] mt-0.5">
          Prep {recipe.prepTime}min · Cook {recipe.cookTime}min · {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Macros */}
      <div className="grid grid-cols-4 gap-0 border-b border-gray-100">
        {[
          { label: 'Cal', value: recipe.calories },
          { label: 'Protein', value: `${recipe.protein}g` },
          { label: 'Carbs', value: `${recipe.carbs}g` },
          { label: 'Fat', value: `${recipe.fat}g` },
        ].map(m => (
          <div key={m.label} className="text-center py-2.5 border-r last:border-r-0 border-gray-100">
            <p className="text-xs font-semibold text-gray-900">{m.value}</p>
            <p className="text-[10px] text-gray-400">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Expandable ingredients */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-500 font-medium"
      >
        <span>Ingredients ({recipe.ingredients.length})</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {expanded && (
        <div className="px-4 pb-2 space-y-1">
          {recipe.ingredients.map((ing, i) => (
            <p key={i} className="text-xs text-gray-700">
              {ing.quantity} {ing.unit} {ing.name}
            </p>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 px-4 py-3 border-t border-gray-100">
        <button onClick={onSave} className="flex items-center gap-1.5 text-xs text-gray-500 font-medium border border-gray-200 rounded-full px-3 py-1.5">
          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-gray-900 text-gray-900' : ''}`} />
          {isSaved ? 'Saved' : 'Save recipe'}
        </button>
      </div>
    </div>
  )
}
