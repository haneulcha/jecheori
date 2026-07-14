import type { NutritionSnapshot, PriceSnapshot, ProduceProfile, RecipeSnapshot } from './types'
import { comingMonths, hasDrops, seasonalThisMonth, selectPicks } from './picks'
import { toCardView, whyNowLine } from './card'
import { currentTerm, seasonOf } from './season'
import { snapshotAgeDays } from './data'
import { matchNutrition, nutritionView } from './nutrition'
import { matchRecipes, recipeView } from './recipe'
import type { AppView, ComingView, Freshness } from './view-types'

const label = (p: ProduceProfile) => ({ emoji: p.emoji, name: p.name })

/** 이 날수부터 "가격이 오래됐다"고 알린다. 제품 규칙 — 뷰가 아니라 여기서 정한다. */
const STALE_AFTER_DAYS = 3

function freshnessOf(snapshot: PriceSnapshot | null, now: Date): Freshness {
  // 스냅샷이 아예 없으면 보여줄 가격도 없다 — "N일 전 가격"이라 할 것도 없으니 경고하지 않는다.
  if (!snapshot) return { kind: 'fresh' }
  const days = snapshotAgeDays(snapshot, now)
  return days >= STALE_AFTER_DAYS ? { kind: 'stale', days } : { kind: 'fresh' }
}

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
    freshness: freshnessOf(snapshot, now),
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
