// @vitest-environment jsdom
import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { App } from './App'
import { toCardView } from '../card'
import { renderWithRouter } from '../test-utils'
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
  price: {
    price: 18200,
    unit: { quantity: 10, measure: { kind: 'count', unit: '개' } },
    changeVsMonthAgoPct: -25.7,
    baseline: { monthAgo: 24500, yearAgo: 19800 },
  },
}
const base: AppView = {
  cards: [toCardView(pick, 7)], noDrop: false, hasNutrition: false, hasRecipes: false,
  seasonal: [{ emoji: '🍑', name: '복숭아' }],
  searchIndex: [],
  date: new Date('2026-07-10'), freshness: { kind: 'dated', surveyedOn: '2026-07-10', days: 0 },
}

describe('App', () => {
  afterEach(() => cleanup())

  test('카드·필터·whyNow·절정 dot 렌더', async () => {
    const { container } = await renderWithRouter(<App view={base} />)
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
  test('카드 없으면 안내·필터 없음', async () => {
    const { container } = await renderWithRouter(<App view={{ ...base, cards: [] }} />)
    expect(container.textContent).toContain('이번 달 제철 정보가 아직 없어요')
    expect(container.querySelector('#f-fruit')).toBeNull()
  })
  test('noDrop이면 담백한 안내를 보인다', async () => {
    const { container } = await renderWithRouter(<App view={{ ...base, noDrop: true }} />)
    expect(container.textContent).toContain('크게 내려온 게 없어요')
  })
  test('절기가 있으면 아이브로에 함께', async () => {
    const { container } = await renderWithRouter(<App view={{ ...base, cards: [], seasonal: [], term: '소서' }} />)
    expect(container.textContent).toContain('소서 · 7월 둘째 주')
  })
  test('hasRecipes면 레시피 출처를 페이지 하단에 한 번 보인다', async () => {
    const { container } = await renderWithRouter(<App view={{ ...base, hasRecipes: true }} />)
    expect(container.textContent).toContain('식품의약품안전처 조리식품 레시피 DB')
  })
  test('hasRecipes false면 레시피 출처가 없다', async () => {
    const { container } = await renderWithRouter(<App view={base} />)
    expect(container.textContent).not.toContain('조리식품 레시피 DB')
  })
  test('목차(NavIndex)로 다가오는 제철에 갈 수 있다', async () => {
    const { container, getByText } = await renderWithRouter(<App view={base} />)
    expect(container.querySelector('.nav-index')).not.toBeNull()
    const coming = getByText('다가오는 제철') as HTMLAnchorElement
    expect(coming.getAttribute('href')).toContain('coming')
  })
  test('맨 아래 옛 "곧 제철" 한 줄은 없다', async () => {
    const { container } = await renderWithRouter(<App view={base} />)
    expect(container.querySelector('.coming')).toBeNull()
  })
  test('조사일 한 줄을 항상 보여준다 (오늘)', async () => {
    const { container } = await renderWithRouter(<App view={base} />)
    expect(container.querySelector('.surveyed')?.textContent).toBe('오늘 · 7월 10일 기준')
  })
  test('스냅샷 없으면(none) 조사일 줄이 없다', async () => {
    const view: AppView = { ...base, freshness: { kind: 'none' } }
    const { container } = await renderWithRouter(<App view={view} />)
    expect(container.querySelector('.surveyed')).toBeNull()
  })
})
