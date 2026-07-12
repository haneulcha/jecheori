import { describe, expect, test } from 'vitest'
import { buildComingView } from './app'
import type { ProduceProfile } from './types'

const p = (id: string, name: string, emoji: string, seasonMonths: number[], peakMonths: number[] = []): ProduceProfile => ({
  id, name, emoji, category: 'fruit',
  kamis: { categoryCode: '0', itemName: id },
  seasonMonths, peakMonths,
  whyNow: { default: '' }, howToPick: '', howToStore: '', howToUse: '',
})

describe('buildComingView', () => {
  test('달별 품목을 이모지+이름+절정으로 투영하고 절기를 곁들인다', () => {
    const grape = p('grape', '포도', '🍇', [8, 9], [8])
    const view = buildComingView([grape], new Date('2026-07-15T00:00:00'))
    expect(view.months).toHaveLength(1)
    expect(view.months[0].month).toBe(8)
    expect(view.months[0].items[0]).toEqual({ emoji: '🍇', name: '포도', peak: true })
    expect(view.term).toBe('소서') // 7/15 → 소서
  })

  test('다가오는 품목이 없으면 months는 빈 배열', () => {
    const peach = p('peach', '복숭아', '🍑', [7], []) // 7월 현재만 → 다가오는 것 없음
    expect(buildComingView([peach], new Date('2026-07-15T00:00:00')).months).toEqual([])
  })
})
