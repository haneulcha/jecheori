import { describe, expect, test } from 'vitest'
import { escapeHtml, formatPrice, perUnitPrice, renderApp, weekLabel } from '../src/render'
import type { PickResult } from '../src/picks'
import type { ProduceProfile } from '../src/types'

const profile: ProduceProfile = {
  id: 'peach',
  name: '복숭아',
  emoji: '🍑',
  category: 'fruit',
  kamis: { categoryCode: '400', itemName: '복숭아' },
  seasonMonths: [7, 8],
  peakMonths: [7],
  whyNow: { default: '여름이 절정이에요' },
  howToPick: '향이 진한 것',
  howToStore: '실온 후숙',
  howToUse: '그냥 먹기',
}

describe('weekLabel', () => {
  test('1일은 첫째 주', () => expect(weekLabel(new Date('2026-07-01'))).toBe('7월 첫째 주'))
  test('10일은 둘째 주', () => expect(weekLabel(new Date('2026-07-10'))).toBe('7월 둘째 주'))
  test('31일은 다섯째 주', () => expect(weekLabel(new Date('2026-07-31'))).toBe('7월 다섯째 주'))
})

describe('formatPrice', () => {
  test('하락', () =>
    expect(
      formatPrice({ price: 18200, unit: '10개', changeVsMonthAgoPct: -25.7 }),
    ).toBe('18,200원/10개 · 한 달 전보다 26% ↓'))
  test('상승', () =>
    expect(formatPrice({ price: 5000, unit: '1kg', changeVsMonthAgoPct: 12.2 })).toBe(
      '5,000원/1kg · 한 달 전보다 12% ↑',
    ))
  test('±1% 미만은 비슷해요', () =>
    expect(formatPrice({ price: 5000, unit: '1kg', changeVsMonthAgoPct: 0.4 })).toBe(
      '5,000원/1kg · 한 달 전과 비슷해요',
    ))
  test('비교 불가면 가격만', () =>
    expect(formatPrice({ price: 5000, unit: '1kg', changeVsMonthAgoPct: null })).toBe(
      '5,000원/1kg',
    ))
})

describe('escapeHtml', () => {
  test('특수문자를 이스케이프한다', () => {
    expect(escapeHtml('<b>&"\'</b>')).toBe('&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;')
  })
})

describe('perUnitPrice', () => {
  test('10개면 개당값', () => expect(perUnitPrice(18200, '10개')).toEqual({ each: 1820 }))
  test('반올림', () => expect(perUnitPrice(12600, '10개')).toEqual({ each: 1260 }))
  test('1개(단수)는 null', () => expect(perUnitPrice(21400, '1개')).toBeNull())
  test('무게 단위는 null', () => expect(perUnitPrice(8000, '1kg')).toBeNull())
})

describe('renderApp', () => {
  const picks: PickResult[] = [
    {
      profile,
      inPeak: true,
      price: { price: 18200, unit: '10개', changeVsMonthAgoPct: -25.7 },
    },
  ]

  test('픽 카드에 이름·문구·가격이 들어간다', () => {
    const html = renderApp({ picks, seasonal: [profile], date: new Date('2026-07-10'), staleDays: 0 })
    expect(html).toContain('복숭아')
    expect(html).toContain('여름이 절정이에요')
    expect(html).toContain('18,200원')
    expect(html).toContain('제철 한창') // 절정 배지
    expect(html).toContain('7월 둘째 주')
  })

  test('가격이 없으면 가격 줄 없이 렌더링된다', () => {
    const html = renderApp({
      picks: [{ profile, inPeak: false, price: null }],
      seasonal: [profile],
      date: new Date('2026-07-10'),
      staleDays: 0,
    })
    expect(html).toContain('복숭아')
    expect(html).not.toContain('원/')
  })

  test('스냅샷이 3일 이상 오래되면 배지를 보여준다', () => {
    const html = renderApp({ picks, seasonal: [], date: new Date('2026-07-10'), staleDays: 4 })
    expect(html).toContain('가격은 4일 전 기준')
  })

  test('픽이 없으면 안내 문구', () => {
    const html = renderApp({ picks: [], seasonal: [], date: new Date('2026-07-10'), staleDays: 0 })
    expect(html).toContain('이번 달 제철 정보가 아직 없어요')
  })

  test('절기가 있으면 아이브로에 함께 표기된다', () => {
    const html = renderApp({
      picks: [],
      seasonal: [],
      date: new Date('2026-07-10'),
      staleDays: 0,
      term: '소서',
    })
    expect(html).toContain('소서 · 7월 둘째 주')
  })

  test('머리말에 라인아트 스케치가 들어간다', () => {
    const html = renderApp({ picks: [], seasonal: [], date: new Date('2026-07-10'), staleDays: 0 })
    expect(html).toContain('class="sprig"')
  })
})
