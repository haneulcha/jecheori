// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { PriceBlock } from './PriceBlock'
import type { Unit } from '../types'

const g100: Unit = { quantity: 100, measure: { kind: 'weight', unit: 'g' } }
const ten: Unit = { quantity: 10, measure: { kind: 'count', unit: '개' } }
const onePogi: Unit = { quantity: 1, measure: { kind: 'count', unit: '포기' } }

describe('PriceBlock', () => {
  test('하락: "지난달 대비" 라벨 + 칩 + 큰가격, fall 클래스 (취소선 없음)', () => {
    const { container } = render(
      <PriceBlock price={{ now: 12600, wasMonthAgo: 16900, unit: ten, perUnit: 1260, change: { kind: 'fall', pct: 25, basisLabel: '지난달' }, monthAgoPct: -25, spark: null }} />,
    )
    expect(container.querySelector('.price.fall')).not.toBeNull()
    // 취소선 예전가는 없앴다 — 등락은 "지난달 대비" 라벨 + 칩으로 표현
    expect(container.innerHTML).not.toContain('16,900')
    expect(container.querySelector('.compare')?.textContent).toContain('지난달 대비')
    expect(container.querySelector('.chip')).not.toBeNull()
    expect(container.textContent).toContain('25%')
    expect(container.innerHTML).toContain('12,600')
  })

  test('상승: rise 클래스', () => {
    const { container } = render(
      <PriceBlock price={{ now: 5000, wasMonthAgo: 4400, unit: g100, perUnit: null, change: { kind: 'rise', pct: 14, basisLabel: '지난달' }, monthAgoPct: 14, spark: null }} />,
    )
    expect(container.querySelector('.price.rise')).not.toBeNull()
  })

  test('similar은 칩·라벨 없이 "지난달과 비슷"·쪽빛(fall)', () => {
    const { container } = render(
      <PriceBlock price={{ now: 5000, wasMonthAgo: 5010, unit: g100, perUnit: null, change: { kind: 'similar', basisLabel: '지난달' }, monthAgoPct: 0.2, spark: null }} />,
    )
    expect(container.querySelector('.price.fall')).not.toBeNull()
    expect(container.querySelector('.chip')).toBeNull()
    expect(container.querySelector('.compare')).toBeNull()
    expect(container.textContent).toContain('지난달과 비슷')
  })

  test('change null이면 "지난달 대비" 줄 없이 가격만', () => {
    const { container } = render(
      <PriceBlock price={{ now: 5000, wasMonthAgo: null, unit: g100, perUnit: null, change: null, monthAgoPct: null, spark: null }} />,
    )
    expect(container.querySelector('.compare')).toBeNull()
    expect(container.querySelector('.near')).toBeNull()
    expect(container.querySelector('.chip')).toBeNull()
    expect(container.innerHTML).toContain('5,000')
  })
})

// 단위 없이는 315원(감자 100g)과 21,476원(수박 1개)이 같은 저울 위에 있는 것처럼 읽힌다.
// 기준선 줄은 "이 숫자를 무엇으로 재었나"를 말한다 — 개당값과 같은 계층이다.
describe('PriceBlock 기준선(단위) 줄', () => {
  test('무게 단위: "100g 기준"만', () => {
    const { container } = render(
      <PriceBlock price={{ now: 315, wasMonthAgo: 370, unit: g100, perUnit: null, change: { kind: 'fall', pct: 15, basisLabel: '지난달' }, monthAgoPct: -15, spark: null }} />,
    )
    const basis = container.querySelector('.basis')
    expect(basis?.textContent).toBe('100g 기준')
  })

  test('개수 단위(N>1): 기준과 개당값을 한 줄에', () => {
    const { container } = render(
      <PriceBlock price={{ now: 7043, wasMonthAgo: 8009, unit: ten, perUnit: 704, change: { kind: 'fall', pct: 12, basisLabel: '지난달' }, monthAgoPct: -12, spark: null }} />,
    )
    const basis = container.querySelector('.basis')
    expect(basis?.textContent).toBe('10개 기준 · 개당 704원')
  })

  test('포기 단수: 기준만, 개당값 없음', () => {
    const { container } = render(
      <PriceBlock price={{ now: 2997, wasMonthAgo: 2911, unit: onePogi, perUnit: null, change: { kind: 'rise', pct: 3, basisLabel: '지난달' }, monthAgoPct: 3, spark: null }} />,
    )
    expect(container.querySelector('.basis')?.textContent).toBe('1포기 기준')
    expect(container.textContent).not.toContain('개당')
  })

  test('기준선(등락)이 없어도 단위는 남는다 — 단위는 조건부가 아니다', () => {
    // 복숭아: 한 달 전 가격이 없어 취소선·칩이 통째로 사라진다. 단위까지 사라지면 안 된다.
    const { container } = render(
      <PriceBlock price={{ now: 19141, wasMonthAgo: null, unit: ten, perUnit: 1914, change: null, monthAgoPct: null, spark: null }} />,
    )
    expect(container.querySelector('.was')).toBeNull()
    expect(container.querySelector('.chip')).toBeNull()
    expect(container.querySelector('.basis')?.textContent).toBe('10개 기준 · 개당 1,914원')
  })
})
