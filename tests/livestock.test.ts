import { describe, expect, test } from 'vitest'
import { buildAppView, buildLivestockView } from '../src/app'
import type { PriceSnapshot, ProduceProfile } from '../src/types'

function profile(over: Partial<ProduceProfile>): ProduceProfile {
  return {
    id: 'x', name: '품목', emoji: '🥩', category: 'livestock',
    kamis: { categoryCode: '500', itemName: '품목' },
    seasonMonths: [], peakMonths: [], whyNow: { default: '설명' },
    howToPick: 'p', howToStore: 's', howToUse: 'u', ...over,
  }
}
const entry = (itemName: string, price: number | null) => ({
  itemName, kindName: '', rank: '상품',
  unit: { quantity: 100, measure: { kind: 'weight' as const, unit: 'g' as const } },
  price,
  baseline: { weekAgo: null, twoWeeksAgo: null, monthAgo: price === null ? null : price + 1000, yearAgo: null, normalYear: null },
})
function snapshot(entries: ReturnType<typeof entry>[]): PriceSnapshot {
  return { schemaVersion: 1, fetchedAt: '2026-07-21T00:00:00Z', surveyedOn: '2026-07-21', entries }
}
const now = new Date('2026-07-21T09:00:00+09:00')

describe('buildLivestockView', () => {
  test('축산물만 고른다 (제철 카테고리는 배제)', () => {
    const profiles = [
      profile({ id: 'pork', name: '삼겹살', kamis: { categoryCode: '500', itemName: '돼지고기' } }),
      profile({ id: 'apple', name: '사과', category: 'fruit', kamis: { categoryCode: '400', itemName: '사과' }, seasonMonths: [9] }),
    ]
    const view = buildLivestockView(profiles, snapshot([entry('돼지고기', 2000)]), null, null, now)
    expect(view.cards.map((c) => c.name)).toEqual(['삼겹살'])
  })

  test('제철 무관하게 축산물 전부 후보 (seasonMonths 빈 배열이어도 포함)', () => {
    const profiles = [profile({ id: 'egg', name: '계란', kamis: { categoryCode: '500', itemName: '계란' } })]
    const view = buildLivestockView(profiles, snapshot([entry('계란', 6000)]), null, null, now)
    expect(view.cards).toHaveLength(1)
  })

  test('하락 큰 순으로 정렬, null 가격은 맨 뒤', () => {
    const profiles = [
      profile({ id: 'a', name: '작은하락', kamis: { categoryCode: '500', itemName: 'A' } }),
      profile({ id: 'b', name: '큰하락', kamis: { categoryCode: '500', itemName: 'B' } }),
      profile({ id: 'c', name: '무가격', kamis: { categoryCode: '500', itemName: 'C' } }),
    ]
    const snap = snapshot([
      { ...entry('A', 9500), baseline: { weekAgo: null, twoWeeksAgo: null, monthAgo: 10000, yearAgo: null, normalYear: null } }, // -5%
      { ...entry('B', 8000), baseline: { weekAgo: null, twoWeeksAgo: null, monthAgo: 10000, yearAgo: null, normalYear: null } }, // -20%
      entry('C', null),
    ])
    const view = buildLivestockView(profiles, snap, null, null, now)
    expect(view.cards.map((c) => c.name)).toEqual(['큰하락', '작은하락', '무가격'])
  })

  test('축산물 카드에 절정 뱃지 없음 (inPeak=false)', () => {
    const profiles = [profile({ id: 'egg', name: '계란', kamis: { categoryCode: '500', itemName: '계란' }, peakMonths: [7] })]
    const view = buildLivestockView(profiles, snapshot([entry('계란', 6000)]), null, null, now)
    expect(view.cards[0].inPeak).toBe(false)
  })
})

describe('제철 라우트 누수 방지', () => {
  test('buildAppView.searchIndex에 축산물이 들어가지 않는다', () => {
    const profiles = [
      profile({ id: 'beef', name: '한우 1등급', kamis: { categoryCode: '500', itemName: '쇠고기' } }),
      profile({ id: 'apple', name: '사과', category: 'fruit', kamis: { categoryCode: '400', itemName: '사과' }, seasonMonths: [9] }),
    ]
    const view = buildAppView(profiles, null, null, null, now)
    expect(view.searchIndex.map((h) => h.name)).not.toContain('한우 1등급')
  })
})
