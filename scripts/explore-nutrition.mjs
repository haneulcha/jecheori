import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { nutritionFieldsOf } from './lib/parse-nutrition.mjs'
import { rankNutritionCandidates } from './lib/rank-nutrition-candidates.mjs'

const API = 'https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02'

/** 프로필 id → 식약처 검색어(부분일치). 첫 탐색 후 노이즈/무결과면 조정해 재실행.
 *  category1은 응답에서 실제값을 캡처하므로 여기서 좁히지 않는다. */
const SEARCH_TERMS = {
  watermelon: ['수박'], 'korean-melon': ['참외'], cucumber: ['오이'],
  zucchini: ['애호박', '호박'], potato: ['감자'], corn: ['옥수수'], spinach: ['시금치'],
  pear: ['배'], grape: ['포도'], 'shine-muscat': ['샤인', '포도'], mandarin: ['감귤', '귤'],
  'sweet-persimmon': ['단감', '감'], kiwi: ['참다래', '키위'], strawberry: ['딸기'],
  melon: ['멜론'], 'napa-cabbage': ['배추'], cabbage: ['양배추'], lettuce: ['상추'],
  'eolgari-cabbage': ['얼갈이'], 'garlic-chives': ['부추'], 'perilla-leaf': ['깻잎'],
  'sweet-pumpkin': ['단호박', '호박'], 'cherry-tomato': ['방울토마토', '토마토'],
  eggplant: ['가지'], 'green-chili': ['풋고추', '고추'], paprika: ['파프리카'],
  radish: ['무'], 'young-radish': ['열무'], carrot: ['당근'], broccoli: ['브로콜리'],
  'green-onion': ['대파', '파'], scallion: ['쪽파', '실파'], onion: ['양파'],
  garlic: ['마늘'], ginger: ['생강'], 'sweet-potato': ['고구마'], minari: ['미나리'],
}

/** foodDb 없는 프로필을 식약처 API로 조회해 변형 후보 + 순위를 만든다. fetchFn 주입으로 테스트. */
export async function buildNutritionCandidates({ key, profiles, fetchFn = fetch }) {
  const results = []
  for (const p of profiles) {
    if (p.foodDb) continue
    const terms = SEARCH_TERMS[p.id] ?? [p.name]
    const byName = new Map()
    for (const term of terms) {
      const url = new URL(API)
      url.searchParams.set('serviceKey', key)
      url.searchParams.set('type', 'json')
      url.searchParams.set('numOfRows', '100')
      url.searchParams.set('FOOD_NM_KR', term)
      const res = await fetchFn(url.toString())
      if (!res.ok) throw new Error(`FoodNtr HTTP ${res.status} (${p.name}/${term})`)
      const json = await res.json()
      const raw = json?.body?.items
      if (raw === undefined || raw === null) {
        const header = json?.header
        if (!header) throw new Error(`FoodNtr 응답 이상: header 없음 (${term})`)
        if (header.resultCode !== '00') {
          throw new Error(`FoodNtr 오류: ${header.resultMsg ?? header.resultCode} (${term})`)
        }
        continue // 정상 무결과 (resultCode '00', items 없음)
      }
      const items = Array.isArray(raw) ? raw : [raw]
      for (const it of items) {
        if (!byName.has(it.FOOD_NM_KR)) {
          byName.set(it.FOOD_NM_KR, {
            foodName: it.FOOD_NM_KR,
            category1: it.FOOD_CAT1_NM ?? '',
            ...nutritionFieldsOf(it),
          })
        }
      }
    }
    const { pick, ranked, flag } = rankNutritionCandidates([...byName.values()])
    results.push({ id: p.id, name: p.name, searchTerms: terms, flag, pick, candidates: ranked })
  }
  return results
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
  const outPath = fileURLToPath(new URL('../nutrition-candidates.json', import.meta.url))
  try {
    const candidates = await buildNutritionCandidates({ key, profiles })
    writeFileSync(outPath, JSON.stringify(candidates, null, 2))
    const flagCount = (f) => candidates.filter((c) => c.flag === f).length
    console.log(
      `nutrition-candidates.json: ${candidates.length}종 ` +
        `(ok ${flagCount('ok')} · cooked ${flagCount('cooked')} · no-match ${flagCount('no-match')})`,
    )
  } catch (err) {
    console.error('탐색 실패:', err.message)
    process.exit(1)
  }
}
