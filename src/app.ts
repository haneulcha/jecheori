import type { ComingPriceSeed, NutritionSnapshot, PriceSnapshot, ProduceProfile, RecipeSnapshot } from './types'
import { comingMonths, hasDrops, matchEntry, priceView, selectPicks } from './picks'
import { toCardView, toComingCardView } from './card'
import { sortCards } from './cardlist'
import { currentTerm, seasonLabel, seasonOf } from './season'
import { snapshotAgeDays } from './data'
import { matchNutrition, nutritionView } from './nutrition'
import { matchRecipes, recipeView } from './recipe'
import type { AppView, ComingView, Freshness, LivestockView, OffSeasonHint } from './view-types'

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
  // 축산물은 제철이 없다 — 제철 달력·검색 인덱스에서 제외(전용 /livestock 탭에서만 보인다).
  const seasonal = profiles.filter((p) => p.category !== 'livestock')
  const picks = selectPicks(seasonal, snapshot, now)
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
    comingMonths(seasonal, month).flatMap((g) => g.items.map((it) => it.profile.id)),
  )
  const searchIndex: OffSeasonHint[] = seasonal
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
    searchIndex,
    date: now,
    freshness: freshnessOf(snapshot, now),
    term: currentTerm(now),
  }
}

/** 원시 프로필+씨앗+시계 → 다가오는 제철 뷰. 순수. 메인과 같은 풀 카드,
 *  가격은 작년 같은 시기 씨앗에서(있으면), 영양·레시피는 계절 무관 씨앗에서. */
export function buildComingView(
  profiles: ProduceProfile[],
  comingSeed: ComingPriceSeed,
  nutrition: NutritionSnapshot | null,
  recipes: RecipeSnapshot | null,
  now: Date,
): ComingView {
  const month = now.getMonth() + 1
  const seasonal = profiles.filter((p) => p.category !== 'livestock')
  const months = comingMonths(seasonal, month).map((g) => ({
    month: g.month,
    season: seasonOf(g.month),
    items: g.items.map((it) => {
      const entry = matchEntry(it.profile, comingSeed.months[String(g.month)] ?? [])
      return toComingCardView(
        it.profile,
        g.month,
        month,
        entry,
        nutritionView(matchNutrition(it.profile, nutrition)),
        recipeView(matchRecipes(it.profile, recipes)),
      )
    }),
  }))
  return { months, date: now, term: currentTerm(now) }
}

/** 축산물 값 페이지. 제철 없음 — category==='livestock' 전체를 후보로,
 *  하락순 정렬(무가격은 sortCards가 뒤로). 순수 함수. */
export function buildLivestockView(
  profiles: ProduceProfile[],
  snapshot: PriceSnapshot | null,
  nutrition: NutritionSnapshot | null,
  recipes: RecipeSnapshot | null,
  now: Date,
): LivestockView {
  const month = now.getMonth() + 1
  const livestock = profiles.filter((p) => p.category === 'livestock')
  const cards = sortCards(
    livestock.map((profile) => {
      const entry = snapshot ? matchEntry(profile, snapshot.entries) : null
      const price = entry ? priceView(entry) : null
      return toCardView(
        { profile, inPeak: false, price },
        month,
        nutritionView(matchNutrition(profile, nutrition)),
        recipeView(matchRecipes(profile, recipes)),
      )
    }),
    'drop',
  )
  return { cards, date: now, term: currentTerm(now), freshness: freshnessOf(snapshot, now) }
}
