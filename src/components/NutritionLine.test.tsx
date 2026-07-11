// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { NutritionLine } from './NutritionLine'
import type { NutritionView } from '../nutrition'

/** 사과 기준 완전한 뷰. 개별 테스트는 필요한 필드만 덮어쓴다. */
const apple: NutritionView = {
  serving: '100g',
  kcal: 53,
  carbs: 14.28,
  protein: 0.2,
  fat: 0.07,
  sugar: 11.13,
  fiber: 1.7,
}

describe('NutritionLine', () => {
  test('열량·탄수화물·당류·식이섬유·단백질·지방을 라벨-값 스탯으로 보인다', () => {
    const { container } = render(<NutritionLine nutrition={apple} />)
    const text = container.textContent
    expect(text).toContain('열량')
    expect(text).toContain('53kcal')
    expect(text).toContain('탄수화물')
    expect(text).toContain('14.3g')
    expect(text).toContain('당류')
    expect(text).toContain('11.1g')
    expect(text).toContain('식이섬유')
    expect(text).toContain('1.7g')
    expect(text).toContain('단백질')
    expect(text).toContain('0.2g')
    expect(text).toContain('지방')
    expect(text).toContain('0.1g')
    expect(text).toContain('100g 기준')
  })
  test('출처는 카드에 반복하지 않는다 (페이지 하단으로 이동)', () => {
    const { container } = render(<NutritionLine nutrition={apple} />)
    expect(container.textContent).not.toContain('식품의약품안전처')
  })
  test('결측 항목은 셀을 만들지 않는다', () => {
    const { container } = render(
      <NutritionLine nutrition={{ ...apple, fiber: null, protein: null }} />,
    )
    const text = container.textContent
    expect(text).toContain('열량')
    expect(text).toContain('탄수화물')
    expect(text).not.toContain('식이섬유')
    expect(text).not.toContain('단백질')
  })
  test('수치가 하나도 없으면 아무것도 렌더하지 않는다', () => {
    const { container } = render(
      <NutritionLine
        nutrition={{
          serving: '100g',
          kcal: null,
          carbs: null,
          protein: null,
          fat: null,
          sugar: null,
          fiber: null,
        }}
      />,
    )
    expect(container.firstChild).toBeNull()
  })
})
