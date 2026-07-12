// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import { Coming } from './Coming'
import { renderWithRouter } from '../test-utils'
import type { ComingView } from '../view-types'

const base: ComingView = {
  months: [
    { month: 8, season: 'summer', items: [{ emoji: '🍑', name: '복숭아', peak: false, whyNow: '여름 복숭아' }] },
    { month: 9, season: 'autumn', items: [{ emoji: '🌰', name: '밤', peak: true, whyNow: '9월이 절정이에요' }] },
  ],
  date: new Date('2026-07-15T00:00:00'),
  term: '소서',
}

describe('Coming', () => {
  test('머리말·달 헤더·카드·절정 배지·목차를 그린다', async () => {
    const { container } = await renderWithRouter(<Coming view={base} />)
    expect(container.querySelector('h1')?.textContent).toContain('다가오는 제철')
    expect([...container.querySelectorAll('h2')].map((h) => h.textContent)).toEqual(['8월', '9월'])
    const cards = container.querySelectorAll('.coming-card')
    expect(cards).toHaveLength(2)
    expect(cards[1].getAttribute('data-season')).toBe('autumn')
    expect(container.textContent).toContain('복숭아')
    expect(container.textContent).toContain('9월이 절정이에요')
    expect(container.querySelectorAll('.peak-badge')).toHaveLength(1) // 밤(9월)만
    expect(container.querySelector('details')).toBeNull() // 예고는 가볍다
    expect(container.querySelector('.nav-index')).not.toBeNull()
    expect(container.querySelector('.sprig')).not.toBeNull()
  })

  test('다가오는 게 없으면 담백한 안내', async () => {
    const { container } = await renderWithRouter(<Coming view={{ ...base, months: [] }} />)
    expect(container.textContent).toContain('다가오는 제철 정보가 아직 없어요')
    expect(container.querySelector('h2')).toBeNull()
  })
})
