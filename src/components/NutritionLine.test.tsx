// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { NutritionLine } from './NutritionLine'

describe('NutritionLine', () => {
  test('serving·kcal·당류·출처를 담백하게 보인다', () => {
    const { container } = render(
      <NutritionLine nutrition={{ serving: '100g', kcal: 53, sugar: 11.13, fiber: 1.7 }} />,
    )
    const text = container.textContent
    expect(text).toContain('100g당')
    expect(text).toContain('53kcal')
    expect(text).toContain('당 11.1g')
    expect(text).toContain('식품의약품안전처')
  })
  test('kcal·당류가 모두 없으면 아무것도 렌더하지 않는다', () => {
    const { container } = render(
      <NutritionLine nutrition={{ serving: '100g', kcal: null, sugar: null, fiber: null }} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
