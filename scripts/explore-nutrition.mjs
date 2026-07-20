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
  'eolgari-cabbage': ['얼갈이'], 'garlic-chives': ['부추'], 'perilla-leaf': ['깻잎', '들깨'],
  'sweet-pumpkin': ['단호박', '호박'], 'cherry-tomato': ['방울토마토', '토마토'],
  eggplant: ['가지'], 'green-chili': ['풋고추', '고추'], paprika: ['파프리카'],
  radish: ['무'], 'young-radish': ['열무'], carrot: ['당근'], broccoli: ['브로콜리'],
  'green-onion': ['대파', '파'], scallion: ['쪽파', '실파'], onion: ['양파'],
  garlic: ['마늘'], ginger: ['생강'], 'sweet-potato': ['고구마'], minari: ['미나리'],
}

const RAW_CATEGORIES = ['과일류', '채소류', '감자 및 전분류', '곡류']

/** 품목별 원물 카테고리(프로브 확정). 미매핑 품목은 RAW_CATEGORIES 전부(안전 폴백). */
const ITEM_CATEGORIES = {
  // 과일류
  watermelon: ['과일류'], 'korean-melon': ['과일류'], pear: ['과일류'], grape: ['과일류'],
  'shine-muscat': ['과일류'], mandarin: ['과일류'], 'sweet-persimmon': ['과일류'],
  kiwi: ['과일류'], strawberry: ['과일류'], melon: ['과일류'],
  // 채소류
  cucumber: ['채소류'], zucchini: ['채소류'], spinach: ['채소류'], 'napa-cabbage': ['채소류'],
  cabbage: ['채소류'], lettuce: ['채소류'], 'eolgari-cabbage': ['채소류'],
  'garlic-chives': ['채소류'], 'perilla-leaf': ['채소류'], 'sweet-pumpkin': ['채소류'],
  'cherry-tomato': ['채소류'], eggplant: ['채소류'], 'green-chili': ['채소류'],
  paprika: ['채소류'], radish: ['채소류'], 'young-radish': ['채소류'], carrot: ['채소류'],
  broccoli: ['채소류'], 'green-onion': ['채소류'], scallion: ['채소류'], onion: ['채소류'],
  garlic: ['채소류'], ginger: ['채소류'], minari: ['채소류'],
  // 전분성 (프로브 확정: 감자·고구마뿌리=감자 및 전분류, 옥수수알곡=곡류)
  potato: ['감자 및 전분류'], 'sweet-potato': ['감자 및 전분류'], corn: ['곡류'],
}

/** 한 프로필의 후보를 그 품목 카테고리들에서 모아 순위화. */
async function candidatesForProfile(p, { key, fetchFn }) {
  const terms = SEARCH_TERMS[p.id] ?? [p.name]
  const categories = ITEM_CATEGORIES[p.id] ?? RAW_CATEGORIES
  const byName = new Map()
  for (const term of terms) {
    for (const category1 of categories) {
      const url = new URL(API)
      url.searchParams.set('serviceKey', key)
      url.searchParams.set('type', 'json')
      url.searchParams.set('numOfRows', '500')
      url.searchParams.set('pageNo', '1')
      url.searchParams.set('FOOD_NM_KR', term)
      url.searchParams.set('FOOD_CAT1_NM', category1)
      const res = await fetchFn(url.toString())
      if (!res.ok) throw new Error(`FoodNtr HTTP ${res.status} (${p.name}/${term}/${category1})`)
      const json = await res.json()
      const header = json?.header
      if (!header) throw new Error(`FoodNtr 응답 이상: header 없음 (${term}/${category1})`)
      if (header.resultCode !== '00') {
        throw new Error(`FoodNtr 오류: ${header.resultMsg ?? header.resultCode} (${term}/${category1})`)
      }
      const raw = json?.body?.items
      if (raw === undefined || raw === null) continue // 그 카테고리에 결과 없음
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
  }
  const { pick, ranked, flag } = rankNutritionCandidates([...byName.values()])
  return { id: p.id, name: p.name, searchTerms: terms, flag, pick, candidates: ranked }
}

/** 동시성 한도를 지키며 items를 fn에 매핑. 결과는 입력 순서 유지. */
async function mapPool(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const idx = next++
      results[idx] = await fn(items[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

/** foodDb 없는 프로필을 원물 카테고리별로 조회해 후보 + 순위를 만든다. fetchFn 주입으로 테스트. */
export async function buildNutritionCandidates({ key, profiles, fetchFn = fetch, concurrency = 8 }) {
  const targets = profiles.filter((p) => !p.foodDb)
  return mapPool(targets, concurrency, (p) => candidatesForProfile(p, { key, fetchFn }))
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
