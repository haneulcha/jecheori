import { describe, expect, test } from 'vitest'
import { classifyPrep, rankNutritionCandidates } from '../scripts/lib/rank-nutrition-candidates.mjs'

const c = (foodName, extra = {}) => ({ foodName, category1: '채소류', kcal: 1, ...extra })

describe('classifyPrep', () => {
  test('생것 명시는 raw', () => {
    expect(classifyPrep('오이_취청_생것')).toBe('raw')
    expect(classifyPrep('감자_수미_생것')).toBe('raw')
    expect(classifyPrep('생강_생것')).toBe('raw')
  })
  test('삶은것·데친것·찐것은 cooked', () => {
    expect(classifyPrep('감자_수미_삶은것')).toBe('cooked')
    expect(classifyPrep('옥수수_단옥수수_찐것')).toBe('cooked')
    expect(classifyPrep('고구마_잎_데친것')).toBe('cooked')
  })
  test('말린것·전분·칩·통조림은 processed', () => {
    expect(classifyPrep('고구마_말린것')).toBe('processed')
    expect(classifyPrep('감자전분')).toBe('processed')
    expect(classifyPrep('감자칩')).toBe('processed')
    expect(classifyPrep('복숭아_통조림')).toBe('processed')
  })
  test('상태표시 없는 요리·가공명은 processed(원물 아님)', () => {
    expect(classifyPrep('감자국')).toBe('processed')
    expect(classifyPrep('오이지')).toBe('processed')
    expect(classifyPrep('시금치나물')).toBe('processed')
  })
})

describe('rankNutritionCandidates', () => {
  test('생것을 삶은것보다 먼저', () => {
    const r = rankNutritionCandidates([c('감자_수미_삶은것'), c('감자_수미_생것')])
    expect(r.pick.foodName).toBe('감자_수미_생것')
    expect(r.flag).toBe('ok')
  })
  test('전분·요리명은 제외하고 생것을 고른다', () => {
    const r = rankNutritionCandidates([c('감자전분'), c('감자국'), c('감자_수미_생것')])
    expect(r.pick.foodName).toBe('감자_수미_생것')
    expect(r.flag).toBe('ok')
  })
  test('생것 없이 삶은것만이면 cooked 플래그', () => {
    const r = rankNutritionCandidates([c('감자_수미_삶은것')])
    expect(r.pick.foodName).toBe('감자_수미_삶은것')
    expect(r.flag).toBe('cooked')
  })
  test('원물 후보가 전부 제외되면 no-match', () => {
    const r = rankNutritionCandidates([c('감자전분'), c('감자국')])
    expect(r.pick).toBeNull()
    expect(r.flag).toBe('no-match')
  })
  test('빈 후보는 no-match', () => {
    expect(rankNutritionCandidates([]).flag).toBe('no-match')
  })
  test('같은 상태면 이름이 짧은(더 일반적인) 것을 먼저', () => {
    const r = rankNutritionCandidates([c('무_알타리_생것'), c('무_생것')])
    expect(r.pick.foodName).toBe('무_생것')
  })
})
