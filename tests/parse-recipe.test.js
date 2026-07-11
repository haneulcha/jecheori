import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { cleanStep, parseRecipeEntry } from '../scripts/lib/parse-recipe.mjs'

const tomato = JSON.parse(
  readFileSync(new URL('./fixtures/cookrcp-tomato.json', import.meta.url), 'utf-8'),
)

describe('cleanStep', () => {
  test('앞 번호 접두를 떼고 trim', () => {
    expect(cleanStep('1. 토마토를 썬다.')).toBe('토마토를 썬다.')
    expect(cleanStep('2 달걀을 푼다.')).toBe('달걀을 푼다.')
    expect(cleanStep('  3.볶는다.  ')).toBe('볶는다.')
    expect(cleanStep('번호 없는 단계')).toBe('번호 없는 단계')
  })
})

describe('parseRecipeEntry', () => {
  test('RCP_NM 정확일치 행을 RecipeEntry로', () => {
    const e = parseRecipeEntry(tomato, '토마토달걀볶음')
    expect(e).toEqual({
      name: '토마토달걀볶음',
      ingredients: '토마토 2개, 달걀 3개, 소금 약간',
      steps: ['토마토를 한입 크기로 썬다.', '달걀을 풀어 반숙으로 볶는다.', '토마토를 넣고 살짝 더 볶는다.'],
    })
  })

  test('빈 MANUAL 단계는 steps에서 제거된다', () => {
    const e = parseRecipeEntry(tomato, '토마토달걀볶음')
    expect(e.steps).toHaveLength(3) // MANUAL04("  ")는 빠짐
  })

  test('이름이 없으면 null', () => {
    expect(parseRecipeEntry(tomato, '없는요리')).toBeNull()
  })

  test('단일객체 row 응답도 처리한다', () => {
    const single = { COOKRCP01: { RESULT: { CODE: 'INFO-000' }, row: tomato.COOKRCP01.row[1] } }
    expect(parseRecipeEntry(single, '토마토달걀볶음')?.name).toBe('토마토달걀볶음')
  })

  test('COOKRCP01 루트가 없으면 throw', () => {
    expect(() => parseRecipeEntry({ foo: 1 }, '토마토달걀볶음')).toThrow(/COOKRCP01/)
  })

  test('RESULT.CODE가 ERROR면 throw', () => {
    const err = { COOKRCP01: { RESULT: { CODE: 'ERROR-300', MSG: '키 오류' } } }
    expect(() => parseRecipeEntry(err, '토마토달걀볶음')).toThrow(/키 오류/)
  })

  test('데이터 없음(INFO-200, row 없음)은 null', () => {
    const none = { COOKRCP01: { RESULT: { CODE: 'INFO-200', MSG: '데이터가 없습니다.' } } }
    expect(parseRecipeEntry(none, '토마토달걀볶음')).toBeNull()
  })
})
