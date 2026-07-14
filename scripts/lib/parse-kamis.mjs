/** "4,800" → 4800. "-", "", "0", null → null */
export function parseNum(s) {
  if (s == null) return null
  const cleaned = String(s).replace(/,/g, '').trim()
  if (cleaned === '' || cleaned === '-') return null
  const n = Number(cleaned)
  return Number.isFinite(n) && n > 0 ? n : null
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
    unit: String(it.unit ?? '').trim(),
    price: parseNum(it.dpr1),
    baseline: {
      monthAgo: parseNum(it.dpr5),
      yearAgo: parseNum(it.dpr6),
    },
  }))
}
