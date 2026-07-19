// @vitest-environment jsdom
import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { App } from './App'
import type { CardView, SeasonStripView } from '../card'
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
    comparison: { basis: 'weekAgo', basisLabel: '지난 주', pct: -8.08 },
    baseline: { weekAgo: 19800, twoWeeksAgo: null, monthAgo: 24500, yearAgo: 19800, normalYear: null },
  },
}
const base: AppView = {
  cards: [toCardView(pick, 7)], noDrop: false, hasNutrition: false, hasRecipes: false,
  searchIndex: [],
  date: new Date('2026-07-10'), freshness: { kind: 'dated', surveyedOn: '2026-07-10', days: 0 },
}

/** 필터/정렬 테스트용 최소 CardView. 가격·영양·레시피 없이 이름·카테고리만 지정.
 *  기본 inPeak: true — 앱의 기본 필터가 "한창 제철"이라, 이 필터를 안 다루는 테스트는
 *  픽스처가 절정이어야 기본 필터에 안 걸러진다. */
const emptyStrip: SeasonStripView = {
  months: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1, inSeason: false, isPeak: false, isCurrent: false,
  })),
  seasonLabel: '', peakLabel: '', currentMonth: 7,
}

function makeCard(overrides: Partial<CardView> = {}): CardView {
  return {
    emoji: '🥕', name: '당근', kind: '', category: 'fruit', inPeak: true,
    whyNow: '', note: { pick: '', store: '', use: '' },
    price: null, nutrition: null, recipes: null, season: emptyStrip,
    ...overrides,
  }
}

function viewWithCards(specs: Partial<CardView>[]): AppView {
  return { ...base, cards: specs.map((s) => makeCard(s)) }
}

