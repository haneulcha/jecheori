/** 조리단계 문자열 앞의 번호 접두("1. ", "2 ", "3.")를 떼고 trim. */
export function cleanStep(s) {
  return String(s).trim().replace(/^\d+\s*\.?\s*/, '').trim()
}

/** COOKRCP01 응답에서 RCP_NM === name 행 하나를 RecipeEntry로.
 *  없으면 null, 루트 없음/오류 응답이면 throw. */
export function parseRecipeEntry(json, name) {
  const root = json?.COOKRCP01
  if (!root) throw new Error('COOKRCP01 응답 이상: 루트 없음')
  const code = root?.RESULT?.CODE ?? ''
  if (code.startsWith('ERROR')) {
    throw new Error(`COOKRCP01 오류: ${root?.RESULT?.MSG ?? code}`)
  }
  const rawRows = root.row
  if (rawRows === undefined || rawRows === null) return null
  // 결과가 1건이면 REST 응답이 row를 배열이 아닌 단일 객체로 주기도 한다.
  const rows = Array.isArray(rawRows) ? rawRows : [rawRows]
  const r = rows.find((x) => x.RCP_NM === name)
  if (!r) return null
  const steps = []
  for (let i = 1; i <= 20; i++) {
    const v = r[`MANUAL${String(i).padStart(2, '0')}`]
    if (v && String(v).trim() !== '') steps.push(cleanStep(v))
  }
  return {
    name: r.RCP_NM,
    ingredients: (r.RCP_PARTS_DTLS ?? '').trim(),
    steps,
  }
}
