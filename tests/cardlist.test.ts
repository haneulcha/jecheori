import { describe, expect, test } from 'vitest'
import { signedChange, sortCards, filterCards, searchCards, searchHints, filterByCategory } from '../src/cardlist'
import type { CardView, SeasonStripView } from '../src/card'
import { count } from './units'

const emptyStrip: SeasonStripView = {
  months: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1, inSeason: false, isPeak: false, isCurrent: false,
  })),
  seasonLabel: '', peakLabel: '', currentMonth: 7,
}

function card(over: Partial<CardView>): CardView {
  return {
    emoji: '🥬', name: '품목', kind: '', category: 'vegetable', inPeak: false,
    whyNow: '', note: { pick: 'p', store: 's', use: 'u' },
    price: null, nutrition: null, recipes: null, season: emptyStrip, ...over,
  }
}

/** 축 분리 회귀 테스트용: 표시 change(값어치)와 monthAgoPct(지난달)를 다르게 설정 */
function card2(name: string, monthAgoPct: number | null, change: any): CardView {
  return card({ name, price: { now: 100, wasMonthAgo: null, unit: count(1, '개'), perUnit: null, monthAgoPct, change, spark: null } })
}
function withPrice(
  name: string,
  now: number,
  ch: { kind: 'fall' | 'rise'; pct: number; basisLabel: string } | { kind: 'similar'; basisLabel: string } | null,
): CardView {
  return card({
    name,
    price: {
      now,
      wasMonthAgo: null,
      unit: count(1, '개'),
      perUnit: null,
      change: ch,
      monthAgoPct: ch && ch.kind !== 'similar' ? (ch.kind === 'fall' ? -ch.pct : ch.pct) : ch ? 0 : null,
      spark: null,
    },
  })
}

describe('signedChange', () => {
  test('하락은 음수', () => expect(signedChange(withPrice('a', 100, { kind: 'fall', pct: 23, basisLabel: '지난달' }))).toBe(-23))
  test('상승은 양수', () => expect(signedChange(withPrice('a', 100, { kind: 'rise', pct: 13, basisLabel: '지난달' }))).toBe(13))
  test('비슷은 0', () => expect(signedChange(withPrice('a', 100, { kind: 'similar', basisLabel: '지난달' }))).toBe(0))
  test('기준선 없으면 null', () => expect(signedChange(withPrice('a', 100, null))).toBeNull())
  test('무가격이면 null', () => expect(signedChange(card({ price: null }))).toBeNull())
  test('축 분리: monthAgoPct(지난달)를 읽음 — 표시 change(값어치)와 무관', () => {
    // 표시는 평년보다 비쌈(rise)이지만 지난달로는 하락(-12)
    expect(signedChange(card2('평년비쌈-지난달하락', -12, { kind: 'rise', pct: 3, basisLabel: '평년' }))).toBe(-12)
  })
})

describe('sortCards', () => {
  test('drop: 큰 하락 먼저, 상승은 아래, 무가격 맨 뒤', () => {
    const cards = [
      withPrice('상승', 100, { kind: 'rise', pct: 13, basisLabel: '지난달' }),
      card({ name: '무가격', price: null }),
      withPrice('큰하락', 100, { kind: 'fall', pct: 26, basisLabel: '지난달' }),
      withPrice('작은하락', 100, { kind: 'fall', pct: 11, basisLabel: '지난달' }),
      withPrice('기준선없음', 100, null),
    ]
    expect(sortCards(cards, 'drop').map((c) => c.name)).toEqual([
      '큰하락', '작은하락', '상승', '기준선없음', '무가격',
    ])
  })
  test('name: 가나다', () => {
    const cards = [card({ name: '나' }), card({ name: '가' }), card({ name: '다' })]
    expect(sortCards(cards, 'name').map((c) => c.name)).toEqual(['가', '나', '다'])
  })
  test('priceLow: 가격 낮은 순, 무가격 뒤', () => {
    const cards = [withPrice('비쌈', 900, null), card({ name: '무', price: null }), withPrice('쌈', 100, null)]
    expect(sortCards(cards, 'priceLow').map((c) => c.name)).toEqual(['쌈', '비쌈', '무'])
  })
  test('원본 불변', () => {
    const cards = [card({ name: '나' }), card({ name: '가' })]
    sortCards(cards, 'name')
    expect(cards.map((c) => c.name)).toEqual(['나', '가'])
  })
  test('축 분리: drop 정렬은 monthAgoPct(지난달) 기준 — 표시 값어치와 무관', () => {
    const cards = [
      card2('평년쌈-지난달상승', 8, { kind: 'fall', pct: 20, basisLabel: '평년' }),
      card2('평년비쌈-지난달하락', -12, { kind: 'rise', pct: 3, basisLabel: '평년' }),
    ]
    // 지난달 기준으로 정렬: -12가 8보다 먼저
    expect(sortCards(cards, 'drop').map((c) => c.name)).toEqual(['평년비쌈-지난달하락', '평년쌈-지난달상승'])
  })
})

