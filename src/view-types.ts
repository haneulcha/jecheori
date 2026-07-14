import type { CardView } from './card'
import type { Season } from './season'

/** 이모지+이름 칩 하나 (이번 달 제철 리스트용) */
export interface Chip {
  emoji: string
  name: string
}

/** 가격 신선도. **임계(며칠부터 "오래됐다"인가)는 제품 규칙이라 여기서 정한다** —
 *  컴포넌트가 `staleDays >= 3`을 판정하고 있었는데, 그건 JSX에 박힌 규칙이었다.
 *  ChangeView와 같은 처리: 케이스를 타입으로 갈라 뷰가 빠뜨릴 수 없게 한다. */
export type Freshness =
  | { kind: 'fresh' }
  | { kind: 'stale'; days: number }

export interface AppView {
  cards: CardView[]
  /** 픽은 있으나 하락이 없을 때 담백한 안내를 보인다 */
  noDrop: boolean
  /** 카드 중 하나라도 영양 정보가 있으면 페이지 하단에 출처를 한 번 표기한다 */
  hasNutrition: boolean
  /** 카드 중 하나라도 레시피가 있으면 페이지 하단에 출처를 한 번 표기한다 */
  hasRecipes: boolean
  seasonal: Chip[]
  date: Date
  freshness: Freshness
  /** 현재 절기 이름 — 있으면 아이브로에 "소서 · 7월 둘째 주"로 표기 */
  term?: string
}

export interface ComingItem {
  emoji: string
  name: string
  peak: boolean
  /** 배정된(미래) 월 기준 한마디 */
  whyNow: string
}

export interface ComingMonth {
  month: number
  /** 그 달의 계절 — 카드 마스킹테이프 색 */
  season: Season
  items: ComingItem[]
}

export interface ComingView {
  months: ComingMonth[]
  date: Date
  /** 현재 절기 이름 — 아이브로용 */
  term?: string
}
