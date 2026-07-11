import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { parseNum, parseNutritionEntry } from '../scripts/lib/parse-nutrition.mjs'

const apple = JSON.parse(
  readFileSync(new URL('./fixtures/foodntr-apple.json', import.meta.url), 'utf-8'),
)

describe('parseNum', () => {
  test('숫자 문자열을 숫자로', () => expect(parseNum('53.00')).toBe(53))
  test('빈 문자열·미정의는 null', () => {
    expect(parseNum('')).toBeNull()
    expect(parseNum(null)).toBeNull()
    expect(parseNum(undefined)).toBeNull()
  })
  test('"0"은 유효한 0 (가격 파서와 다름)', () => expect(parseNum('0')).toBe(0))
})

describe('parseNutritionEntry', () => {
  test('정확일치 원물을 NutritionEntry로 변환한다', () => {
    expect(parseNutritionEntry(apple, '사과_부사_생것')).toEqual({
      foodName: '사과_부사_생것',
      serving: '100g',
      kcal: 53, carbs: 14.28, protein: 0.2, fat: 0.07, sugar: 11.13, fiber: 1.7,
    })
  })
  test('노이즈(사과잼)는 고르지 않는다 — 정확일치만', () => {
    expect(parseNutritionEntry(apple, '사과_부사_생것').kcal).toBe(53)
  })
  test('일치 항목 없으면 null', () => {
    expect(parseNutritionEntry(apple, '없는이름')).toBeNull()
  })
  test('오류 응답이면 throw', () => {
    expect(() => parseNutritionEntry({ header: { resultMsg: 'LIMIT' } }, 'x')).toThrow(/FoodNtr/)
  })
})
