# 레시피 핀 메모 재설계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 레시피 표시를 바텀시트에서 "카드 위 핀 메모 한 장 + 레시피별 칩 진입"으로 바꾼다 (표시 전용, 데이터 계층 불변).

**Architecture:** `ProduceCard`가 열린 레시피 인덱스(`current: number | null`) 상태를 쥐고, `.open` 안엔 `RecipeChips`(횡스크롤 칩), 카드 오버레이엔 `RecipeMemo`(핀 메모 한 장)를 렌더한다. 넘김은 메모를 리마운트하지 않고 `index`만 바꿔 제자리 교체한다. `RecipeSheet`는 삭제한다. `recipe.ts`·`card.ts`·`recipes.json`·로더는 건드리지 않는다.

**Tech Stack:** TanStack Start(React 19) + Vite + Vitest + @testing-library/react(jsdom). 순수 CSS(`src/style.css`), 애니메이션 라이브러리 없음.

## Global Constraints

- **텍스트만.** 레시피 사진 없음. 담백한 한국어, 이커머스 화법 금지.
- **쪽빛(`--ink`)만 텍스트·글리프를 싣는다.** 웜 컬러(`--tint`·`--rise`)는 배경·장식 오브젝트로만.
- **압정은 단색(`--rise`)** + 흰 하이라이트 점. 그라데이션 금지(DESIGN.md).
- **그림자**는 메모 부양 1단(`0 12px 26px -12px rgba(43,69,134,.32)`)만 예외.
- **모션**: 메모 열기(`memo-in`)/닫기(`memo-out`)는 **오버슈트 없는** ease-out/ease-in 대칭 1쌍. 넘김엔 등장 모션을 걸지 않는다. `prefers-reduced-motion: reduce`면 전부 끈다.
- **터치 타깃 ~44px**: 압정·`‹ ›`는 시각 크기 유지 + 투명 히트 패딩.
- **넘김은 리마운트 없음**: `RecipeMemo`에 `key={index}`를 주지 않는다.
- 메모는 **비모달**. 순수 로직은 `recipe.ts`, 표시만 `components`.
- 데이터 타입(불변): `RecipeView = RecipeEntry[]`, `RecipeEntry = { name: string; ingredients: string; steps: string[] }`, `CardView.recipes: RecipeView | null`.

---

## 파일 구조

- Create `src/components/RecipeChips.tsx` — 레시피별 칩 횡스크롤(표시 전용).
- Create `src/components/RecipeChips.test.tsx`
- Create `src/components/RecipeMemo.tsx` — 핀 메모 한 장(요리명·재료·단계·`n / N`·압정·`‹ ›`·닫기 애니메이션·포커스).
- Create `src/components/RecipeMemo.test.tsx`
- Modify `src/components/ProduceCard.tsx` — `current` 상태 + 칩/메모 배선 + 접힘 초기화 + 닫힘 포커스 복귀. `RecipeSheet` import 제거.
- Modify `src/components/ProduceCard.test.tsx` — 새 인터랙션으로 교체.
- Delete `src/components/RecipeSheet.tsx`, `src/components/RecipeSheet.test.tsx`.
- Modify `src/style.css` — `.sheet*`·`.recipe-open` 제거, `.chips`·`.chip-btn`·`.memo-layer`·`.memo`·`.pin`·`.nav`·`.count`·`.recipe-label`·`--memo`·키프레임·reduced-motion 추가.
- Modify `DESIGN.md` — 결정 기록 추가.

---

### Task 1: RecipeChips — 레시피별 칩 횡스크롤

**Files:**
- Create: `src/components/RecipeChips.tsx`
- Test: `src/components/RecipeChips.test.tsx`

**Interfaces:**
- Consumes: `RecipeView` from `../recipe` (`RecipeEntry[]`, 각 항목 `{ name, ingredients, steps }`).
- Produces: `RecipeChips({ recipes, current, onSelect, memoId })` —
  `recipes: RecipeView`, `current: number | null`, `onSelect: (index: number) => void`, `memoId: string`.
  칩 `<button class="chip-btn" aria-pressed aria-controls={memoId}>`, 활성 칩만 `aria-pressed="true"`.

- [ ] **Step 1: Write the failing test**

