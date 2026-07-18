import type { NutritionSnapshot, PriceSnapshot, ProduceProfile, RecipeSnapshot } from './types'
import { comingMonths, hasDrops, seasonalThisMonth, selectPicks } from './picks'
import { toCardView, whyNowLine } from './card'
import { sortCards } from './cardlist'
import { currentTerm, seasonLabel, seasonOf } from './season'
import { snapshotAgeDays } from './data'
import { matchNutrition, nutritionView } from './nutrition'
import { matchRecipes, recipeView } from './recipe'
import type { AppView, ComingView, Freshness, OffSeasonHint } from './view-types'

const label = (p: ProduceProfile) => ({ emoji: p.emoji, name: p.name })

function freshnessOf(snapshot: PriceSnapshot | null, now: Date): Freshness {
  // 스냅샷이 없으면 지어낼 조사일이 없다 — 줄을 그리지 않는다.
  if (!snapshot) return { kind: 'none' }
  return { kind: 'dated', surveyedOn: snapshot.surveyedOn, days: snapshotAgeDays(snapshot, now) }
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
  const cards = sortCards(
    picks.map((p) =>
      toCardView(
        p,
        month,
        nutritionView(matchNutrition(p.profile, nutrition)),
        recipeView(matchRecipes(p.profile, recipes)),
      ),
    ),
    'drop',
  )
  const comingIds = new Set(
    comingMonths(profiles, month).flatMap((g) => g.items.map((it) => it.profile.id)),
  )
  const searchIndex: OffSeasonHint[] = profiles
    .filter((p) => !p.seasonMonths.includes(month))
    .map((p) => ({
      emoji: p.emoji,
      name: p.name,
      seasonLabel: seasonLabel(p.seasonMonths),
      comingSoon: comingIds.has(p.id),
    }))
  return {
    cards,
    noDrop: picks.length > 0 && !hasDrops(picks),
    hasNutrition: cards.some((c) => c.nutrition !== null),
    hasRecipes: cards.some((c) => c.recipes !== null),
    seasonal: seasonalThisMonth(profiles, month).map(label),
    searchIndex,
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
