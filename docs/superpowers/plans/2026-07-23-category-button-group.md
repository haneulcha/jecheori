# 카테고리 ButtonGroup 분리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 과일·채소·수산물 카테고리를 FilterBar 칩에서 빼내 재사용 가능한 단일 선택 세그먼트 컨트롤(`ButtonGroup`)로 분리한다.

**Architecture:** 타입에서 카테고리 축(`Category`)을 상태 필터 축(`Filter`)과 분리하고, 순수 로직 `filterByCategory`를 추가해 `filterCards`와 합성한다. 새 `ButtonGroup`은 표시 전용 제네릭 프리미티브(radiogroup 시맨틱, 슬라이딩 썸)이며, `App`이 카테고리 옵션과 상태를 소유해 넘긴다. 타입에서 카테고리를 제거하는 파괴적 변경은 소비자(FilterBar·App·테스트)를 한 번에 갱신하는 Task 3에서만 일어나, 그전 태스크는 순수 가산(additive)이라 매 커밋이 `npm test`+`tsc` 모두 그린이다.

**Tech Stack:** TanStack Start (React 19), TypeScript, CSS Modules, Vitest + Testing Library.

## Global Constraints

- node ≥ 22.
- 완료 게이트 = `npm test` **와** `npx tsc --noEmit` 둘 다 통과.
- 순수 로직 테스트는 `tests/`에 `'../src/…'` 임포트. 컴포넌트 테스트는 `src/components/*.test.tsx` + 상단 `// @vitest-environment jsdom`.
- `KamisRef.categoryCode`는 `'100' | '200' | '400'`만 유효(픽스처도 유효 타입).
- 색 규율: 텍스트·강조는 오직 쪽빛(`--ink`)/뮤트(`--muted`). 웜 컬러(`--tint`/`--accent`)는 배경·테두리에만. 그라데이션 금지.
- 모션은 `prefers-reduced-motion: reduce`에서 전부 정적.
- 사용자향 시각 변경은 브라우저 실측 + 스크린샷 사인오프.
- `src/routeTree.gen.ts`는 gitignore(커밋 대상 아님).

---

### Task 1: 타입 분리 + 순수 카테고리 필터 (가산)

`Category` 타입과 `filterByCategory`를 **추가만** 한다(아직 `Filter`에서 카테고리를 빼지 않아 tsc 그린 유지).

**Files:**
- Modify: `src/view-types.ts:11` (Filter 근처에 Category 추가)
- Modify: `src/cardlist.ts` (filterByCategory 추가)
- Test: `tests/cardlist.test.ts` (filterByCategory describe 추가)

