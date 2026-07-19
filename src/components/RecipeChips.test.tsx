// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { RecipeChips } from './RecipeChips'

afterEach(() => cleanup())

const recipes = [
  { name: '토마토달걀볶음', ingredients: '토마토, 달걀', steps: ['썬다'] },
  { name: '냉토마토파스타', ingredients: '토마토, 펜네', steps: ['삶는다'] },
  { name: '가지토마토구이', ingredients: '가지, 토마토', steps: ['굽는다'] },
]

describe('RecipeChips', () => {
  test('레시피 수만큼 칩을 요리명으로 그린다', () => {
    const { getAllByRole, getByText } = render(
      <RecipeChips recipes={recipes} current={null} onSelect={() => {}} memoId="m" />,
    )
    expect(getAllByRole('button')).toHaveLength(3)
    expect(getByText('냉토마토파스타')).toBeTruthy()
  })

  test('활성 칩만 aria-pressed=true', () => {
    const { getAllByRole } = render(
      <RecipeChips recipes={recipes} current={1} onSelect={() => {}} memoId="m" />,
    )
    const chips = getAllByRole('button')
    expect(chips[0].getAttribute('aria-pressed')).toBe('false')
    expect(chips[1].getAttribute('aria-pressed')).toBe('true')
  })

  test('칩 클릭이 onSelect(index)를 부른다 (활성 칩 재클릭도 같은 index)', () => {
    const onSelect = vi.fn()
    const { getAllByRole } = render(
      <RecipeChips recipes={recipes} current={2} onSelect={onSelect} memoId="m" />,
    )
    const chips = getAllByRole('button')
    fireEvent.click(chips[0])
    expect(onSelect).toHaveBeenLastCalledWith(0)
    fireEvent.click(chips[2]) // 활성 칩 재클릭 → 부모가 토글, 여기선 그대로 index 전달
    expect(onSelect).toHaveBeenLastCalledWith(2)
  })

  test('활성 칩만 메모를 aria-controls로 가리킨다 (메모는 열려 있을 때만 존재)', () => {
    const { getAllByRole } = render(
      <RecipeChips recipes={recipes} current={1} onSelect={() => {}} memoId="memo-x" />,
    )
    const chips = getAllByRole('button')
    expect(chips[0].getAttribute('aria-controls')).toBeNull()
    expect(chips[1].getAttribute('aria-controls')).toBe('memo-x')
    expect(chips[2].getAttribute('aria-controls')).toBeNull()
  })

  test('열린 메모가 없으면 아무 칩도 aria-controls를 갖지 않는다', () => {
    const { getAllByRole } = render(
      <RecipeChips recipes={recipes} current={null} onSelect={() => {}} memoId="memo-x" />,
    )
    expect(getAllByRole('button')[0].getAttribute('aria-controls')).toBeNull()
  })
})
