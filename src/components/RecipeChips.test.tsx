// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { RecipeChips } from './RecipeChips'

const recipes = [
  { name: '토마토달걀볶음', ingredients: '토마토, 달걀', steps: ['썬다'] },
  { name: '냉토마토파스타', ingredients: '토마토, 펜네', steps: ['삶는다'] },
  { name: '가지토마토구이', ingredients: '가지, 토마토', steps: ['굽는다'] },
]

describe('RecipeChips', () => {
  test('레시피 수만큼 칩을 요리명으로 그린다', () => {
    const { container, getByText } = render(
      <RecipeChips recipes={recipes} current={null} onSelect={() => {}} memoId="m" />,
    )
    expect(container.querySelectorAll('.chip-btn')).toHaveLength(3)
    expect(getByText('냉토마토파스타')).toBeTruthy()
  })

  test('활성 칩만 aria-pressed=true', () => {
    const { container } = render(
      <RecipeChips recipes={recipes} current={1} onSelect={() => {}} memoId="m" />,
    )
    const chips = container.querySelectorAll('.chip-btn')
    expect(chips[0].getAttribute('aria-pressed')).toBe('false')
    expect(chips[1].getAttribute('aria-pressed')).toBe('true')
  })

  test('칩 클릭이 onSelect(index)를 부른다 (활성 칩 재클릭도 같은 index)', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <RecipeChips recipes={recipes} current={2} onSelect={onSelect} memoId="m" />,
    )
    const chips = container.querySelectorAll('.chip-btn')
    fireEvent.click(chips[0])
    expect(onSelect).toHaveBeenLastCalledWith(0)
    fireEvent.click(chips[2]) // 활성 칩 재클릭 → 부모가 토글, 여기선 그대로 index 전달
    expect(onSelect).toHaveBeenLastCalledWith(2)
  })

  test('칩은 메모를 aria-controls로 가리킨다', () => {
    const { container } = render(
      <RecipeChips recipes={recipes} current={null} onSelect={() => {}} memoId="memo-x" />,
    )
    expect(container.querySelector('.chip-btn')!.getAttribute('aria-controls')).toBe('memo-x')
  })
})
