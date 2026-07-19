import { describe, expect, test } from 'vitest'
import { classifyPrep, rankNutritionCandidates } from '../scripts/lib/rank-nutrition-candidates.mjs'

const c = (foodName, extra = {}) => ({ foodName, category1: '채소류', kcal: 1, ...extra })

describe('classifyPrep', () => {
  test('상태 접미가 없으면 생것으로 본다', () => expect(classifyPrep('오이')).toBe('raw'))
  test('생것 명시는 raw', () => expect(classifyPrep('사과_부사_생것')).toBe('raw'))
  test('데친것·삶은것은 cooked', () => {
    expect(classifyPrep('시금치_데친것')).toBe('cooked')
    expect(classifyPrep('감자_삶은것')).toBe('cooked')
  })
  test('통조림·주스·말린것은 processed', () => {
    expect(classifyPrep('사과잼')).toBe('processed')
    expect(classifyPrep('복숭아_통조림')).toBe('processed')
    expect(classifyPrep('포도_주스')).toBe('processed')
  })
  test('생강처럼 이름에 생이 들어가도 상태 토큰이 아니면 raw', () =>
    expect(classifyPrep('생강_생것')).toBe('raw'))
})

describe('rankNutritionCandidates', () => {
  test('생것을 조리보다 먼저 고른다', () => {
    const r = rankNutritionCandidates([c('사과_구운것'), c('사과_부사_생것')])
    expect(r.pick.foodName).toBe('사과_부사_생것')
    expect(r.flag).toBe('ok')
  })
  test('생것이 없으면 조리를 고르고 cooked 플래그', () => {
    const r = rankNutritionCandidates([c('시금치_데친것')])
    expect(r.pick.foodName).toBe('시금치_데친것')
    expect(r.flag).toBe('cooked')
  })
  test('중가공만 있으면 no-match (pick null)', () => {
    const r = rankNutritionCandidates([c('사과잼'), c('복숭아_통조림')])
    expect(r.pick).toBeNull()
    expect(r.flag).toBe('no-match')
    expect(r.ranked).toHaveLength(0)
  })
  test('빈 후보는 no-match', () => {
    expect(rankNutritionCandidates([]).flag).toBe('no-match')
  })
  test('같은 상태면 이름이 짧은(더 일반적인) 것을 먼저', () => {
    const r = rankNutritionCandidates([c('무_알타리_생것'), c('무_생것')])
    expect(r.pick.foodName).toBe('무_생것')
  })
})
