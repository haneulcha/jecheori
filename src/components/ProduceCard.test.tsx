// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, test } from 'vitest'
import { ProduceCard } from './ProduceCard'
import type { CardView, SeasonStripView } from '../card'

/** 레시피는 "보관·쓰임" 쪽(3쪽)에 산다. RTL 렌더는 하이드레이션 후 상태라 페이저가 뜨므로,
 *  칩을 만지려면 먼저 그 쪽으로 넘겨야 한다. */
const toRecipePage = (getByRole: ReturnType<typeof render>['getByRole']) =>
  fireEvent.click(getByRole('tab', { name: '보관·쓰임' }))

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
    const { queryByText, queryAllByRole } = render(<ProduceCard card={base} />)
    expect(queryByText('레시피')).toBeNull()
    expect(queryAllByRole('group')).toHaveLength(0)
  })

  test('recipes 있으면 "보관·쓰임" 쪽에 칩을 보이고 처음엔 메모가 없다', () => {
    const { getAllByRole, getByText, queryAllByRole, getByRole } = render(
      <ProduceCard card={withRecipes} />,
    )
    toRecipePage(getByRole)
    // 도트는 role="tab"이라 button 롤이 아니다 — 여기 잡히는 건 레시피 칩 둘뿐이다
    expect(getAllByRole('button')).toHaveLength(2)
    expect(getByText('레시피')).toBeTruthy()
    expect(queryAllByRole('group')).toHaveLength(0)
  })

  test('칩을 누르면 그 레시피 메모가 뜬다', () => {
    // 요리명은 칩과 메모 h3 두 곳에 나오므로, 메모는 접근성 이름(aria-label)으로 지목한다.
    const { getByRole } = render(<ProduceCard card={withRecipes} />)
    toRecipePage(getByRole)
    fireEvent.click(getByRole('button', { name: '냉토마토파스타' }))
    const memo = getByRole('group', { name: '냉토마토파스타' })
    expect(memo).not.toBeNull()
    expect(memo.querySelector('h3')!.textContent).toBe('냉토마토파스타')
  })

  test('‹ ›로 넘기면 메모 내용과 활성 칩이 동기화된다', () => {
    const { getByRole, getByTestId } = render(<ProduceCard card={withRecipes} />)
    toRecipePage(getByRole)
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
    toRecipePage(getByRole)
    const chip = getByRole('button', { name: '토마토달걀볶음' })
    fireEvent.click(chip)
    expect(queryAllByRole('group')).toHaveLength(1) // 메모
    fireEvent.click(chip)
    expect(queryAllByRole('group')).toHaveLength(0) // 메모 사라짐
  })

  test('압정으로 닫으면 메모가 사라지고 포커스가 그 칩으로 돌아온다', async () => {
    const { getByRole, queryAllByRole } = render(<ProduceCard card={withRecipes} />)
    toRecipePage(getByRole)
    const chip = getByRole('button', { name: '토마토달걀볶음' })
    fireEvent.click(chip)
    fireEvent.click(getByRole('button', { name: '레시피 떼기' }))
    await waitFor(() => expect(queryAllByRole('group')).toHaveLength(0))
    expect(document.activeElement).toBe(chip)
  })

  test('레시피 쪽을 떠나면 열린 메모가 닫힌다(폴백의 "카드 접기"와 같은 규칙)', () => {
    const { getByRole, queryAllByRole } = render(<ProduceCard card={withRecipes} />)
    toRecipePage(getByRole)
    fireEvent.click(getByRole('button', { name: '토마토달걀볶음' }))
    expect(queryAllByRole('group')).toHaveLength(1)
    fireEvent.click(getByRole('tab', { name: '표지' }))
    expect(queryAllByRole('group')).toHaveLength(0)
  })

  test('끝 레시피로 넘기면 포커스가 메모에 남는다(비활성 버튼 포커스 유실 방지)', () => {
    const { getByRole } = render(<ProduceCard card={withRecipes} />)
    toRecipePage(getByRole)
    fireEvent.click(getByRole('button', { name: '토마토달걀볶음' })) // index 0
    fireEvent.click(getByRole('button', { name: '다음 레시피' })) // → 마지막(1), next 비활성
    expect(document.activeElement).toBe(getByRole('group', { name: '냉토마토파스타' }))
  })

  test('레시피 쪽으로 돌아와도 메모가 열려 있지 않다(상태 초기화)', () => {
    const { getByRole, queryAllByRole } = render(<ProduceCard card={withRecipes} />)
    toRecipePage(getByRole)
    fireEvent.click(getByRole('button', { name: '토마토달걀볶음' }))
    expect(queryAllByRole('group')).toHaveLength(1)
    fireEvent.click(getByRole('tab', { name: '표지' }))
    toRecipePage(getByRole)
    expect(queryAllByRole('group')).toHaveLength(0)
  })
})

