import { describe, expect, test } from 'vitest'
import { perUnitPrice, sparklineGeometry, whyNowLine, toCardView } from '../src/card'
import type { PickResult, PriceView } from '../src/picks'
import type { ProduceProfile } from '../src/types'
import { nutritionView } from '../src/nutrition'
import { recipeView } from '../src/recipe'

const profile: ProduceProfile = {
  id: 'peach',
  name: '복숭아',
  emoji: '🍑',
  category: 'fruit',
  kamis: { categoryCode: '400', itemName: '복숭아', kindName: '백도' },
  seasonMonths: [7, 8],
  peakMonths: [7],
  whyNow: { '7': '칠월 문구', default: '기본' },
  howToPick: '향이 진한 것',
  howToStore: '실온 후숙',
  howToUse: '그냥 먹기',
}

const priceView = (over: Partial<PriceView> = {}): PriceView => ({
  price: 12600,
  unit: { quantity: 10, measure: '개' },
  changeVsMonthAgoPct: -25.4,
  baseline: { monthAgo: 16900, yearAgo: 13400 },
  ...over,
})

const pick = (over: Partial<PickResult> = {}): PickResult => ({
  profile,
  inPeak: true,
  price: priceView(),
  ...over,
})

describe('perUnitPrice', () => {
  test('10개면 개당값', () =>
    expect(perUnitPrice(18200, { quantity: 10, measure: '개' })).toEqual({ each: 1820 }))
  test('반올림', () =>
    expect(perUnitPrice(12600, { quantity: 10, measure: '개' })).toEqual({ each: 1260 }))
  test('1개(단수)는 null', () =>
    expect(perUnitPrice(21400, { quantity: 1, measure: '개' })).toBeNull())
  test('무게 단위는 null', () =>
    expect(perUnitPrice(8000, { quantity: 1, measure: 'kg' })).toBeNull())
  test('100g도 null — 무게는 개당값이 없다', () =>
    expect(perUnitPrice(315, { quantity: 100, measure: 'g' })).toBeNull())
})

describe('sparklineGeometry', () => {
  test('최댓값은 위(y=24), 최솟값은 아래(y=44)', () => {
    const pts = sparklineGeometry({ yearAgo: 13400, monthAgo: 16900, now: 12600 })
    expect(pts.map((p) => p.x)).toEqual([45, 150, 255])
    expect(pts[1].y).toBeCloseTo(24, 1)
    expect(pts[2].y).toBeCloseTo(44, 1)
    expect(pts[0].y).toBeGreaterThan(pts[1].y)
  })
  test('모두 같으면 중앙', () => {
    const pts = sparklineGeometry({ yearAgo: 100, monthAgo: 100, now: 100 })
    expect(pts.every((p) => p.y === 34)).toBe(true)
  })
})

describe('whyNowLine', () => {
  test('해당 월 문구를 쓰고, 없으면 default', () => {
    expect(whyNowLine(profile, 7)).toBe('칠월 문구')
    expect(whyNowLine(profile, 8)).toBe('기본')
  })
})

