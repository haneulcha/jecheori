import { describe, expect, test } from 'vitest'
import { matchEntry, selectPicks, whyNowLine } from '../src/picks'
import type { PriceEntry, PriceSnapshot, ProduceProfile } from '../src/types'

function profile(over: Partial<ProduceProfile>): ProduceProfile {
  return {
    id: 'x',
    name: '품목',
    emoji: '🥬',
    category: 'vegetable',
    kamis: { categoryCode: '200', itemName: '품목' },
    seasonMonths: [7],
    peakMonths: [],
    whyNow: { default: '기본 문구' },
    howToPick: 'p',
    howToStore: 's',
    howToUse: 'u',
    ...over,
  }
}

function entry(over: Partial<PriceEntry>): PriceEntry {
  return {
    itemCode: '0',
    itemName: '품목',
    kindName: '기본',
    rank: '상품',
    unit: '1kg',
    price: 1000,
    priceMonthAgo: 1000,
    priceYearAgo: 1000,
    ...over,
  }
}

const snap = (entries: PriceEntry[]): PriceSnapshot => ({
  schemaVersion: 1,
  fetchedAt: '2026-07-10T00:00:00Z',
  entries,
})

const JULY = new Date('2026-07-10')

describe('matchEntry', () => {
  test('이름이 일치하고 가격이 있는 상품 등급을 고른다', () => {
    const entries = [
      entry({ itemName: '오이', rank: '중품', price: 700 }),
      entry({ itemName: '오이', rank: '상품', price: 900 }),
    ]
    const p = profile({ kamis: { categoryCode: '200', itemName: '오이' } })
    expect(matchEntry(p, entries)?.rank).toBe('상품')
  })

  test('선호 품종(kindName 부분 일치)을 우선한다', () => {
    const entries = [
      entry({ itemName: '포도', kindName: '캠벨(1kg)' }),
      entry({ itemName: '포도', kindName: '샤인머스캣(1kg)', price: 15000 }),
    ]
    const p = profile({ kamis: { categoryCode: '400', itemName: '포도', kindName: '샤인' } })
    expect(matchEntry(p, entries)?.kindName).toContain('샤인')
  })

  test('일치하는 이름이 없거나 가격이 전부 null이면 null', () => {
    const p = profile({ kamis: { categoryCode: '200', itemName: '멜론' } })
    expect(matchEntry(p, [entry({ itemName: '오이' })])).toBeNull()
    expect(matchEntry(p, [entry({ itemName: '멜론', price: null })])).toBeNull()
  })
})

describe('selectPicks', () => {
  test('이번 달 제철 품목만 나온다', () => {
    const profiles = [
      profile({ id: 'july', seasonMonths: [7] }),
      profile({ id: 'dec', seasonMonths: [12] }),
    ]
    const picks = selectPicks(profiles, snap([]), JULY)
    expect(picks.map((p) => p.profile.id)).toEqual(['july'])
  })

  test('절정 월 품목이 항상 먼저 온다', () => {
    const profiles = [
      profile({ id: 'season-cheap', kamis: { categoryCode: '200', itemName: 'A' } }),
      profile({
        id: 'peak-expensive',
        peakMonths: [7],
        kamis: { categoryCode: '200', itemName: 'B' },
      }),
    ]
    const entries = [
      entry({ itemName: 'A', price: 500, priceMonthAgo: 1000 }), // 50% 하락
      entry({ itemName: 'B', price: 1200, priceMonthAgo: 1000 }), // 20% 상승
    ]
    const picks = selectPicks(profiles, snap(entries), JULY)
    expect(picks.map((p) => p.profile.id)).toEqual(['peak-expensive', 'season-cheap'])
  })

  test('같은 그룹 안에서는 하락률 큰 순', () => {
    const profiles = [
      profile({ id: 'small-drop', kamis: { categoryCode: '200', itemName: 'A' } }),
      profile({ id: 'big-drop', kamis: { categoryCode: '200', itemName: 'B' } }),
    ]
    const entries = [
      entry({ itemName: 'A', price: 950, priceMonthAgo: 1000 }),
      entry({ itemName: 'B', price: 600, priceMonthAgo: 1000 }),
    ]
    const picks = selectPicks(profiles, snap(entries), JULY)
    expect(picks.map((p) => p.profile.id)).toEqual(['big-drop', 'small-drop'])
  })

  test('가격 결측 품목은 같은 그룹 맨 뒤로 (제철 정보는 유지)', () => {
    const profiles = [
      profile({ id: 'no-price', kamis: { categoryCode: '200', itemName: '없음' } }),
      profile({ id: 'priced', kamis: { categoryCode: '200', itemName: 'A' } }),
    ]
    const entries = [entry({ itemName: 'A', price: 900, priceMonthAgo: 1000 })]
    const picks = selectPicks(profiles, snap(entries), JULY)
    expect(picks.map((p) => p.profile.id)).toEqual(['priced', 'no-price'])
    expect(picks[1].price).toBeNull()
  })

  test('최대 limit개까지만', () => {
    const profiles = Array.from({ length: 8 }, (_, i) =>
      profile({ id: `p${i}`, kamis: { categoryCode: '200', itemName: `x${i}` } }),
    )
    expect(selectPicks(profiles, snap([]), JULY)).toHaveLength(5)
    expect(selectPicks(profiles, snap([]), JULY, 3)).toHaveLength(3)
  })

  test('스냅샷이 null이어도 제철 정보만으로 동작한다', () => {
    const picks = selectPicks([profile({ id: 'a' })], null, JULY)
    expect(picks).toHaveLength(1)
    expect(picks[0].price).toBeNull()
  })

  test('changeVsMonthAgoPct 계산: (당일-1개월전)/1개월전×100', () => {
    const profiles = [profile({ kamis: { categoryCode: '200', itemName: 'A' } })]
    const entries = [entry({ itemName: 'A', price: 880, priceMonthAgo: 1000 })]
    const picks = selectPicks(profiles, snap(entries), JULY)
    expect(picks[0].price?.changeVsMonthAgoPct).toBeCloseTo(-12)
  })
})

describe('whyNowLine', () => {
  test('해당 월 문구가 있으면 그걸, 없으면 default', () => {
    const p = profile({ whyNow: { default: '기본', '7': '칠월 문구' } })
    expect(whyNowLine(p, 7)).toBe('칠월 문구')
    expect(whyNowLine(p, 8)).toBe('기본')
  })
})
