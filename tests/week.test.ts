import { describe, expect, test } from 'vitest'
import { relativeDayLabel, surveyedDateLabel } from '../src/week'

describe('relativeDayLabel', () => {
  test('0일은 "오늘"', () => {
    expect(relativeDayLabel(0)).toBe('오늘')
  })

  test('N일은 "N일 전"', () => {
    expect(relativeDayLabel(5)).toBe('5일 전')
  })
})

describe('surveyedDateLabel', () => {
  test('조사일을 "M월 D일 조사"로 (앞 0 제거)', () => {
    expect(surveyedDateLabel('2026-07-13')).toBe('7월 13일 조사')
    expect(surveyedDateLabel('2026-01-05')).toBe('1월 5일 조사')
  })
})
