import { describe, expect, test } from 'vitest'
import { buildAppView } from '../src/app'
import type { NutritionSnapshot, PriceEntry, PriceSnapshot, ProduceProfile } from '../src/types'

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
  schemaVersion: 1,
  fetchedAt: '2026-07-08T00:00:00Z',
  entries: [{
    itemCode: '413', itemName: '복숭아', kindName: '백도(10개)', rank: '상품', unit: '10개',
    price: 18200, priceMonthAgo: 24500, priceYearAgo: 19800, ...over,
  }],
})

const JULY = new Date('2026-07-10')

describe('buildAppView', () => {
  test('이번 달 제철 픽을 카드로, 하락이면 noDrop false', () => {
    const v = buildAppView([peach, grape], snap(), null, JULY)
    expect(v.cards).toHaveLength(1) // 7월 제철은 복숭아만 (포도는 8월)
    expect(v.cards[0].name).toBe('복숭아')
    expect(v.cards[0].price?.change).toEqual({ kind: 'fall', pct: 26 })
    expect(v.noDrop).toBe(false)
  })

  test('seasonal은 이번 달, coming은 다음 달 신규', () => {
    const v = buildAppView([peach, grape], snap(), null, JULY)
    expect(v.seasonal).toEqual([{ emoji: '🍑', name: '복숭아' }])
    expect(v.coming).toEqual([{ emoji: '🍇', name: '포도' }]) // 8월 신규
  })

  test('staleDays·term·date를 채운다', () => {
    const v = buildAppView([peach], snap(), null, JULY)
    expect(v.staleDays).toBe(2)
    expect(typeof v.term).toBe('string')
    expect(v.date).toBe(JULY)
  })

  test('상승만이면 noDrop true', () => {
    const v = buildAppView([peach], snap({ price: 18200, priceMonthAgo: 16000 }), null, JULY)
    expect(v.noDrop).toBe(true)
  })

  test('스냅샷 없으면 가격 null, staleDays 0', () => {
    const v = buildAppView([peach], null, null, JULY)
    expect(v.cards[0].price).toBeNull()
    expect(v.staleDays).toBe(0)
  })

  test('foodDb 매칭 시 카드에 nutrition이 실린다', () => {
    const profiles = [
      { id: 'apple', emoji: '🍎', name: '사과', category: 'fruit', kamis: { categoryCode: '400', itemName: '사과' }, foodDb: { category1: '과일류', foodName: '사과_부사_생것' }, seasonMonths: [7], peakMonths: [], whyNow: {}, howToPick: '', howToStore: '', howToUse: '' },
    ] as any
    const nutrition: NutritionSnapshot = {
      schemaVersion: 1, fetchedAt: '2026-07-11T00:00:00.000Z',
      entries: [{ foodName: '사과_부사_생것', serving: '100g', kcal: 53, carbs: 14.28, protein: 0.2, fat: 0.07, sugar: 11.13, fiber: 1.7 }],
    }
    const view = buildAppView(profiles, null, nutrition, new Date('2026-07-11T00:00:00Z'))
    expect(view.cards[0].nutrition).toEqual({ serving: '100g', kcal: 53, sugar: 11.13, fiber: 1.7 })
  })

  test('nutrition 스냅샷 null이면 카드 nutrition은 null', () => {
    const profiles = [
      { id: 'apple', emoji: '🍎', name: '사과', category: 'fruit', kamis: { categoryCode: '400', itemName: '사과' }, foodDb: { category1: '과일류', foodName: '사과_부사_생것' }, seasonMonths: [7], peakMonths: [], whyNow: {}, howToPick: '', howToStore: '', howToUse: '' },
    ] as any
    const view = buildAppView(profiles, null, null, new Date('2026-07-11T00:00:00Z'))
    expect(view.cards[0].nutrition).toBeNull()
  })
})
