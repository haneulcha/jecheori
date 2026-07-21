// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
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

afterEach(() => cleanup())

describe('ProduceCard 레시피', () => {
  test('recipes 없으면 칩·메모가 없다', () => {
    // 주의: <details>도 암묵 role="group"이라 queryByRole('group')이 그 자체와 매칭된다.
    // 메모(role=group) 유무는 group 요소 개수로 판별한다(1개 = details뿐 = 메모 없음).
    const { queryByText, queryAllByRole } = render(<ProduceCard card={base} />)
    expect(queryByText('레시피')).toBeNull()
    expect(queryAllByRole('group')).toHaveLength(1)
  })

  test('recipes 있으면 칩을 보이고 처음엔 메모가 없다', () => {
    const { getAllByRole, getByText, queryAllByRole } = render(<ProduceCard card={withRecipes} />)
    expect(getAllByRole('button')).toHaveLength(2)
    expect(getByText('레시피')).toBeTruthy()
    expect(queryAllByRole('group')).toHaveLength(1)
  })

  test('칩을 누르면 그 레시피 메모가 뜬다', () => {
    // 요리명은 칩과 메모 h3 두 곳에 나오므로, 메모는 접근성 이름(aria-label)으로 지목한다.
    const { getByRole } = render(<ProduceCard card={withRecipes} />)
    fireEvent.click(getByRole('button', { name: '냉토마토파스타' }))
    const memo = getByRole('group', { name: '냉토마토파스타' })
    expect(memo).not.toBeNull()
    expect(memo.querySelector('h3')!.textContent).toBe('냉토마토파스타')
  })

  test('‹ ›로 넘기면 메모 내용과 활성 칩이 동기화된다', () => {
    const { getByRole, getByTestId } = render(<ProduceCard card={withRecipes} />)
    fireEvent.click(getByRole('button', { name: '토마토달걀볶음' })) // 0번 열기
    fireEvent.click(getByRole('button', { name: '다음 레시피' })) // → 1번
    expect(getByRole('group', { name: '냉토마토파스타' }).querySelector('h3')!.textContent).toBe(
      '냉토마토파스타',
    )
    expect(getByTestId('count').textContent).toBe('2 / 2')
    expect(getByRole('button', { name: '냉토마토파스타' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(getByRole('button', { name: '토마토달걀볶음' }).getAttribute('aria-pressed')).toBe(
      'false',
    )
  })

  test('같은 칩을 다시 누르면 메모가 닫힌다(즉시)', () => {
    const { getByRole, queryAllByRole } = render(<ProduceCard card={withRecipes} />)
    const chip = getByRole('button', { name: '토마토달걀볶음' })
    fireEvent.click(chip)
    expect(queryAllByRole('group')).toHaveLength(2) // details + 메모
    fireEvent.click(chip)
    expect(queryAllByRole('group')).toHaveLength(1) // 메모 사라짐
  })

  test('압정으로 닫으면 메모가 사라지고 포커스가 그 칩으로 돌아온다', async () => {
    const { getByRole, queryAllByRole } = render(<ProduceCard card={withRecipes} />)
    const chip = getByRole('button', { name: '토마토달걀볶음' })
    fireEvent.click(chip)
    fireEvent.click(getByRole('button', { name: '레시피 떼기' }))
    await waitFor(() => expect(queryAllByRole('group')).toHaveLength(1))
    expect(document.activeElement).toBe(chip)
  })

  test('카드를 접으면 열린 메모가 초기화된다', () => {
    const { container, getByRole, queryAllByRole } = render(<ProduceCard card={withRecipes} />)
    fireEvent.click(getByRole('button', { name: '토마토달걀볶음' }))
    expect(queryAllByRole('group')).toHaveLength(2)
    const details = container.querySelector('details')!
    details.open = false
    fireEvent(details, new Event('toggle'))
    expect(queryAllByRole('group')).toHaveLength(1)
  })

  test('끝 레시피로 넘기면 포커스가 메모에 남는다(비활성 버튼 포커스 유실 방지)', () => {
    const { getByRole } = render(<ProduceCard card={withRecipes} />)
    fireEvent.click(getByRole('button', { name: '토마토달걀볶음' })) // index 0
    fireEvent.click(getByRole('button', { name: '다음 레시피' })) // → 마지막(1), next 비활성
    expect(document.activeElement).toBe(getByRole('group', { name: '냉토마토파스타' }))
  })

  test('카드를 접었다 다시 열면 메모가 열려 있지 않다(상태 초기화)', () => {
    const { container, getByRole, queryAllByRole } = render(<ProduceCard card={withRecipes} />)
    const details = container.querySelector('details')!
    fireEvent.click(getByRole('button', { name: '토마토달걀볶음' }))
    expect(queryAllByRole('group')).toHaveLength(2)
    details.open = false
    fireEvent(details, new Event('toggle'))
    expect(queryAllByRole('group')).toHaveLength(1)
    details.open = true
    fireEvent(details, new Event('toggle'))
    expect(queryAllByRole('group')).toHaveLength(1) // 재열림 시 닫힌 상태
  })
})

describe('ProduceCard 제철 띠', () => {
  test('접기 전(summary)에도 season 띠를 보인다', () => {
    const { getByRole } = render(<ProduceCard card={base} />)
    expect(getByRole('img')).toBeTruthy()
    expect(getByRole('img').children).toHaveLength(12)
  })

  test('제철 카테고리(fruit/vegetable/seafood) 카드는 SeasonStrip이 있다', () => {
    const { queryByRole } = render(<ProduceCard card={{ ...base, category: 'fruit' }} />)
    expect(queryByRole('img', { name: /제철/ })).toBeTruthy()
  })

  test('축산물 카드는 SeasonStrip이 없다(제철이 없다)', () => {
    const livestock: CardView = { ...base, category: 'livestock' }
    const { queryByRole } = render(<ProduceCard card={livestock} />)
    expect(queryByRole('img', { name: /제철/ })).toBeNull()
  })
})
