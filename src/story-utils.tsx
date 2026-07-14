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
import { nutritionView } from './nutrition'
import { recipeView } from './recipe'
import type {
  Category,
  Measure,
  NutritionSnapshot,
  PriceEntry,
  PriceSnapshot,
  ProduceProfile,
  RecipeSnapshot,
} from './types'

import produceJson from '../public/data/produce.json'
import pricesJson from '../public/data/prices.json'
import nutritionJson from '../public/data/nutrition.json'
import recipesJson from '../public/data/recipes.json'

/** 실물 데이터 — 스토리는 픽스처를 지어내지 않는다. 지어낸 영양 수치는 그럴듯해서 더 위험하다. */
export const REAL = {
  profiles: produceJson as unknown as ProduceProfile[],
  prices: pricesJson as unknown as PriceSnapshot,
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
  /** null이면 취소선 예전가·등락 칩·스파크라인이 전부 사라진다 */
  monthAgo: number | null
  /** null이면 스파크라인만 사라진다 (등락 칩은 남는다) */
  yearAgo: number | null
  unitQuantity: number
  unitMeasure: MeasureKey
  hasNutrition: boolean
  /** 0이면 레시피 섹션 없음. 실제 recipes.json에서 앞에서부터 n개 */
  recipeCount: number
}

export const CARD_KNOBS_DEFAULT: CardKnobs = {
  name: '감자',
  emoji: '🥔',
  kindName: '수미',
  category: 'vegetable',
  inPeak: true,
  whyNow: '햇감자가 나오는 철이에요',
  price: 315,
  monthAgo: 371,
  yearAgo: 340,
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
  recipeCount: { control: { type: 'range', min: 0, max: 5, step: 1 } },
} as const

function toProfile(k: CardKnobs): ProduceProfile {
  return {
    id: 'story',
    name: k.name,
    emoji: k.emoji,
    category: k.category,
    // 카드의 품종 줄은 profile.kamis.kindName에서 온다 (card.ts) — 참조를 여기서 채운다.
    kamis: { categoryCode: '200', itemName: k.name, kindName: k.kindName },
    seasonMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    peakMonths: [],
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
    baseline: { monthAgo: k.monthAgo, yearAgo: k.yearAgo },
  }
}

/** 노브 → 재료 → **진짜 파이프라인** → CardView.
 *  1% "비슷" 임계도, 개당값 조건도, 스파크 null 조건도 여기서 정하지 않는다 — card.ts가 정한다.
 *  그래서 도달 불가능한 조합(무게 단위인데 개당값이 붙은 카드)은 애초에 만들 수 없다. */
export function buildCard(k: CardKnobs, month: number): CardView {
  const entry = toEntry(k)
  const pick: PickResult = {
    profile: toProfile(k),
    inPeak: k.inPeak,
    price: entry ? priceView(entry) : null,
  }
  return toCardView(
    pick,
    month,
    k.hasNutrition ? nutritionView(REAL.nutrition.entries[0]) : null,
    recipeView(REAL.recipes.entries.slice(0, k.recipeCount)),
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
