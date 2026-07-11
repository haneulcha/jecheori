import type { PickResult, PriceView } from './picks'
import type { Category, ProduceProfile } from './types'
import type { NutritionView } from './nutrition'

// 픽(PickResult)의 표시 투영. 카드 렌더에 필요한 모든 값을 계산해 담는다.
// 파생 규칙(개당값·반올림·"비슷" 임계·스파크 좌표)은 전부 여기서 끝난다.

export interface NoteView {
  pick: string
  store: string
  use: string
}

/** 등락 표시. render는 케이스별로 소비한다. */
export type ChangeView =
  | { kind: 'fall'; pct: number } // 칩 ↓, 큰가격 쪽빛
  | { kind: 'rise'; pct: number } // 칩 ↑, 큰가격 러스트
  | { kind: 'similar' } // "비슷" 문구, 칩 없음
  | null // 지난달 데이터 없음 → 칩·문구 없음

export interface SparkView {
  points: { x: number; y: number }[]
  yearAgo: number
  monthAgo: number
  now: number
}

export interface PriceCardView {
  now: number
  wasMonthAgo: number | null
  perUnit: number | null
  change: ChangeView
  spark: SparkView | null
}

export interface CardView {
  emoji: string
  name: string
  kind: string
  category: Category
  inPeak: boolean
  whyNow: string
  note: NoteView
  price: PriceCardView | null
  nutrition: NutritionView | null
}

/** "N개"(N>1) 단위면 개당값을 계산. 단수·무게 단위는 null. */
export function perUnitPrice(price: number, unit: string): { each: number } | null {
  const m = /^(\d+)\s*개$/.exec(unit.trim())
  if (!m) return null
  const count = Number(m[1])
  if (count <= 1) return null
  return { each: Math.round(price / count) }
}

const SPARK_X = [45, 150, 255]

/** 세 값(작년/한달전/지금)을 스파크라인 좌표로. 최댓값 y=24(위), 최솟값 y=44(아래), 모두 같으면 34. */
export function sparklineGeometry(v: { yearAgo: number; monthAgo: number; now: number }): { x: number; y: number }[] {
  const vals = [v.yearAgo, v.monthAgo, v.now]
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min
  return vals.map((val, i) => ({
    x: SPARK_X[i],
    y: span === 0 ? 34 : 44 - ((val - min) / span) * 20,
  }))
}

/** 월별 "왜 지금인지" 한 줄. 키는 "1"~"12" 또는 "default". */
export function whyNowLine(profile: ProduceProfile, month: number): string {
  return profile.whyNow[String(month)] ?? profile.whyNow['default'] ?? ''
}

function toChange(pct: number | null): ChangeView {
  if (pct === null) return null
  if (Math.abs(pct) < 1) return { kind: 'similar' }
  const rounded = Math.round(Math.abs(pct))
  return pct < 0 ? { kind: 'fall', pct: rounded } : { kind: 'rise', pct: rounded }
}

function toSpark(v: PriceView): SparkView | null {
  if (v.priceMonthAgo === null || v.priceYearAgo === null) return null
  return {
    points: sparklineGeometry({ yearAgo: v.priceYearAgo, monthAgo: v.priceMonthAgo, now: v.price }),
    yearAgo: v.priceYearAgo,
    monthAgo: v.priceMonthAgo,
    now: v.price,
  }
}

function toPriceCardView(v: PriceView): PriceCardView {
  const per = perUnitPrice(v.price, v.unit)
  return {
    now: v.price,
    wasMonthAgo: v.priceMonthAgo,
    perUnit: per ? per.each : null,
    change: toChange(v.changeVsMonthAgoPct),
    spark: toSpark(v),
  }
}

/** 픽 → 카드 뷰. 순수 함수. nutrition은 표시 grounding(선정엔 영향 없음). */
export function toCardView(pick: PickResult, month: number, nutrition: NutritionView | null = null): CardView {
  const { profile, inPeak, price } = pick
  return {
    emoji: profile.emoji,
    name: profile.name,
    kind: profile.kamis.kindName ?? '',
    category: profile.category,
    inPeak,
    whyNow: whyNowLine(profile, month),
    note: { pick: profile.howToPick, store: profile.howToStore, use: profile.howToUse },
    price: price ? toPriceCardView(price) : null,
    nutrition,
  }
}
