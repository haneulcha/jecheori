import type { NutritionView } from '../nutrition'

/** 소수 첫째 자리까지, 정수면 정수로 (11.13 → "11.1", 53 → "53"). */
function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export function NutritionLine({ nutrition }: { nutrition: NutritionView }) {
  const parts: string[] = []
  if (nutrition.kcal !== null) parts.push(`${fmt(nutrition.kcal)}kcal`)
  if (nutrition.sugar !== null) parts.push(`당 ${fmt(nutrition.sugar)}g`)
  if (parts.length === 0) return null
  return (
    <p className="nutrition">
      <span className="serving">{nutrition.serving}당</span> {parts.join(' · ')}
      {' '}
      <span className="src">출처: 식품의약품안전처</span>
    </p>
  )
}
