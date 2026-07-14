import { describe, expect, test } from 'vitest'
import { comingMonths, hasDrops, matchEntry, priceView, selectPicks } from '../src/picks'
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

function entry(over: Partial<PriceEntry> = {}): PriceEntry {
  return {
    itemCode: '0',
    itemName: '품목',
    kindName: '기본',
    rank: '상품',
    unit: '1kg',
    price: 1000,
    baseline: { monthAgo: 1000, yearAgo: 1000 },
    ...over,
  }
}

const snap = (entries: PriceEntry[]): PriceSnapshot => ({
  schemaVersion: 2,
  fetchedAt: '2026-07-10T00:00:00Z',
  surveyedOn: '2026-07-10',
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

  test('선호 품종이 지정됐는데 그 품종이 없으면 다른 품종으로 폴백하지 않는다', () => {
    const entries = [entry({ itemName: '호박', kindName: '애호박(1개)' })]
    const p = profile({ kamis: { categoryCode: '200', itemName: '호박', kindName: '단호박' } })
    expect(matchEntry(p, entries)).toBeNull()
  })

  test('KAMIS가 조사하지 않는 품목(kamis 참조 없음)은 null이다', () => {
    // 가지·옥수수·부추·단호박은 소매·도매 어느 쪽에도 없다 — 가격 없이 제철만 보여준다
    const entries = [entry({ itemName: '가지', price: 3000 })]
    const p = profile({ name: '가지', kamis: undefined })
    expect(matchEntry(p, entries)).toBeNull()
  })

  test('일치하는 이름이 없거나 가격이 전부 null이면 null', () => {
    const p = profile({ kamis: { categoryCode: '200', itemName: '멜론' } })
    expect(matchEntry(p, [entry({ itemName: '오이' })])).toBeNull()
    expect(matchEntry(p, [entry({ itemName: '멜론', price: null })])).toBeNull()
  })
})

describe('priceView', () => {
  test('price가 null인 entry는 null을 반환한다', () => {
    expect(priceView(entry({ price: null }))).toBeNull()
  })
})

describe('priceView 기준선 통과', () => {
  test('기준선을 그대로 싣는다', () => {
    const v = priceView(entry({ price: 12600, baseline: { monthAgo: 16900, yearAgo: 13400 } }))
    expect(v).toEqual({
      price: 12600,
      unit: '1kg',
      changeVsMonthAgoPct: expect.closeTo(-25.44, 1),
      baseline: { monthAgo: 16900, yearAgo: 13400 },
    })
  })
  test('결측은 null로 통과', () => {
    const v = priceView(entry({ price: 1000, baseline: { monthAgo: null, yearAgo: null } }))
    expect(v?.baseline).toEqual({ monthAgo: null, yearAgo: null })
    expect(v?.changeVsMonthAgoPct).toBeNull()
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
      entry({ itemName: 'A', price: 500, baseline: { monthAgo: 1000, yearAgo: 1000 } }), // 50% 하락
      entry({ itemName: 'B', price: 1200, baseline: { monthAgo: 1000, yearAgo: 1000 } }), // 20% 상승
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
      entry({ itemName: 'A', price: 950, baseline: { monthAgo: 1000, yearAgo: 1000 } }),
      entry({ itemName: 'B', price: 600, baseline: { monthAgo: 1000, yearAgo: 1000 } }),
    ]
    const picks = selectPicks(profiles, snap(entries), JULY)
    expect(picks.map((p) => p.profile.id)).toEqual(['big-drop', 'small-drop'])
  })

  test('가격 결측 품목은 같은 그룹 맨 뒤로 (제철 정보는 유지)', () => {
    const profiles = [
      profile({ id: 'no-price', kamis: { categoryCode: '200', itemName: '없음' } }),
      profile({ id: 'priced', kamis: { categoryCode: '200', itemName: 'A' } }),
    ]
    const entries = [entry({ itemName: 'A', price: 900, baseline: { monthAgo: 1000, yearAgo: 1000 } })]
    const picks = selectPicks(profiles, snap(entries), JULY)
    expect(picks.map((p) => p.profile.id)).toEqual(['priced', 'no-price'])
    expect(picks[1].price).toBeNull()
  })

  test('가격은 있지만 1개월 전 가격이 없으면 하락률 그룹 뒤, 가격 결측 앞', () => {
    const profiles = [
      profile({ id: 'no-price', kamis: { categoryCode: '200', itemName: '없음' } }),
      profile({ id: 'no-change', kamis: { categoryCode: '200', itemName: 'B' } }),
      profile({ id: 'has-change', kamis: { categoryCode: '200', itemName: 'A' } }),
    ]
    const entries = [
      entry({ itemName: 'A', price: 1100, baseline: { monthAgo: 1000, yearAgo: 1000 } }), // 상승이라도 그룹 0
      entry({ itemName: 'B', price: 800, baseline: { monthAgo: null, yearAgo: null } }),
    ]
    const picks = selectPicks(profiles, snap(entries), JULY)
    expect(picks.map((p) => p.profile.id)).toEqual(['has-change', 'no-change', 'no-price'])
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
    const entries = [entry({ itemName: 'A', price: 880, baseline: { monthAgo: 1000, yearAgo: 1000 } })]
    const picks = selectPicks(profiles, snap(entries), JULY)
    expect(picks[0].price?.changeVsMonthAgoPct).toBeCloseTo(-12)
  })
})

