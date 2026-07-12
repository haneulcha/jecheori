import { describe, expect, test } from 'vitest'
import { comingMonths } from './picks'
import type { ProduceProfile } from './types'

const p = (id: string, seasonMonths: number[], peakMonths: number[] = []): ProduceProfile => ({
  id, name: id, emoji: '·', category: 'fruit',
  kamis: { categoryCode: '0', itemName: id },
  seasonMonths, peakMonths,
  whyNow: { default: '' }, howToPick: '', howToStore: '', howToUse: '',
})

describe('comingMonths', () => {
  test('다음 두 달을 달별로 묶고, 겹치면 먼저 드는 달에만 놓는다', () => {
    const grape = p('grape', [8, 9])
    const chestnut = p('chestnut', [9, 10])
    const g = comingMonths([grape, chestnut], 7)
    expect(g.map((x) => x.month)).toEqual([8, 9])
    expect(g[0].items.map((i) => i.profile.id)).toEqual(['grape'])
    expect(g[1].items.map((i) => i.profile.id)).toEqual(['chestnut']) // grape는 8에 이미 배정
  })

  test('이번 달에 이미 제철인 품목은 제외한다', () => {
    const peach = p('peach', [7, 8]) // 7월이 현재 → 8월에도 안 나온다
    expect(comingMonths([peach], 7)).toEqual([])
  })

  test('연말을 넘어 다음 해로 랩어라운드한다', () => {
    const g = comingMonths([p('mandarin', [1])], 12)
    expect(g.map((x) => x.month)).toEqual([1])
    expect(g[0].items.map((i) => i.profile.id)).toEqual(['mandarin'])
  })

  test('배정된 달에 절정이면 peak=true', () => {
    const g = comingMonths([p('fig', [9], [9])], 8)
    expect(g[0].month).toBe(9)
    expect(g[0].items[0].peak).toBe(true)
  })

  test('새로 드는 품목이 없는 달은 결과에서 뺀다', () => {
    const g = comingMonths([p('chestnut', [9])], 7) // 8월엔 없음, 9월에만
    expect(g.map((x) => x.month)).toEqual([9])
  })
})
