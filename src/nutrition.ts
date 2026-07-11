import type { NutritionEntry, NutritionSnapshot, ProduceProfile } from './types'

/** 카드 표시용 순수 파생. 원시 NutritionEntry에서 담백하게 쓸 값만 추린다. */
export interface NutritionView {
  serving: string
  kcal: number | null
  sugar: number | null
  fiber: number | null
}

/** 프로필의 foodDb 참조로 스냅샷에서 엔트리 하나를 찾는다. 없으면 null. */
export function matchNutrition(
  profile: ProduceProfile,
  snapshot: NutritionSnapshot | null,
): NutritionEntry | null {
  if (!snapshot || !profile.foodDb) return null
  const { foodName } = profile.foodDb
  return snapshot.entries.find((e) => e.foodName === foodName) ?? null
}

/** 엔트리 → 표시 뷰 (순수 파생). */
export function nutritionView(entry: NutritionEntry | null): NutritionView | null {
  if (!entry) return null
  return { serving: entry.serving, kcal: entry.kcal, sugar: entry.sugar, fiber: entry.fiber }
}
