import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const API_BASE = 'https://www.kamis.or.kr/service/price/xml.do'

/** KAMIS가 UA·Accept 없는 요청을 406으로 막는다(fetch-prices와 동일). */
const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; jecheori/1.0; +https://github.com/haneulcha/jecheori)',
  Accept: 'application/json, text/javascript, */*; q=0.01',
}

/** 부류 600 원시 응답을 parseUnit 없이 열거한다 — 단위를 **가르치기 전에** 발견하는 게 목적.
 *  parseCategoryResponse는 모르는 단위(마리·근)에 throw하므로 여기선 원시 필드를 직접 읽는다. */
export function summarizeSeafood(json) {
  const data = json?.data
  if (Array.isArray(data)) {
    if (data.length === 1 && data[0] === '001') return { items: [], units: [] }
    throw new Error(`KAMIS 오류 응답: ${JSON.stringify(data)}`)
  }
  if (!data) throw new Error(`KAMIS 오류 응답: ${JSON.stringify(json)}`)
  if (data.error_code && data.error_code !== '000') throw new Error(`KAMIS error_code=${data.error_code}`)
  const raw = Array.isArray(data.item) ? data.item : [data.item].filter(Boolean)
  const items = raw.map((it) => ({
    itemName: String(it.item_name ?? '').trim(),
    kindName: String(it.kind_name ?? '').trim(),
    rank: String(it.rank ?? '').trim(),
    unit: String(it.unit ?? '').trim(),
    price: it.dpr1 ?? null,
  }))
  const units = [...new Set(items.map((i) => i.unit).filter(Boolean))].sort()
  return { items, units }
}

/** 부류 600 하루치를 조회해 품목·단위를 요약. fetchFn 주입으로 테스트. */
export async function probeSeafood({ certKey, certId, regday, fetchFn = fetch }) {
  const url = new URL(API_BASE)
  url.searchParams.set('action', 'dailyPriceByCategoryList')
  url.searchParams.set('p_product_cls_code', '01') // 소매
  url.searchParams.set('p_item_category_code', '600') // 수산물
  url.searchParams.set('p_country_code', '') // 전체 평균
  url.searchParams.set('p_regday', regday)
  url.searchParams.set('p_convert_kg_yn', 'N') // 단위 보존 — 마리·근을 그대로 보려면 필수
  url.searchParams.set('p_cert_key', certKey)
  url.searchParams.set('p_cert_id', certId)
  url.searchParams.set('p_returntype', 'json')
  const res = await fetchFn(url.toString(), { headers: REQUEST_HEADERS })
  if (!res.ok) throw new Error(`KAMIS HTTP ${res.status} (부류 600)`)
  return summarizeSeafood(await res.json())
}

const isMain =
  import.meta.url && process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  ;(async () => {
    const certKey = process.env.KAMIS_CERT_KEY
    const certId = process.env.KAMIS_CERT_ID
    if (!certKey || !certId) {
      console.error('KAMIS_CERT_KEY / KAMIS_CERT_ID 환경변수가 필요합니다')
      process.exit(1)
    }
    // regday 미지정이면 KST 오늘 (KAMIS는 YYYY-MM-DD)
    const regday = process.argv[2] ?? new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)
    try {
      const { items, units } = await probeSeafood({ certKey, certId, regday })
      console.log(`부류 600 (${regday}): ${items.length}개 항목, 단위 ${units.length}종 → ${units.join(', ')}`)
      for (const it of items) {
        console.log(`  ${it.itemName} / ${it.kindName || '-'} / ${it.unit} / ${it.price ?? '-'} [${it.rank}]`)
      }
    } catch (err) {
      console.error('프로브 실패:', err.message)
      process.exit(1)
    }
  })()
}
