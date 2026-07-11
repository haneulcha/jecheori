// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { RecipeSheet } from './RecipeSheet'

const recipes = [
  { name: '토마토달걀볶음', ingredients: '토마토 2개, 달걀 3개', steps: ['토마토를 썬다', '달걀을 볶는다'] },
]

describe('RecipeSheet', () => {
  test('요리명·재료·조리단계를 보인다', () => {
    const { container } = render(<RecipeSheet recipes={recipes} onClose={() => {}} />)
    const text = container.textContent
    expect(text).toContain('토마토달걀볶음')
    expect(text).toContain('토마토 2개, 달걀 3개')
    expect(text).toContain('토마토를 썬다')
    expect(container.querySelectorAll('.steps li')).toHaveLength(2)
  })

  test('단계가 없으면 단계 목록을 그리지 않는다', () => {
    const { container } = render(
      <RecipeSheet recipes={[{ name: '생토마토', ingredients: '토마토', steps: [] }]} onClose={() => {}} />,
    )
    expect(container.querySelector('.steps')).toBeNull()
  })

  test('배경 클릭으로 닫힌다', () => {
    const onClose = vi.fn()
    const { container } = render(<RecipeSheet recipes={recipes} onClose={onClose} />)
    fireEvent.click(container.querySelector('.sheet-backdrop')!)
    expect(onClose).toHaveBeenCalled()
  })

  test('Esc로 닫힌다', () => {
    const onClose = vi.fn()
    render(<RecipeSheet recipes={recipes} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  test('시트 본문 클릭은 닫지 않는다', () => {
    const onClose = vi.fn()
    const { container } = render(<RecipeSheet recipes={recipes} onClose={onClose} />)
    fireEvent.click(container.querySelector('.sheet')!)
    expect(onClose).not.toHaveBeenCalled()
  })
})
