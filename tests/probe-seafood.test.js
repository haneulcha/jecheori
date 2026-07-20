import { describe, expect, test } from 'vitest'
import { probeSeafood, summarizeSeafood } from '../scripts/probe-seafood.mjs'

const item = (item_name, kind_name, unit, dpr1 = '1000') => ({ item_name, kind_name, unit, rank: '상', dpr1 })

describe('summarizeSeafood', () => {
  test('원시 단위를 중복 제거·정렬해 열거한다 (parseUnit 없이)', () => {
    const json = { data: { item: [item('굴', '', '1kg'), item('고등어', '', '1마리'), item('갈치', '', '1마리')] } }
    const { items, units } = summarizeSeafood(json)
    expect(items).toHaveLength(3)
    expect(units).toEqual(['1kg', '1마리']) // 마리를 몰라도 throw하지 않고 열거
    expect(items[0]).toMatchObject({ itemName: '굴', unit: '1kg', price: '1000' })
  })
  test('item이 단일 객체여도 배열로 감싼다', () => {
    const { items } = summarizeSeafood({ data: { item: item('굴', '', '1kg') } })
    expect(items).toHaveLength(1)
  })
  test("data가 ['001']이면 빈 결과 (그날 조사 없음)", () => {
    expect(summarizeSeafood({ data: ['001'] })).toEqual({ items: [], units: [] })
  })
  test('error_code가 000이 아니면 throw', () => {
    expect(() => summarizeSeafood({ data: { error_code: '900' } })).toThrow(/900/)
  })
  test('오류 코드 배열이면 throw', () => {
    expect(() => summarizeSeafood({ data: ['900'] })).toThrow(/KAMIS 오류/)
  })
})

describe('probeSeafood', () => {
  test('부류 600·단위 보존(p_convert_kg_yn=N)으로 조회한다', async () => {
    let seen
    const fetchFn = async (url) => { seen = new URL(url); return { ok: true, json: async () => ({ data: { item: [item('굴', '', '1kg')] } }) } }
    const out = await probeSeafood({ certKey: 'K', certId: 'I', regday: '2026-07-20', fetchFn })
    expect(seen.searchParams.get('p_item_category_code')).toBe('600')
    expect(seen.searchParams.get('p_convert_kg_yn')).toBe('N')
    expect(seen.searchParams.get('p_product_cls_code')).toBe('01')
    expect(out.units).toEqual(['1kg'])
  })
  test('HTTP 실패면 throw', async () => {
    const fetchFn = async () => ({ ok: false, status: 406 })
    await expect(probeSeafood({ certKey: 'K', certId: 'I', regday: '2026-07-20', fetchFn })).rejects.toThrow(/406/)
  })
})