describe('toCardView', () => {
  test('식별·절정·whyNow·노트를 투영한다', () => {
    const c = toCardView(pick(), 7)
    expect(c.emoji).toBe('🍑')
    expect(c.name).toBe('복숭아')
    expect(c.kind).toBe('백도')
    expect(c.category).toBe('fruit')
    expect(c.inPeak).toBe(true)
    expect(c.whyNow).toBe('칠월 문구')
    expect(c.note).toEqual({ pick: '향이 진한 것', store: '실온 후숙', use: '그냥 먹기' })
  })

  test('kindName 없으면 빈 문자열', () => {
    const p: ProduceProfile = { ...profile, kamis: { categoryCode: '400', itemName: '복숭아' } }
    expect(toCardView(pick({ profile: p }), 7).kind).toBe('')
  })

  test('하락: change fall + 반올림된 pct, 개당값·스파크 계산', () => {
    const c = toCardView(pick({ price: priceView({ changeVsMonthAgoPct: -25.4 }) }), 7)
    expect(c.price?.change).toEqual({ kind: 'fall', pct: 25 })
    expect(c.price?.now).toBe(12600)
    expect(c.price?.wasMonthAgo).toBe(16900)
    expect(c.price?.perUnit).toBe(1260)
    expect(c.price?.spark).not.toBeNull()
  })

  test('상승: change rise', () => {
    const c = toCardView(pick({ price: priceView({ changeVsMonthAgoPct: 13.6 }) }), 7)
    expect(c.price?.change).toEqual({ kind: 'rise', pct: 14 })
  })

  test('변동 미미(<1%)는 similar', () => {
    const c = toCardView(pick({ price: priceView({ changeVsMonthAgoPct: 0.2 }) }), 7)
    expect(c.price?.change).toEqual({ kind: 'similar' })
  })

  test('지난달 없으면 change null · spark null', () => {
    const c = toCardView(
      pick({ price: priceView({ changeVsMonthAgoPct: null, baseline: { monthAgo: null, yearAgo: 13400 } }) }),
      7,
    )
    expect(c.price?.change).toBeNull()
    expect(c.price?.spark).toBeNull()
  })

  test('작년 없으면 spark null', () => {
    const c = toCardView(pick({ price: priceView({ baseline: { monthAgo: 16900, yearAgo: null } }) }), 7)
    expect(c.price?.spark).toBeNull()
  })

  test('무게 단위는 perUnit null', () => {
    const c = toCardView(pick({ price: priceView({ unit: { quantity: 1, measure: 'kg' } }) }), 7)
    expect(c.price?.perUnit).toBeNull()
  })

  test('가격 없으면 price null', () => {
    expect(toCardView(pick({ price: null }), 7).price).toBeNull()
  })

  test('nutrition 인자를 CardView에 얹는다', () => {
    const pick = {
      profile: { emoji: '🍎', name: '사과', category: 'fruit', kamis: { itemName: '사과' }, whyNow: {}, howToPick: '', howToStore: '', howToUse: '', seasonMonths: [7], peakMonths: [] },
      inPeak: false,
      price: null,
    } as any
    const nv = nutritionView({ foodName: '사과_부사_생것', serving: '100g', kcal: 53, carbs: 14.28, protein: 0.2, fat: 0.07, sugar: 11.13, fiber: 1.7 })
    expect(toCardView(pick, 7, nv).nutrition).toEqual({ serving: '100g', kcal: 53, carbs: 14.28, protein: 0.2, fat: 0.07, sugar: 11.13, fiber: 1.7 })
  })

  test('nutrition 인자 없으면 null', () => {
    const pick = {
      profile: { emoji: '🥔', name: '감자', category: 'vegetable', kamis: { itemName: '감자' }, whyNow: {}, howToPick: '', howToStore: '', howToUse: '', seasonMonths: [7], peakMonths: [] },
      inPeak: false,
      price: null,
    } as any
    expect(toCardView(pick, 7).nutrition).toBeNull()
  })

  test('recipes 인자를 CardView에 얹는다', () => {
    const pick = {
      profile: { emoji: '🍅', name: '토마토', category: 'vegetable', kamis: { itemName: '토마토' }, whyNow: {}, howToPick: '', howToStore: '', howToUse: '' },
      inPeak: false,
      price: null,
    } as any
    const rv = recipeView([{ name: '토마토달걀볶음', ingredients: '토마토, 달걀', steps: ['썬다'] }])
    expect(toCardView(pick, 7, null, rv).recipes).toEqual([
      { name: '토마토달걀볶음', ingredients: '토마토, 달걀', steps: ['썬다'] },
    ])
  })

  test('recipes 인자 없으면 null', () => {
    const pick = {
      profile: { emoji: '🥔', name: '감자', category: 'vegetable', kamis: { itemName: '감자' }, whyNow: {}, howToPick: '', howToStore: '', howToUse: '' },
      inPeak: false,
      price: null,
    } as any
    expect(toCardView(pick, 7).recipes).toBeNull()
  })
})
