import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { buildNutritionSnapshot } from '../scripts/fetch-nutrition.mjs'

const apple = JSON.parse(
  readFileSync(new URL('./fixtures/foodntr-apple.json', import.meta.url), 'utf-8'),
)
const profiles = [
  { name: '사과', foodDb: { category1: '과일류', foodName: '사과_부사_생것' } },
  { name: '감자' }, // foodDb 없음 → 건너뜀
]

test('foodDb 있는 프로필만 조회하고 엔트리를 모은다', async () => {
  const calls = []
  const fetchFn = async (url) => {
    calls.push(new URL(url).searchParams.get('FOOD_NM_KR'))
    return { ok: true, json: async () => apple }
  }
  const snap = await buildNutritionSnapshot({ key: 'K', profiles, fetchFn })
  expect(calls).toEqual(['사과_부사_생것']) // 감자는 호출 안 함
  expect(snap.schemaVersion).toBe(1)
  expect(snap.entries).toHaveLength(1)
  expect(snap.entries[0].kcal).toBe(53)
  expect(new Date(snap.fetchedAt).getTime()).not.toBeNaN()
})

test('요청에 serviceKey와 카테고리 필터가 들어간다', async () => {
  let sp
  const fetchFn = async (url) => {
    sp = new URL(url).searchParams
    return { ok: true, json: async () => apple }
  }
  await buildNutritionSnapshot({ key: 'MYKEY', profiles, fetchFn })
  expect(sp.get('serviceKey')).toBe('MYKEY')
  expect(sp.get('FOOD_CAT1_NM')).toBe('과일류')
  expect(sp.get('type')).toBe('json')
})

test('HTTP 오류면 throw', async () => {
  const fetchFn = async () => ({ ok: false, status: 500 })
  await expect(
    buildNutritionSnapshot({ key: 'K', profiles, fetchFn }),
  ).rejects.toThrow(/500/)
})
