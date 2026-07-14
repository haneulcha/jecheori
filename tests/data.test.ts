import { afterEach, describe, expect, test, vi } from 'vitest'
import { loadProfiles, loadSnapshot, snapshotAgeDays } from '../src/data'
import type { PriceSnapshot, ProduceProfile } from '../src/types'

const snap: PriceSnapshot = {
  schemaVersion: 2,
  // 수집은 7/10에 돌았지만 실제 조사일은 7/7 — 공표 전·휴장일이면 이렇게 벌어진다
  fetchedAt: '2026-07-10T08:00:00Z',
  surveyedOn: '2026-07-07',
  entries: [],
}

afterEach(() => vi.unstubAllGlobals())

describe('snapshotAgeDays', () => {
  test('조사일로 잰다 — 수집시각이 아니다', () => {
    // 조사일 7/7 KST 자정 기준, 7/10 09:00 KST = 만 3일
    expect(snapshotAgeDays(snap, new Date('2026-07-10T00:00:00Z'))).toBe(3)
  })

  test('조사 당일이면 0', () => {
    expect(snapshotAgeDays(snap, new Date('2026-07-07T11:00:00Z'))).toBe(0)
  })

  test('now가 조사일보다 이르면 음수 대신 0', () => {
    expect(snapshotAgeDays(snap, new Date('2026-07-05T00:00:00Z'))).toBe(0)
  })

  test('fetchedAt이 오늘이어도 조사일이 오래됐으면 오래된 것이다', () => {
    // cron이 매일 도니까 fetchedAt으로 재면 늘 0이 된다 — 그 구멍을 막는 테스트
    const daily: PriceSnapshot = { ...snap, fetchedAt: '2026-07-13T08:00:00Z' }
    expect(snapshotAgeDays(daily, new Date('2026-07-13T08:00:00Z'))).toBe(6)
  })
})

describe('loadProfiles', () => {
  test('성공 시 프로필 배열', async () => {
    const profiles: ProduceProfile[] = [
      {
        id: 'apple',
        name: '사과',
        emoji: '🍎',
        category: 'fruit',
        kamis: { categoryCode: '400', itemName: '사과' },
        seasonMonths: [9, 10, 11],
        peakMonths: [10],
        whyNow: { default: '가을이 제철' },
        howToPick: '단단하고 향이 좋은 것',
        howToStore: '냉장 보관',
        howToUse: '생과일로',
      },
    ]
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => profiles }))
    expect(await loadProfiles()).toEqual(profiles)
  })
  test('실패 시 throw (상태 코드 포함)', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: false, status: 404 }))
    await expect(loadProfiles()).rejects.toThrow(/404/)
  })
})

describe('loadSnapshot', () => {
  test('fetch 실패 시 null (가격 없이도 앱은 동작)', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: false, status: 404 }))
    expect(await loadSnapshot()).toBeNull()
  })
  test('네트워크 예외에도 null', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('offline')
    })
    expect(await loadSnapshot()).toBeNull()
  })
  test('성공 시 파싱된 스냅샷', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => snap }))
    expect(await loadSnapshot()).toEqual(snap)
  })
})
