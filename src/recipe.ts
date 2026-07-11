import type { RecipeEntry, RecipeSnapshot, ProduceProfile } from './types'

/** 카드 표시용 — 비어있지 않은 레시피 목록. */
export type RecipeView = RecipeEntry[]

/** 프로필의 recipeRef.names 순서대로 스냅샷에서 엔트리를 고른다. 없는 이름은 제외. */
export function matchRecipes(
  profile: ProduceProfile,
  snapshot: RecipeSnapshot | null,
): RecipeEntry[] {
  if (!snapshot || !profile.recipeRef) return []
  return profile.recipeRef.names
    .map((n) => snapshot.entries.find((e) => e.name === n))
    .filter((e): e is RecipeEntry => e !== undefined)
}

/** 엔트리 목록 → 표시 뷰. 비면 null (카드 진입점 없음). */
export function recipeView(entries: RecipeEntry[]): RecipeView | null {
  return entries.length > 0 ? entries : null
}
