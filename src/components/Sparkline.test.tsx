// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Sparkline } from './Sparkline'

describe('Sparkline', () => {
  test('4점 궤적 + 평년 점선 + 각주 렌더', () => {
    const { container } = render(
      <Sparkline
        spark={{
          points: [
            { label: '1달 전', value: 3698 },
            { label: '2주 전', value: 3818 },
            { label: '1주 전', value: 3622 },
            { label: '지금', value: 3513 },
          ],
          levels: [0.6, 1, 0.36, 0.28],
          // 평년(4473)은 점들 최고치(3818)보다 위 — card.ts가 평년을 포함한 스케일로 계산하므로
          // 평년이 새 최댓값이 되어 level 1(캔버스 상단)에 놓인다.
          normalYearLevel: 1,
          normalYear: 4473,
          yearAgo: 4622,
        }}
      />,
    )
    expect(container.querySelectorAll('polyline').length).toBe(1)
    expect(container.querySelectorAll('.pt').length).toBe(4)
    expect(container.querySelector('.norm-line')).not.toBeNull() // 평년 점선
    expect(container.textContent).toContain('평년')
    expect(container.textContent).toContain('4,473')
    expect(container.textContent).toContain('4,622') // 작년 각주
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
          yearAgo: null,
        }}
      />,
    )
    expect(container.querySelector('.norm-line')).toBeNull()
    expect(container.querySelector('.spark-foot')).toBeNull()
  })
})
