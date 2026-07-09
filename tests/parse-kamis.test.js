import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { parseCategoryResponse, parseNum } from '../scripts/lib/parse-kamis.mjs'

const load = (name) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf-8'))

describe('parseNum', () => {
  test('콤마 문자열을 숫자로', () => expect(parseNum('4,800')).toBe(4800))
  test('결측 표기는 null', () => {
    expect(parseNum('-')).toBeNull()
    expect(parseNum('')).toBeNull()
    expect(parseNum('0')).toBeNull()
    expect(parseNum(null)).toBeNull()
  })
})

describe('parseCategoryResponse', () => {
  const entries = parseCategoryResponse(load('kamis-daily-200.json'))

  test('모든 행을 PriceEntry로 변환한다', () => {
    expect(entries).toHaveLength(4)
    expect(entries[0]).toEqual({
      itemCode: '223',
      itemName: '오이',
      kindName: '가시계통(10개)',
      rank: '상품',
      unit: '10개',
      price: 8540,
      priceMonthAgo: 10120,
      priceYearAgo: 9050,
    })
  })

  test('당일(dpr1)이 결측이면 최근 조사일(dpr2)로 폴백한다', () => {
    const cabbage = entries.find((e) => e.itemName === '배추')
    expect(cabbage.price).toBe(3980)
  })

  test('전부 결측이면 price가 null이다', () => {
    const spinach = entries.find((e) => e.itemName === '시금치')
    expect(spinach.price).toBeNull()
    expect(spinach.priceMonthAgo).toBeNull()
  })

  test('오류 응답이면 throw한다', () => {
    expect(() => parseCategoryResponse(load('kamis-error.json'))).toThrow(/KAMIS/)
  })
})
