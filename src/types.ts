export type Category = 'fruit' | 'vegetable'

/** KAMIS 응답과 프로필을 잇는 참조. 코드가 아니라 품목명으로 매칭한다
 *  (KAMIS 품목 코드는 문서마다 편차가 있어 이름 매칭이 더 안전). */
export interface KamisRef {
  /** 100 식량작물 | 200 채소류 | 400 과일류 */
  categoryCode: '100' | '200' | '400'
  /** KAMIS item_name과 정확히 일치해야 함 (예: "사과") */
  itemName: string
  /** 선호 품종 — KAMIS kind_name에 부분 일치 (예: "샤인") */
  kindName?: string
}

export interface ProduceProfile {
  id: string
  name: string
  emoji: string
  category: Category
  kamis: KamisRef
  /** 제철 월 (1~12) */
  seasonMonths: number[]
  /** 절정 월 — seasonMonths의 부분집합 */
  peakMonths: number[]
  /** 월별 "왜 지금인지" 한 줄. 키는 "1"~"12" 또는 "default" */
  whyNow: Record<string, string>
  howToPick: string
  howToStore: string
  howToUse: string
}

export interface PriceEntry {
  itemCode: string
  itemName: string
  kindName: string
  rank: string
  unit: string
  /** 당일 평균 소매가 (당일 조사 없으면 최근 조사일 가격). 결측이면 null */
  price: number | null
  priceMonthAgo: number | null
  priceYearAgo: number | null
}

export interface PriceSnapshot {
  schemaVersion: number
  /** ISO 8601 */
  fetchedAt: string
  entries: PriceEntry[]
}
