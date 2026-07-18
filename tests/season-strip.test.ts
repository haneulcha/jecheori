import { describe, expect, test } from 'vitest'
import { toSeasonStrip } from '../src/card'
import type { ProduceProfile } from '../src/types'

function profile(over: Partial<ProduceProfile> = {}): ProduceProfile {
  return {
    id: 'x', name: '수박', emoji: '🍉', category: 'fruit',
    seasonMonths: [6, 7, 8], peakMonths: [7], whyNow: {},
    howToPick: '', howToStore: '', howToUse: '',
    ...over,
  }
}

describe('toSeasonStrip', () => {
  test('12개월을 1→12 순서로 만든다', () => {
    const s = toSeasonStrip(profile(), 7)
    expect(s.months).toHaveLength(12)
    expect(s.months.map((c) => c.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  test('여름 품목·이번 달 7월: 7월 칸은 제철·절정·이번 달', () => {
    const s = toSeasonStrip(profile(), 7)
    expect(s.months[6]).toEqual({ month: 7, inSeason: true, isPeak: true, isCurrent: true })
    expect(s.months[8]).toEqual({ month: 9, inSeason: false, isPeak: false, isCurrent: false })
    expect(s.currentMonth).toBe(7)
    expect(s.seasonLabel).toBe('6~8월')
    expect(s.peakLabel).toBe('7월')
  })

  test('랩어라운드(12→4월) 라벨·제철 판정', () => {
    const s = toSeasonStrip(profile({ seasonMonths: [12, 1, 2, 3, 4], peakMonths: [1, 2, 3] }), 7)
    expect(s.seasonLabel).toBe('12~4월')
    expect(s.peakLabel).toBe('1~3월')
    expect(s.months[11].inSeason).toBe(true) // 12월
    expect(s.months[0].inSeason).toBe(true) // 1월
    expect(s.months[5].inSeason).toBe(false) // 6월
  })

  test('이번 달이 제철 밖이어도 isCurrent만 붙는다', () => {
    const s = toSeasonStrip(profile({ seasonMonths: [6, 7, 8], peakMonths: [7] }), 1)
    expect(s.months[0]).toEqual({ month: 1, inSeason: false, isPeak: false, isCurrent: true })
  })
})