`src/components/RecipeChips.test.tsx`:
```tsx
// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { RecipeChips } from './RecipeChips'

const recipes = [
  { name: '토마토달걀볶음', ingredients: '토마토, 달걀', steps: ['썬다'] },
  { name: '냉토마토파스타', ingredients: '토마토, 펜네', steps: ['삶는다'] },
  { name: '가지토마토구이', ingredients: '가지, 토마토', steps: ['굽는다'] },
]

describe('RecipeChips', () => {
  test('레시피 수만큼 칩을 요리명으로 그린다', () => {
    const { container, getByText } = render(
      <RecipeChips recipes={recipes} current={null} onSelect={() => {}} memoId="m" />,
    )
    expect(container.querySelectorAll('.chip-btn')).toHaveLength(3)
    expect(getByText('냉토마토파스타')).toBeTruthy()
  })

  test('활성 칩만 aria-pressed=true', () => {
    const { container } = render(
      <RecipeChips recipes={recipes} current={1} onSelect={() => {}} memoId="m" />,
    )
    const chips = container.querySelectorAll('.chip-btn')
    expect(chips[0].getAttribute('aria-pressed')).toBe('false')
    expect(chips[1].getAttribute('aria-pressed')).toBe('true')
  })

  test('칩 클릭이 onSelect(index)를 부른다 (활성 칩 재클릭도 같은 index)', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <RecipeChips recipes={recipes} current={2} onSelect={onSelect} memoId="m" />,
    )
    const chips = container.querySelectorAll('.chip-btn')
    fireEvent.click(chips[0])
    expect(onSelect).toHaveBeenLastCalledWith(0)
    fireEvent.click(chips[2]) // 활성 칩 재클릭 → 부모가 토글, 여기선 그대로 index 전달
    expect(onSelect).toHaveBeenLastCalledWith(2)
  })

  test('칩은 메모를 aria-controls로 가리킨다', () => {
    const { container } = render(
      <RecipeChips recipes={recipes} current={null} onSelect={() => {}} memoId="memo-x" />,
    )
    expect(container.querySelector('.chip-btn')!.getAttribute('aria-controls')).toBe('memo-x')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/RecipeChips.test.tsx`
Expected: FAIL — `Failed to resolve import "./RecipeChips"`.

- [ ] **Step 3: Write minimal implementation**

`src/components/RecipeChips.tsx`:
```tsx
import type { RecipeView } from '../recipe'

/** 카드 펼침 영역의 레시피 진입점 — 레시피별 칩, 횡스크롤. 표시 전용. */
export function RecipeChips({
  recipes,
  current,
  onSelect,
  memoId,
}: {
  recipes: RecipeView
  current: number | null
  onSelect: (index: number) => void
  memoId: string
}) {
  return (
    <div className="chips">
      {recipes.map((r, i) => (
        <button
          key={r.name}
          type="button"
          className="chip-btn"
          aria-pressed={current === i}
          aria-controls={memoId}
          onClick={() => onSelect(i)}
        >
          {r.name}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/RecipeChips.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/RecipeChips.tsx src/components/RecipeChips.test.tsx
git commit -m "feat: RecipeChips — 레시피별 칩 횡스크롤 진입점"
```

---

### Task 2: RecipeMemo — 핀 메모 한 장

**Files:**
- Create: `src/components/RecipeMemo.tsx`
- Test: `src/components/RecipeMemo.test.tsx`

**Interfaces:**
- Consumes: `RecipeView` from `../recipe`.
- Produces: `RecipeMemo({ recipes, index, id, onClose, onStep })` —
  `recipes: RecipeView`, `index: number`, `id?: string`, `onClose: () => void`, `onStep: (delta: number) => void`.
  루트 `<article class="memo" role="group" aria-label={요리명} tabIndex=-1>`; 마운트 시 포커스; `.pin`(닫기)·`.nav-prev`/`.nav-next`(clamp, `disabled`)·`.count`(`n / N`). 닫기(압정/Esc)는 `.memo-closing` 클래스 후 `CLOSE_MS` 뒤 `onClose`. `index` 변경 시 리마운트 안 함(제자리 교체).

- [ ] **Step 1: Write the failing test**

