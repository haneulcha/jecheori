// @vitest-environment jsdom
import { fireEvent, render, waitFor } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { ProduceCard } from './ProduceCard'
import type { CardView, SeasonStripView } from '../card'

const emptyStrip: SeasonStripView = {
  months: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1, inSeason: false, isPeak: false, isCurrent: false,
  })),
  seasonLabel: '', peakLabel: '', currentMonth: 7,
}

const base: CardView = {
  emoji: '🍅', name: '토마토', kind: '', category: 'vegetable', inPeak: false,
  whyNow: '', note: { pick: 'p', store: 's', use: 'u' },
  price: null, nutrition: null, recipes: null, season: emptyStrip,
}
const withRecipes: CardView = {
  ...base,
  recipes: [
    { name: '토마토달걀볶음', ingredients: '토마토, 달걀', steps: ['썬다'] },
    { name: '냉토마토파스타', ingredients: '토마토, 펜네', steps: ['삶는다'] },
  ],
}

describe('ProduceCard 레시피', () => {
  test('recipes 없으면 칩·메모가 없다', () => {
    const { container } = render(<ProduceCard card={base} />)
    expect(container.querySelector('.chips')).toBeNull()
    expect(container.querySelector('.memo')).toBeNull()
  })

  test('recipes 있으면 칩을 보이고 처음엔 메모가 없다', () => {
    const { container } = render(<ProduceCard card={withRecipes} />)
    expect(container.querySelectorAll('.chip-btn')).toHaveLength(2)
    expect(container.querySelector('.recipe-label')!.textContent).toBe('레시피')
    expect(container.querySelector('.memo')).toBeNull()
  })

  test('칩을 누르면 그 레시피 메모가 뜬다', () => {
    // 요리명은 칩과 메모 h3 두 곳에 나오므로 getByText가 아니라 메모로 스코프한다.
    const { container } = render(<ProduceCard card={withRecipes} />)
    fireEvent.click(container.querySelectorAll('.chip-btn')[1])
    const memo = container.querySelector('.memo')
    expect(memo).not.toBeNull()
    expect(memo!.querySelector('h3')!.textContent).toBe('냉토마토파스타')
  })

  test('‹ ›로 넘기면 메모 내용과 활성 칩이 동기화된다', () => {
    const { container } = render(<ProduceCard card={withRecipes} />)
    fireEvent.click(container.querySelectorAll('.chip-btn')[0]) // 0번 열기
    fireEvent.click(container.querySelector('.nav-next')!) // → 1번
    expect(container.querySelector('h3')!.textContent).toBe('냉토마토파스타')
    expect(container.querySelector('.count')!.textContent).toBe('2 / 2')
    const chips = container.querySelectorAll('.chip-btn')
    expect(chips[1].getAttribute('aria-pressed')).toBe('true')
    expect(chips[0].getAttribute('aria-pressed')).toBe('false')
  })

  test('같은 칩을 다시 누르면 메모가 닫힌다(즉시)', () => {
    const { container } = render(<ProduceCard card={withRecipes} />)
    const chip = container.querySelectorAll('.chip-btn')[0]
    fireEvent.click(chip)
    expect(container.querySelector('.memo')).not.toBeNull()
    fireEvent.click(chip)
    expect(container.querySelector('.memo')).toBeNull()
  })

  test('압정으로 닫으면 메모가 사라지고 포커스가 그 칩으로 돌아온다', async () => {
    const { container } = render(<ProduceCard card={withRecipes} />)
    const chip = container.querySelectorAll('.chip-btn')[0]
    fireEvent.click(chip)
    fireEvent.click(container.querySelector('.pin')!)
    await waitFor(() => expect(container.querySelector('.memo')).toBeNull())
    expect(document.activeElement).toBe(chip)
  })

  test('카드를 접으면 열린 메모가 초기화된다', () => {
    const { container } = render(<ProduceCard card={withRecipes} />)
    fireEvent.click(container.querySelectorAll('.chip-btn')[0])
    expect(container.querySelector('.memo')).not.toBeNull()
    const details = container.querySelector('details')!
    details.open = false
    fireEvent(details, new Event('toggle'))
    expect(container.querySelector('.memo')).toBeNull()
  })

  test('끝 레시피로 넘기면 포커스가 메모에 남는다(비활성 버튼 포커스 유실 방지)', () => {
    const { container } = render(<ProduceCard card={withRecipes} />)
    fireEvent.click(container.querySelectorAll('.chip-btn')[0]) // index 0
    fireEvent.click(container.querySelector('.nav-next')!) // → 마지막(1), next 비활성
    expect(document.activeElement).toBe(container.querySelector('.memo'))
  })

  test('카드를 접었다 다시 열면 메모가 열려 있지 않다(상태 초기화)', () => {
    const { container } = render(<ProduceCard card={withRecipes} />)
    const details = container.querySelector('details')!
    fireEvent.click(container.querySelectorAll('.chip-btn')[0])
    expect(container.querySelector('.memo')).not.toBeNull()
    details.open = false
    fireEvent(details, new Event('toggle'))
    expect(container.querySelector('.memo')).toBeNull()
    details.open = true
    fireEvent(details, new Event('toggle'))
    expect(container.querySelector('.memo')).toBeNull() // 재열림 시 닫힌 상태
  })
})

describe('ProduceCard 제철 띠', () => {
  test('펼치면 season 띠를 보인다', () => {
    const { container } = render(<ProduceCard card={base} />)
    expect(container.querySelectorAll('.season-cell')).toHaveLength(12)
    expect(container.querySelector('.season-cap')!.textContent).toBe('제철 달력 · 이번 달 7월')
  })
})
