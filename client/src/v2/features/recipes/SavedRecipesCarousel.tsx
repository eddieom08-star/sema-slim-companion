import RecipeCard from './RecipeCard'

interface SavedRecipesCarouselProps {
  recipes: any[]
  isPro: boolean
  onUpgrade: () => void
}

export default function SavedRecipesCarousel({ recipes, isPro, onUpgrade }: SavedRecipesCarouselProps) {
  const MAX_FREE = 5
  const visible = isPro ? recipes : recipes.slice(0, MAX_FREE)

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 px-1" style={{ scrollSnapType: 'x mandatory' }}>
      {visible.map((recipe: any, i: number) => (
        <div key={i} className="flex-shrink-0 w-[min(224px,80vw)]" style={{ scrollSnapAlign: 'start' }}>
          <RecipeCard recipe={recipe} onSave={() => {}} isSaved />
        </div>
      ))}
      {!isPro && recipes.length >= MAX_FREE && (
        <div
          className="flex-shrink-0 w-52 rounded-2xl border-2 border-dashed border-purple-200 flex flex-col items-center justify-center p-4 text-center cursor-pointer"
          onClick={onUpgrade}
          style={{ scrollSnapAlign: 'start' }}
        >
          <p className="text-sm text-purple-400 font-medium mb-1">Save unlimited</p>
          <p className="text-xs text-purple-300">Upgrade to Pro</p>
        </div>
      )}
    </div>
  )
}
