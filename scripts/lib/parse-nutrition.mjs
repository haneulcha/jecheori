/** 문자열 영양수치를 숫자로. 빈문자열·미정의는 null. "0"은 유효한 0. */
export function parseNum(s) {
  if (s === null || s === undefined) return null
  const t = String(s).trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isNaN(n) ? null : n
}

/** FoodNtrCpntDbInfo02 응답에서 FOOD_NM_KR === foodName 원물 하나를 NutritionEntry로.
 *  없으면 null, 오류 응답(body.items 없음)이면 throw. */
export function parseNutritionEntry(json, foodName) {
  const rawItems = json?.body?.items
  if (rawItems === undefined || rawItems === null) {
    const msg = json?.header?.resultMsg ?? 'unknown'
    throw new Error(`FoodNtr 응답 이상: ${msg}`)
  }
  // 조회 결과가 1건이면 REST 응답이 items를 배열이 아닌 단일 객체로 준다.
  const items = Array.isArray(rawItems) ? rawItems : [rawItems]
  const it = items.find((x) => x.FOOD_NM_KR === foodName)
  if (!it) return null
  return {
    foodName: it.FOOD_NM_KR,
    serving: it.SERVING_SIZE ?? '',
    kcal: parseNum(it.AMT_NUM1),
    carbs: parseNum(it.AMT_NUM6),
    protein: parseNum(it.AMT_NUM3),
    fat: parseNum(it.AMT_NUM4),
    sugar: parseNum(it.AMT_NUM7),
    fiber: parseNum(it.AMT_NUM8),
  }
}
