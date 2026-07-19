// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import { Coming } from './Coming'
import { renderWithRouter } from '../test-utils'
import { buildComingView } from '../app'
import type { ProduceProfile } from '../types'

const EMPTY_SEED = { collectedYear: null, months: {} }
const prof = (
  id: string, name: string, emoji: string,
  seasonMonths: number[], peakMonths: number[], whyNow: Record<string, string>,
): ProduceProfile => ({
  id, name, emoji, category: 'fruit',
  kamis: { categoryCode: '400', itemName: id },
  seasonMonths, peakMonths, whyNow,
  howToPick: 'p', howToStore: 's', howToUse: 'u',
})

const view = buildComingView(
  [
    prof('peach2', '복숭아', '🍑', [8], [], { default: '여름 복숭아' }),
    prof('chestnut', '밤', '🌰', [9], [9], { '9': '9월이 절정이에요', default: '가을' }),
  ],
  EMPTY_SEED, null, null, new Date('2026-07-15T00:00:00'),
)

describe('Coming', () => {
  test('머리말·달 헤더·풀 카드(펼침 가능)·절정 dot·목차를 그린다', async () => {
    const { container } = await renderWithRouter(<Coming view={view} />)
    expect(container.querySelector('h1')?.textContent).toContain('다가오는 제철')
    expect([...container.querySelectorAll('h2')].map((h) => h.textContent)).toEqual(['8월', '9월'])
    const cards = container.querySelectorAll('.card')
    expect(cards).toHaveLength(2)
    const sections = container.querySelectorAll('.coming-month')
    expect(sections[1].getAttribute('data-season')).toBe('autumn') // 9월 = 가을
    expect(container.textContent).toContain('복숭아')
    expect(container.textContent).toContain('9월이 절정이에요')
    expect(container.querySelectorAll('.peak-dot')).toHaveLength(1) // 밤(9월)만
    expect(container.querySelector('details')).not.toBeNull() // 이제 펼침 가능
    expect(container.querySelector('.season-cell')).not.toBeNull() // 간트 띠
    expect(container.querySelector('.nav-index')).not.toBeNull()
    expect(container.querySelector('.sprig')).not.toBeNull()
  })

  test('다가오는 게 없으면 담백한 안내', async () => {
    const empty = buildComingView(
      [prof('peach', '복숭아', '🍑', [7], [], { default: '여름' })],
      EMPTY_SEED, null, null, new Date('2026-07-15T00:00:00'),
    )
    const { container } = await renderWithRouter(<Coming view={empty} />)
    expect(container.textContent).toContain('다가오는 제철 정보가 아직 없어요')
    expect(container.querySelector('h2')).toBeNull()
  })
})
