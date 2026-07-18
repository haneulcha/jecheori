// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Sparkline } from './Sparkline'

describe('Sparkline', () => {
  test('5점 궤적(작년 포함) + 점 위 값 + 평년 점선·각주 렌더', () => {
    const { container } = render(
      <Sparkline
        spark={{
          points: [
            { label: '작년', value: 4622 },
            { label: '1달 전', value: 3698 },
            { label: '2주 전', value: 3818 },
            { label: '1주 전', value: 3622 },
            { label: '지금', value: 3513 },
          ],
          levels: [1, 0.17, 0.28, 0.1, 0],
          // 평년(4473)은 점 최고치(작년 4622)보다 아래지만 최근 점들보다 위 — card.ts가 같은 스케일로 계산.
          normalYearLevel: 0.87,
          normalYear: 4473,
        }}
      />,
    )
    expect(container.querySelectorAll('polyline').length).toBe(1)
    expect(container.querySelectorAll('.pt').length).toBe(5) // 작년 포함 5점
    // 점 위 값(.val) 복원 — 작년·지금 값이 그래프에 보인다
    expect(container.querySelectorAll('.val').length).toBe(5)
    expect(container.textContent).toContain('4,622') // 작년 점 값
    expect(container.textContent).toContain('3,513') // 지금 점 값
    expect(container.querySelector('.norm-line')).not.toBeNull() // 평년 점선
    expect(container.textContent).toContain('평년')
    expect(container.textContent).toContain('4,473') // 평년 각주
  })

  test('평년 없으면 점선·각주 항목 없음', () => {
    const { container } = render(
      <Sparkline
        spark={{
          points: [
            { label: '1주 전', value: 110 },
            { label: '지금', value: 100 },
          ],
          levels: [1, 0],
          normalYearLevel: null,
          normalYear: null,
        }}
      />,
    )
    expect(container.querySelector('.norm-line')).toBeNull()
    expect(container.querySelector('.spark-foot')).toBeNull()
  })
})