describe('hasDrops', () => {
  const mk = (pct: number | null) => ({
    profile: profile({}),
    inPeak: false,
    price: { price: 1, unit: '1kg', changeVsMonthAgoPct: pct, baseline: { monthAgo: 1, yearAgo: 1 } },
  })
  test('하락이 있으면 true', () => expect(hasDrops([mk(-5)])).toBe(true))
  test('전부 상승/무변동이면 false', () => expect(hasDrops([mk(3), mk(null)])).toBe(false))
})

describe('comingMonths', () => {
  test('다음 두 달을 달별로 묶고, 겹치면 먼저 드는 달에만 놓는다', () => {
    const grape = profile({ id: 'grape', seasonMonths: [8, 9] })
    const chestnut = profile({ id: 'chestnut', seasonMonths: [9, 10] })
    const g = comingMonths([grape, chestnut], 7)
    expect(g.map((x) => x.month)).toEqual([8, 9])
    expect(g[0].items.map((i) => i.profile.id)).toEqual(['grape'])
    expect(g[1].items.map((i) => i.profile.id)).toEqual(['chestnut']) // grape는 8에 이미 배정
  })

  test('이번 달에 이미 제철인 품목은 제외한다', () => {
    const peach = profile({ id: 'peach', seasonMonths: [7, 8] }) // 7월이 현재 → 8월에도 안 나온다
    expect(comingMonths([peach], 7)).toEqual([])
  })

  test('연말을 넘어 다음 해로 랩어라운드한다', () => {
    const g = comingMonths([profile({ id: 'mandarin', seasonMonths: [1] })], 12)
    expect(g.map((x) => x.month)).toEqual([1])
    expect(g[0].items.map((i) => i.profile.id)).toEqual(['mandarin'])
  })

  test('배정된 달에 절정이면 peak=true', () => {
    const g = comingMonths([profile({ id: 'fig', seasonMonths: [9], peakMonths: [9] })], 8)
    expect(g[0].month).toBe(9)
    expect(g[0].items[0].peak).toBe(true)
  })

  test('새로 드는 품목이 없는 달은 결과에서 뺀다', () => {
    const g = comingMonths([profile({ id: 'chestnut', seasonMonths: [9] })], 7) // 8월엔 없음, 9월에만
    expect(g.map((x) => x.month)).toEqual([9])
  })
})
