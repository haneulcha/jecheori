// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { App } from './App'
import { toCardView } from '../card'
import type { PickResult } from '../picks'
import type { ProduceProfile } from '../types'
import type { AppView } from '../view-types'

const profile: ProduceProfile = {
  id: 'peach', name: '복숭아', emoji: '🍑', category: 'fruit',
  kamis: { categoryCode: '400', itemName: '복숭아' },
  seasonMonths: [7, 8], peakMonths: [7], whyNow: { default: '여름이 절정이에요' },
  howToPick: 'p', howToStore: 's', howToUse: 'u',
}
const pick: PickResult = {
  profile, inPeak: true,
  price: { price: 18200, unit: '10개', changeVsMonthAgoPct: -25.7, priceMonthAgo: 24500, priceYearAgo: 19800 },
}
const base: AppView = {
  cards: [toCardView(pick, 7)], noDrop: false, hasNutrition: false,
  seasonal: [{ emoji: '🍑', name: '복숭아' }], coming: [],
  date: new Date('2026-07-10'), staleDays: 0,
}

describe('App', () => {
  test('카드·필터·whyNow·절정 dot 렌더', () => {
    const { container } = render(<App view={base} />)
    const html = container.innerHTML
    expect(html).toContain('data-cat="fruit"')
    expect(container.querySelector('#f-fruit')).not.toBeNull()
    expect(container.textContent).toContain('여름이 절정이에요')
    // 한마디는 펼치기 전에도 보이도록 summary 안에 산다 (손글씨 메모)
    expect(container.querySelector('summary .why')?.textContent).toBe('여름이 절정이에요')
    expect(html).toContain('18,200')
    expect(container.querySelector('.peak-dot')).not.toBeNull()
    expect(container.querySelector('.sprig')).not.toBeNull()
  })
  test('카드 없으면 안내·필터 없음', () => {
    const { container } = render(<App view={{ ...base, cards: [] }} />)
    expect(container.textContent).toContain('이번 달 제철 정보가 아직 없어요')
    expect(container.querySelector('#f-fruit')).toBeNull()
  })
  test('noDrop·곧 제철', () => {
    const { container } = render(
      <App view={{ ...base, noDrop: true, coming: [{ emoji: '🍇', name: '포도' }] }} />,
    )
    expect(container.textContent).toContain('크게 내려온 게 없어요')
    expect(container.textContent).toContain('포도')
  })
  test('절기가 있으면 아이브로에 함께', () => {
    const { container } = render(<App view={{ ...base, cards: [], seasonal: [], term: '소서' }} />)
    expect(container.textContent).toContain('소서 · 7월 둘째 주')
  })
})
