import { describe, expect, test } from 'vitest'
import { escapeHtml, renderApp, weekLabel, renderPeakDot, renderSparkline, renderNote, renderPriceBlock } from '../src/render'
import { sparklineGeometry } from '../src/card'
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

describe('escapeHtml', () => {
  test('특수문자를 이스케이프한다', () => {
    expect(escapeHtml('<b>&"\'</b>')).toBe('&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;')
  })
})

describe('renderApp', () => {
  const picks: PickResult[] = [
    {
      profile,
      inPeak: true,
      price: { price: 18200, unit: '10개', changeVsMonthAgoPct: -25.7, priceMonthAgo: 24500, priceYearAgo: 19800 },
    },
  ]

  test('픽 카드: 이름·가격블록·data-cat·절정 dot', () => {
    const html = renderApp({ picks, seasonal: [profile], date: new Date('2026-07-10'), staleDays: 0 })
    expect(html).toContain('복숭아')
    expect(html).toContain('data-cat="fruit"')
    expect(html).toContain('class="price fall')  // 가격 블록
    expect(html).toContain('18,200')
    expect(html).toContain('peak-dot')            // 절정
    expect(html).toContain('여름이 절정이에요')     // whyNow (펼침)
  })

  test('가격이 없으면 가격 블록 없이', () => {
    const html = renderApp({ picks: [{ profile, inPeak: false, price: null }], seasonal: [profile], date: new Date('2026-07-10'), staleDays: 0 })
    expect(html).toContain('복숭아')
    expect(html).not.toContain('class="price')
    expect(html).not.toContain('peak-dot')
  })

  test('스냅샷이 3일 이상 오래되면 배지를 보여준다', () => {
    const html = renderApp({ picks, seasonal: [], date: new Date('2026-07-10'), staleDays: 4 })
    expect(html).toContain('가격은 4일 전 기준')
  })

  test('픽이 없으면 안내 문구', () => {
    const html = renderApp({ picks: [], seasonal: [], date: new Date('2026-07-10'), staleDays: 0 })
    expect(html).toContain('이번 달 제철 정보가 아직 없어요')
  })

  test('픽이 있으면 과일/채소 필터 토글', () => {
    const html = renderApp({ picks, seasonal: [profile], date: new Date('2026-07-10'), staleDays: 0 })
    expect(html).toContain('id="f-all"')
    expect(html).toContain('id="f-fruit"')
    expect(html).toContain('id="f-veg"')
    expect(html).toContain('class="list"')
  })
  test('픽이 없으면 필터 없음', () => {
    const html = renderApp({ picks: [], seasonal: [], date: new Date('2026-07-10'), staleDays: 0 })
    expect(html).not.toContain('id="f-fruit"')
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

  test('픽은 있으나 하락이 없으면 담백한 안내', () => {
    const flat = [{ profile, inPeak: true, price: { price: 5000, unit: '1kg', changeVsMonthAgoPct: 2, priceMonthAgo: 4900, priceYearAgo: 5000 } }]
    const html = renderApp({ picks: flat, seasonal: [profile], date: new Date('2026-07-10'), staleDays: 0 })
    expect(html).toContain('크게 내려온 게 없어요')
  })
  test('곧 제철 예고', () => {
    const html = renderApp({ picks: [], seasonal: [], date: new Date('2026-07-10'), staleDays: 0, coming: [{ ...profile, name: '포도', emoji: '🍇' }] })
    expect(html).toContain('곧 제철')
    expect(html).toContain('포도')
  })
})

describe('renderPriceBlock', () => {
  test('하락: 취소선 지난값 + 칩 % + 큰 가격 + 개당값', () => {
    const html = renderPriceBlock({ now: 12600, wasMonthAgo: 16900, perUnit: 1260, change: { kind: 'fall', pct: 25 }, spark: null })
    expect(html).toContain('class="price fall"')
    expect(html).toContain('16,900원') // 취소선 지난값
    expect(html).toContain('12,600')   // 큰 가격
    expect(html).toContain('25%')      // 등락
    expect(html).toContain('개당 1,260원')
  })
  test('상승: rise 클래스, 무게 단위면 개당값 없음', () => {
    const html = renderPriceBlock({ now: 5000, wasMonthAgo: 4400, perUnit: null, change: { kind: 'rise', pct: 14 }, spark: null })
    expect(html).toContain('class="price rise"')
    expect(html).not.toContain('개당')
  })
  test('변동 미미(similar)는 칩 없이 비슷 문구, 쪽빛 유지', () => {
    const html = renderPriceBlock({ now: 5000, wasMonthAgo: 5010, perUnit: null, change: { kind: 'similar' }, spark: null })
    expect(html).toContain('비슷')
    expect(html).not.toContain('chip')
    expect(html).toContain('class="price fall"')
  })
  test('지난값 없으면(change null) 취소선 생략', () => {
    const html = renderPriceBlock({ now: 5000, wasMonthAgo: null, perUnit: null, change: null, spark: null })
    expect(html).not.toContain('was')
    expect(html).toContain('5,000')
  })
})

describe('renderPeakDot', () => {
  test('절정이면 dot + 툴팁', () => {
    const html = renderPeakDot(true)
    expect(html).toContain('class="peak-dot"')
    expect(html).toContain('맛의 절정')
  })
  test('절정 아니면 빈 문자열', () => expect(renderPeakDot(false)).toBe(''))
})

describe('renderSparkline', () => {
  test('SVG + 라벨 + 값', () => {
    const spark = {
      points: sparklineGeometry({ yearAgo: 13400, monthAgo: 16900, now: 12600 }),
      yearAgo: 13400,
      monthAgo: 16900,
      now: 12600,
    }
    const html = renderSparkline(spark)
    expect(html).toContain('<svg')
    expect(html).toContain('작년 이맘때')
    expect(html).toContain('지금')
    expect(html).toContain('12,600')
  })
})

describe('renderNote', () => {
  test('세 키와 내용을 담는다', () => {
    const html = renderNote({ pick: '향이 진한 것', store: '실온 후숙', use: '그냥 먹기' })
    expect(html).toContain('class="note"')
    expect(html).toContain('고르는 법')
    expect(html).toContain('보관')
    expect(html).toContain('쓰임')
    expect(html).toContain('향이 진한 것')
    expect(html).toContain('실온 후숙')
    expect(html).toContain('그냥 먹기')
  })
  test('내용을 이스케이프한다', () => {
    expect(renderNote({ pick: '<b>x</b>', store: '', use: '' })).toContain('&lt;b&gt;')
  })
})
