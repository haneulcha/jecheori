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
  test('12개월 간트 바를 그린다', () => {
    const { container } = render(<SeasonStrip strip={strip()} />)
    expect(container.querySelectorAll('.season-cell')).toHaveLength(12)
  })

  test('제철·절정 칸에 클래스가 붙는다 (연함/짙음)', () => {
    const { container } = render(<SeasonStrip strip={strip()} />)
    const cells = container.querySelectorAll('.season-cell')
    expect(cells[5].classList.contains('is-season')).toBe(true) // 6월 제철
    expect(cells[5].classList.contains('is-peak')).toBe(false) // 6월은 절정 아님
    expect(cells[6].classList.contains('is-peak')).toBe(true) // 7월 절정
    expect(cells[8].classList.contains('is-season')).toBe(false) // 9월 비제철
  })

  test('제철 월과 이번 달만 숫자를 적고 나머지는 숨긴다', () => {
    const { container } = render(<SeasonStrip strip={strip()} />)
    const labels = container.querySelectorAll('.season-label')
    expect(labels).toHaveLength(12) // 칸 정렬 유지 위해 span은 12개
    expect(labels[5].textContent).toBe('6') // 제철
    expect(labels[6].textContent).toBe('7') // 제철·이번달
    expect(labels[7].textContent).toBe('8') // 제철
    expect(labels[0].textContent).toBe('') // 비제철 → 숨김
    expect(labels[8].textContent).toBe('') // 9월 비제철 → 숨김
  })

  test('이번 달이 제철 밖이어도 그 숫자는 보이고 bold', () => {
    // 이번 달 9월 — 제철(6~8) 밖. 그래도 9월 숫자가 보이고 bold.
    const s = strip({
      months: Array.from({ length: 12 }, (_, i) => {
        const m = i + 1
        return { month: m, inSeason: m >= 6 && m <= 8, isPeak: m === 7, isCurrent: m === 9 }
      }),
      currentMonth: 9,
    })
    const { container } = render(<SeasonStrip strip={s} />)
    expect(container.querySelectorAll('.season-label')[8].textContent).toBe('9')
    const bold = container.querySelectorAll('.season-label.is-current')
    expect(bold).toHaveLength(1)
    expect(bold[0].textContent).toBe('9')
  })

  test('그래픽에 문장형 aria-label을 싣는다', () => {
    const { container } = render(<SeasonStrip strip={strip()} />)
    const img = container.querySelector('.season-bar')!
    expect(img.getAttribute('role')).toBe('img')
    expect(img.getAttribute('aria-label')).toBe('제철 6~8월, 절정 7월, 이번 달 7월')
  })
})
