import { describe, expect, test } from 'vitest'
import { buildAppView, buildComingView } from '../src/app'
import type { NutritionSnapshot, PriceEntry, PriceSnapshot, ProduceProfile, RecipeSnapshot } from '../src/types'
import { count } from './units'

const peach: ProduceProfile = {
  id: 'peach', name: '복숭아', emoji: '🍑', category: 'fruit',
  kamis: { categoryCode: '400', itemName: '복숭아' },
  seasonMonths: [7, 8], peakMonths: [7],
  whyNow: { default: '여름' }, howToPick: 'p', howToStore: 's', howToUse: 'u',
}
const grape: ProduceProfile = {
  id: 'grape', name: '포도', emoji: '🍇', category: 'fruit',
  kamis: { categoryCode: '400', itemName: '포도' },
  seasonMonths: [8, 9], peakMonths: [9],
  whyNow: { default: '가을' }, howToPick: 'p', howToStore: 's', howToUse: 'u',
}

const snap = (over: Partial<PriceEntry> = {}): PriceSnapshot => ({
  schemaVersion: 2,
  fetchedAt: '2026-07-08T00:00:00Z',
  surveyedOn: '2026-07-08',
  entries: [{
    itemName: '복숭아', kindName: '백도(10개)', rank: '상품',
    unit: count(10),
    price: 18200, baseline: { monthAgo: 24500, yearAgo: 19800 }, ...over,
  }],
})

const JULY = new Date('2026-07-10')

describe('buildAppView', () => {
  test('이번 달 제철 픽을 카드로, 하락이면 noDrop false', () => {
    const v = buildAppView([peach, grape], snap(), null, null, JULY)
    expect(v.cards).toHaveLength(1) // 7월 제철은 복숭아만 (포도는 8월)
    expect(v.cards[0].name).toBe('복숭아')
    expect(v.cards[0].price?.change).toEqual({ kind: 'fall', pct: 26 })
    expect(v.noDrop).toBe(false)
  })

  test('seasonal은 이번 달 제철만', () => {
    const v = buildAppView([peach, grape], snap(), null, null, JULY)
    expect(v.seasonal).toEqual([{ emoji: '🍑', name: '복숭아' }])
  })

  test('term·date를 채운다', () => {
    const v = buildAppView([peach], snap(), null, null, JULY)
    expect(typeof v.term).toBe('string')
    expect(v.date).toBe(JULY)
  })

  test('스냅샷 있으면 dated — 조사일·날수를 싣는다 (2일 전, 임계 없음)', () => {
    // 조사일 7/8, 기준 7/10 → 2일. 임계가 없으니 그대로 dated로 싣는다.
    const v = buildAppView([peach], snap(), null, null, JULY)
    expect(v.freshness).toEqual({ kind: 'dated', surveyedOn: '2026-07-08', days: 2 })
  })

  test('오래된 조사일도 임계 없이 날수 그대로 싣는다 (4일)', () => {
    const old = { ...snap(), surveyedOn: '2026-07-06' } // 7/10 기준 4일
    const v = buildAppView([peach], old, null, null, JULY)
    expect(v.freshness).toEqual({ kind: 'dated', surveyedOn: '2026-07-06', days: 4 })
  })

  test('상승만이면 noDrop true', () => {
    const v = buildAppView([peach], snap({ price: 18200, baseline: { monthAgo: 16000, yearAgo: 19800 } }), null, null, JULY)
    expect(v.noDrop).toBe(true)
  })

  test('스냅샷 없으면 가격 null, freshness는 none (지어낼 조사일이 없다)', () => {
    const v = buildAppView([peach], null, null, null, JULY)
    expect(v.cards[0].price).toBeNull()
    expect(v.freshness).toEqual({ kind: 'none' })
  })

  test('foodDb 매칭 시 카드에 nutrition이 실린다', () => {
    const profiles = [
      { id: 'apple', emoji: '🍎', name: '사과', category: 'fruit', kamis: { categoryCode: '400', itemName: '사과' }, foodDb: { category1: '과일류', foodName: '사과_부사_생것' }, seasonMonths: [7], peakMonths: [], whyNow: {}, howToPick: '', howToStore: '', howToUse: '' },
    ] as any
    const nutrition: NutritionSnapshot = {
      schemaVersion: 1, fetchedAt: '2026-07-11T00:00:00.000Z',
      entries: [{ foodName: '사과_부사_생것', serving: '100g', kcal: 53, carbs: 14.28, protein: 0.2, fat: 0.07, sugar: 11.13, fiber: 1.7 }],
    }
    const view = buildAppView(profiles, null, nutrition, null, new Date('2026-07-11T00:00:00Z'))
    expect(view.cards[0].nutrition).toEqual({ serving: '100g', kcal: 53, carbs: 14.28, protein: 0.2, fat: 0.07, sugar: 11.13, fiber: 1.7 })
    expect(view.hasNutrition).toBe(true)
  })

  test('nutrition 스냅샷 null이면 카드 nutrition은 null', () => {
    const profiles = [
      { id: 'apple', emoji: '🍎', name: '사과', category: 'fruit', kamis: { categoryCode: '400', itemName: '사과' }, foodDb: { category1: '과일류', foodName: '사과_부사_생것' }, seasonMonths: [7], peakMonths: [], whyNow: {}, howToPick: '', howToStore: '', howToUse: '' },
    ] as any
    const view = buildAppView(profiles, null, null, null, new Date('2026-07-11T00:00:00Z'))
    expect(view.cards[0].nutrition).toBeNull()
    expect(view.hasNutrition).toBe(false)
  })

  test('recipeRef 매칭 시 카드에 recipes가 실리고 hasRecipes true', () => {
    const profiles = [
      { id: 'tomato', emoji: '🍅', name: '토마토', category: 'vegetable', kamis: { categoryCode: '200', itemName: '토마토' }, recipeRef: { names: ['토마토달걀볶음'] }, seasonMonths: [7], peakMonths: [], whyNow: {}, howToPick: '', howToStore: '', howToUse: '' },
    ] as any
    const recipes: RecipeSnapshot = {
      schemaVersion: 1, fetchedAt: '2026-07-11T00:00:00.000Z',
      entries: [{ name: '토마토달걀볶음', ingredients: '토마토, 달걀', steps: ['썬다', '볶는다'] }],
    }
    const view = buildAppView(profiles, null, null, recipes, new Date('2026-07-11T00:00:00Z'))
    expect(view.cards[0].recipes).toEqual([{ name: '토마토달걀볶음', ingredients: '토마토, 달걀', steps: ['썬다', '볶는다'] }])
    expect(view.hasRecipes).toBe(true)
  })

  test('recipes 스냅샷 null이면 카드 recipes는 null, hasRecipes false', () => {
    const profiles = [
      { id: 'tomato', emoji: '🍅', name: '토마토', category: 'vegetable', kamis: { categoryCode: '200', itemName: '토마토' }, recipeRef: { names: ['토마토달걀볶음'] }, seasonMonths: [7], peakMonths: [], whyNow: {}, howToPick: '', howToStore: '', howToUse: '' },
    ] as any
    const view = buildAppView(profiles, null, null, null, new Date('2026-07-11T00:00:00Z'))
    expect(view.cards[0].recipes).toBeNull()
    expect(view.hasRecipes).toBe(false)
  })

  test('buildAppView: 카드는 하락 큰 순으로 정렬된다', () => {
    const a = { ...peach, id: 'a', name: '작은하락', seasonMonths: [7], peakMonths: [] }
    const b = { ...peach, id: 'b', name: '큰하락', seasonMonths: [7], peakMonths: [] }
    const snapshot: PriceSnapshot = {
      schemaVersion: 2, fetchedAt: '2026-07-15T00:00:00Z', surveyedOn: '2026-07-15',
      entries: [
        { itemName: '작은하락', kindName: '기본', rank: '상품', unit: count(1, '개'), price: 90, baseline: { monthAgo: 100, yearAgo: 100 } },
        { itemName: '큰하락', kindName: '기본', rank: '상품', unit: count(1, '개'), price: 50, baseline: { monthAgo: 100, yearAgo: 100 } },
      ],
    }
    const withKamis = (p: ProduceProfile, itemName: string) => ({ ...p, kamis: { categoryCode: '400' as const, itemName } })
    const view = buildAppView([withKamis(a, '작은하락'), withKamis(b, '큰하락')], snapshot, null, null, new Date('2026-07-15'))
    expect(view.cards.map((c) => c.name)).toEqual(['큰하락', '작은하락'])
  })

  test('buildAppView: 비제철 프로필이 searchIndex에 든다', () => {
    const view = buildAppView([peach, grape], snap(), null, null, new Date('2026-07-15'))
    // 7월: peach 제철(cards), grape 비제철(searchIndex)
    expect(view.cards.map((c) => c.name)).toContain('복숭아')
    expect(view.searchIndex.map((h) => h.name)).toEqual(['포도'])
    expect(view.searchIndex[0].seasonLabel).toBe('8~9월')
  })
})