`src/components/RecipeMemo.test.tsx`:
```tsx
// @vitest-environment jsdom
import { fireEvent, render, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { RecipeMemo } from './RecipeMemo'

const recipes = [
  { name: '토마토달걀볶음', ingredients: '토마토 2개, 달걀 3개', steps: ['토마토를 썬다', '달걀을 볶는다'] },
  { name: '냉토마토파스타', ingredients: '토마토, 펜네', steps: ['삶는다'] },
  { name: '가지토마토구이', ingredients: '가지, 토마토', steps: ['굽는다'] },
]
const noop = () => {}

describe('RecipeMemo', () => {
  test('요리명·재료·단계·위치표시를 보인다', () => {
    const { container } = render(
      <RecipeMemo recipes={recipes} index={0} onClose={noop} onStep={noop} />,
    )
    const text = container.textContent
    expect(text).toContain('토마토달걀볶음')
    expect(text).toContain('토마토 2개, 달걀 3개')
    expect(text).toContain('토마토를 썬다')
    expect(container.querySelectorAll('.steps li')).toHaveLength(2)
    expect(container.querySelector('.count')!.textContent).toBe('1 / 3')
  })

  test('단계가 없으면 단계 목록을 그리지 않는다', () => {
    const { container } = render(
      <RecipeMemo
        recipes={[{ name: '생토마토', ingredients: '토마토', steps: [] }]}
        index={0}
        onClose={noop}
        onStep={noop}
      />,
    )
    expect(container.querySelector('.steps')).toBeNull()
  })

  test('첫 레시피에선 이전이, 마지막에선 다음이 비활성 (clamp)', () => {
    const first = render(<RecipeMemo recipes={recipes} index={0} onClose={noop} onStep={noop} />)
    expect(first.container.querySelector<HTMLButtonElement>('.nav-prev')!.disabled).toBe(true)
    expect(first.container.querySelector<HTMLButtonElement>('.nav-next')!.disabled).toBe(false)
    const last = render(<RecipeMemo recipes={recipes} index={2} onClose={noop} onStep={noop} />)
    expect(last.container.querySelector<HTMLButtonElement>('.nav-next')!.disabled).toBe(true)
  })

  test('‹ ›가 onStep(∓1)을 부른다', () => {
    const onStep = vi.fn()
    const { container } = render(
      <RecipeMemo recipes={recipes} index={1} onClose={noop} onStep={onStep} />,
    )
    fireEvent.click(container.querySelector('.nav-prev')!)
    expect(onStep).toHaveBeenLastCalledWith(-1)
    fireEvent.click(container.querySelector('.nav-next')!)
    expect(onStep).toHaveBeenLastCalledWith(1)
  })

  test('마운트 시 메모로 포커스가 간다', () => {
    const { container } = render(
      <RecipeMemo recipes={recipes} index={0} onClose={noop} onStep={noop} />,
    )
    expect(document.activeElement).toBe(container.querySelector('.memo'))
  })

  test('index가 바뀌어도 메모는 리마운트되지 않고 내용만 교체된다', () => {
    const { container, rerender } = render(
      <RecipeMemo recipes={recipes} index={0} onClose={noop} onStep={noop} />,
    )
    const node = container.querySelector('.memo')
    rerender(<RecipeMemo recipes={recipes} index={1} onClose={noop} onStep={noop} />)
    expect(container.querySelector('.memo')).toBe(node) // 같은 DOM 노드
    expect(container.querySelector('h3')!.textContent).toBe('냉토마토파스타')
    expect(container.querySelector('.count')!.textContent).toBe('2 / 3')
  })

  test('압정 클릭이 닫힘 전환 후 onClose를 부른다', async () => {
    const onClose = vi.fn()
    const { container } = render(
      <RecipeMemo recipes={recipes} index={0} onClose={onClose} onStep={noop} />,
    )
    fireEvent.click(container.querySelector('.pin')!)
    expect(container.querySelector('.memo')!.className).toContain('memo-closing')
    expect(onClose).not.toHaveBeenCalled()
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  test('Esc가 onClose를 부른다', async () => {
    const onClose = vi.fn()
    render(<RecipeMemo recipes={recipes} index={0} onClose={onClose} onStep={noop} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/RecipeMemo.test.tsx`
Expected: FAIL — `Failed to resolve import "./RecipeMemo"`.

- [ ] **Step 3: Write minimal implementation**

