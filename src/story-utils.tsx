import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import type { Decorator } from '@storybook/react-vite'
import type { CardView } from './card'
import { toCardView } from './card'
import type { PickResult } from './picks'
import { priceView } from './picks'
import { matchNutrition, nutritionView } from './nutrition'
import { matchRecipes, recipeView } from './recipe'
import type {
  Category,
  ComingPriceSeed,
  Measure,
  NutritionSnapshot,
  PriceEntry,
  PriceSnapshot,
  ProduceProfile,
  RecipeSnapshot,
} from './types'

import produceJson from '../public/data/produce.json'
import pricesJson from '../public/data/prices.json'
import comingPricesJson from '../public/data/coming-prices.json'
import nutritionJson from '../public/data/nutrition.json'
import recipesJson from '../public/data/recipes.json'

/** 실물 데이터 — 스토리는 픽스처를 지어내지 않는다. 지어낸 영양 수치는 그럴듯해서 더 위험하다. */
export const REAL = {
  profiles: produceJson as unknown as ProduceProfile[],
  prices: pricesJson as unknown as PriceSnapshot,
  comingPrices: comingPricesJson as unknown as ComingPriceSeed,
  nutrition: nutritionJson as unknown as NutritionSnapshot,
  recipes: recipesJson as unknown as RecipeSnapshot,
}

/** 단위 표기 → Measure. 무게냐 개수냐가 도메인 구분이고 글자는 그 안의 라벨이다 (types.ts).
 *  개당값은 count이면서 수량 > 1일 때만 성립하므로, 이 노브가 개당값 줄을 켜고 끈다. */
const MEASURES = {
  g: { kind: 'weight', unit: 'g' },
  kg: { kind: 'weight', unit: 'kg' },
  개: { kind: 'count', unit: '개' },
  포기: { kind: 'count', unit: '포기' },
} as const satisfies Record<string, Measure>

export type MeasureKey = keyof typeof MEASURES

/** 카드 한 장의 원시 재료. CardView가 아니라 **재료**다 — 진짜 파이프라인이 이걸 카드로 만든다. */
export interface CardKnobs {
  name: string
  emoji: string
  kindName: string
  category: Category
  inPeak: boolean
  whyNow: string
  /** null이면 KAMIS 매칭 실패/결측 — 가격 블록 전체가 사라진다 */
  price: number | null
  /** 정렬·필터(지난달 축)와 값어치 폴백 3순위. null이면 그 축의 등락을 모른다. */
  monthAgo: number | null
  /** 값어치 폴백 2순위(평년 없을 때). null이면 그 축은 건너뛴다. */
  yearAgo: number | null
  /** 값어치 헤드라인 1순위(있으면 항상 우선) + 스파크 점선·각주. null이면 작년→지난달로 폴백. */
  normalYear: number | null
  /** 최근 궤적 점(1주 전). null이면 스파크에서 이 점만 빠진다(궤적 2점 미만이면 스파크 자체가 사라진다). */
  weekAgo: number | null
  /** 최근 궤적 점(2주 전). weekAgo와 같은 규칙. */
  twoWeeksAgo: number | null
  unitQuantity: number
  unitMeasure: MeasureKey
  /** 영양은 프로필에 foodDb 참조가 있어야 성립한다 — 40개 중 3개(복숭아·토마토·사과)뿐이다.
   *  이 토글을 켜도 name이 그 셋 중 하나가 아니면(예: 기본값 감자) 영양은 안 뜬다 — 그게 규칙이다. */
  hasNutrition: boolean
  /** 0이면 레시피 섹션 없음. 그 품목의 실제 레시피(matchRecipes)에서 앞에서부터 n개.
   *  품목이 실제로 가진 레시피 수보다 크게 올려도 더 나오지 않는다 — 그것도 사실이다. */
  recipeCount: number
}

export const CARD_KNOBS_DEFAULT: CardKnobs = {
  name: '감자',
  emoji: '🥔',
  // 실물 감자 프로필엔 kamis.kindName이 없다(40개 중 애호박·포도·샤인머스캣·대파·쪽파 5개만 보유).
  // 빈 문자열로 두어 기본 카드가 실제 앱엔 없는 품종 줄을 그리지 않게 한다.
  // 노브 자체는 남긴다 — 품종을 가진 품목(샤인머스캣 등)도 있어 유효한 축이다.
  kindName: '',
  category: 'vegetable',
  inPeak: true,
  whyNow: '햇감자가 나오는 철이에요',
  price: 315,
  monthAgo: 371,
  yearAgo: 340,
  // 평년·1주·2주는 기본값에서 비워둔다 — 기존 스토리(하락·상승·비슷 등)가 "지난달/작년"
  // 폴백 단만 본다는 전제를 그대로 유지한다. 평년·궤적을 보려면 노브를 명시적으로 켠다.
  normalYear: null,
  weekAgo: null,
  twoWeeksAgo: null,
  unitQuantity: 100,
  unitMeasure: 'g',
  hasNutrition: false,
  recipeCount: 3,
}

