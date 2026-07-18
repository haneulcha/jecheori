import type { PickResult, PriceView, ValueComparison } from './picks'
import type { Baseline, Category, ProduceProfile, Unit } from './types'
import type { NutritionView } from './nutrition'
import type { RecipeView } from './recipe'

// 픽(PickResult)의 표시 투영. 카드 렌더에 필요한 모든 값을 계산해 담는다.
// 파생 규칙(개당값·반올림·"비슷" 임계·스파크 좌표)은 전부 여기서 끝난다.

export interface NoteView {
  pick: string
  store: string
  use: string
}

/** 등락 표시(값어치 비교 = comparison에서 파생). basisLabel은 무엇 대비인지
 *  ("평년"·"작년"·"지난달") — 폴백 우선도에 따라 픽마다 다를 수 있어 문구에 함께 싣는다. */
export type ChangeView =
  | { kind: 'fall'; pct: number; basisLabel: string } // 칩 ↓, 큰가격 쪽빛
  | { kind: 'rise'; pct: number; basisLabel: string } // 칩 ↑, 큰가격 러스트
  | { kind: 'similar'; basisLabel: string } // "비슷" 문구, 칩 없음
  | null // 비교 기준 없음 → 칩·문구 없음

export interface SparkView {
  /** 존재하는 궤적 점(작년→1달 전→2주 전→1주 전→지금 중 결측 제외), 시간순.
   *  작년 이맘때는 각주가 아니라 **점**으로 그린다(기존 그래프처럼 값도 점 위에 표기). */
  points: { label: string; value: number }[]
  /** points 각각의 상대 위치 (0 = 최저, 1 = 최고). 픽셀은 컴포넌트가 정한다 */
  levels: number[]
  /** normalYear의 상대 위치 — points와 **같은 스케일**(정상년이 스케일에 포함된 채)로 계산.
   *  없으면 null. 컴포넌트가 따로 min/max를 재계산하면 평년이 점들의 범위 밖(주로 위)일 때
   *  스케일을 벗어나 점선이 캔버스 밖으로 사라지거나(평탄 궤적 span=0), 클리핑된다. */
  normalYearLevel: number | null
  /** 평년 기준선(가로 점선 + 각주). 없으면 null — 점선·각주 생략 */
  normalYear: number | null
}

export interface PriceCardView {
  now: number
  wasMonthAgo: number | null
  /** 이 가격을 무엇으로 재었나. 없으면 315원(감자 100g)과 21,476원(수박 1개)이
   *  같은 저울 위에 있는 것처럼 읽힌다. 문자열 조립은 컴포넌트 소관이라 구조체로 넘긴다. */
  unit: Unit
  perUnit: number | null
  /** 값어치 비교(평년→작년→지난달 폴백) — 표시용 등락. */
  change: ChangeView
  /** 지난달 대비 %(음수=하락). change와 별도 축 — 정렬·필터(하락순, "하락" 필터)는
   *  항상 이 값을 쓴다. 표시 기준(change.basisLabel)이 평년이어도 정렬은 지난달로 고정. */
  monthAgoPct: number | null
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
  recipes: RecipeView | null
}

/** 개당값 — **셀 수 있는 단위이고 수량이 1보다 클 때만** 성립한다.
 *  무게(kg·g)엔 개당값이 없고, 1개·1포기처럼 단수면 나눌 게 없다.
 *  KAMIS 표기 파싱은 어댑터(parse-kamis.mjs)가 이미 끝냈다 — 여기선 종류만 본다. */
export function perUnitPrice(price: number, unit: Unit): { each: number } | null {
  if (unit.measure.kind !== 'count' || unit.quantity <= 1) return null
  return { each: Math.round(price / unit.quantity) }
}

/** 값들의 **상대 위치**. 0 = 최솟값, 1 = 최댓값, 모두 같으면 0.5.
 *
 *  픽셀도 viewBox도 여기선 모른다 — 그건 컴포넌트 소관이다. 예전엔 이 함수가
 *  x=[45,150,255]·y=24~44라는 SVG 좌표를 그대로 뱉어서, 스파크라인 크기를 바꾸면
 *  "순수 파생" 레이어가 따라 바뀌었다. 도메인 사실은 "어디쯤인가"지 "x가 몇"이 아니다.
 *  점 개수는 고정하지 않는다 — 최근 궤적은 2~4점으로 가변이다. */
