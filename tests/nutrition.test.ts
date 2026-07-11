import { describe, expect, test } from 'vitest'
import { matchNutrition, nutritionView } from '../src/nutrition'
import type { NutritionSnapshot, ProduceProfile } from '../src/types'

const snapshot: NutritionSnapshot = {
  schemaVersion: 1,
  fetchedAt: '2026-07-11T00:00:00.000Z',
  entries: [
    { foodName: '사과_부사_생것', serving: '100g', kcal: 53, carbs: 14.28, protein: 0.2, fat: 0.07, sugar: 11.13, fiber: 1.7 },
  ],
}
const apple = { name: '사과', foodDb: { category1: '과일류', foodName: '사과_부사_생것' } } as ProduceProfile
const potato = { name: '감자' } as ProduceProfile

describe('matchNutrition', () => {
  test('foodDb.foodName으로 엔트리를 찾는다', () => {
    expect(matchNutrition(apple, snapshot)?.kcal).toBe(53)
  })
  test('foodDb 없으면 null', () => expect(matchNutrition(potato, snapshot)).toBeNull())
  test('스냅샷 null이면 null', () => expect(matchNutrition(apple, null)).toBeNull())
})

describe('nutritionView', () => {
  test('표시값(serving·kcal·sugar·fiber)만 추린다', () => {
    const entry = snapshot.entries[0]
    expect(nutritionView(entry)).toEqual({ serving: '100g', kcal: 53, sugar: 11.13, fiber: 1.7 })
  })
  test('null이면 null', () => expect(nutritionView(null)).toBeNull())
})
