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
  const items = json?.body?.items
  if (!Array.isArray(items)) {
    const msg = json?.header?.resultMsg ?? 'unknown'
    throw new Error(`FoodNtr 응답 이상: ${msg}`)
  }
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