describe('App', () => {
  afterEach(() => cleanup())

  test('카드·필터·whyNow·절정 dot 렌더', async () => {
    const { container, getByText, queryByTestId, queryByRole } = await renderWithRouter(
      <App view={base} />,
    )
    const html = container.innerHTML
    expect(html).toContain('data-cat="fruit"')
    // 옛 CSS 라디오(#f-fruit) 대신 JS FilterBar 칩이 마운트 후 보인다
    expect(queryByTestId('filter')).not.toBeNull()
    expect(container.textContent).toContain('과일')
    expect(container.textContent).toContain('여름이 절정이에요')
    // 한마디는 펼치기 전에도 보이도록 summary 안에 산다 (손글씨 메모)
    expect(getByText('여름이 절정이에요')).toBeTruthy()
    expect(html).toContain('18,200')
    expect(queryByRole('button', { name: '지금이 제철 절정' })).not.toBeNull()
    expect(queryByTestId('sprig')).not.toBeNull()
  })
  test('카드 없으면 안내·필터 없음', async () => {
    const { container, queryByTestId } = await renderWithRouter(
      <App view={{ ...base, cards: [] }} />,
    )
    expect(container.textContent).toContain('이번 달 제철 정보가 아직 없어요')
    expect(queryByTestId('filter')).toBeNull()
  })
  test('필터 칩 토글로 카드가 걸러진다', async () => {
    const view = viewWithCards([
      { name: '수박', category: 'fruit' },
      { name: '오이', category: 'vegetable' },
    ])
    const { container, getByRole } = await renderWithRouter(<App view={view} />)
    fireEvent.click(getByRole('button', { name: '과일' }))
    expect(container.textContent).toContain('수박')
    expect(container.textContent).not.toContain('오이')
  })
  test('정렬 변경이 순서를 바꾼다 (이름)', async () => {
    const view = viewWithCards([{ name: '수박' }, { name: '가지' }])
    const { getByLabelText, getAllByTestId } = await renderWithRouter(<App view={view} />)
    fireEvent.change(getByLabelText('정렬'), { target: { value: 'name' } })
    // card-title에는 이름 + 절정 dot(툴팁 텍스트 포함)이 함께 있어 첫 텍스트 노드(이름)만 본다
    const names = getAllByTestId('card-name').map((n) => n.firstChild?.textContent)
    expect(names).toEqual(['가지', '수박'])
  })
  test('조건에 맞는 카드가 없으면 빈 상태 문구를 보인다', async () => {
    const view = viewWithCards([{ name: '수박', category: 'fruit' }])
    const { container, getByRole } = await renderWithRouter(<App view={view} />)
    fireEvent.click(getByRole('button', { name: '채소' }))
    expect(container.textContent).toContain('조건에 맞는 제철 품목이 없어요')
  })
  test('noDrop이면 담백한 안내를 보인다', async () => {
    const { container } = await renderWithRouter(<App view={{ ...base, noDrop: true }} />)
    expect(container.textContent).toContain('크게 내려온 게 없어요')
  })
  test('절기가 있으면 아이브로에 함께', async () => {
    const { container } = await renderWithRouter(<App view={{ ...base, cards: [], term: '소서' }} />)
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
    const { getByText, getByRole } = await renderWithRouter(<App view={base} />)
    expect(getByRole('button', { name: '목차' })).toBeTruthy()
    const coming = getByText('다가오는 제철 품목') as HTMLAnchorElement
    expect(coming.getAttribute('href')).toContain('coming')
  })
  test('맨 아래 옛 "곧 제철" 한 줄은 없다', async () => {
    const { queryByText } = await renderWithRouter(<App view={base} />)
    expect(queryByText(/곧 제철/)).toBeNull()
  })
  test('조사일: 상대 표현 상시 + 절대날짜는 툴팁 + 전국 평균', async () => {
    const { getByTestId } = await renderWithRouter(<App view={base} />)
    // 상대("오늘")만 상시, 절대날짜는 .date-tip 툴팁에 접어둔다
    expect(getByTestId('rel-date').textContent).toContain('오늘')
    expect(getByTestId('date-tip').textContent).toBe('7월 10일 조사')
    expect(getByTestId('surveyed').textContent).toContain('전국 평균')
  })
  test('하단 "○월의 제철" 이름 칩 목록은 없다', async () => {
    const { container } = await renderWithRouter(<App view={base} />)
    expect(container.textContent).not.toMatch(/월의 제철/)
  })
  test('필터 칩 문구 갱신 + 정렬 아이콘·현재값', async () => {
    const { container, queryByTestId, getByRole } = await renderWithRouter(
      <App view={viewWithCards([{ name: '오이' }])} />,
    )
    expect(container.textContent).toContain('가격 하락')
    expect(container.textContent).toContain('한창 제철')
    expect(container.textContent).not.toMatch(/내려간 것|>절정</)
    // "정렬" 글자는 아이콘으로, 현재값은 select에 보인다
    expect(queryByTestId('sort-icon')).not.toBeNull()
    expect(getByRole('combobox', { name: '정렬' }).textContent).toContain('하락 큰 순')
  })
  test('조사일 줄에 전국 평균 표기', async () => {
    const view = viewWithCards([{ name: '오이' }])
    const { getByTestId } = await renderWithRouter(<App view={view} />)
    expect(getByTestId('surveyed').textContent).toContain('전국 평균')
  })
  test('스냅샷 없으면(none) 조사일 줄이 없다', async () => {
    const view: AppView = { ...base, freshness: { kind: 'none' } }
    const { queryByTestId } = await renderWithRouter(<App view={view} />)
    expect(queryByTestId('surveyed')).toBeNull()
  })
  test('검색: 제철 매치는 카드로, 비제철 매치는 힌트로', async () => {
    const view: AppView = {
      ...viewWithCards([{ name: '오이' }]),
      searchIndex: [{ emoji: '🍓', name: '딸기', seasonLabel: '12~4월', comingSoon: false }],
    }
    const { container } = await renderWithRouter(<App view={view} />)
    fireEvent.change(container.querySelector('input[type="search"]')!, { target: { value: '딸' } })
    expect(container.textContent).not.toContain('오이')
    expect(container.textContent).toContain('딸기')
    expect(container.textContent).toContain('12~4월 제철')
  })
  test('검색 무매치면 담백한 안내', async () => {
    const view = viewWithCards([{ name: '오이' }])
    const { container } = await renderWithRouter(<App view={view} />)
    fireEvent.change(container.querySelector('input[type="search"]')!, { target: { value: 'zzz' } })
    expect(container.textContent).toContain("찾지 못했어요")
  })
})
