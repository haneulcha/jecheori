import type { CardView } from './card'
import type { Season } from './season'

/** 가격 조사일. 스냅샷이 있으면 신선도와 무관하게 날짜를 항상 싣는다(상시 표시).
 *  임계·경고는 없앴다 — 상대 문구("3일 전")가 신선도를 말한다. 케이스를 타입으로
 *  갈라 뷰가 빠뜨릴 수 없게 한다(스냅샷 없음 vs 날짜 있음). */
export type Freshness =
  | { kind: 'none' }
  | { kind: 'dated'; surveyedOn: string; days: number }

export type Filter = 'fruit' | 'vegetable' | 'seafood' | 'drop' | 'peak' | 'priced'
export type SortMode = 'drop' | 'name' | 'priceLow'

/** 검색이 이번 달 제철 밖의 품목을 찾았을 때 보여줄 힌트 (가격 없음). */
export interface OffSeasonHint {
  emoji: string
  name: string
  /** "12~4월" */
  seasonLabel: string
  /** 다음 제철이 /coming 범위(2개월) 안인가 */
  comingSoon: boolean
}

export interface AppView {
  cards: CardView[]
  /** 픽은 있으나 하락이 없을 때 담백한 안내를 보인다 */
  noDrop: boolean
  /** 카드 중 하나라도 영양 정보가 있으면 페이지 하단에 출처를 한 번 표기한다 */
  hasNutrition: boolean
  /** 카드 중 하나라도 레시피가 있으면 페이지 하단에 출처를 한 번 표기한다 */
  hasRecipes: boolean
  /** 이번 달 비제철 프로필 전체 — 검색이 제철 밖 품목을 찾았을 때 힌트로 보여준다 */
  searchIndex: OffSeasonHint[]
  date: Date
  freshness: Freshness
  /** 현재 절기 이름 — 있으면 아이브로에 "소서 · 7월 둘째 주"로 표기 */
  term?: string
}

export interface ComingMonth {
  month: number
  /** 그 달의 계절 — 카드 마스킹테이프 색(섹션 data-season) */
  season: Season
  items: CardView[]
}

export interface ComingView {
  months: ComingMonth[]
  date: Date
  /** 현재 절기 이름 — 아이브로용 */
  term?: string
}

export interface LivestockView {
  cards: CardView[]
  date: Date
  /** 현재 절기 이름 — 아이브로용 */
  term?: string
  /** 가격 조사일 신선도 (제철 페이지와 동일한 "N일 전 조사 · 전국 평균" 줄) */
  freshness: Freshness
}
