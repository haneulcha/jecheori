// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { ComingCard } from './ComingCard'

describe('ComingCard', () => {
  test('카드 껍데기로 이모지·이름·한마디, 절정 배지, 미래 계절색', () => {
    const { container } = render(
      <ComingCard item={{ emoji: '🌰', name: '밤', peak: true, whyNow: '9월이 절정이에요' }} season="autumn" />,
    )
    const card = container.querySelector('.card.coming-card')!
    expect(card.getAttribute('data-season')).toBe('autumn')
    expect(container.querySelector('.emoji')?.textContent).toBe('🌰')
    expect(container.querySelector('.card-title')?.textContent).toContain('밤')
    expect(container.querySelector('.peak-badge')).not.toBeNull()
    expect(container.querySelector('.why')?.textContent).toBe('9월이 절정이에요')
    // 예고는 가볍다: 펼침·가격 없음
    expect(container.querySelector('details')).toBeNull()
    expect(container.querySelector('.price')).toBeNull()
  })

  test('절정 아니면 배지 없음, 한마디 없으면 why 없음', () => {
    const { container } = render(
      <ComingCard item={{ emoji: '🍠', name: '고구마', peak: false, whyNow: '' }} season="autumn" />,
    )
    expect(container.querySelector('.peak-badge')).toBeNull()
    expect(container.querySelector('.why')).toBeNull()
  })
})
