import type { NutritionSnapshot, PriceSnapshot, ProduceProfile, RecipeSnapshot } from './types'
import { comingMonths, hasDrops, seasonalThisMonth, selectPicks } from './picks'
import { toCardView, whyNowLine } from './card'
import { currentTerm, seasonOf } from './season'
import { snapshotAgeDays } from './data'
import { matchNutrition, nutritionView } from './nutrition'
import { matchRecipes, recipeView } from './recipe'
import type { AppView, ComingView } from './view-types'

const label = (p: ProduceProfile) => ({ emoji: p.emoji, name: p.name })

/** 원시 데이터(프로필·스냅샷·시계) → 화면 뷰. 순수 함수 — "무엇을 보여줄지" 조립을 한 곳에 모은다. */
export function buildAppView(
  profiles: ProduceProfile[],
  snapshot: PriceSnapshot | null,
  nutrition: NutritionSnapshot | null,
  recipes: RecipeSnapshot | null,
  now: Date,
): AppView {
  const month = now.getMonth() + 1
  const picks = selectPicks(profiles, snapshot, now)
  const cards = picks.map((p) =>
    toCardView(
      p,
      month,
      nutritionView(matchNutrition(p.profile, nutrition)),
      recipeView(matchRecipes(p.profile, recipes)),
    ),
  )
  return {
    cards,
    noDrop: picks.length > 0 && !hasDrops(picks),
    hasNutrition: cards.some((c) => c.nutrition !== null),
    hasRecipes: cards.some((c) => c.recipes !== null),
    seasonal: seasonalThisMonth(profiles, month).map(label),
    date: now,
    staleDays: snapshot ? snapshotAgeDays(snapshot, now) : 0,
    term: currentTerm(now),
  }
}

/** 원시 프로필+시계 → 다가오는 제철 뷰. 순수. 가격·영양·레시피 안 씀. */
export function buildComingView(profiles: ProduceProfile[], now: Date): ComingView {
  const month = now.getMonth() + 1
  const months = comingMonths(profiles, month).map((g) => ({
    month: g.month,
    season: seasonOf(g.month),
    items: g.items.map((it) => ({
      emoji: it.profile.emoji,
      name: it.profile.name,
      peak: it.peak,
      whyNow: whyNowLine(it.profile, g.month),
    })),
  }))
  return { months, date: now, term: currentTerm(now) }
}
