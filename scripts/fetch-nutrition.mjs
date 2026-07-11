import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseNutritionEntry } from './lib/parse-nutrition.mjs'
import { writeSnapshot } from './fetch-prices.mjs'

const API = 'https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02'

/** foodDb 참조가 있는 프로필만 조회해 NutritionSnapshot 생성. fetchFn 주입으로 테스트. */
export async function buildNutritionSnapshot({ key, profiles, fetchFn = fetch }) {
  const entries = []
  for (const p of profiles) {
    if (!p.foodDb) continue
    const url = new URL(API)
    url.searchParams.set('serviceKey', key)
    url.searchParams.set('type', 'json')
    url.searchParams.set('numOfRows', '50')
    url.searchParams.set('FOOD_NM_KR', p.foodDb.foodName)
    url.searchParams.set('FOOD_CAT1_NM', p.foodDb.category1)
    const res = await fetchFn(url.toString())
    if (!res.ok) throw new Error(`FoodNtr HTTP ${res.status} (${p.name})`)
    const entry = parseNutritionEntry(await res.json(), p.foodDb.foodName)
    if (entry) entries.push(entry)
  }
  return { schemaVersion: 1, fetchedAt: new Date().toISOString(), entries }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const key = process.env.DATA_GO_KR_KEY
  if (!key) {
    console.error('DATA_GO_KR_KEY 환경변수가 필요합니다')
    process.exit(1)
  }
  const profiles = JSON.parse(
    readFileSync(new URL('../public/data/produce.json', import.meta.url), 'utf-8'),
  )
  const outPath = fileURLToPath(new URL('../public/data/nutrition.json', import.meta.url))
  try {
    const snapshot = await buildNutritionSnapshot({ key, profiles })
    if (snapshot.entries.length === 0) throw new Error('수집된 영양 엔트리가 없습니다')
    writeSnapshot(snapshot, outPath)
    console.log(`nutrition.json 갱신: ${snapshot.entries.length}개`)
  } catch (err) {
    console.error('영양 수집 실패 — nutrition.json은 변경하지 않음:', err.message)
    process.exit(1)
  }
}
