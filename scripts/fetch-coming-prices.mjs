import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { buildLatestSnapshot, writeSnapshot } from './fetch-prices.mjs'

/** 작년 12개월치를 각 달 15일 기준으로 모아 씨앗을 만든다. buildFn 주입으로 테스트 가능.
 *  15일이 휴장이면 buildLatestSnapshot이 최대 7일 소급해 유효 조사일을 찾는다. */
export async function buildComingSeed({ year, buildFn }) {
  const months = {}
  for (let m = 1; m <= 12; m++) {
    const from = `${year}-${String(m).padStart(2, '0')}-15`
    const snap = await buildFn(from)
    months[String(m)] = snap.entries
  }
  return { collectedYear: year, months }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const certKey = process.env.KAMIS_CERT_KEY
  const certId = process.env.KAMIS_CERT_ID
  if (!certKey || !certId) {
    console.error('KAMIS_CERT_KEY / KAMIS_CERT_ID 환경변수가 필요합니다')
    process.exit(1)
  }
  const yearArg = process.argv.find((a) => a.startsWith('--year='))?.slice('--year='.length)
  const year = yearArg ? Number(yearArg) : new Date().getFullYear() - 1 // 기본: 작년
  const outPath = fileURLToPath(new URL('../public/data/coming-prices.json', import.meta.url))
  const buildFn = (from) => buildLatestSnapshot({ certKey, certId, from })
  try {
    const seed = await buildComingSeed({ year, buildFn })
    const counts = Object.entries(seed.months).map(([m, e]) => `${m}월 ${e.length}`).join(' · ')
    writeSnapshot(seed, outPath)
    console.log(`coming-prices.json 갱신(${year}년): ${counts}`)
  } catch (err) {
    console.error('다가오는 가격 수집 실패 — coming-prices.json은 변경하지 않음:', err.message)
    process.exit(1)
  }
}
