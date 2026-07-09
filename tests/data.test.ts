import { afterEach, describe, expect, test, vi } from 'vitest'
import { loadProfiles, loadSnapshot, snapshotAgeDays } from '../src/data'
import type { PriceSnapshot, ProduceProfile } from '../src/types'

const snap: PriceSnapshot = {
  schemaVersion: 1,
  fetchedAt: '2026-07-07T22:00:00Z',
  entries: [],
}

afterEach(() => vi.unstubAllGlobals())

describe('snapshotAgeDays', () => {
  test('만 3일 지난 스냅샷은 3', () => {
    expect(snapshotAgeDays(snap, new Date('2026-07-10T23:00:00Z'))).toBe(3)
  })
  test('당일이면 0', () => {
    expect(snapshotAgeDays(snap, new Date('2026-07-08T01:00:00Z'))).toBe(0)
  })
  test('now가 fetchedAt보다 이르면 음수 대신 0', () => {
    expect(snapshotAgeDays(snap, new Date('2026-07-05T00:00:00Z'))).toBe(0)
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
