// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { SeasonStrip } from './SeasonStrip'
import type { SeasonStripView } from '../card'

function strip(over: Partial<SeasonStripView> = {}): SeasonStripView {
  return {
    months: Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      return { month: m, inSeason: m >= 6 && m <= 8, isPeak: m === 7, isCurrent: m === 7 }
    }),
    seasonLabel: '6~8월', peakLabel: '7월', currentMonth: 7,
    ...over,
  }
}

describe('SeasonStrip', () => {
  test('12칸을 그린다', () => {
    const { container } = render(<SeasonStrip strip={strip()} />)
    expect(container.querySelectorAll('.season-cell')).toHaveLength(12)
  })

  test('제철·절정·이번 달 칸에 클래스가 붙는다', () => {
    const { container } = render(<SeasonStrip strip={strip()} />)
    const cells = container.querySelectorAll('.season-cell')
    expect(cells[6].classList.contains('is-season')).toBe(true) // 7월
    expect(cells[6].classList.contains('is-peak')).toBe(true)
    expect(cells[6].classList.contains('is-current')).toBe(true)
    expect(cells[8].classList.contains('is-season')).toBe(false) // 9월
  })

  test('그래픽에 문장형 aria-label을 싣는다', () => {
    const { container } = render(<SeasonStrip strip={strip()} />)
    const img = container.querySelector('.season-cells')!
    expect(img.getAttribute('role')).toBe('img')
    expect(img.getAttribute('aria-label')).toBe('제철 6~8월, 절정 7월, 이번 달 7월')
  })

  test('캡션에 이번 달을 적는다', () => {
    const { container } = render(<SeasonStrip strip={strip()} />)
    expect(container.querySelector('.season-cap')!.textContent).toBe('제철 달력 · 이번 달 7월')
  })
})
