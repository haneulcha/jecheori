import type { CardView } from './card'

/** 이모지+이름 칩 하나 (제철 리스트·곧 제철 예고용) */
export interface Chip {
  emoji: string
  name: string
}

export interface AppView {
  cards: CardView[]
  /** 픽은 있으나 하락이 없을 때 담백한 안내를 보인다 */
  noDrop: boolean
  seasonal: Chip[]
  coming: Chip[]
  date: Date
  staleDays: number
  /** 현재 절기 이름 — 있으면 아이브로에 "소서 · 7월 둘째 주"로 표기 */
  term?: string
}
