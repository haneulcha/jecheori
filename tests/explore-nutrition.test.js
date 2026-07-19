import { expect, test } from 'vitest'
import { buildNutritionCandidates } from '../scripts/explore-nutrition.mjs'

const respOf = (items) => ({
  ok: true,
  json: async () => ({ header: { resultCode: '00' }, body: { items } }),
})

const cucumberItems = [
  { FOOD_NM_KR: '오이_취청_생것', FOOD_CAT1_NM: '채소류', SERVING_SIZE: '100g', AMT_NUM1: '9.00' },
  { FOOD_NM_KR: '오이지', FOOD_CAT1_NM: '채소류', SERVING_SIZE: '100g', AMT_NUM1: '11.00' },
]

test('foodDb 없는 프로필만 조회하고 생것을 pick 한다', async () => {
  const calls = []
  const profiles = [
    { id: 'apple', name: '사과', foodDb: { category1: '과일류', foodName: '사과_부사_생것' } },
    { id: 'cucumber', name: '오이' },
  ]
  const fetchFn = async (url) => {
    calls.push(new URL(url).searchParams.get('FOOD_NM_KR'))
    return respOf(cucumberItems)
  }
  const out = await buildNutritionCandidates({ key: 'K', profiles, fetchFn })
  expect(calls).toEqual(['오이']) // 사과는 foodDb 있어 건너뜀
  expect(out).toHaveLength(1)
  expect(out[0].id).toBe('cucumber')
  expect(out[0].pick.foodName).toBe('오이_취청_생것')
  expect(out[0].pick.category1).toBe('채소류') // 실제 FOOD_CAT1_NM 캡처
  expect(out[0].pick.kcal).toBe(9)
  expect(out[0].flag).toBe('ok')
})

test('오류 헤더(resultCode≠00)면 throw — 조용한 실패 방지', async () => {
  const fetchFn = async () => ({
    ok: true,
    json: async () => ({ header: { resultCode: '30', resultMsg: 'LIMITED' }, body: {} }),
  })
  await expect(
    buildNutritionCandidates({ key: 'K', profiles: [{ id: 'cucumber', name: '오이' }], fetchFn }),
  ).rejects.toThrow(/LIMITED/)
})

test('HTTP 오류면 throw', async () => {
  const fetchFn = async () => ({ ok: false, status: 500 })
  await expect(
    buildNutritionCandidates({ key: 'K', profiles: [{ id: 'cucumber', name: '오이' }], fetchFn }),
  ).rejects.toThrow(/500/)
})
