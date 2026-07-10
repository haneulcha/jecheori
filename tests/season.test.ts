import { describe, expect, test } from 'vitest'
import { currentTerm, seasonOf } from '../src/season'

describe('currentTerm', () => {
  test('절기 당일부터 그 절기다', () => {
    expect(currentTerm(new Date('2026-07-07T12:00:00'))).toBe('소서')
  })
  test('다음 절기 전날까지 유지된다', () => {
    expect(currentTerm(new Date('2026-07-21T12:00:00'))).toBe('소서')
  })
  test('다음 절기로 넘어간다', () => {
    expect(currentTerm(new Date('2026-07-22T12:00:00'))).toBe('대서')
  })
  test('연초 소한 전에는 전년 동지', () => {
    expect(currentTerm(new Date('2026-01-02T12:00:00'))).toBe('동지')
  })
})

describe('seasonOf', () => {
  test('3~5월은 봄', () => expect(seasonOf(4)).toBe('spring'))
  test('6~8월은 여름', () => expect(seasonOf(7)).toBe('summer'))
  test('9~11월은 가을', () => expect(seasonOf(10)).toBe('autumn'))
  test('12~2월은 겨울', () => {
    expect(seasonOf(12)).toBe('winter')
    expect(seasonOf(1)).toBe('winter')
  })
})
