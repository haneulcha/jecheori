// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Coming } from './Coming'
import type { ComingView } from '../view-types'

const base: ComingView = {
  months: [
    { month: 8, season: 'summer', items: [{ emoji: '🍑', name: '복숭아', peak: false, whyNow: '' }] },
    { month: 9, season: 'autumn', items: [{ emoji: '🌰', name: '밤', peak: true, whyNow: '' }] },
  ],
  date: new Date('2026-07-15T00:00:00'),
  term: '소서',
}

describe('Coming', () => {
  test('달 헤더·품목·절정 태그를 그리고 왼쪽 지금 탭을 둔다', () => {
    const { container } = render(<Coming view={base} />)
    expect(container.querySelector('h1')?.textContent).toContain('다가오는 제철')
    const h2s = [...container.querySelectorAll('h2')].map((h) => h.textContent)
    expect(h2s).toEqual(['8월', '9월'])
    expect(container.textContent).toContain('복숭아')
    expect(container.textContent).toContain('밤')
    // 절정만 태그를 단다
    const peakTags = container.querySelectorAll('.peak-tag')
    expect(peakTags).toHaveLength(1)
    expect(peakTags[0].textContent).toContain('절정')
    // 왼쪽 지금 탭
    const back = container.querySelector('.index-tab-left')!
    expect(back.getAttribute('aria-label')).toBe('지금 담기 좋은 것')
    // 머리말 스케치
    expect(container.querySelector('.sprig')).not.toBeNull()
  })

  test('다가오는 게 없으면 담백한 안내', () => {
    const { container } = render(<Coming view={{ ...base, months: [] }} />)
    expect(container.textContent).toContain('다가오는 제철 정보가 아직 없어요')
    expect(container.querySelector('h2')).toBeNull()
  })
})