describe('ProduceCard 쪽 넘김', () => {
  test('네 쪽과 도트가 있고 표지가 첫 쪽이다', () => {
    const { getAllByRole, getByRole } = render(<ProduceCard card={base} />)
    expect(getAllByRole('tabpanel', { hidden: true })).toHaveLength(4)
    expect(getByRole('tab', { name: '표지' }).getAttribute('aria-selected')).toBe('true')
  })

  test('도트로 넘기면 선택이 옮겨간다', () => {
    const { getByRole } = render(<ProduceCard card={base} />)
    fireEvent.click(getByRole('tab', { name: '고르는 법' }))
    expect(getByRole('tab', { name: '고르는 법' }).getAttribute('aria-selected')).toBe('true')
    expect(getByRole('tab', { name: '표지' }).getAttribute('aria-selected')).toBe('false')
  })

  test('←/→ 방향키로 넘어가고, 표지에서 ←면 마지막 쪽으로 감싼다(무한 루프)', () => {
    const { container, getByRole } = render(<ProduceCard card={base} />)
    const cardEl = container.querySelector('article')!
    fireEvent.keyDown(cardEl, { key: 'ArrowRight' })
    expect(getByRole('tab', { name: '시세·영양' }).getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(cardEl, { key: 'ArrowLeft' })
    fireEvent.keyDown(cardEl, { key: 'ArrowLeft' })
    expect(getByRole('tab', { name: '보관·쓰임' }).getAttribute('aria-selected')).toBe('true')
  })

  test('보이는 쪽만 빼고 inert — 넷을 한꺼번에 읽거나 숨은 칩에 탭이 걸리지 않게', () => {
    // jsdom은 inert를 접근성 트리에 반영하지 않으므로(롤 쿼리로는 넷 다 잡힌다) 속성을 본다.
    const { container, getByRole } = render(<ProduceCard card={base} />)
    const inertOf = () =>
      [...container.querySelectorAll('[role="tabpanel"]')].map((el) => el.hasAttribute('inert'))
    expect(inertOf()).toEqual([false, true, true, true])
    fireEvent.click(getByRole('tab', { name: '고르는 법' }))
    expect(inertOf()).toEqual([true, true, false, true])
  })
})

/** 무JS·프리렌더 산출물은 지금까지의 <details> 그대로여야 한다 — JS가 없으면 이 상태로 남고,
 *  카드 안 모든 정보에 닿을 수 있다. 하이드레이션 후에야 페이저로 승격한다. */
describe('ProduceCard 무JS 폴백', () => {
  test('서버 렌더는 <details>이고 손질 세 줄이 다 들어 있다', () => {
    const html = renderToStaticMarkup(<ProduceCard card={base} />)
    expect(html).toContain('<details')
    expect(html).not.toContain('role="tablist"')
    for (const label of ['고르는 법', '보관', '쓰임']) expect(html).toContain(label)
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

/** ⚠️ `getByRole('img')` 금지: `alt=""`인 <img>는 접근성 트리에서 빠져 그 쿼리에
 *  안 잡히고, `role="img"`는 이미 SeasonStrip이 점유해 기존 제철 띠 테스트와 충돌한다.
 *  도판은 `container.querySelector('img')`로 지목한다. */
describe('ProduceCard 도판', () => {
  const withImage: CardView = { ...base, image: 'tomato' }

  test('image 있으면 <img> — alt="" · 96px 속성 · 기본 lazy', () => {
    const { container } = render(<ProduceCard card={withImage} />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img!.getAttribute('src')).toBe('/assets/produce/tomato.webp')
    expect(img!.getAttribute('alt')).toBe('') // 품목명이 바로 옆에 있다 — 채우면 이중 낭독
    expect(img!.getAttribute('width')).toBe('96') // 크기의 유일한 권위 (CLS 방지)
    expect(img!.getAttribute('height')).toBe('96')
    expect(img!.getAttribute('loading')).toBe('lazy')
  })

  test('eager면 loading="eager" + fetchpriority="high"', () => {
    const { container } = render(<ProduceCard card={withImage} eager />)
    const img = container.querySelector('img')
    expect(img!.getAttribute('loading')).toBe('eager')
    expect(img!.getAttribute('fetchpriority')).toBe('high')
  })

  test('image 없으면 이모지 폴백 — aria-hidden으로 이중 낭독 방지(기존 결함 수정)', () => {
    // 이모지는 표지 + 속쪽 머리 셋에 나온다(머리는 시각적 길잡이라 aria-hidden 처리).
    const { container, getAllByText } = render(<ProduceCard card={base} />)
    expect(container.querySelector('img')).toBeNull()
    for (const el of getAllByText('🍅')) expect(el.getAttribute('aria-hidden')).toBe('true')
  })
})
