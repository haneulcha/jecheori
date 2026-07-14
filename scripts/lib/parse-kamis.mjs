/** "4,800" → 4800. "-", "", "0", null → null */
export function parseNum(s) {
  if (s == null) return null
  const cleaned = String(s).replace(/,/g, '').trim()
  if (cleaned === '' || cleaned === '-') return null
  const n = Number(cleaned)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** KAMIS 단위 표기 → { quantity, measure }. "10개" → { quantity: 10, measure: '개' }
 *
 *  measure는 'kg' | 'g' | '개' | '포기' 넷뿐이다 (전 계절·전 부류 실측).
 *  처음 보는 표기는 null로 뭉개지 않고 throw한다 — 단위 없는 가격이 화면까지 새어나가면
 *  아무도 모른 채 틀린 개당값을 본다. 조용한 오염보다 시끄러운 실패가 낫다.
 *  환산은 하지 않는다. KAMIS 표기를 그대로 보존한다 — 환산이 없으면 오차도 없다.
 */
export function parseUnit(s) {
  const m = /^(\d+)\s*(kg|g|개|포기)$/.exec(String(s ?? '').trim())
  if (!m) throw new Error(`KAMIS 단위 표기를 모르겠습니다: ${JSON.stringify(s)}`)
  return { quantity: Number(m[1]), measure: m[2] }
}

/** KAMIS dailyPriceByCategoryList 응답 → PriceEntry[] (오류 응답이면 throw)
 *
 *  dpr 컬럼은 순서가 아니라 의미로 골라야 한다 (응답의 day1~day7이 라벨을 준다):
 *    dpr1=당일  dpr2=1일전  dpr3=1주일전  dpr4=2주일전  dpr5=1개월전  dpr6=1년전  dpr7=일평년
 *  1개월전을 dpr3에서 읽으면 조용히 1주일전 값이 들어온다 (실제로 그랬다).
 *
 *  price(관측)는 조사일(dpr1)의 값만 담는다 — dpr2로 메우지 않는다. 메우면 스냅샷의
 *  surveyedOn과 실제 가격의 날짜가 어긋난다. 조사일 찾기는 buildLatestSnapshot이 한다.
 *  baseline(기준선)은 KAMIS가 날짜를 주지 않고 라벨만 주는 비교값이라 관측과 칸을 나눈다.
 */
export function parseCategoryResponse(json) {
  const data = json?.data
  if (!data || Array.isArray(data)) {
    // KAMIS는 인증 실패 등 오류 시 data가 ["200"] 같은 코드 배열로 온다
    throw new Error(`KAMIS 오류 응답: ${JSON.stringify(data ?? json)}`)
  }
  if (data.error_code && data.error_code !== '000') {
    throw new Error(`KAMIS error_code=${data.error_code}`)
  }
  const items = Array.isArray(data.item) ? data.item : [data.item].filter(Boolean)
  return items.map((it) => ({
    itemCode: String(it.item_code ?? ''),
    itemName: String(it.item_name ?? '').trim(),
    kindName: String(it.kind_name ?? '').trim(),
    rank: String(it.rank ?? '').trim(),
    unit: parseUnit(it.unit),
    price: parseNum(it.dpr1),
    baseline: {
      monthAgo: parseNum(it.dpr5),
      yearAgo: parseNum(it.dpr6),
    },
  }))
}