export function sparklineLevels(vals: number[]): number[] {
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  return vals.map((val) => relativeLevel(val, min, max))
}

/** 값 하나의 상대 위치를 주어진 [min, max] 스케일 위에서 구한다. span이 0(모두 같음)이면
 *  0.5(중앙) — sparklineLevels와 toSpark의 normalYearLevel이 이 하나의 규칙을 공유한다. */
function relativeLevel(val: number, min: number, max: number): number {
  const span = max - min
  return span === 0 ? 0.5 : (val - min) / span
}

/** 월별 "왜 지금인지" 한 줄. 키는 "1"~"12" 또는 "default". */
export function whyNowLine(profile: ProduceProfile, month: number): string {
  return profile.whyNow[String(month)] ?? profile.whyNow['default'] ?? ''
}

export function toChange(c: ValueComparison | null): ChangeView {
  if (c === null) return null
  if (Math.abs(c.pct) < 1) return { kind: 'similar', basisLabel: c.basisLabel }
  const rounded = Math.round(Math.abs(c.pct))
  return c.pct < 0
    ? { kind: 'fall', pct: rounded, basisLabel: c.basisLabel }
    : { kind: 'rise', pct: rounded, basisLabel: c.basisLabel }
}

/** 궤적 [작년, 1달 전, 2주 전, 1주 전, 지금] 중 존재하는 점만 시간순으로 잇는다.
 *  작년 이맘때는 각주가 아니라 **점**으로(값도 점 위에). 결측(null)은 건너뛴다 —
 *  점 2개 미만이면 그릴 게 없어 null. 평년(normalYear)은 궤적 점이 아니라 가로 기준선·각주로. */
export function toSpark(price: number, b: Baseline): SparkView | null {
  const seq: { label: string; value: number | null }[] = [
    { label: '작년', value: b.yearAgo },
    { label: '1달 전', value: b.monthAgo },
    { label: '2주 전', value: b.twoWeeksAgo },
    { label: '1주 전', value: b.weekAgo },
    { label: '지금', value: price },
  ]
  const points = seq.filter((p): p is { label: string; value: number } => p.value !== null && p.value !== undefined)
  if (points.length < 2) return null
  const normalYear = b.normalYear ?? null
  // 평년을 스케일에 포함시킨다 — 평년이 점들 범위 밖(주로 위, "우린 평년보다 싸다"가 요점)일 때
  // 점들만으로 스케일을 잡으면 평년선이 범위 밖으로 잘리거나(특히 평탄 궤적에서 캔버스 밖으로).
  const pointValues = points.map((p) => p.value)
  const scaleValues = normalYear !== null ? [...pointValues, normalYear] : pointValues
  const min = Math.min(...scaleValues)
  const max = Math.max(...scaleValues)
  return {
    points,
    levels: pointValues.map((v) => relativeLevel(v, min, max)),
    normalYearLevel: normalYear !== null ? relativeLevel(normalYear, min, max) : null,
    normalYear,
  }
}

function toPriceCardView(v: PriceView): PriceCardView {
  const per = perUnitPrice(v.price, v.unit)
  return {
    now: v.price,
    wasMonthAgo: v.baseline.monthAgo,
    unit: v.unit,
    perUnit: per ? per.each : null,
    change: toChange(v.comparison),
    monthAgoPct: v.changeVsMonthAgoPct,
    spark: toSpark(v.price, v.baseline),
  }
}

/** 픽 → 카드 뷰. 순수 함수. nutrition·recipes는 표시 grounding(선정엔 영향 없음). */
export function toCardView(
  pick: PickResult,
  month: number,
  nutrition: NutritionView | null = null,
  recipes: RecipeView | null = null,
): CardView {
  const { profile, inPeak, price } = pick
  return {
    emoji: profile.emoji,
    name: profile.name,
    kind: profile.kamis?.kindName ?? '',
    category: profile.category,
    inPeak,
    whyNow: whyNowLine(profile, month),
    note: { pick: profile.howToPick, store: profile.howToStore, use: profile.howToUse },
    price: price ? toPriceCardView(price) : null,
    nutrition,
    recipes,
  }
}
