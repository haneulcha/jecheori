// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { NutritionLine } from './NutritionLine'

describe('NutritionLine', () => {
  test('열량·당류·식이섬유를 라벨-값 스탯으로 보인다', () => {
    const { container } = render(
      <NutritionLine nutrition={{ serving: '100g', kcal: 53, sugar: 11.13, fiber: 1.7 }} />,
    )
    const text = container.textContent
    expect(text).toContain('열량')
    expect(text).toContain('53kcal')
    expect(text).toContain('당류')
    expect(text).toContain('11.1g')
    expect(text).toContain('식이섬유')
    expect(text).toContain('1.7g')
    expect(text).toContain('100g 기준')
  })
  test('출처는 카드에 반복하지 않는다 (페이지 하단으로 이동)', () => {
    const { container } = render(
      <NutritionLine nutrition={{ serving: '100g', kcal: 53, sugar: 11.13, fiber: 1.7 }} />,
    )
    expect(container.textContent).not.toContain('식품의약품안전처')
  })
  test('결측 항목은 셀을 만들지 않는다', () => {
    const { container } = render(
      <NutritionLine nutrition={{ serving: '100g', kcal: 19, sugar: 2.4, fiber: null }} />,
    )
    const text = container.textContent
    expect(text).toContain('열량')
    expect(text).toContain('당류')
    expect(text).not.toContain('식이섬유')
  })
  test('열량·당류·식이섬유가 모두 없으면 아무것도 렌더하지 않는다', () => {
    const { container } = render(
      <NutritionLine nutrition={{ serving: '100g', kcal: null, sugar: null, fiber: null }} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
