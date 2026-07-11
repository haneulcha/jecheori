import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseRecipeEntry } from './lib/parse-recipe.mjs'
import { writeSnapshot } from './fetch-prices.mjs'

const BASE = 'http://openapi.foodsafetykorea.go.kr/api'

/** recipeRef 있는 프로필의 각 RCP_NM을 조회해 RecipeSnapshot 생성. fetchFn 주입으로 테스트. */
export async function buildRecipeSnapshot({ key, profiles, fetchFn = fetch }) {
  const entries = []
  const seen = new Set()
  for (const p of profiles) {
    if (!p.recipeRef) continue
    for (const name of p.recipeRef.names) {
      if (seen.has(name)) continue
      seen.add(name)
      const url = `${BASE}/${key}/COOKRCP01/json/1/50/RCP_NM=${encodeURIComponent(name)}`
      const res = await fetchFn(url)
      if (!res.ok) throw new Error(`COOKRCP01 HTTP ${res.status} (${name})`)
      const entry = parseRecipeEntry(await res.json(), name)
      if (entry) entries.push(entry)
    }
  }
  return { schemaVersion: 1, fetchedAt: new Date().toISOString(), entries }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const key = process.env.FOODSAFETY_API_KEY
  if (!key) {
    console.error('FOODSAFETY_API_KEY 환경변수가 필요합니다')
    process.exit(1)
  }
  const profiles = JSON.parse(
    readFileSync(new URL('../public/data/produce.json', import.meta.url), 'utf-8'),
  )
  const outPath = fileURLToPath(new URL('../public/data/recipes.json', import.meta.url))
  try {
    const snapshot = await buildRecipeSnapshot({ key, profiles })
    if (snapshot.entries.length === 0) throw new Error('수집된 레시피 엔트리가 없습니다')
    writeSnapshot(snapshot, outPath)
    console.log(`recipes.json 갱신: ${snapshot.entries.length}개`)
  } catch (err) {
    console.error('레시피 수집 실패 — recipes.json은 변경하지 않음:', err.message)
    process.exit(1)
  }
}
