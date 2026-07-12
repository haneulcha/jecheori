// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { IndexTab } from './IndexTab'

describe('IndexTab', () => {
  test('오른쪽 탭은 다가오는 제철로 가는 앵커', () => {
    const { container } = render(
      <IndexTab side="right" path="coming" label="다가오는 제철" ariaLabel="다가오는 제철" />,
    )
    const a = container.querySelector('a')!
    expect(a.className).toContain('index-tab-right')
    expect(a.getAttribute('href')).toContain('coming')
    expect(a.getAttribute('aria-label')).toBe('다가오는 제철')
    expect(a.textContent).toContain('다가오는 제철')
  })

  test('왼쪽 탭은 홈(BASE_URL)으로 가고 coming을 포함하지 않는다', () => {
    const { container } = render(
      <IndexTab side="left" path="" label="지금" ariaLabel="지금 담기 좋은 것" />,
    )
    const a = container.querySelector('a')!
    expect(a.className).toContain('index-tab-left')
    expect(a.getAttribute('href')).toBe(import.meta.env.BASE_URL)
    expect(a.getAttribute('aria-label')).toBe('지금 담기 좋은 것')
  })
})
