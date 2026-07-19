import { describe, expect, test } from 'vitest'
import { cx } from '../src/cx'

describe('cx', () => {
  test('truthy만 공백으로 결합', () => {
    expect(cx('a', 'b')).toBe('a b')
  })
  test('falsy(false/null/undefined/빈문자)는 무시', () => {
    expect(cx('a', false, null, undefined, '', 'b')).toBe('a b')
  })
  test('조건부 클래스', () => {
    const on = true
    expect(cx('chip', on && 'on')).toBe('chip on')
    expect(cx('chip', false && 'on')).toBe('chip')
  })
})
