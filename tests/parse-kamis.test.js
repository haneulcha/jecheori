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

// 픽스처는 실제 KAMIS 응답 캡처 (2026-07-13, 부류 200).
// 컬럼 의미: dpr1=당일 dpr2=1일전 dpr3=1주일전 dpr4=2주일전 dpr5=1개월전 dpr6=1년전 dpr7=일평년
describe('parseCategoryResponse', () => {
  const entries = parseCategoryResponse(load('kamis-daily-200.json'))

  test('모든 행을 PriceEntry로 변환한다', () => {
    expect(entries).toHaveLength(4)
    expect(entries[0]).toEqual({
      itemCode: '211',
      itemName: '배추',
      kindName: '봄(1포기)',
      rank: '상품',
      unit: '1포기',
      price: 3513, // dpr1 (당일)
      priceMonthAgo: 3692, // dpr5 — dpr3(1주일전)이 아니다
      priceYearAgo: 4642, // dpr6 — dpr4(2주일전)이 아니다
    })
  })

  test('1개월전은 dpr5, 1년전은 dpr6에서 읽는다 (1·2주일전 컬럼과 혼동 금지)', () => {
    const cabbage = entries[0]
    // 같은 행의 1주일전(3,608)·2주일전(3,818)을 잘못 집으면 실패한다
    expect(cabbage.priceMonthAgo).not.toBe(3608)
    expect(cabbage.priceYearAgo).not.toBe(3818)
  })

  test('당일(dpr1)이 결측이면 1일전(dpr2)으로 폴백한다', () => {
    const entries = parseCategoryResponse({
      data: {
        error_code: '000',
        item: { item_name: '오이', dpr1: '-', dpr2: '8,420', dpr5: '10,120', dpr6: '9,050' },
      },
    })
    expect(entries[0].price).toBe(8420)
  })

  test('당일·1일전이 모두 결측이면 price가 null이다', () => {
    // 당근: 월요일이라 1일전(일요일)이 없고, 당일 조사도 없는 행
    const carrot = entries.find((e) => e.itemName === '당근')
    expect(carrot.price).toBeNull()
    expect(carrot.priceMonthAgo).toBeNull() // dpr5 결측
    expect(carrot.priceYearAgo).toBe(2952) // dpr6은 있다
  })

  test('오류 응답이면 throw한다', () => {
    expect(() => parseCategoryResponse(load('kamis-error.json'))).toThrow(/KAMIS/)
  })

  test('error_code가 000이 아니면 throw한다', () => {
    expect(() => parseCategoryResponse({ data: { error_code: '999', item: [] } })).toThrow(
      /KAMIS error_code=999/,
    )
  })

  test('data.item이 단일 객체여도 엔트리 1개로 변환한다', () => {
    const entries = parseCategoryResponse({
      data: {
        error_code: '000',
        item: {
          item_name: '오이',
          item_code: '223',
          kind_name: '가시계통(10개)',
          rank: '상품',
          unit: '10개',
          dpr1: '8,540',
          dpr2: '8,420',
          dpr3: '9,000',
          dpr4: '9,010',
          dpr5: '10,120',
          dpr6: '9,050',
        },
      },
    })
    expect(entries).toEqual([
      {
        itemCode: '223',
        itemName: '오이',
        kindName: '가시계통(10개)',
        rank: '상품',
        unit: '10개',
        price: 8540,
        priceMonthAgo: 10120,
        priceYearAgo: 9050,
      },
    ])
  })
})
