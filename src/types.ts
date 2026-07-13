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
  /** KAMIS 가격 참조 (선택). KAMIS 소매 일일조사는 모든 제철 작물을 다루지 않는다 —
   *  가지·옥수수·부추·단호박은 소매·도매 어느 쪽에도 없다. 그런 품목은 이 참조를 비워
   *  가격 없이 제철 정보만 보여준다. "아직 못 맞춘 것"과 "원래 가격이 없는 것"은 다르다. */
  kamis?: KamisRef
  /** 영양 grounding 참조 (선택). 없으면 카드에 영양 줄 없음. */
  foodDb?: FoodDbRef
  /** 레시피 grounding 참조 (선택). 없으면 카드에 레시피 진입점 없음. */
  recipeRef?: RecipeRef
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
  /** 가격의 실제 조사일 (YYYY-MM-DD). 공표 전·휴장일이면 fetchedAt보다 며칠 앞설 수 있다 */
  priceDate?: string
  entries: PriceEntry[]
}

/** 식약처 영양DB에서 원물 하나를 집기 위한 수기 참조 (KamisRef와 같은 패턴).
 *  FOOD_CAT1_NM 필터 + 대표 엔트리명(FOOD_NM_KR 정확일치)으로 매칭. */
export interface FoodDbRef {
  /** FOOD_CAT1_NM 필터값: '과일류' | '채소류' */
  category1: string
  /** 대표 원물 엔트리명 (예: "사과_부사_생것") */
  foodName: string
}

export interface NutritionEntry {
  foodName: string
  /** 1회 제공량 표기 (예: "100g") */
  serving: string
  /** 에너지 kcal */
  kcal: number | null
  carbs: number | null
  protein: number | null
  fat: number | null
  /** 당류 g */
  sugar: number | null
  /** 식이섬유 g */
  fiber: number | null
}

export interface NutritionSnapshot {
  schemaVersion: number
  fetchedAt: string
  entries: NutritionEntry[]
}

/** 식약처 조리식품 레시피 DB(COOKRCP01)에서 요리를 집기 위한 수기 참조.
 *  실제 RCP_NM과 정확일치하는 이름만 넣는다 (KamisRef·FoodDbRef와 같은 패턴). */
export interface RecipeRef {
  names: string[]
}

export interface RecipeEntry {
  /** RCP_NM */
  name: string
  /** RCP_PARTS_DTLS 원문 한 줄 */
  ingredients: string
  /** MANUAL01~20 중 비어있지 않은 조리단계 (번호 접두 제거) */
  steps: string[]
}

export interface RecipeSnapshot {
  schemaVersion: number
  /** ISO 8601 */
  fetchedAt: string
  entries: RecipeEntry[]
}
