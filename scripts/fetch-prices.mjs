import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCategoryResponse } from './lib/parse-kamis.mjs'

const API_BASE = 'https://www.kamis.or.kr/service/price/xml.do'
// 식량작물(감자·고구마·옥수수), 채소류, 과일류
const CATEGORY_CODES = ['100', '200', '400']

/** KST 기준 YYYY-MM-DD */
export function kstDateString(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
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
    const res = await fetchFn(url.toString())
    if (!res.ok) throw new Error(`KAMIS HTTP ${res.status} (부류 ${categoryCode})`)
    entries.push(...parseCategoryResponse(await res.json()))
  }
  return { schemaVersion: 1, fetchedAt: new Date().toISOString(), entries }
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
  const regday = dateArg ?? kstDateString()
  const outPath = fileURLToPath(new URL('../public/data/prices.json', import.meta.url))
  try {
    const snapshot = await buildSnapshot({ certKey, certId, regday })
    if (snapshot.entries.length === 0) throw new Error('응답에 품목이 없습니다')
    writeSnapshot(snapshot, outPath)
    console.log(`prices.json 갱신: ${snapshot.entries.length}개 항목 (${regday})`)
  } catch (err) {
    console.error('가격 수집 실패 — prices.json은 변경하지 않음:', err.message)
    process.exit(1)
  }
}
