import { describe, expect, test } from 'vitest'
import { signedChange, sortCards } from '../src/cardlist'
import type { CardView } from '../src/card'
import { count } from './units'

function card(over: Partial<CardView>): CardView {
  return {
    emoji: '🥬', name: '품목', kind: '', category: 'vegetable', inPeak: false,
    whyNow: '', note: { pick: 'p', store: 's', use: 'u' },
    price: null, nutrition: null, recipes: null, ...over,
  }
}
function withPrice(name: string, now: number, ch: { kind: 'fall' | 'rise'; pct: number } | { kind: 'similar' } | null): CardView {
  return card({ name, price: { now, wasMonthAgo: null, unit: count(1, '개'), perUnit: null, change: ch, spark: null } })
}

describe('signedChange', () => {
  test('하락은 음수', () => expect(signedChange(withPrice('a', 100, { kind: 'fall', pct: 23 }))).toBe(-23))
  test('상승은 양수', () => expect(signedChange(withPrice('a', 100, { kind: 'rise', pct: 13 }))).toBe(13))
  test('비슷은 0', () => expect(signedChange(withPrice('a', 100, { kind: 'similar' }))).toBe(0))
  test('기준선 없으면 null', () => expect(signedChange(withPrice('a', 100, null))).toBeNull())
  test('무가격이면 null', () => expect(signedChange(card({ price: null }))).toBeNull())
})

describe('sortCards', () => {
  test('drop: 큰 하락 먼저, 상승은 아래, 무가격 맨 뒤', () => {
    const cards = [
      withPrice('상승', 100, { kind: 'rise', pct: 13 }),
      card({ name: '무가격', price: null }),
      withPrice('큰하락', 100, { kind: 'fall', pct: 26 }),
      withPrice('작은하락', 100, { kind: 'fall', pct: 11 }),
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
})
