import { useState } from 'react'
import { ChevronDown, ChevronUp, Bookmark, Clock, Users } from 'lucide-react'

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
  const [showIngredients, setShowIngredients] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [saved, setSaved] = useState(isSaved ?? false)

  const handleSave = () => {
    setSaved(true)
    onSave()
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-3">
        <p className="text-white font-semibold text-sm">{recipe.name}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="flex items-center gap-1 text-white/70 text-[10px]">
            <Clock className="w-3 h-3" />
            {recipe.prepTime + recipe.cookTime}min
          </span>
          <span className="flex items-center gap-1 text-white/70 text-[10px]">
            <Users className="w-3 h-3" />
            {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Macros */}
      <div className="grid grid-cols-4 gap-0 border-b border-gray-100 dark:border-gray-700">
        {[
          { label: 'Cal', value: recipe.calories },
          { label: 'Protein', value: `${recipe.protein}g` },
          { label: 'Carbs', value: `${recipe.carbs}g` },
          { label: 'Fat', value: `${recipe.fat}g` },
        ].map(m => (
          <div key={m.label} className="text-center py-2.5 border-r last:border-r-0 border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{m.value}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Tags */}
      {recipe.tags && recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-2.5">
          {recipe.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 rounded-full text-[10px] font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Expandable ingredients */}
      <button
        onClick={() => setShowIngredients(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 font-medium"
      >
        <span>Ingredients ({recipe.ingredients.length})</span>
        {showIngredients ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {showIngredients && (
        <div className="px-4 pb-2 space-y-1">
          {recipe.ingredients.map((ing, i) => (
            <p key={i} className="text-xs text-gray-700 dark:text-gray-300">
              {ing.quantity} {ing.unit} {ing.name}
            </p>
          ))}
        </div>
      )}

      {/* Expandable instructions */}
      {recipe.instructions && (
        <>
          <button
            onClick={() => setShowInstructions(e => !e)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 font-medium border-t border-gray-100 dark:border-gray-700"
          >
            <span>Instructions</span>
            {showInstructions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showInstructions && (
            <div className="px-4 pb-3">
              {recipe.instructions.split(/\n|(?=\d+\.\s)/).filter(Boolean).map((step, i) => (
                <p key={i} className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 leading-relaxed">
                  {step.trim()}
                </p>
              ))}
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="flex gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={handleSave}
          disabled={saved}
          className="flex items-center gap-1.5 text-xs font-medium border border-gray-200 dark:border-gray-600 rounded-full px-3 py-1.5 text-gray-500 dark:text-gray-400 disabled:opacity-50"
        >
          <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-current text-purple-500' : ''}`} />
          {saved ? 'Saved' : 'Save recipe'}
        </button>
      </div>
    </div>
  )
}
