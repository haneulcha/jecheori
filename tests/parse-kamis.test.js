import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { parseCategoryResponse, parseNum, parseUnit } from '../scripts/lib/parse-kamis.mjs'

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

describe('parseUnit', () => {
  test('수량과 계량을 가른다', () => {
    expect(parseUnit('10개')).toEqual({ quantity: 10, measure: '개' })
    expect(parseUnit('1kg')).toEqual({ quantity: 1, measure: 'kg' })
    expect(parseUnit('100g')).toEqual({ quantity: 100, measure: 'g' })
    expect(parseUnit('1포기')).toEqual({ quantity: 1, measure: '포기' })
  })

  test('kg를 g로 잘못 집지 않는다', () => {
    expect(parseUnit('1kg').measure).toBe('kg')
  })

  test('처음 보는 표기는 null로 뭉개지 않고 throw한다', () => {
    // 조용한 오염보다 시끄러운 실패가 낫다 — 단위 없는 가격이 화면까지 새어나가면 안 된다
    expect(() => parseUnit('1단')).toThrow(/단위/)
    expect(() => parseUnit('')).toThrow(/단위/)
    expect(() => parseUnit(null)).toThrow(/단위/)
  })
})

// 픽스처는 실제 KAMIS 응답 캡처 (2026-07-13, 부류 200).
// 컬럼 의미: dpr1=당일 dpr2=1일전 dpr3=1주일전 dpr4=2주일전 dpr5=1개월전 dpr6=1년전 dpr7=일평년
describe('parseCategoryResponse', () => {
  const entries = parseCategoryResponse(load('kamis-daily-200.json'))

  test('모든 행을 PriceEntry로 변환한다 — 관측과 기준선은 다른 칸이다', () => {
    expect(entries).toHaveLength(4)
    expect(entries[0]).toEqual({
      itemCode: '211',
      itemName: '배추',
      kindName: '봄(1포기)',
      rank: '상품',
      unit: { quantity: 1, measure: '포기' },
      price: 3513, // dpr1 (당일 = 조사일의 관측)
      baseline: {
        monthAgo: 3692, // dpr5 — dpr3(1주일전)이 아니다
        yearAgo: 4642, // dpr6 — dpr4(2주일전)이 아니다
      },
    })
  })

  test('기준선은 dpr5·dpr6에서 읽는다 (1·2주일전 컬럼과 혼동 금지)', () => {
    const cabbage = entries[0]
    // 같은 행의 1주일전(3,608)·2주일전(3,818)을 잘못 집으면 실패한다
    expect(cabbage.baseline.monthAgo).not.toBe(3608)
    expect(cabbage.baseline.yearAgo).not.toBe(3818)
  })

  test('당일(dpr1)이 결측이면 1일전으로 메우지 않고 null이다', () => {
    // 스냅샷은 조사일 하나를 뜻한다. 다른 날 값으로 메우면 그 약속이 깨진다.
    const entries = parseCategoryResponse({
      data: {
        error_code: '000',
        item: { item_name: '오이', unit: '10개', dpr1: '-', dpr2: '8,420', dpr5: '10,120', dpr6: '9,050' },
      },
    })
    expect(entries[0].price).toBeNull()
  })

  test('관측이 결측이어도 기준선은 남는다', () => {
    // 당근: 당일 조사가 없는 행. 그래도 1년전 값은 KAMIS가 준다.
    const carrot = entries.find((e) => e.itemName === '당근')
    expect(carrot.price).toBeNull()
    expect(carrot.baseline.monthAgo).toBeNull() // dpr5 결측
    expect(carrot.baseline.yearAgo).toBe(2952) // dpr6은 있다
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
        unit: { quantity: 10, measure: '개' },
        price: 8540,
        baseline: { monthAgo: 10120, yearAgo: 9050 },
      },
    ])
  })
})