`src/components/RecipeMemo.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react'
import type { RecipeView } from '../recipe'

/** 닫힘 전환 길이(ms) — CSS memo-out과 맞춘다. reduced-motion이면 전환은 안 보이지만
 *  이 타이머로 제거는 그대로 일어난다. */
const CLOSE_MS = 180

/** 카드 위에 핀처럼 꽂히는 레시피 메모 한 장. ‹ ›로 넘기고 압정/Esc로 닫는다.
 *  넘김(index 변경)은 리마운트 없이 내용만 제자리 교체 — 부모가 key를 주지 않는다. */
export function RecipeMemo({
  recipes,
  index,
  id,
  onClose,
  onStep,
}: {
  recipes: RecipeView
  index: number
  id?: string
  onClose: () => void
  onStep: (delta: number) => void
}) {
  const [closing, setClosing] = useState(false)
  const rootRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const timer = useRef<ReturnType<typeof setTimeout>>()

  // 열릴 때(마운트) 포커스를 메모로. 언마운트 시 타이머 정리.
  useEffect(() => {
    rootRef.current?.focus()
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const beginClose = () => {
    setClosing(true)
    timer.current = setTimeout(() => onCloseRef.current(), CLOSE_MS)
  }

  // Esc 닫기. beginClose는 stable 참조만 쓰므로 첫 렌더 캡처로 안전.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') beginClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const r = recipes[index]
  return (
    <article
      ref={rootRef}
      id={id}
      className={closing ? 'memo memo-closing' : 'memo'}
      role="group"
      aria-label={r.name}
      tabIndex={-1}
    >
      <button type="button" className="pin" onClick={beginClose} aria-label="레시피 떼기" />
      <button
        type="button"
        className="nav nav-prev"
        onClick={() => onStep(-1)}
        disabled={index === 0}
        aria-label="이전 레시피"
      >
        ‹
      </button>
      <button
        type="button"
        className="nav nav-next"
        onClick={() => onStep(1)}
        disabled={index === recipes.length - 1}
        aria-label="다음 레시피"
      >
        ›
      </button>
      <h3>{r.name}</h3>
      {r.ingredients && <p className="ing">{r.ingredients}</p>}
      {r.steps.length > 0 && (
        <ol className="steps">
          {r.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}
      <p className="count">
        {index + 1} / {recipes.length}
      </p>
    </article>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/RecipeMemo.test.tsx`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/RecipeMemo.tsx src/components/RecipeMemo.test.tsx
git commit -m "feat: RecipeMemo — 핀 메모 한 장(‹ › 넘김·압정 닫기·제자리 교체)"
```

---

### Task 3: ProduceCard 배선 + RecipeSheet 삭제

**Files:**
- Modify: `src/components/ProduceCard.tsx` (전체 교체)
- Modify: `src/components/ProduceCard.test.tsx` (전체 교체)
- Delete: `src/components/RecipeSheet.tsx`, `src/components/RecipeSheet.test.tsx`

**Interfaces:**
- Consumes: `RecipeChips`(Task 1), `RecipeMemo`(Task 2), `CardView` from `../card`.
- Produces: `ProduceCard({ card })` — `.open` 안 `RecipeChips`, 카드 자식 `.memo-layer > RecipeMemo`(열렸을 때만, `key` 없이). `current: number | null` 상태. 칩 재탭·카드 접힘은 즉시 닫힘, 압정·Esc는 애니메이션 닫힘. 닫힐 때 포커스를 해당 칩으로 복귀.

- [ ] **Step 1: Write the failing test**

`src/components/ProduceCard.test.tsx` (전체 교체):
```tsx
// @vitest-environment jsdom
import { fireEvent, render, waitFor } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { ProduceCard } from './ProduceCard'
import type { CardView } from '../card'

