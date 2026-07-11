// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { PriceBlock } from './PriceBlock'

describe('PriceBlock', () => {
  test('하락: 취소선·칩·큰가격·개당값, fall 클래스', () => {
    const { container } = render(
      <PriceBlock price={{ now: 12600, wasMonthAgo: 16900, perUnit: 1260, change: { kind: 'fall', pct: 25 }, spark: null }} />,
    )
    expect(container.querySelector('.price.fall')).not.toBeNull()
    const html = container.innerHTML
    expect(html).toContain('16,900원')
    expect(html).toContain('12,600')
    expect(container.textContent).toContain('25%')
    expect(html).toContain('개당 1,260원')
  })
  test('상승: rise 클래스, 무게 단위면 개당값 없음', () => {
    const { container } = render(
      <PriceBlock price={{ now: 5000, wasMonthAgo: 4400, perUnit: null, change: { kind: 'rise', pct: 14 }, spark: null }} />,
    )
    expect(container.querySelector('.price.rise')).not.toBeNull()
    expect(container.textContent).not.toContain('개당')
  })
  test('similar은 칩 없이 비슷 문구·쪽빛(fall)', () => {
    const { container } = render(
      <PriceBlock price={{ now: 5000, wasMonthAgo: 5010, perUnit: null, change: { kind: 'similar' }, spark: null }} />,
    )
    expect(container.querySelector('.price.fall')).not.toBeNull()
    expect(container.querySelector('.chip')).toBeNull()
    expect(container.textContent).toContain('비슷')
  })
  test('change null이면 취소선 생략', () => {
    const { container } = render(
      <PriceBlock price={{ now: 5000, wasMonthAgo: null, perUnit: null, change: null, spark: null }} />,
    )
    expect(container.querySelector('.was')).toBeNull()
    expect(container.innerHTML).toContain('5,000')
  })
})
