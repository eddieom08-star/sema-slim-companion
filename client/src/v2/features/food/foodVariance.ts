/** Shape returned by /api/food-database/search */
export interface FoodResult {
  id?: number | string
  name: string
  brand?: string | null
  calories: number
  protein: number | string
  carbs: number | string
  fat: number | string
  fiber?: number | string | null
  sugar?: number | string | null
  servingSize: number
  servingUnit: string
  source?: string
}

const CALORIE_VARIANCE_THRESHOLD = 40

/**
 * If the top results differ by more than CALORIE_VARIANCE_THRESHOLD calories
 * per serving, we need to ask the user which one they mean.
 */
export function needsDisambiguation(results: FoodResult[]): boolean {
  if (results.length < 2) return false
  const cals = results.map(r => Number(r.calories))
  const max = Math.max(...cals)
  const min = Math.min(...cals)
  return max - min > CALORIE_VARIANCE_THRESHOLD
}

/** Infer meal type from current time if not provided */
export function inferMealType(): string {
  const h = new Date().getHours()
  if (h < 10) return 'breakfast'
  if (h < 14) return 'lunch'
  if (h < 17) return 'snack'
  if (h < 21) return 'dinner'
  return 'snack'
}
