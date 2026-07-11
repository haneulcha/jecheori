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
  expect(url).toContain('/api/MYKEY/COOKRCP01/json/1/100/RCP_NM=')
  expect(url).toContain(encodeURIComponent('토마토달걀볶음'))
})

test('공백 있는 이름은 첫 토큰으로 조회하고 파서가 전체 이름을 정확일치한다', async () => {
  // 경로 필터가 공백에서 깨지므로 "복숭아 화채"는 첫 토큰 "복숭아"로 조회해야 한다.
  const peachFixture = {
    COOKRCP01: {
      RESULT: { CODE: 'INFO-000' },
      row: [
        { RCP_NM: '복숭아샤벳', RCP_PARTS_DTLS: '복숭아', MANUAL01: '1. 간다' },
        { RCP_NM: '복숭아 화채', RCP_PARTS_DTLS: '복숭아, 식혜', MANUAL01: '1. 썬다' },
      ],
    },
  }
  let queried
  const fetchFn = async (u) => {
    queried = decodeURIComponent(u.split('RCP_NM=')[1])
    return { ok: true, json: async () => peachFixture }
  }
  const snap = await buildRecipeSnapshot({
    key: 'K',
    profiles: [{ name: '복숭아', recipeRef: { names: ['복숭아 화채'] } }],
    fetchFn,
  })
  expect(queried).toBe('복숭아') // 첫 토큰으로 조회(공백 필터 회피)
  expect(snap.entries).toHaveLength(1)
  expect(snap.entries[0].name).toBe('복숭아 화채') // 파서가 전체 이름 정확일치
})

test('HTTP 오류면 throw', async () => {
  const fetchFn = async () => ({ ok: false, status: 500 })
  await expect(
    buildRecipeSnapshot({ key: 'K', profiles, fetchFn }),
  ).rejects.toThrow(/500/)
})
