import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCategoryResponse } from './lib/parse-kamis.mjs'

const API_BASE = 'https://www.kamis.or.kr/service/price/xml.do'
// 식량작물(감자·고구마·옥수수), 채소류, 과일류
const CATEGORY_CODES = ['100', '200', '400']

/** KAMIS가 UA·Accept 없는 요청을 최근 HTTP 406으로 막는다(WAF 봇 차단으로 추정).
 *  브라우저 호환 UA + JSON Accept를 실어 보낸다. p_returntype=json과 짝. */
const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (compatible; jecheori/1.0; +https://github.com/haneulcha/jecheori)',
  Accept: 'application/json, text/javascript, */*; q=0.01',
}

/** 스냅샷 shape 버전. 2 = 조사일(surveyedOn)·관측/기준선 분리·구조화된 단위.
 *  3 = 기준선에 1주·2주전(dpr3·4)·평년(dpr7) 추가 */
const SCHEMA_VERSION = 3

/** 유효한 스냅샷으로 인정하는 최소 가격 보유 비율.
 *  정상 조사일이면 95% 이상이 값을 갖고, 공표 전·휴장일이면 0%다 — 둘은 확실히 갈린다. */
const MIN_PRICED_RATIO = 0.5
const MAX_LOOKBACK_DAYS = 7

/** KST 기준 YYYY-MM-DD */
export function kstDateString(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

/** YYYY-MM-DD를 days만큼 이동 */
export function shiftDateString(ymd, days) {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function pricedRatio(entries) {
  if (entries.length === 0) return 0
  return entries.filter((e) => e.price !== null).length / entries.length
}

/** 하루치 스냅샷 생성. regday를 인자로 받아 과거 날짜 소급 수집도 가능 (열린 설계) */
export async function buildSnapshot({ certKey, certId, regday, fetchFn = fetch }) {
  const entries = []
  for (const categoryCode of CATEGORY_CODES) {
    const url = new URL(API_BASE)
    url.searchParams.set('action', 'dailyPriceByCategoryList')
    url.searchParams.set('p_product_cls_code', '01') // 소매
    url.searchParams.set('p_item_category_code', categoryCode)
    url.searchParams.set('p_country_code', '') // 전체 평균
    url.searchParams.set('p_regday', regday)
    url.searchParams.set('p_convert_kg_yn', 'N')
    url.searchParams.set('p_cert_key', certKey)
    url.searchParams.set('p_cert_id', certId)
    url.searchParams.set('p_returntype', 'json')
    const res = await fetchFn(url.toString(), { headers: REQUEST_HEADERS })
    if (!res.ok) throw new Error(`KAMIS HTTP ${res.status} (부류 ${categoryCode})`)
    entries.push(...parseCategoryResponse(await res.json()))
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    fetchedAt: new Date().toISOString(),
    surveyedOn: regday,
    entries,
  }
}

/** 최근 조사일 스냅샷.
 *
 *  당일 소매가격은 그날 오후에 공표되고 일요일·공휴일엔 조사 자체가 없다. 그래서 "오늘"을
 *  그대로 물으면 아침 실행에선 당일값이 비고, 월요일엔 폴백(1일전=일요일)까지 같이 비어
 *  전 품목이 null이 된다. 값이 찰 때까지 하루씩 거슬러 올라간다.
 */
export async function buildLatestSnapshot({
  certKey,
  certId,
  from,
  maxLookbackDays = MAX_LOOKBACK_DAYS,
  fetchFn = fetch,
}) {
  const tried = []
  for (let back = 0; back <= maxLookbackDays; back++) {
    const regday = shiftDateString(from, -back)
    const snapshot = await buildSnapshot({ certKey, certId, regday, fetchFn })
    if (pricedRatio(snapshot.entries) >= MIN_PRICED_RATIO) return snapshot
    tried.push(regday)
  }
  throw new Error(`유효한 가격이 없습니다 (조회한 날짜: ${tried.join(', ')})`)
}

/** 임시 파일에 쓴 뒤 rename — 도중 실패해도 기존 파일이 깨지지 않는다 */
export function writeSnapshot(snapshot, outPath) {
  mkdirSync(dirname(outPath), { recursive: true })
  const tmp = `${outPath}.tmp`
  writeFileSync(tmp, JSON.stringify(snapshot, null, 2) + '\n')
  renameSync(tmp, outPath)
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const certKey = process.env.KAMIS_CERT_KEY
  const certId = process.env.KAMIS_CERT_ID
  if (!certKey || !certId) {
    console.error('KAMIS_CERT_KEY / KAMIS_CERT_ID 환경변수가 필요합니다')
    process.exit(1)
  }
  const dateArg = process.argv.find((a) => a.startsWith('--date='))?.slice('--date='.length)
  const from = dateArg ?? kstDateString()
  const outPath = fileURLToPath(new URL('../public/data/prices.json', import.meta.url))
  try {
    const snapshot = await buildLatestSnapshot({ certKey, certId, from })
    const priced = snapshot.entries.filter((e) => e.price !== null).length
    writeSnapshot(snapshot, outPath)
    console.log(
      `prices.json 갱신: ${priced}/${snapshot.entries.length}개 항목에 가격 (조사일 ${snapshot.surveyedOn})`,
    )
  } catch (err) {
    console.error('가격 수집 실패 — prices.json은 변경하지 않음:', err.message)
    process.exit(1)
  }
}
