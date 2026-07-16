import { describe, expect, test } from 'vitest'
import { surveyedLabel } from '../src/week'

describe('surveyedLabel', () => {
  test('오늘(0일)은 "오늘 · M월 D일 기준"', () => {
    expect(surveyedLabel(0, '2026-07-16')).toBe('오늘 · 7월 16일 기준')
  })

  test('N일 전은 "N일 전 · M월 D일 기준"', () => {
    expect(surveyedLabel(3, '2026-07-13')).toBe('3일 전 · 7월 13일 기준')
  })

  test('월·일의 앞 0을 제거한다', () => {
    expect(surveyedLabel(1, '2026-01-05')).toBe('1일 전 · 1월 5일 기준')
  })
})