export const CARD_ARG_TYPES = {
  category: { control: 'inline-radio', options: ['fruit', 'vegetable'] },
  unitMeasure: { control: 'inline-radio', options: Object.keys(MEASURES) },
  unitQuantity: { control: { type: 'number', min: 1 } },
  price: { control: 'number' },
  monthAgo: { control: 'number' },
  yearAgo: { control: 'number' },
  normalYear: { control: 'number' },
  weekAgo: { control: 'number' },
  twoWeeksAgo: { control: 'number' },
  recipeCount: { control: { type: 'range', min: 0, max: 5, step: 1 } },
} as const

/** 노브 이름으로 실물 프로필을 찾아 recipeRef·foodDb를 얹는다. 그래야 레시피·영양이
 *  "그 품목의 진짜 데이터"로 매칭된다 — 임의로 고른 엔트리가 아무 이름에나 붙지 않는다.
 *  임의 이름(실물에 없는 이름)이면 참조 없이 둔다 — 그것도 정직한 상태다(레시피·영양 없는 카드). */
function toProfile(k: CardKnobs, month: number): ProduceProfile {
  const real = REAL.profiles.find((p) => p.name === k.name)
  return {
    id: 'story',
    name: k.name,
    emoji: k.emoji,
    category: k.category,
    // 카드의 품종 줄은 profile.kamis.kindName에서 온다 (card.ts) — 참조를 여기서 채운다.
    kamis: { categoryCode: '200', itemName: k.name, kindName: k.kindName },
    foodDb: real?.foodDb,
    recipeRef: real?.recipeRef,
    seasonMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    // inPeak 노브에서 파생 — picks.ts의 selectPicks와 같은 방향(peakMonths.includes(month)).
    // 노브로 직접 세팅한 inPeak와 모순되지 않도록 재료 안에서 일관되게 만든다.
    peakMonths: k.inPeak ? [month] : [],
    whyNow: { default: k.whyNow },
    howToPick: '단단하고 흠집 없는 것으로 고르세요',
    howToStore: '서늘하고 어두운 곳에 두세요',
    howToUse: '찌거나 굽거나, 국에 넣어도 좋아요',
  }
}

function toEntry(k: CardKnobs): PriceEntry | null {
  if (k.price === null) return null
  return {
    itemName: k.name,
    kindName: k.kindName,
    rank: '상품',
    unit: { quantity: k.unitQuantity, measure: MEASURES[k.unitMeasure] },
    price: k.price,
    baseline: {
      weekAgo: k.weekAgo,
      twoWeeksAgo: k.twoWeeksAgo,
      monthAgo: k.monthAgo,
      yearAgo: k.yearAgo,
      normalYear: k.normalYear,
    },
  }
}

/** 노브 → 재료 → **진짜 파이프라인** → CardView.
 *  1% "비슷" 임계도, 개당값 조건도, 스파크 null 조건도 여기서 정하지 않는다 — card.ts가 정한다.
 *  그래서 도달 불가능한 조합(무게 단위인데 개당값이 붙은 카드)은 애초에 만들 수 없다.
 *  영양·레시피도 진짜 매처(matchNutrition/matchRecipes)를 통과하므로, 품목과 무관한
 *  레시피·영양이 붙는 조합 자체를 만들 수 없다 — recipeCount는 매칭된 목록을 자르기만 한다. */
export function buildCard(k: CardKnobs, month: number): CardView {
  const entry = toEntry(k)
  const profile = toProfile(k, month)
  const pick: PickResult = {
    profile,
    inPeak: k.inPeak,
    price: entry ? priceView(entry) : null,
  }
  const recipes = matchRecipes(profile, REAL.recipes).slice(0, k.recipeCount)
  return toCardView(
    pick,
    month,
    k.hasNutrition ? nutritionView(matchNutrition(profile, REAL.nutrition)) : null,
    recipeView(recipes),
  )
}

/** NavIndex가 TanStack <Link>를 쓰므로 App·Coming 스토리는 라우터 없이는 크래시한다.
 *  test-utils.tsx의 메모리 라우터 패턴과 같다. 카드 스토리엔 필요 없어 전역이 아니라 스토리별로 붙인다. */
export const withRouter: Decorator = (Story) => {
  const rootRoute = createRootRoute()
  const children = ['/', '/coming'].map((path) =>
    createRoute({ getParentRoute: () => rootRoute, path, component: () => <Story /> }),
  )
  const router = createRouter({
    routeTree: rootRoute.addChildren(children),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  return <RouterProvider router={router} />
}
