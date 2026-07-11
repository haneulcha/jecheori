// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { ProduceCard } from './ProduceCard'
import type { CardView } from '../card'

const base: CardView = {
  emoji: '🍅', name: '토마토', kind: '', category: 'vegetable', inPeak: false,
  whyNow: '', note: { pick: 'p', store: 's', use: 'u' }, price: null, nutrition: null, recipes: null,
}

describe('ProduceCard 레시피 진입점', () => {
  test('recipes 없으면 진입점이 없다', () => {
    const { container } = render(<ProduceCard card={base} />)
    expect(container.querySelector('.recipe-open')).toBeNull()
  })

  test('recipes 있으면 진입점을 보이고, 탭하면 바텀시트가 열린다', () => {
    const card = { ...base, recipes: [{ name: '토마토달걀볶음', ingredients: '토마토, 달걀', steps: ['썬다'] }] }
    const { container, getByText } = render(<ProduceCard card={card} />)
    const open = container.querySelector('.recipe-open')!
    expect(open).not.toBeNull()
    expect(container.querySelector('.sheet')).toBeNull() // 처음엔 닫힘
    fireEvent.click(open)
    expect(container.querySelector('.sheet')).not.toBeNull()
    expect(getByText('토마토달걀볶음')).toBeTruthy()
  })
})
