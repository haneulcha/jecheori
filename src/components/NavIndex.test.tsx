// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { NavIndex } from './NavIndex'

describe('NavIndex', () => {
  afterEach(() => cleanup())

  test('목차 토글(체크박스)과 두 페이지 링크를 그린다', () => {
    const { container, getByLabelText, getByText } = render(<NavIndex current="now" />)
    const toggle = getByLabelText('목차 열기') as HTMLInputElement
    expect(toggle.type).toBe('checkbox')
    const now = getByText('지금 담기 좋은 것') as HTMLAnchorElement
    const coming = getByText('다가오는 제철') as HTMLAnchorElement
    expect(now.getAttribute('href')).toBe(import.meta.env.BASE_URL)
    expect(coming.getAttribute('href')).toContain('coming')
    // 현재 페이지 표시
    expect(now.getAttribute('aria-current')).toBe('page')
    expect(coming.getAttribute('aria-current')).toBeNull()
    expect(container.querySelector('.nav-index')).not.toBeNull()
  })

  test('current="coming"이면 다가오는 링크가 현재', () => {
    const { getByText } = render(<NavIndex current="coming" />)
    expect(getByText('다가오는 제철').getAttribute('aria-current')).toBe('page')
    expect(getByText('지금 담기 좋은 것').getAttribute('aria-current')).toBeNull()
  })
})