describe('filterCards', () => {
  const fruit = card({ name: '수박', category: 'fruit', inPeak: true, price: { now: 100, wasMonthAgo: null, unit: count(1, '개'), perUnit: null, change: { kind: 'fall', pct: 11, basisLabel: '지난달' }, monthAgoPct: -11, spark: null } })
  const vegRise = card({ name: '토마토', category: 'vegetable', inPeak: true, price: { now: 100, wasMonthAgo: null, unit: count(1, '개'), perUnit: null, change: { kind: 'rise', pct: 13, basisLabel: '지난달' }, monthAgoPct: 13, spark: null } })
  const vegNoPrice = card({ name: '가지', category: 'vegetable', inPeak: false, price: null })
  const all = [fruit, vegRise, vegNoPrice]

  test('빈 필터면 전부', () => expect(filterCards(all, new Set())).toHaveLength(3))
  test('내려간 것만', () => expect(filterCards(all, new Set(['drop'])).map((c) => c.name)).toEqual(['수박']))
  test('절정만', () => expect(filterCards(all, new Set(['peak'])).map((c) => c.name)).toEqual(['수박', '토마토']))
  test('가격 있는 것만', () => expect(filterCards(all, new Set(['priced'])).map((c) => c.name)).toEqual(['수박', '토마토']))
  test('AND: 채소(카테고리) + 가격있음', () =>
    expect(filterCards(filterByCategory(all, 'vegetable'), new Set(['priced'])).map((c) => c.name)).toEqual(['토마토']))
  test('축 분리: drop 필터는 monthAgoPct(지난달) 기준 — 표시 값어치와 무관', () => {
    const cards = [
      card2('평년쌈-지난달상승', 8, { kind: 'fall', pct: 20, basisLabel: '평년' }),
      card2('평년비쌈-지난달하락', -12, { kind: 'rise', pct: 3, basisLabel: '평년' }),
    ]
    // 지난달 기준으로 필터: -12만 하락(< 0)
    expect(filterCards(cards, new Set(['drop'])).map((c) => c.name)).toEqual(['평년비쌈-지난달하락'])
  })
})

describe('searchCards / searchHints', () => {
  const cards = [card({ name: '오이' }), card({ name: '참외' }), card({ name: '수박' })]
  test('이름 부분일치', () => expect(searchCards(cards, '외').map((c) => c.name)).toEqual(['참외']))
  test('공백 트림', () => expect(searchCards(cards, ' 오이 ').map((c) => c.name)).toEqual(['오이']))
  test('빈 쿼리는 전체', () => expect(searchCards(cards, '  ')).toHaveLength(3))

  const index = [
    { emoji: '🍓', name: '딸기', seasonLabel: '12~4월', comingSoon: false },
    { emoji: '🍇', name: '포도', seasonLabel: '8~9월', comingSoon: true },
  ]
  test('힌트 부분일치', () => expect(searchHints(index, '딸').map((h) => h.name)).toEqual(['딸기']))
})

describe('filterByCategory', () => {
  const fruit = card({ name: '수박', category: 'fruit' })
  const veg = card({ name: '오이', category: 'vegetable' })
  const sea = card({ name: '굴', category: 'seafood' })
  const all = [fruit, veg, sea]

  test("'all'이면 전부", () => expect(filterByCategory(all, 'all')).toHaveLength(3))
  test('과일만', () => expect(filterByCategory(all, 'fruit').map((c) => c.name)).toEqual(['수박']))
  test('채소만', () => expect(filterByCategory(all, 'vegetable').map((c) => c.name)).toEqual(['오이']))
  test('수산물만', () => expect(filterByCategory(all, 'seafood').map((c) => c.name)).toEqual(['굴']))
  test('없는 카테고리면 빈 목록', () =>
    expect(filterByCategory([fruit], 'seafood')).toEqual([]))
})
