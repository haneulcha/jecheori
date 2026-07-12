// @vitest-environment jsdom
import { fireEvent, render, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { RecipeMemo } from './RecipeMemo'

const recipes = [
  { name: '토마토달걀볶음', ingredients: '토마토 2개, 달걀 3개', steps: ['토마토를 썬다', '달걀을 볶는다'] },
  { name: '냉토마토파스타', ingredients: '토마토, 펜네', steps: ['삶는다'] },
  { name: '가지토마토구이', ingredients: '가지, 토마토', steps: ['굽는다'] },
]
const noop = () => {}

describe('RecipeMemo', () => {
  test('요리명·재료·단계·위치표시를 보인다', () => {
    const { container } = render(
      <RecipeMemo recipes={recipes} index={0} onClose={noop} onStep={noop} />,
    )
    const text = container.textContent
    expect(text).toContain('토마토달걀볶음')
    expect(text).toContain('토마토 2개, 달걀 3개')
    expect(text).toContain('토마토를 썬다')
    expect(container.querySelectorAll('.steps li')).toHaveLength(2)
    expect(container.querySelector('.count')!.textContent).toBe('1 / 3')
  })

  test('단계가 없으면 단계 목록을 그리지 않는다', () => {
    const { container } = render(
      <RecipeMemo
        recipes={[{ name: '생토마토', ingredients: '토마토', steps: [] }]}
        index={0}
        onClose={noop}
        onStep={noop}
      />,
    )
    expect(container.querySelector('.steps')).toBeNull()
  })

  test('첫 레시피에선 이전이, 마지막에선 다음이 비활성 (clamp)', () => {
    const first = render(<RecipeMemo recipes={recipes} index={0} onClose={noop} onStep={noop} />)
    expect(first.container.querySelector<HTMLButtonElement>('.nav-prev')!.disabled).toBe(true)
    expect(first.container.querySelector<HTMLButtonElement>('.nav-next')!.disabled).toBe(false)
    const last = render(<RecipeMemo recipes={recipes} index={2} onClose={noop} onStep={noop} />)
    expect(last.container.querySelector<HTMLButtonElement>('.nav-next')!.disabled).toBe(true)
  })

  test('‹ ›가 onStep(∓1)을 부른다', () => {
    const onStep = vi.fn()
    const { container } = render(
      <RecipeMemo recipes={recipes} index={1} onClose={noop} onStep={onStep} />,
    )
    fireEvent.click(container.querySelector('.nav-prev')!)
    expect(onStep).toHaveBeenLastCalledWith(-1)
    fireEvent.click(container.querySelector('.nav-next')!)
    expect(onStep).toHaveBeenLastCalledWith(1)
  })

  test('마운트 시 메모로 포커스가 간다', () => {
    const { container } = render(
      <RecipeMemo recipes={recipes} index={0} onClose={noop} onStep={noop} />,
    )
    expect(document.activeElement).toBe(container.querySelector('.memo'))
  })

  test('index가 바뀌어도 메모는 리마운트되지 않고 내용만 교체된다', () => {
    const { container, rerender } = render(
      <RecipeMemo recipes={recipes} index={0} onClose={noop} onStep={noop} />,
    )
    const node = container.querySelector('.memo')
    rerender(<RecipeMemo recipes={recipes} index={1} onClose={noop} onStep={noop} />)
    expect(container.querySelector('.memo')).toBe(node) // 같은 DOM 노드
    expect(container.querySelector('h3')!.textContent).toBe('냉토마토파스타')
    expect(container.querySelector('.count')!.textContent).toBe('2 / 3')
  })

  test('압정 클릭이 닫힘 전환 후 onClose를 부른다', async () => {
    const onClose = vi.fn()
    const { container } = render(
      <RecipeMemo recipes={recipes} index={0} onClose={onClose} onStep={noop} />,
    )
    fireEvent.click(container.querySelector('.pin')!)
    expect(container.querySelector('.memo')!.className).toContain('memo-closing')
    expect(onClose).not.toHaveBeenCalled()
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  test('Esc가 onClose를 부른다', async () => {
    const onClose = vi.fn()
    render(<RecipeMemo recipes={recipes} index={0} onClose={onClose} onStep={noop} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  test('닫힘 진행 중 index가 바뀌면 닫힘이 취소되고 onClose가 안 불린다', async () => {
    const onClose = vi.fn()
    const { container, rerender } = render(
      <RecipeMemo recipes={recipes} index={0} onClose={onClose} onStep={noop} />,
    )
    fireEvent.click(container.querySelector('.pin')!)
    expect(container.querySelector('.memo')!.className).toContain('memo-closing')
    rerender(<RecipeMemo recipes={recipes} index={1} onClose={onClose} onStep={noop} />)
    expect(container.querySelector('.memo')!.className).not.toContain('memo-closing')
    await new Promise((r) => setTimeout(r, 250)) // 원래 예약됐던 180ms 타이머가 지나도록
    expect(onClose).not.toHaveBeenCalled()
  })

  test('압정을 두 번 눌러도 onClose는 한 번만 불린다', async () => {
    const onClose = vi.fn()
    const { container } = render(
      <RecipeMemo recipes={recipes} index={0} onClose={onClose} onStep={noop} />,
    )
    fireEvent.click(container.querySelector('.pin')!)
    fireEvent.click(container.querySelector('.pin')!)
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 220))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('압정+Esc 연타로도 타이머가 고아가 되지 않아 onClose는 한 번만', async () => {
    const onClose = vi.fn()
    const { container } = render(
      <RecipeMemo recipes={recipes} index={0} onClose={onClose} onStep={noop} />,
    )
    fireEvent.click(container.querySelector('.pin')!)
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 250)) // 고아 타이머가 있었다면 이 창에서 또 불렸을 것
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
