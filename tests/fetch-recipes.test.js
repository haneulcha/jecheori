import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { buildRecipeSnapshot } from '../scripts/fetch-recipes.mjs'

const tomato = JSON.parse(
  readFileSync(new URL('./fixtures/cookrcp-tomato.json', import.meta.url), 'utf-8'),
)
const profiles = [
  { name: '토마토', recipeRef: { names: ['토마토달걀볶음'] } },
  { name: '감자' }, // recipeRef 없음 → 건너뜀
  { name: '방울토마토', recipeRef: { names: ['토마토달걀볶음'] } }, // 중복 name
]

test('recipeRef 있는 프로필만 조회하고 중복 name은 한 번만 호출한다', async () => {
  const calls = []
  const fetchFn = async (url) => {
    calls.push(decodeURIComponent(url.split('RCP_NM=')[1]))
    return { ok: true, json: async () => tomato }
  }
  const snap = await buildRecipeSnapshot({ key: 'K', profiles, fetchFn })
  expect(calls).toEqual(['토마토달걀볶음']) // 감자 스킵, 중복 1회
  expect(snap.schemaVersion).toBe(1)
  expect(snap.entries).toHaveLength(1)
  expect(snap.entries[0].name).toBe('토마토달걀볶음')
  expect(new Date(snap.fetchedAt).getTime()).not.toBeNaN()
})

test('요청 URL에 키가 경로로, RCP_NM이 인코딩되어 들어간다', async () => {
  let url
  const fetchFn = async (u) => { url = u; return { ok: true, json: async () => tomato } }
  await buildRecipeSnapshot({ key: 'MYKEY', profiles: [profiles[0]], fetchFn })
  expect(url).toContain('/api/MYKEY/COOKRCP01/json/1/50/RCP_NM=')
  expect(url).toContain(encodeURIComponent('토마토달걀볶음'))
})

test('HTTP 오류면 throw', async () => {
  const fetchFn = async () => ({ ok: false, status: 500 })
  await expect(
    buildRecipeSnapshot({ key: 'K', profiles, fetchFn }),
  ).rejects.toThrow(/500/)
})
