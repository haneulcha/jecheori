/** "4,800" → 4800. "-", "", "0", null → null */
export function parseNum(s) {
  if (s == null) return null
  const cleaned = String(s).replace(/,/g, '').trim()
  if (cleaned === '' || cleaned === '-') return null
  const n = Number(cleaned)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** KAMIS 단위 표기 → Unit. "10개" → { quantity: 10, measure: { kind: 'count', unit: '개' } }
 *
 *  **여기가 KAMIS의 글자를 도메인의 종류로 옮기는 자리다.** 바깥은 kg·g·개·포기라는
 *  글자가 아니라 "무게냐 개수냐"만 알면 된다 — 그래야 KAMIS가 단위를 하나 더 늘려도
 *  개당값 규칙이 안 바뀐다.
 *
 *  처음 보는 표기는 null로 뭉개지 않고 throw한다 — 단위 없는 가격이 화면까지 새어나가면
 *  아무도 모른 채 틀린 개당값을 본다. 조용한 오염보다 시끄러운 실패가 낫다.
 *  환산은 하지 않는다. KAMIS 표기를 그대로 보존한다 — 환산이 없으면 오차도 없다.
 */
const MEASURES = {
  kg: { kind: 'weight', unit: 'kg' },
  g: { kind: 'weight', unit: 'g' },
  개: { kind: 'count', unit: '개' },
  포기: { kind: 'count', unit: '포기' },
  마리: { kind: 'count', unit: '마리' },
  근: { kind: 'weight', unit: '근' }, // 근≈600g이지만 환산 안 함 — KAMIS 표기 보존
  손: { kind: 'count', unit: '손' }, // 고등어 한 손 등
  장: { kind: 'count', unit: '장' }, // 김 10장 등
  구: { kind: 'count', unit: '구' }, // 계란 10구·30구 — 낱개 계량
  L: { kind: 'volume', unit: 'L' }, // 우유 1L — 부피(개당값 없음)
}

export function parseUnit(s) {
  const m = /^(\d+)\s*(kg|g|개|포기|마리|근|손|장|구|L)$/.exec(String(s ?? '').trim())
  if (!m) throw new Error(`KAMIS 단위 표기를 모르겠습니다: ${JSON.stringify(s)}`)
  return { quantity: Number(m[1]), measure: { ...MEASURES[m[2]] } }
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
  if (Array.isArray(data)) {
    // KAMIS는 item 목록 대신 코드 배열로 응답하기도 한다:
    //   001=결과 없음(그날 조사 없음), 200=파라미터 오류, 900=인증 실패.
    // 001은 "이 날짜엔 조사가 없다"일 뿐이니 빈 배열로 돌려 상위(buildLatestSnapshot)의
    // 소급 탐색이 직전 조사일로 넘어가게 한다 — 일요일·공휴일이 여기 해당한다.
    // 그 외 코드(200·900 등)는 진짜 실패이므로 조용히 뭉개지 않고 throw한다.
    if (data.length === 1 && data[0] === '001') return []
    throw new Error(`KAMIS 오류 응답: ${JSON.stringify(data)}`)
  }
  if (!data) {
    throw new Error(`KAMIS 오류 응답: ${JSON.stringify(json)}`)
  }
  if (data.error_code && data.error_code !== '000') {
    throw new Error(`KAMIS error_code=${data.error_code}`)
  }
  const items = Array.isArray(data.item) ? data.item : [data.item].filter(Boolean)
  return items.map((it) => ({
    itemName: String(it.item_name ?? '').trim(),
    kindName: String(it.kind_name ?? '').trim(),
    rank: String(it.rank ?? '').trim(),
    unit: parseUnit(it.unit),
    price: parseNum(it.dpr1),
    baseline: {
      weekAgo: parseNum(it.dpr3),
      twoWeeksAgo: parseNum(it.dpr4),
      monthAgo: parseNum(it.dpr5),
      yearAgo: parseNum(it.dpr6),
      normalYear: parseNum(it.dpr7),
    },
  }))
}
