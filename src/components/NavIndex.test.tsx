// @vitest-environment jsdom
import { act, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { NavIndex } from './NavIndex'
import { renderWithRouter } from '../test-utils'

afterEach(() => cleanup())

describe('NavIndex', () => {
  test('램프줄 버튼으로 서랍을 여닫고 목차 링크·현재 표시를 그린다', async () => {
    const { container, getByRole, getByText } = await renderWithRouter(<NavIndex current="now" />)
    const cord = getByRole('button', { name: '목차' })
    expect(container.querySelector('[data-open]')).toBeNull()
    fireEvent.click(cord)
    expect(container.querySelector('[data-open]')).not.toBeNull()
    const now = getByText('지금 제철인 품목')
    const coming = getByText('다가오는 제철 품목')
    expect(now.getAttribute('href')).toBe('/')
    expect(coming.getAttribute('href')).toBe('/coming')
    expect(now.getAttribute('aria-current')).toBe('page')
    expect(coming.getAttribute('aria-current')).toBeNull()
  })

  test('링크를 누르면 서랍이 닫힌다', async () => {
    const { container, getByRole, getByText } = await renderWithRouter(<NavIndex current="now" />)
    fireEvent.click(getByRole('button', { name: '목차' }))
    expect(container.querySelector('[data-open]')).not.toBeNull()
    await act(async () => {
      fireEvent.click(getByText('지금 제철인 품목'))
    })
    expect(container.querySelector('[data-open]')).toBeNull()
  })

  test('current="coming"이면 다가오는 링크가 현재', async () => {
    const { getByText } = await renderWithRouter(<NavIndex current="coming" />, '/coming')
    expect(getByText('다가오는 제철 품목').getAttribute('aria-current')).toBe('page')
    expect(getByText('지금 제철인 품목').getAttribute('aria-current')).toBeNull()
  })

  test('제목 없이 두 링크를 라벨대로 그린다', async () => {
    const { container, getByText } = await renderWithRouter(<NavIndex current="now" />)
    // 목차 제목 제거
    expect(container.textContent).not.toContain('목차')
    // 새 라벨
    expect(getByText('지금 제철인 품목')).toBeTruthy()
    expect(getByText('다가오는 제철 품목')).toBeTruthy()
  })
})