// Helper for test fixture
const cp = (
  id: string, name: string, emoji: string,
  seasonMonths: number[], peakMonths: number[], whyNow: Record<string, string>,
): ProduceProfile => ({
  id, name, emoji, category: 'fruit',
  kamis: { categoryCode: '400', itemName: id },
  seasonMonths, peakMonths, whyNow,
  howToPick: 'p', howToStore: 's', howToUse: 'u',
})

describe('buildComingView', () => {
  test('달별 계절과 품목별 미래월 한마디를 싣는다', () => {
    const grape = cp('grape', '포도', '🍇', [8, 9], [8], { '8': '8월이 절정이에요', default: '가을' })
    const view = buildComingView([grape], new Date('2026-07-15T00:00:00'))
    expect(view.months).toHaveLength(1)
    expect(view.months[0].month).toBe(8)
    expect(view.months[0].season).toBe('summer')
    expect(view.months[0].items[0]).toEqual({ emoji: '🍇', name: '포도', peak: true, whyNow: '8월이 절정이에요' })
    expect(view.term).toBe('소서')
  })

  test('9월 그룹은 가을, 미래월 한마디를 뽑는다', () => {
    const chestnut = cp('chestnut', '밤', '🌰', [9], [9], { '9': '9월이 절정이에요', default: '가을' })
    const view = buildComingView([chestnut], new Date('2026-07-15T00:00:00'))
    expect(view.months[0].season).toBe('autumn')
    expect(view.months[0].items[0].whyNow).toBe('9월이 절정이에요')
  })

  test('다가오는 게 없으면 months는 빈 배열', () => {
    const peach = cp('peach', '복숭아', '🍑', [7], [], { default: '여름' })
    expect(buildComingView([peach], new Date('2026-07-15T00:00:00')).months).toEqual([])
  })
})