const base: CardView = {
  emoji: '🍅', name: '토마토', kind: '', category: 'vegetable', inPeak: false,
  whyNow: '', note: { pick: 'p', store: 's', use: 'u' }, price: null, nutrition: null, recipes: null,
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
    expect(container.querySelector('.recipe-label')!.textContent).toContain('2개')
    expect(container.querySelector('.memo')).toBeNull()
  })

  test('칩을 누르면 그 레시피 메모가 뜬다', () => {
    const { container, getByText } = render(<ProduceCard card={withRecipes} />)
    fireEvent.click(container.querySelectorAll('.chip-btn')[1])
    expect(container.querySelector('.memo')).not.toBeNull()
    expect(getByText('냉토마토파스타')).toBeTruthy()
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
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ProduceCard.test.tsx`
Expected: FAIL — 기존 구현이 `.chips`/`.recipe-label`/`.memo`를 안 그림(옛 `.recipe-open`/`.sheet`).

- [ ] **Step 3: Write minimal implementation**

`src/components/ProduceCard.tsx` (전체 교체):
```tsx
import { useId, useRef, useState } from 'react'
import type { CardView } from '../card'
import { PriceBlock } from './PriceBlock'
import { Sparkline } from './Sparkline'
import { NutritionLine } from './NutritionLine'
import { Note } from './Note'
import { PeakDot } from './PeakDot'
import { RecipeChips } from './RecipeChips'
import { RecipeMemo } from './RecipeMemo'

export function ProduceCard({ card }: { card: CardView }) {
  const [current, setCurrent] = useState<number | null>(null)
  const rootRef = useRef<HTMLDetailsElement>(null)
  const memoId = useId()
  const recipes = card.recipes

  const select = (i: number) => setCurrent((c) => (c === i ? null : i))
  const step = (delta: number) =>
    setCurrent((c) =>
      c === null || !recipes ? c : Math.min(Math.max(c + delta, 0), recipes.length - 1),
    )
  // 닫기: 아직 붙어 있는 해당 칩으로 포커스를 돌리고 상태를 지운다.
  const close = () => {
    if (current !== null) {
      rootRef.current?.querySelectorAll<HTMLButtonElement>('.chip-btn')[current]?.focus()
    }
    setCurrent(null)
  }

  return (
    <details
      ref={rootRef}
      className="card"
      data-cat={card.category}
      onToggle={(e) => {
        if (!e.currentTarget.open) setCurrent(null)
      }}
    >
      <summary>
        <div className="summary-row">
          <span className="id">
            <span className="emoji">{card.emoji}</span>
            <span>
              <span className="card-title">
                {card.name}
                {card.inPeak && <PeakDot />}
              </span>
              <span className="kind">{card.kind}</span>
            </span>
          </span>
          {card.price && <PriceBlock price={card.price} />}
        </div>
        {card.whyNow && <p className="why">{card.whyNow}</p>}
      </summary>
      <div className="open">
        {card.price?.spark && <Sparkline spark={card.price.spark} />}
        {card.nutrition && <NutritionLine nutrition={card.nutrition} />}
        <Note note={card.note} />
        {recipes && (
          <>
            <p className="recipe-label">레시피 {recipes.length}개</p>
            <RecipeChips recipes={recipes} current={current} onSelect={select} memoId={memoId} />
          </>
        )}
      </div>
      {recipes && current !== null && (
        <div className="memo-layer">
          <RecipeMemo
            recipes={recipes}
            index={current}
            id={memoId}
            onClose={close}
            onStep={step}
          />
        </div>
      )}
    </details>
  )
}
```

- [ ] **Step 4: Delete the obsolete bottom-sheet files**

```bash
git rm src/components/RecipeSheet.tsx src/components/RecipeSheet.test.tsx
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/ProduceCard.test.tsx`
Expected: PASS (7 tests).

Run: `npx vitest run`
Expected: PASS — 전체 스위트 그린, `RecipeSheet` 참조 없음.

- [ ] **Step 6: Commit**

```bash
git add src/components/ProduceCard.tsx src/components/ProduceCard.test.tsx
git commit -m "feat: ProduceCard에 핀 메모 배선 + RecipeSheet 삭제"
```

---

### Task 4: 스타일 + DESIGN.md 결정 기록

**Files:**
- Modify: `src/style.css` (`--memo` 토큰 추가 ~line 30대, `.recipe-open`+`.sheet*` 블록 제거 ~line 276–323 교체)
- Modify: `DESIGN.md` (결정 기록 말미)

**Interfaces:**
- Consumes: Task 1–3이 그리는 클래스(`.chips`,`.chip-btn`,`.memo-layer`,`.memo`,`.pin`,`.nav`,`.count`,`.recipe-label`).
- Produces: 시각 산출물만(테스트 없음). 검증은 `npm run build` + 브라우저 실측.

- [ ] **Step 1: `--memo` 토큰 추가**

`src/style.css`의 `:root` 공통 토큰(현재 `--lift` 근처, line ~36)에 한 줄 추가:
```css
  --memo: #FFFCF3;                   /* 메모 낱장 — 순백 카드와 구분되는 살짝 따뜻한 종이 */
```

- [ ] **Step 2: 옛 바텀시트 스타일을 핀 메모 스타일로 교체**

`src/style.css`에서 `/* 레시피 바텀시트 ... */`부터 `.sheet .steps li { ... }`까지(현재 line 276–323) **전부 삭제**하고 아래로 교체:
```css
/* 레시피 진입 칩 + 카드 위 핀 메모 */
.recipe-label { font-size: 0.68rem; letter-spacing: 0.08em; color: var(--muted); margin: 0.2rem 0 0.45rem; }

.chips {
  display: flex; gap: 0.4rem; overflow-x: auto; padding-bottom: 0.3rem;
  scrollbar-width: thin; -webkit-overflow-scrolling: touch;
}
.chip-btn {
  flex: 0 0 auto; font: inherit; font-size: 0.82rem;
  background: none; border: 1px dashed var(--line); border-radius: 0.4rem;
  padding: 0.34rem 0.8rem; color: var(--ink); cursor: pointer; white-space: nowrap;
  transition: border-color 0.15s, background 0.15s, transform 0.1s ease-out;
}
.chip-btn:hover { border-color: var(--ink); }
.chip-btn:active { transform: scale(0.97); }              /* 누르는 순간 즉시 피드백 */
.chip-btn[aria-pressed="true"] { border-style: solid; border-color: var(--ink); background: var(--tint); }
.chip-btn:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

.memo-layer { position: absolute; inset: 0; pointer-events: none; z-index: 5; }
.memo {
  position: absolute; left: 50%; top: 12px; width: min(21rem, 94%);
  transform: translateX(-50%) rotate(-0.7deg);
  background: var(--memo); border: 1px solid var(--line); border-radius: 0.15rem;
  padding: 1.35rem 2.5rem 1rem;                            /* 좌우 여백 = ‹ › 자리 */
  box-shadow: 0 12px 26px -12px rgba(43, 69, 134, 0.32);  /* 예외: 메모 부양 1단 */
  pointer-events: auto; outline: none;
  animation: memo-in 0.2s ease-out;                        /* 오버슈트 없음 */
}
.memo-closing { animation: memo-out 0.18s ease-in forwards; }  /* 열기와 대칭 */
@keyframes memo-in {
  from { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.98) rotate(-0.7deg); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1) rotate(-0.7deg); }
}
@keyframes memo-out {
  from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1) rotate(-0.7deg); }
  to   { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.98) rotate(-0.7deg); }
}
.memo h3 { font-size: 1rem; margin: 0 0 0.5rem; color: var(--ink); text-align: center; }
.memo .ing { font-size: 0.79rem; color: var(--muted); margin: 0 0 0.8rem; line-height: 1.55; }
.memo .steps { margin: 0; padding-left: 1.2rem; font-size: 0.85rem; color: #5a5140; line-height: 1.7; max-height: 15rem; overflow-y: auto; }
.memo .steps li { margin-bottom: 0.35rem; }
.memo .steps li::marker { color: var(--muted); }
.memo .count { text-align: center; font-size: 0.72rem; color: var(--muted); margin: 0.85rem 0 0; font-variant-numeric: tabular-nums; letter-spacing: 0.04em; }

/* 압정 = 닫기. 단색 러스트 + 흰 하이라이트(그라데이션 금지). 히트 영역 ~44px. */
.pin {
  position: absolute; top: -0.62rem; left: 50%; transform: translateX(-50%);
  width: 1.15rem; height: 1.15rem; border-radius: 50%; border: none; cursor: pointer;
  background: var(--rise); padding: 0; z-index: 2;
  box-shadow: 0 2px 3px -1px rgba(0, 0, 0, 0.35);
}
.pin::after { content: ""; position: absolute; top: 30%; left: 30%; width: 0.3rem; height: 0.3rem; border-radius: 50%; background: rgba(255, 255, 255, 0.8); }
.pin::before { content: ""; position: absolute; inset: -0.75rem; }   /* 투명 히트 패딩 */
.pin:hover { filter: brightness(1.06); }

/* ‹ › 넘김. 히트 영역 ~44px. */
.nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 1.9rem; height: 1.9rem; border-radius: 50%;
  border: 1px solid var(--ink); background: var(--card); color: var(--ink);
  font-size: 1rem; line-height: 1; cursor: pointer; padding: 0;
  display: flex; align-items: center; justify-content: center;
}
.nav::before { content: ""; position: absolute; inset: -0.5rem; }   /* 투명 히트 패딩 */
.nav-prev { left: 0.3rem; }
.nav-next { right: 0.3rem; }
.nav:hover:not(:disabled) { background: var(--tint); }
.nav:disabled { opacity: 0.28; cursor: default; }
.pin:focus-visible, .nav:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  .memo, .memo-closing { animation: none; }
  .chip-btn { transition: border-color 0.15s, background 0.15s; }
  .chip-btn:active { transform: none; }
}
```

- [ ] **Step 3: 빌드로 스타일·프리렌더 확인**

Run: `npm run build`
Expected: 성공(`dist/client/` 생성). 오류 없음.

- [ ] **Step 4: DESIGN.md 결정 기록 추가**

`DESIGN.md`의 `## 결정 기록` 말미에 추가:
```markdown
- 레시피 표시를 바텀시트에서 **카드 위 핀 메모 한 장**으로 바꿨다 (2026-07-12). 진입점은
  레시피별 칩(횡스크롤, `.chip-btn`), 상세는 압정으로 꽂힌 낱장(`.memo`) + `‹ ›` 넘김(clamp).
  냉장고-메모 은유의 연장. 그림자(메모 부양 1단)와 모션(열기/닫기 대칭 1쌍, 오버슈트 없음)에
  예외를 하나씩 더 열었다 — 마스킹테이프 완화와 같은 결. 압정은 단색(그라데이션 금지 유지).
  apple-design 스킬 렌즈로 다듬음(열기≠넘기기 분리, ~44px 터치 타깃, 칩 누름-즉시 피드백).
  스펙: `docs/superpowers/specs/2026-07-12-recipe-pin-memo-design.md`
```