**Interfaces:**
- Produces: `type CategoryFilter = 'all' | 'fruit' | 'vegetable' | 'seafood'`; `filterByCategory(cards: CardView[], category: CategoryFilter): CardView[]`

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/cardlist.test.ts` 최상단 import에 `filterByCategory` 추가하고(2번 줄 `import { signedChange, sortCards, filterCards, searchCards, searchHints } from '../src/cardlist'` → 끝에 `, filterByCategory`), 파일 끝(`describe('filterCards'…)` 블록 뒤, 120번 줄 닫는 `})` 다음)에 아래 describe를 추가한다:

```ts
describe('filterByCategory', () => {
  const fruit = card({ name: '수박', category: 'fruit' })
  const veg = card({ name: '오이', category: 'vegetable' })
  const sea = card({ name: '굴', category: 'seafood' })
  const all = [fruit, veg, sea]

  test("'all'이면 전부", () => expect(filterByCategory(all, 'all')).toHaveLength(3))
  test('과일만', () => expect(filterByCategory(all, 'fruit').map((c) => c.name)).toEqual(['수박']))
  test('채소만', () => expect(filterByCategory(all, 'vegetable').map((c) => c.name)).toEqual(['오이']))
  test('수산물만', () => expect(filterByCategory(all, 'seafood').map((c) => c.name)).toEqual(['굴']))
  test('없는 카테고리면 빈 목록', () =>
    expect(filterByCategory([fruit], 'seafood')).toEqual([]))
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/cardlist.test.ts`
Expected: FAIL — `filterByCategory is not a function` (또는 import 에러).

- [ ] **Step 3: 타입 추가** — `src/view-types.ts:11`의 `export type Filter = …` 줄 **아래**에 추가:

```ts
export type CategoryFilter = 'all' | 'fruit' | 'vegetable' | 'seafood'
```

- [ ] **Step 4: 순수 함수 추가** — `src/cardlist.ts` 상단 import(2번 줄)에 `CategoryFilter`를 더하고(`import type { CategoryFilter, Filter, OffSeasonHint, SortMode } from './view-types'`), `filterCards` 정의(40–42번 줄) **아래**에 추가:

```ts
/** 카테고리 단일 선택 필터 (순수). 'all'이면 전부 통과. */
export function filterByCategory(cards: CardView[], category: CategoryFilter): CardView[] {
  return category === 'all' ? cards : cards.filter((c) => c.category === category)
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run tests/cardlist.test.ts`
Expected: PASS (기존 filterCards 케이스 + 새 filterByCategory 케이스 전부).

- [ ] **Step 6: 타입 게이트**

Run: `npx tsc --noEmit`
Expected: 에러 없음(가산이라 기존 코드 무영향).

- [ ] **Step 7: 커밋**

```bash
git add src/view-types.ts src/cardlist.ts tests/cardlist.test.ts
git commit -m "feat: Category 타입 + filterByCategory 순수 필터 추가"
```

---

### Task 2: ButtonGroup 컴포넌트 (독립 프리미티브)

재사용 단일 선택 세그먼트 컨트롤. 아직 어디서도 안 쓰이므로 순수 가산.

**Files:**
- Create: `src/components/ButtonGroup.tsx`
- Create: `src/components/ButtonGroup.module.css`
- Test: `src/components/ButtonGroup.test.tsx`

**Interfaces:**
- Consumes: `cx` (`src/cx.ts`)
- Produces: `interface ButtonGroupOption<T extends string> { value: T; label: string }`; `ButtonGroup<T extends string>(props: { options: ButtonGroupOption<T>[]; value: T; onChange: (v: T) => void; ariaLabel: string }): JSX.Element`. 루트 `data-testid="button-group"`, 각 칸 `role="radio"`.

- [ ] **Step 1: 실패하는 테스트 작성** — `src/components/ButtonGroup.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { ButtonGroup, type ButtonGroupOption } from './ButtonGroup'

type Cat = 'all' | 'fruit' | 'veg'
const OPTS: ButtonGroupOption<Cat>[] = [
  { value: 'all', label: '전체' },
  { value: 'fruit', label: '과일' },
  { value: 'veg', label: '채소' },
]

function Harness({ onChange }: { onChange?: (v: Cat) => void }) {
  const [value, setValue] = useState<Cat>('all')
  return (
    <ButtonGroup
      options={OPTS}
      value={value}
      onChange={(v) => { setValue(v); onChange?.(v) }}
      ariaLabel="카테고리"
    />
  )
}

describe('ButtonGroup', () => {
  afterEach(() => cleanup())

  test('옵션 라벨을 모두 렌더하고 radiogroup 접근명을 갖는다', () => {
    const { getByRole } = render(<Harness />)
    const group = getByRole('radiogroup', { name: '카테고리' })
    expect(group).toBeTruthy()
    expect(getByRole('radio', { name: '전체' })).toBeTruthy()
    expect(getByRole('radio', { name: '채소' })).toBeTruthy()
  })

  test('선택값이 aria-checked로 반영된다', () => {
    const { getByRole } = render(<Harness />)
    expect(getByRole('radio', { name: '전체' }).getAttribute('aria-checked')).toBe('true')
    expect(getByRole('radio', { name: '과일' }).getAttribute('aria-checked')).toBe('false')
  })

  test('클릭하면 onChange(value)가 불린다', () => {
    const onChange = vi.fn()
    const { getByRole } = render(<Harness onChange={onChange} />)
    fireEvent.click(getByRole('radio', { name: '과일' }))
    expect(onChange).toHaveBeenCalledWith('fruit')
    expect(getByRole('radio', { name: '과일' }).getAttribute('aria-checked')).toBe('true')
  })

  test('←/→ 방향키로 이동하며 순환한다', () => {
    const onChange = vi.fn()
    const { getByRole } = render(<Harness onChange={onChange} />)
    fireEvent.keyDown(getByRole('radio', { name: '전체' }), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('fruit')
    fireEvent.keyDown(getByRole('radio', { name: '전체' }), { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('veg') // 전체에서 왼쪽 → 마지막으로 순환
  })

  test('선택 칸만 tabIndex 0 (로빙 tabindex)', () => {
    const { getByRole } = render(<Harness />)
    expect(getByRole('radio', { name: '전체' }).getAttribute('tabindex')).toBe('0')
    expect(getByRole('radio', { name: '과일' }).getAttribute('tabindex')).toBe('-1')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/ButtonGroup.test.tsx`
Expected: FAIL — `ButtonGroup` 모듈 없음.

- [ ] **Step 3: 컴포넌트 구현** — `src/components/ButtonGroup.tsx`:

```tsx
import { cx } from '../cx'
import styles from './ButtonGroup.module.css'

export interface ButtonGroupOption<T extends string> {
  value: T
  label: string
}

/** 단일 선택 세그먼트 컨트롤 (표시 전용, 재사용 프리미티브).
 *  radiogroup 시맨틱 + 로빙 tabindex + ←/→ 방향키. 선택 칸을 알약 썸이 슬라이드로 따라간다.
 *  상호배타는 "하나만 고르는 곳"이라는 시각을 규율로 만든다 — chip group(FilterBar)과 대비. */
export function ButtonGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: ButtonGroupOption<T>[]
  value: T
  onChange: (v: T) => void
  ariaLabel: string
}) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div className={styles.group} role="radiogroup" aria-label={ariaLabel} data-testid="button-group">
      <span
        className={styles.thumb}
        aria-hidden="true"
        style={{ width: `calc((100% - 6px) / ${options.length})`, transform: `translateX(${idx * 100}%)` }}
      />
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={cx(styles.seg, selected && styles.on)}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              const dir =
                e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
                : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1
                : 0
              if (!dir) return
              e.preventDefault()
              const next = (idx + dir + options.length) % options.length
              onChange(options[next].value)
              // 방향키 이동은 포커스도 새 칸으로 옮긴다(로빙 tabindex 관례)
              const btns = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
              btns?.[next]?.focus()
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: 스타일 구현** — `src/components/ButtonGroup.module.css` (시안 A2: inset 트랙 음영):

```css
.group {
  position: relative;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  align-items: stretch;
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  padding: 3px;
  isolation: isolate;
  /* A2: 트랙 안쪽 눌린 음영 — DESIGN.md 그림자 금지의 두 번째 예외(냉장고 메모 --lift에 이어).
     세그먼트 웰의 "홈" 느낌. 드롭섀도 아님(안으로만), 그라데이션 아님. */
  box-shadow: inset 0 1px 2px rgba(43, 69, 134, 0.07);
}
.thumb {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  background: var(--tint);
  border: 1px solid var(--accent);
  border-radius: var(--radius-pill);
  z-index: 0;
  /* 차양(NavIndex) 언롤과 같은 곡선 — 앱의 슬라이드 어휘 재사용 */
  transition: transform 0.32s cubic-bezier(0.2, 0.75, 0.2, 1);
}
.seg {
  position: relative;
  z-index: 1;
  appearance: none;
  background: none;
  border: 0;
  font: inherit;
  font-size: var(--text-sm);
  color: var(--muted);
  padding: var(--space-2xs) 0;
  cursor: pointer;
  border-radius: var(--radius-pill);
  transition: color 0.2s ease;
}
.seg.on { color: var(--ink); font-weight: 700; }
.seg:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  .thumb,
  .seg { transition: none; }
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/components/ButtonGroup.test.tsx`
Expected: PASS (5개 전부).

- [ ] **Step 6: 타입 게이트**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 7: 커밋**

```bash
git add src/components/ButtonGroup.tsx src/components/ButtonGroup.module.css src/components/ButtonGroup.test.tsx
git commit -m "feat: 단일 선택 세그먼트 ButtonGroup 컴포넌트 (시안 A2)"
```

---

### Task 3: 카테고리 축 컷오버 — App 배선 + FilterBar 정리 + 타입 제거

파괴적 변경을 한 번에: `Filter`에서 카테고리 제거, FilterBar 칩 3개 제거, App에 ButtonGroup 배선, 관련 테스트·스토리 갱신. 이 태스크 끝에 카테고리 필터가 세그먼트로 동작한다.

**Files:**
- Modify: `src/view-types.ts:11` (Filter에서 카테고리 제거)
- Modify: `src/cardlist.ts:30-37` (PRED에서 카테고리 3항 제거)
- Modify: `src/components/FilterBar.tsx:5-12` (CHIPS에서 카테고리 3항 제거)
- Modify: `src/components/App.tsx` (category 상태·CATEGORIES·합성·렌더, EXCLUSIVE_FILTERS 삭제)
- Test: `tests/cardlist.test.ts` (filterCards의 카테고리 셋 케이스 이전)
- Test: `src/components/App.test.tsx` (radio 셀렉터로 갱신)
- Test: `src/components/App.stories.tsx:323,366` (radio 셀렉터로 갱신)

**Interfaces:**
- Consumes: `filterByCategory`, `CategoryFilter` (Task 1); `ButtonGroup`, `ButtonGroupOption` (Task 2)
- Produces: 없음(최종 소비자).

- [ ] **Step 1: cardlist 테스트를 축 분리에 맞게 수정** — `tests/cardlist.test.ts`의 `describe('filterCards'…)` 안에서:
  - 99번 줄 `test('과일만', …)` **삭제**(카테고리는 filterByCategory가 담당 — Task 1에서 커버).
  - 103번 줄 `test('AND: 채소 + 가격있음', …)`를 아래로 교체(카테고리는 합성으로):

```ts
  test('AND: 채소(카테고리) + 가격있음', () =>
    expect(filterCards(filterByCategory(all, 'vegetable'), new Set(['priced'])).map((c) => c.name)).toEqual(['토마토']))
```

  - 113–120번 줄 `test('seafood 필터는 수산 카드만 남긴다', …)` **삭제**(filterByCategory 테스트가 대체).

- [ ] **Step 2: 실패 확인 (컴파일·런타임)**

Run: `npx tsc --noEmit`
Expected: 아직 그린(이 단계는 테스트 파일만 수정). 이어서 소스에서 카테고리를 제거하면 소비자들이 깨지는 걸 다음 스텝들에서 함께 고친다. (참고: `npx vitest run tests/cardlist.test.ts` 은 여전히 PASS.)

- [ ] **Step 3: Filter 타입에서 카테고리 제거** — `src/view-types.ts:11`:

```ts
export type Filter = 'drop' | 'peak' | 'priced'
```

- [ ] **Step 4: PRED에서 카테고리 제거** — `src/cardlist.ts:30-37`의 `PRED`를 아래로 교체:

```ts
const PRED: Record<Filter, (c: CardView) => boolean> = {
  drop: (c) => (c.price?.monthAgoPct ?? 0) < 0,
  peak: (c) => c.inPeak,
  priced: (c) => c.price != null,
}
```

  같은 파일 39번 줄 주석 `/** 필터 술어 AND (순수). 과일/채소/수산 상호배타는 UI(App.tsx toggle)가 관장. */`을 아래로 교체:

```ts
/** 상태 필터 술어 AND (순수). 카테고리 축은 filterByCategory가 별도로 관장. */
```

- [ ] **Step 5: FilterBar에서 카테고리 칩 제거** — `src/components/FilterBar.tsx:5-12`의 `CHIPS`를 아래로 교체:

```ts
const CHIPS: { key: Filter; label: string }[] = [
  { key: 'peak', label: '한창 제철' },
  { key: 'drop', label: '가격 하락' },
  { key: 'priced', label: '가격 있음' },
]
```

- [ ] **Step 6: App에 카테고리 세그먼트 배선** — `src/components/App.tsx`를 아래 5곳 수정:

  (a) import 교체 — 2번 줄, 3번 줄, 5번 줄 근처:

```tsx
import { filterByCategory, filterCards, searchCards, searchHints, sortCards } from '../cardlist'
import type { AppView, CategoryFilter, Filter, SortMode } from '../view-types'
import { ButtonGroup, type ButtonGroupOption } from './ButtonGroup'
```

  (b) 19번 줄 `const EXCLUSIVE_FILTERS: Filter[] = ['fruit', 'vegetable', 'seafood']`와 그 위 18번 줄 주석을 **삭제**하고, 대신 카테고리 옵션 상수를 추가:

```tsx
// 카테고리 축(과일·채소·수산)은 상호배타 — 세그먼트 컨트롤로 항상 하나만 선택. '전체'=미필터.
const CATEGORIES: ButtonGroupOption<CategoryFilter>[] = [
  { value: 'all', label: '전체' },
  { value: 'fruit', label: '과일' },
  { value: 'vegetable', label: '채소' },
  { value: 'seafood', label: '수산물' },
]
```

  (c) 41번 줄 `const [filters, …]` 아래에 카테고리 상태 추가:

```tsx
  const [category, setCategory] = useState<CategoryFilter>('all')
```

  (d) 51–63번 줄 `toggle`을 단순 add/delete로 교체(상호배타 분기 제거):

```tsx
  const toggle = (f: Filter) =>
    setFilters((prev) => {
      const next = new Set(prev)
      if (next.has(f)) next.delete(f)
      else next.add(f)
      return next
    })
```

  (e) 68번 줄 `const shown = …`을 카테고리 합성으로 교체:

```tsx
  const shown = sortCards(filterCards(filterByCategory(base, category), filters), sort)
```

  (f) 96–102번 줄 `.controls` 블록에 SearchBar와 ctrlrow **사이**로 ButtonGroup을 넣는다:

```tsx
                <div className={styles.controls}>
                  <SearchBar query={query} onChange={setQuery} />
                  <ButtonGroup options={CATEGORIES} value={category} onChange={setCategory} ariaLabel="카테고리" />
                  <div className={styles.ctrlrow}>
                    <FilterBar filters={filters} onToggle={toggle} />
                    <SortControl sort={sort} onChange={setSort} />
                  </div>
                </div>
```

- [ ] **Step 7: App 테스트 갱신** — `src/components/App.test.tsx`:
  - 66번 줄 주석을 교체: `// 옛 CSS 라디오(#f-fruit) 대신 JS 컨트롤(세그먼트+칩)이 마운트 후 보인다`.
  - 89번 줄 `fireEvent.click(getByRole('button', { name: '과일' }))` → `fireEvent.click(getByRole('radio', { name: '과일' }))`.
  - 93–107번 줄 `test('과일·채소·수산 칩은 3자 상호배타 …')` 전체를 아래로 교체(세그먼트=단일 선택):

```tsx
  test('카테고리 세그먼트는 단일 선택 (하나 고르면 이전 해제)', async () => {
    const view = viewWithCards([
      { name: '수박', category: 'fruit' },
      { name: '오이', category: 'vegetable' },
      { name: '굴', category: 'seafood' },
    ])
    const { container, getByRole } = await renderWithRouter(<App view={view} />)
    fireEvent.click(getByRole('radio', { name: '과일' }))
    expect(container.textContent).toContain('수박')
    expect(container.textContent).not.toContain('굴')
    fireEvent.click(getByRole('radio', { name: '수산물' })) // 과일 해제되고 수산만
    expect(container.textContent).toContain('굴')
    expect(container.textContent).not.toContain('수박')
    expect(getByRole('radio', { name: '과일' }).getAttribute('aria-checked')).toBe('false')
  })
```

  - 119번 줄 `fireEvent.click(getByRole('button', { name: '채소' }))` → `fireEvent.click(getByRole('radio', { name: '채소' }))`.

- [ ] **Step 8: 스토리 갱신** — `src/components/App.stories.tsx`:
  - 323번 줄 `const fruitChip = await canvas.findByRole('button', { name: '과일' })` → `findByRole('radio', { name: '과일' })`.
  - 366번 줄 동일하게 `findByRole('radio', { name: '과일' })`로.
  - 313번 줄 주석의 `FilterBar·cardlist.filterCards` → `카테고리 세그먼트·cardlist.filterByCategory`로 갱신.

- [ ] **Step 9: 전체 테스트 + 타입 게이트**

Run: `npm test`
Expected: PASS (cardlist·ButtonGroup·App 전부).

Run: `npx tsc --noEmit`
Expected: 에러 없음(카테고리 리터럴 잔재 없음).

- [ ] **Step 10: 브라우저 실측** — `npm run dev` 후 브라우저에서:
  - 세그먼트 4칸 `[전체 | 과일 | 채소 | 수산물]`, 기본 '전체' 선택.
  - 각 칸 클릭 시 tint 채움 알약이 **부드럽게 슬라이드**, 선택 칸만 쪽빛 볼드.
  - 트랙 inset 음영(눌린 홈) 보임.
  - Tab으로 진입 → ←/→ 방향키로 이동·목록 갱신, 포커스 링(쪽빛).
  - 카테고리 + 상태 칩(한창 제철 등) 동시 적용이 목록에 반영.
  - DevTools에서 `prefers-reduced-motion: reduce` 켜면 슬라이드 즉시 전환.
  - 스크린샷 저장해 사인오프.

- [ ] **Step 11: 커밋**

```bash
git add src/view-types.ts src/cardlist.ts src/components/FilterBar.tsx src/components/App.tsx \
        tests/cardlist.test.ts src/components/App.test.tsx src/components/App.stories.tsx
git commit -m "feat: 카테고리를 세그먼트 ButtonGroup으로 분리 (FilterBar에서 제거)"
```

---

### Task 4: 문서 갱신

DESIGN.md 결정 기록·89줄 메모·모션 절, 제품-동작-지도.md 한 줄.

**Files:**
- Modify: `DESIGN.md` (결정 기록 항목 추가, 89번 줄 메모 수정, 모션 절 항목 추가)
- Modify: `docs/제품-동작-지도.md` (카테고리 기본값·단일 선택 한 줄)

- [ ] **Step 1: DESIGN.md 89번 줄 메모 수정** — 현 구현에 맞게:

```
- 카드 펼침은 `<details>` — JS 없는 인터랙션 (카테고리 세그먼트는 하이드레이션 후 JS radiogroup)
```

- [ ] **Step 2: DESIGN.md 모션 절에 항목 추가** — 96–102번 줄 모션 목록(차양 항목 아래)에:

```
  - **카테고리 세그먼트(ButtonGroup)**: 선택 알약이 칸 사이를 슬라이드(차양과 같은 곡선
    `cubic-bezier(0.2,0.75,0.2,1)` 320ms) + 라벨 색 전환. reduced-motion이면 즉시.
```

- [ ] **Step 3: DESIGN.md 결정 기록에 항목 추가** — 파일 끝(마지막 결정 항목 뒤)에:

```
- 과일·채소·수산물 카테고리를 FilterBar 알약 칩에서 **세그먼트 ButtonGroup**으로 분리했다
  (2026-07-23). 카테고리는 상호배타(항상 하나)인데 상태 칩과 시각이 같아 "여럿 켤 수 있다"로
  오독됐다. `[전체 | 과일 | 채소 | 수산물]` 단일 선택 세그먼트(radiogroup, ←/→ 방향키, 슬라이딩
  알약 썸)로 바꿔 "하나 고르는 곳"을 시각 규율로 만들고, 상태 칩(chip group)과 대비시켰다.
  '전체' 칸을 추가해 미필터를 명시적 선택으로 표현. 트랙에 **inset 음영**을 얹었다 — 냉장고
  메모 부양(`--lift`)에 이은 **두 번째 그림자 예외**(안으로만, 세그먼트 웰의 눌린 홈; 그라데이션
  금지는 유지). apple-design 렌즈로 시안 3안(트랙+슬라이딩 / 밑줄 탭 / 아웃라인) 중 트랙안,
  이어 음영 3안(톤 / inset / 결합) 중 inset을 브라우저 시안 비교로 확정. 스펙:
  `docs/superpowers/specs/2026-07-23-category-button-group-design.md`
```

- [ ] **Step 4: 제품-동작-지도.md 갱신** — 카테고리 필터를 다루는 위치(필터 관련 절)에 한 줄 추가. 해당 절이 없으면 필터 설명 근처에:

```
- 카테고리 필터(과일·채소·수산물)는 세그먼트 컨트롤로 **항상 하나만** 선택되며 기본값은
  '전체'(미필터). 상태 칩(한창 제철·가격 하락·가격 있음)은 여럿 동시 토글로 별개 축이다.
```

- [ ] **Step 5: 게이트(문서만이지만 확인)**

Run: `npm test && npx tsc --noEmit`
Expected: 여전히 PASS(문서 변경은 무영향).

- [ ] **Step 6: 커밋**

```bash
git add DESIGN.md docs/제품-동작-지도.md
git commit -m "docs: 카테고리 세그먼트 분리 — DESIGN 결정 기록·모션·동작 지도"
```

---

## Self-Review

**Spec coverage:**
- 재사용 ButtonGroup → Task 2. ✓
- 카테고리 FilterBar 분리 → Task 3 (Step 5–6). ✓
- FilterBar 상태 칩 유지 → Task 3 Step 5(peak·drop·priced 남김). ✓
- 선택 모델(전체 포함 항상 하나) → Task 2(컴포넌트) + Task 3(CATEGORIES·기본 'all'). ✓
- 시안 A2 inset 트랙·슬라이딩·차양 곡선 → Task 2 CSS. ✓
- 타입 분리 Filter/Category → Task 1(추가) + Task 3(제거). ✓
- filterByCategory + filterCards 합성 → Task 1 + Task 3 Step 6(e). ✓
- EXCLUSIVE_FILTERS 삭제 → Task 3 Step 6(b). ✓
- 접근성 radiogroup·방향키·로빙 tabindex → Task 2. ✓
- 테스트(cardlist 이전·ButtonGroup 신규·App/스토리 갱신) → Task 1·2·3. ✓
- 브라우저 실측·스크린샷 → Task 3 Step 10. ✓
- DESIGN.md·제품-동작-지도 → Task 4. ✓
- 그림자 2번째 예외 기록 → Task 4 Step 3. ✓

**Placeholder scan:** 모든 코드 스텝에 실제 코드 있음. "적절히"·TBD·TODO 없음. Task 4 Step 4만 "해당 절 없으면 근처에"라는 조건부지만 삽입할 문장 전문을 제공함. ✓

**Type consistency:** `filterByCategory(cards, category)` (Task 1) ↔ App 합성 호출(Task 3 6e) 시그니처 일치. `ButtonGroupOption<T>`/`ButtonGroup` props(Task 2) ↔ App 사용(Task 3 6b·6f) 일치. `CategoryFilter` 유니온(Task 1) ↔ CATEGORIES value(Task 3) 일치. `Filter = 'drop'|'peak'|'priced'`(Task 3) ↔ PRED 키·CHIPS 키 일치. ✓
