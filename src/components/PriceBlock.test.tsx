// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { PriceBlock } from './PriceBlock'
import type { Unit } from '../types'
import type { PriceCardView } from '../card'

afterEach(() => cleanup())

const g100: Unit = { quantity: 100, measure: { kind: 'weight', unit: 'g' } }
const ten: Unit = { quantity: 10, measure: { kind: 'count', unit: '개' } }
const onePogi: Unit = { quantity: 1, measure: { kind: 'count', unit: '포기' } }

describe('PriceBlock', () => {
  test('평년 기준이면 "평년 대비" 라벨 + 칩', () => {
    const { container, getByTestId } = render(
      <PriceBlock price={{ now: 3513, wasMonthAgo: null, unit: g100, perUnit: null, monthAgoPct: -5, change: { kind: 'fall', pct: 21, basisLabel: '평년' }, spark: null }} />,
    )
    expect(getByTestId('compare').textContent).toContain('평년 대비')
    expect(container.textContent).toContain('21%')
  })

  test('작년 폴백이면 "작년 대비"', () => {
    const { getByTestId } = render(
      <PriceBlock price={{ now: 100, wasMonthAgo: null, unit: g100, perUnit: null, monthAgoPct: null, change: { kind: 'fall', pct: 12, basisLabel: '작년' }, spark: null }} />,
    )
    expect(getByTestId('compare').textContent).toContain('작년 대비')
  })

  test('similar이면 "{기준}과 비슷"', () => {
    const { container } = render(
      <PriceBlock price={{ now: 100, wasMonthAgo: null, unit: g100, perUnit: null, monthAgoPct: 0, change: { kind: 'similar', basisLabel: '평년' }, spark: null }} />,
    )
    expect(container.textContent).toContain('평년과 비슷')
  })

  test('상승: rise 클래스', () => {
    const { getByTestId } = render(
      <PriceBlock price={{ now: 5000, wasMonthAgo: 4400, unit: g100, perUnit: null, change: { kind: 'rise', pct: 14, basisLabel: '지난달' }, monthAgoPct: 14, spark: null }} />,
    )
    expect(getByTestId('price').dataset.dir).toBe('rise')
  })

  test('change null이면 "지난달 대비" 줄 없이 가격만', () => {
    const { container, queryByTestId } = render(
      <PriceBlock price={{ now: 5000, wasMonthAgo: null, unit: g100, perUnit: null, change: null, monthAgoPct: null, spark: null }} />,
    )
    expect(queryByTestId('compare')).toBeNull()
    expect(container.textContent).not.toContain('비슷')
    expect(queryByTestId('chip')).toBeNull()
    expect(container.innerHTML).toContain('5,000')
  })
})

// 단위 없이는 315원(감자 100g)과 21,476원(수박 1개)이 같은 저울 위에 있는 것처럼 읽힌다.
// 기준선 줄은 "이 숫자를 무엇으로 재었나"를 말한다 — 개당값과 같은 계층이다.
describe('PriceBlock 기준선(단위) 줄', () => {
  test('무게 단위: "100g 기준"만', () => {
    const { getByTestId } = render(
      <PriceBlock price={{ now: 315, wasMonthAgo: 370, unit: g100, perUnit: null, change: { kind: 'fall', pct: 15, basisLabel: '지난달' }, monthAgoPct: -15, spark: null }} />,
    )
    expect(getByTestId('basis').textContent).toBe('100g 기준')
  })

  test('개수 단위(N>1): 기준과 개당값을 한 줄에', () => {
    const { getByTestId } = render(
      <PriceBlock price={{ now: 7043, wasMonthAgo: 8009, unit: ten, perUnit: 704, change: { kind: 'fall', pct: 12, basisLabel: '지난달' }, monthAgoPct: -12, spark: null }} />,
    )
    expect(getByTestId('basis').textContent).toBe('10개 기준 · 개당 704원')
  })

  test('포기 단수: 기준만, 개당값 없음', () => {
    const { container, getByTestId } = render(
      <PriceBlock price={{ now: 2997, wasMonthAgo: 2911, unit: onePogi, perUnit: null, change: { kind: 'rise', pct: 3, basisLabel: '지난달' }, monthAgoPct: 3, spark: null }} />,
    )
    expect(getByTestId('basis').textContent).toBe('1포기 기준')
    expect(container.textContent).not.toContain('개당')
  })

  test('기준선(등락)이 없어도 단위는 남는다 — 단위는 조건부가 아니다', () => {
    // 복숭아: 한 달 전 가격이 없어 취소선·칩이 통째로 사라진다. 단위까지 사라지면 안 된다.
    const { getByTestId, queryByTestId } = render(
      <PriceBlock price={{ now: 19141, wasMonthAgo: null, unit: ten, perUnit: 1914, change: null, monthAgoPct: null, spark: null }} />,
    )
    expect(queryByTestId('chip')).toBeNull()
    expect(getByTestId('basis').textContent).toBe('10개 기준 · 개당 1,914원')
  })
})

test('change.kind가 basis면 "작년 기준"만 그리고 등락 칩·화살표는 없다', () => {
  const price: PriceCardView = {
    now: 3200,
    wasMonthAgo: null,
    unit: { quantity: 1, measure: { kind: 'count', unit: '개' } },
    perUnit: null,
    change: { kind: 'basis', basisLabel: '작년' },
    monthAgoPct: null,
    spark: null,
  }
  const { container, queryByTestId } = render(<PriceBlock price={price} />)
  expect(container.textContent).toContain('작년 기준')
  expect(container.textContent).toContain('3,200')
  expect(queryByTestId('chip')).toBeNull()
  expect(container.querySelector('svg')).toBeNull()
})
