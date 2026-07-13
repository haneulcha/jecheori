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
    price: parseNum(it.dpr1) ?? parseNum(it.dpr2),
    priceMonthAgo: parseNum(it.dpr5),
    priceYearAgo: parseNum(it.dpr6),
  }))
}