- [ ] **Step 5: 전체 스위트 재확인 후 커밋**

Run: `npx vitest run`
Expected: PASS (전체 그린).

```bash
git add src/style.css DESIGN.md
git commit -m "style: 핀 메모 스타일 + DESIGN.md 결정 기록"
```

---

## 실행 후

- **브라우저 실측**(스펙 미해결 항목): 핀 메모 오버레이·`‹ ›` clamp·횡스크롤·열기/닫기 모션·터치 타깃을 `npm run dev`(localhost:5173)에서 확인. `[[verify-ui-in-browser]]`.
- **알려진 소폭 한계(다음 사이클)**: (1) `‹`/`›`가 끝에서 `disabled`가 되며 포커스가 body로 빠질 수 있음 — 필요 시 사용한 버튼이 비활성되면 메모로 포커스 이동. (2) 칩 재탭·카드 접힘 닫기는 즉시(애니메이션 없음) — 압정/Esc만 대칭 닫힘. (3) 스와이프 넘김(§2·§5·§6)은 미도입.

## Self-Review

- **스펙 커버리지:** 진입(칩 횡스크롤·버튼 룩 유지·활성 tint)=Task1+4 · 상세(중앙 메모·압정 단색·`‹ ›` clamp·`n/N`·세로 스크롤)=Task2+4 · 열기/닫기/포커스·접힘 초기화·비모달·aria=Task2+3 · 모션(열기≠넘기기·오버슈트 없음·대칭 닫기·reduced-motion)=Task2+4 · 터치 타깃·누름 피드백=Task4 · `RecipeSheet` 삭제·스타일 교체=Task3+4 · 결정 기록=Task4. 트리거 연결은 "중앙+활성 칩 tint"로 구현(Task1 `aria-pressed`/tint + Task4). 데이터 계층 불변(테스트 없음)=명시.
- **플레이스홀더 스캔:** 없음(모든 코드·명령·기대출력 구체).
- **타입 일관성:** `current: number | null`·`onSelect(i)`·`onStep(delta)`·`onClose()`·`memoId`/`id`가 Task1–3에서 동일. `RecipeView`/`RecipeEntry` 필드(`name`·`ingredients`·`steps`)는 기존 `recipe.ts`와 일치.
