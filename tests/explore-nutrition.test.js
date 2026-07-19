import { expect, test } from 'vitest'
import { buildNutritionCandidates } from '../scripts/explore-nutrition.mjs'

const ok = (items) => ({
  ok: true,
  json: async () => ({ header: { resultCode: '00' }, body: { items } }),
})

// 카테고리별로 다른 결과를 주는 fetchFn: 채소류엔 오이 생것, 나머지 카테고리는 빈 결과
const cucumberFetch = async (url) => {
  const cat = new URL(url).searchParams.get('FOOD_CAT1_NM')
  if (cat === '채소류') {
    return ok([
      { FOOD_NM_KR: '오이_취청_생것', FOOD_CAT1_NM: '채소류', SERVING_SIZE: '100g', AMT_NUM1: '9.00' },
      { FOOD_NM_KR: '오이지', FOOD_CAT1_NM: '채소류', SERVING_SIZE: '100g', AMT_NUM1: '11.00' },
    ])
  }
  return ok(undefined) // 다른 카테고리엔 결과 없음
}

test('foodDb 없는 프로필만, 품목 카테고리(오이=채소류)로 조회하고 생것을 pick', async () => {
  const cats = []
  const profiles = [
    { id: 'apple', name: '사과', foodDb: { category1: '과일류', foodName: '사과_부사_생것' } },
    { id: 'cucumber', name: '오이' },
  ]
  const fetchFn = async (url) => {
    cats.push(new URL(url).searchParams.get('FOOD_CAT1_NM'))
    return cucumberFetch(url)
  }
  const out = await buildNutritionCandidates({ key: 'K', profiles, fetchFn, concurrency: 1 })
  expect(cats).toEqual(['채소류']) // 오이는 채소류 1개만, 사과는 건너뜀
  expect(out).toHaveLength(1)
  expect(out[0].id).toBe('cucumber')
  expect(out[0].pick.foodName).toBe('오이_취청_생것') // 오이지는 processed로 제외
  expect(out[0].pick.category1).toBe('채소류')
  expect(out[0].pick.kcal).toBe(9)
  expect(out[0].flag).toBe('ok')
})

test('FOOD_NM_KR과 FOOD_CAT1_NM이 요청에 들어간다', async () => {
  let sp
  const fetchFn = async (url) => {
    sp = new URL(url).searchParams
    return ok(undefined)
  }
  await buildNutritionCandidates({ key: 'MYKEY', profiles: [{ id: 'cucumber', name: '오이' }], fetchFn })
  expect(sp.get('serviceKey')).toBe('MYKEY')
  expect(sp.get('numOfRows')).toBe('500')
  expect(sp.get('FOOD_NM_KR')).toBe('오이')
  expect(sp.get('FOOD_CAT1_NM')).toBe('채소류') // 오이는 채소류 하나만
})

test('감자는 감자 및 전분류 카테고리로 질의한다', async () => {
  const cats = []
  const fetchFn = async (url) => {
    cats.push(new URL(url).searchParams.get('FOOD_CAT1_NM'))
    return ok(undefined)
  }
  await buildNutritionCandidates({ key: 'K', profiles: [{ id: 'potato', name: '감자' }], fetchFn, concurrency: 1 })
  expect(cats).toEqual(['감자 및 전분류'])
})

test('미매핑 품목은 원물류 4개 카테고리 전부 질의(안전 폴백)', async () => {
  const cats = []
  const fetchFn = async (url) => {
    cats.push(new URL(url).searchParams.get('FOOD_CAT1_NM'))
    return ok(undefined)
  }
  await buildNutritionCandidates({ key: 'K', profiles: [{ id: 'unknown-x', name: '미지' }], fetchFn, concurrency: 1 })
  expect(cats).toEqual(['과일류', '채소류', '감자 및 전분류', '곡류'])
})

test('오류 헤더면 throw', async () => {
  const fetchFn = async () => ({
    ok: true,
    json: async () => ({ header: { resultCode: '30', resultMsg: 'LIMITED' }, body: {} }),
  })
  await expect(
    buildNutritionCandidates({ key: 'K', profiles: [{ id: 'cucumber', name: '오이' }], fetchFn }),
  ).rejects.toThrow(/LIMITED/)
})

test('header 없는 malformed 응답이면 throw', async () => {
  const fetchFn = async () => ({ ok: true, json: async () => ({ body: {} }) })
  await expect(
    buildNutritionCandidates({ key: 'K', profiles: [{ id: 'cucumber', name: '오이' }], fetchFn }),
  ).rejects.toThrow(/header 없음/)
})

test('HTTP 오류면 throw', async () => {
  const fetchFn = async () => ({ ok: false, status: 500 })
  await expect(
    buildNutritionCandidates({ key: 'K', profiles: [{ id: 'cucumber', name: '오이' }], fetchFn }),
  ).rejects.toThrow(/500/)
})

test('body.items가 단일 객체로 와도 후보로 모은다', async () => {
  const fetchFn = async (url) => {
    const cat = new URL(url).searchParams.get('FOOD_CAT1_NM')
    if (cat === '채소류') {
      return {
        ok: true,
        json: async () => ({
          header: { resultCode: '00' },
          body: {
            items: {
              FOOD_NM_KR: '오이_취청_생것',
              FOOD_CAT1_NM: '채소류',
              SERVING_SIZE: '100g',
              AMT_NUM1: '9.00',
            },
          },
        }),
      }
    }
    return ok(undefined)
  }
  const out = await buildNutritionCandidates({
    key: 'K',
    profiles: [{ id: 'cucumber', name: '오이' }],
    fetchFn,
  })
  expect(out[0].pick.foodName).toBe('오이_취청_생것')
  expect(out[0].flag).toBe('ok')
})

test('전 카테고리 결과 없으면 no-match (pick null, throw 아님)', async () => {
  const fetchFn = async () => ok(undefined)
  const out = await buildNutritionCandidates({
    key: 'K',
    profiles: [{ id: 'cucumber', name: '오이' }],
    fetchFn,
  })
  expect(out[0].flag).toBe('no-match')
  expect(out[0].pick).toBeNull()
})
