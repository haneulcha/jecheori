// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { ButtonGroup, type ButtonGroupOption } from './ButtonGroup'

type Cat = 'all' | 'fruit' | 'veg'
const OPTS: ButtonGroupOption<Cat>[] = [
  { value: 'all', label: '전체' },
  { value: 'fruit', label: '과일' },
  { value: 'veg', label: '채소' },
]

function Harness({ onChange }: { onChange?: (v: Cat) => void }) {
  const [value, setValue] = useState<Cat>('all')
  return (
    <ButtonGroup
      options={OPTS}
      value={value}
      onChange={(v) => { setValue(v); onChange?.(v) }}
      ariaLabel="카테고리"
    />
  )
}

describe('ButtonGroup', () => {
  afterEach(() => cleanup())

  test('옵션 라벨을 모두 렌더하고 radiogroup 접근명을 갖는다', () => {
    const { getByRole } = render(<Harness />)
    const group = getByRole('radiogroup', { name: '카테고리' })
    expect(group).toBeTruthy()
    expect(getByRole('radio', { name: '전체' })).toBeTruthy()
    expect(getByRole('radio', { name: '채소' })).toBeTruthy()
  })

  test('선택값이 aria-checked로 반영된다', () => {
    const { getByRole } = render(<Harness />)
    expect(getByRole('radio', { name: '전체' }).getAttribute('aria-checked')).toBe('true')
    expect(getByRole('radio', { name: '과일' }).getAttribute('aria-checked')).toBe('false')
  })

  test('클릭하면 onChange(value)가 불린다', () => {
    const onChange = vi.fn()
    const { getByRole } = render(<Harness onChange={onChange} />)
    fireEvent.click(getByRole('radio', { name: '과일' }))
    expect(onChange).toHaveBeenCalledWith('fruit')
    expect(getByRole('radio', { name: '과일' }).getAttribute('aria-checked')).toBe('true')
  })

  test('←/→ 방향키로 이동하며 순환한다', () => {
    const onChange = vi.fn()
    const { getByRole } = render(<Harness onChange={onChange} />)
    fireEvent.keyDown(getByRole('radio', { name: '전체' }), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('fruit')
    fireEvent.keyDown(getByRole('radio', { name: '전체' }), { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('veg') // 전체에서 왼쪽 → 마지막으로 순환
  })

  test('선택 칸만 tabIndex 0 (로빙 tabindex)', () => {
    const { getByRole } = render(<Harness />)
    expect(getByRole('radio', { name: '전체' }).getAttribute('tabindex')).toBe('0')
    expect(getByRole('radio', { name: '과일' }).getAttribute('tabindex')).toBe('-1')
  })
})
