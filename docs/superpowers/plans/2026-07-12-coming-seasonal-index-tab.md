# 다가오는 제철 — 램프줄 인덱스·카드형 페이지 Implementation Plan (개정)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 이번 달 집중 메인은 그대로 두고, 다가오는 제철을 별도 `/coming` 경로에 **카드형**으로 세우고, 두 페이지를 우측 상단 **램프줄 → 오른쪽 CSS 슬라이드 인덱스 서랍**으로 넘나든다.

**Architecture:** 순수 선정(`comingMonths`) → 순수 조립(`buildComingView`, 미래월 `whyNow`·달별 `season` 포함) → 표시(`Coming`·`ComingCard`·`NavIndex`) → 라우트(`coming.tsx` 프리렌더). 냉장고-메모 카드 껍데기를 재활용하고, 인덱스 서랍은 체크박스 훅(CSS-only)으로 연다.

**Tech Stack:** TanStack Start(React 19) · Vite · Vitest · Testing Library. node ≥ 22.

## Global Constraints

- 정적 프리렌더·서버 없음·런타임 외부요청 없음·무추적. 새 경로도 정적 산출물 한 장.
- 다가오는 페이지는 **`produce.json`(프로필)과 시계만** 쓴다 — 가격·영양·레시피 심에 손대지 않는다.
- 예고는 카드보다 가볍다: **껍데기(마스킹테이프·이모지·이름·손글씨 한마디·절정 배지)는 재활용, 알맹이(가격·스파크·영양·레시피·`<details>` 펼침)는 제거.**
- 텍스트·글리프는 오직 쪽빛(`--ink`). 계절 웜 컬러(`--tint`/`--accent`)는 배경·마스킹테이프·배지 채움으로만.
- 인덱스 서랍 열고/닫기는 **CSS-only(체크박스 훅)**. `prefers-reduced-motion: reduce`면 슬라이드 없이 즉시. Esc/포커스 마감은 선택적 최소 JS(이번 범위 밖).
- 문구는 계절의 목소리로, 감탄사·느낌표 금지, 서술로 끝낸다.
- 링크 href는 `import.meta.env.BASE_URL` 접두(루트 `/`, 하위경로 `/jecheori/`). 테스트/jsdom에선 `/`.
- 순수 로직 테스트는 `tests/`에 두고 `'../src/…'` 임포트, **유효 `categoryCode`('100'|'200'|'400')** 사용. 컴포넌트 테스트는 `src/components/*.test.tsx` + `// @vitest-environment jsdom`.
- 각 커밋 전 `npm test`와 `npx tsc --noEmit` 모두 초록.

---

## 이미 완료(재사용, 손대지 않음)

- **`comingMonths`**(`src/picks.ts`) + 도메인 타입 `ComingPick`/`ComingGroup` — 커밋 7879c7c. 변경 없음.
- **`Sprig`**(`src/components/Sprig.tsx`) — 커밋 2689f37. 변경 없음.
- **`/coming` 라우트**(`src/routes/coming.tsx`) — 커밋 013e0b5. 로더는 `buildComingView(produce, new Date())` 그대로(반환 뷰가 확장돼도 시그니처 동일).
- 메인 옛 "곧 제철" 한 줄·`AppView.coming`·`comingSoon` 제거 — 커밋 356e193/a0a6865. 변경 없음.

## 되돌림(초안 산출물 폐기)

- **`IndexTab`**(컴포넌트+테스트+CSS) — 램프줄 서랍(`NavIndex`)이 대체. Task R4에서 제거.

---

### Task R1: `ComingView` 확장 + `buildComingView` (미래월 whyNow·달별 season)

카드 껍데기를 그리려면 이모지·이름·절정 외에 **미래 월 한마디**와 **그 달 계절색**이 필요하다. 기존 순수 함수 `whyNowLine`(card.ts)·`seasonOf`(season.ts)를 재사용한다.

**Files:**
- Modify: `src/view-types.ts`, `src/app.ts`
- Test: `tests/app.test.ts` (기존 `buildComingView` 블록 갱신)
- Touch(컴파일 유지): `src/components/Coming.test.tsx` (픽스처에 새 필드 추가 — R3에서 완전 재작성)

**Interfaces:**
- Consumes: `comingMonths`(picks), `whyNowLine`(card.ts), `seasonOf`·`Season`(season.ts), `currentTerm`(season.ts).
- Produces:
  - `interface ComingItem { emoji: string; name: string; peak: boolean; whyNow: string }`
  - `interface ComingMonth { month: number; season: Season; items: ComingItem[] }`
  - `interface ComingView { months: ComingMonth[]; date: Date; term?: string }`
  - `buildComingView(profiles: ProduceProfile[], now: Date): ComingView`

- [ ] **Step 1: 테스트 갱신(실패 상태로)**

`tests/app.test.ts`의 `describe('buildComingView', …)` 블록을 아래로 교체(없으면 파일 끝에 추가). 파일 상단 import에 `buildComingView`가 이미 있으면 유지.

```ts
// (파일에 이미 있는 import 유지: buildAppView, buildComingView from '../src/app')
// 헬퍼(파일에 없으면 buildComingView describe 위에 추가):
const cp = (
  id: string, name: string, emoji: string,
  seasonMonths: number[], peakMonths: number[], whyNow: Record<string, string>,
): ProduceProfile => ({
  id, name, emoji, category: 'fruit',
  kamis: { categoryCode: '400', itemName: id },
  seasonMonths, peakMonths, whyNow,
  howToPick: 'p', howToStore: 's', howToUse: 'u',
})

describe('buildComingView', () => {
  test('달별 계절과 품목별 미래월 한마디를 싣는다', () => {
    const grape = cp('grape', '포도', '🍇', [8, 9], [8], { '8': '8월이 절정이에요', default: '가을' })
    const view = buildComingView([grape], new Date('2026-07-15T00:00:00'))
    expect(view.months).toHaveLength(1)
    expect(view.months[0].month).toBe(8)
    expect(view.months[0].season).toBe('summer')
    expect(view.months[0].items[0]).toEqual({ emoji: '🍇', name: '포도', peak: true, whyNow: '8월이 절정이에요' })
    expect(view.term).toBe('소서')
  })

  test('9월 그룹은 가을, 미래월 한마디를 뽑는다', () => {
    const chestnut = cp('chestnut', '밤', '🌰', [9], [9], { '9': '9월이 절정이에요', default: '가을' })
    const view = buildComingView([chestnut], new Date('2026-07-15T00:00:00'))
    expect(view.months[0].season).toBe('autumn')
    expect(view.months[0].items[0].whyNow).toBe('9월이 절정이에요')
  })

  test('다가오는 게 없으면 months는 빈 배열', () => {
    const peach = cp('peach', '복숭아', '🍑', [7], [], { default: '여름' })
    expect(buildComingView([peach], new Date('2026-07-15T00:00:00')).months).toEqual([])
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/app.test.ts`
Expected: FAIL — `season`/`whyNow`가 아직 없어 `toEqual`/`toBe` 단언 실패.

- [ ] **Step 3: 타입·조립 확장**

`src/view-types.ts`: 상단에 `import type { Season } from './season'` 추가. 기존 `ComingItem`/`ComingMonth`/`ComingView` 정의를 아래로 교체:

```ts
export interface ComingItem {
  emoji: string
  name: string
  peak: boolean
  /** 배정된(미래) 월 기준 한마디 */
  whyNow: string
}
export interface ComingMonth {
  month: number
  /** 그 달의 계절 — 카드 마스킹테이프 색 */
  season: Season
  items: ComingItem[]
}
export interface ComingView {
  months: ComingMonth[]
  date: Date
  term?: string
}
```

`src/app.ts`:
- import 수정: `import { currentTerm, seasonOf } from './season'` (seasonOf 추가), `import { toCardView, whyNowLine } from './card'` (whyNowLine 추가).
- `buildComingView`를 아래로 교체:

```ts
export function buildComingView(profiles: ProduceProfile[], now: Date): ComingView {
  const month = now.getMonth() + 1
  const months = comingMonths(profiles, month).map((g) => ({
    month: g.month,
    season: seasonOf(g.month),
    items: g.items.map((it) => ({
      emoji: it.profile.emoji,
      name: it.profile.name,
      peak: it.peak,
      whyNow: whyNowLine(it.profile, g.month),
    })),
  }))
  return { months, date: now, term: currentTerm(now) }
}
```

- [ ] **Step 4: Coming.test 픽스처 컴파일 유지(임시)**

`src/components/Coming.test.tsx`의 `ComingView` 리터럴(`base`)에 새 필수 필드를 더해 tsc를 초록으로 유지한다(R3에서 이 파일을 완전히 재작성하므로 임시 조치). 각 `months[*]`에 `season: 'summer'`(8월)·`season: 'autumn'`(9월)을, 각 `items[*]`에 `whyNow: ''`를 추가.

- [ ] **Step 5: 통과 + 타입 확인**

Run: `npx vitest run tests/app.test.ts && npm test && npx tsc --noEmit`
Expected: buildComingView 3 tests PASS, 전체 초록, tsc 0 errors.

- [ ] **Step 6: 커밋**

```bash
git add src/view-types.ts src/app.ts tests/app.test.ts src/components/Coming.test.tsx
git commit -m "feat: ComingView 확장 — 달별 season·품목별 미래월 whyNow(카드 재활용용)"
```

---

### Task R2: `ComingCard` — 카드 껍데기 재활용 (정적·경량)

냉장고-메모 카드의 **표지 면**과 같은 클래스를 쓰되 **정적 `<div>`**로. 가격·펼침 없음. 절정은 now-카피 없는 **동형 배지**(`.peak-badge`)로. `data-season`으로 미래 계절색을 카드 로컬에 건다.

**Files:**
- Create: `src/components/ComingCard.tsx`
- Test: `src/components/ComingCard.test.tsx`

**Interfaces:**
- Consumes: `ComingItem`(view-types), `Season`(season.ts).
- Produces: `function ComingCard(props: { item: ComingItem; season: Season }): JSX.Element` — `<div class="card coming-card" data-season>` with `.summary-row`/`.emoji`/`.card-title`/`.peak-badge`/`.why`.

- [ ] **Step 1: 실패 테스트 작성**

Create `src/components/ComingCard.test.tsx`:

```tsx
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
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/ComingCard.test.tsx`
Expected: FAIL — cannot find module `./ComingCard`.

- [ ] **Step 3: 구현**

Create `src/components/ComingCard.tsx`:

```tsx
import type { Season } from '../season'
import type { ComingItem } from '../view-types'

/** 다가오는 품목 한 장 — 냉장고-메모 카드 껍데기 재활용(정적 div). 가격·펼침 없음. 표시 전용. */
export function ComingCard({ item, season }: { item: ComingItem; season: Season }) {
  return (
    <div className="card coming-card" data-season={season}>
      <div className="summary-row">
        <span className="id">
          <span className="emoji">{item.emoji}</span>
          <span>
            <span className="card-title">
              {item.name}
              {item.peak && (
                <span className="peak-badge" role="img" aria-label="절정">
                  <b></b>
                </span>
              )}
            </span>
          </span>
        </span>
      </div>
      {item.whyNow && <p className="why">{item.whyNow}</p>}
    </div>
  )
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/components/ComingCard.test.tsx && npx tsc --noEmit`
Expected: 2 tests PASS, tsc clean.

- [ ] **Step 5: 커밋**

```bash
git add src/components/ComingCard.tsx src/components/ComingCard.test.tsx
git commit -m "feat: ComingCard — 냉장고-메모 카드 껍데기 재활용(정적·경량)"
```

---

### Task R3: `NavIndex` — 램프줄 + CSS 슬라이드 인덱스 서랍

우측 상단 램프줄(A) → 당기면 오른쪽에서 인덱스 서랍 슬라이드(가로 읽기 목차). 열고/닫기는 체크박스 훅(CSS-only). 목차 링크는 진짜 앵커(BASE_URL 접두). 이 태스크는 마크업/컴포넌트만; 슬라이드·비주얼 CSS는 Task R6.

**Files:**
- Create: `src/components/NavIndex.tsx`
- Test: `src/components/NavIndex.test.tsx`

**Interfaces:**
- Produces: `function NavIndex(props: { current: 'now' | 'coming' }): JSX.Element`.

- [ ] **Step 1: 실패 테스트 작성**

Create `src/components/NavIndex.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { NavIndex } from './NavIndex'

describe('NavIndex', () => {
  test('목차 토글(체크박스)과 두 페이지 링크를 그린다', () => {
    const { container, getByLabelText, getByText } = render(<NavIndex current="now" />)
    const toggle = getByLabelText('목차 열기') as HTMLInputElement
    expect(toggle.type).toBe('checkbox')
    const now = getByText('지금 담기 좋은 것') as HTMLAnchorElement
    const coming = getByText('다가오는 제철') as HTMLAnchorElement
    expect(now.getAttribute('href')).toBe(import.meta.env.BASE_URL)
    expect(coming.getAttribute('href')).toContain('coming')
    // 현재 페이지 표시
    expect(now.getAttribute('aria-current')).toBe('page')
    expect(coming.getAttribute('aria-current')).toBeNull()
    expect(container.querySelector('.nav-index')).not.toBeNull()
  })

  test('current="coming"이면 다가오는 링크가 현재', () => {
    const { getByText } = render(<NavIndex current="coming" />)
    expect(getByText('다가오는 제철').getAttribute('aria-current')).toBe('page')
    expect(getByText('지금 담기 좋은 것').getAttribute('aria-current')).toBeNull()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/NavIndex.test.tsx`
Expected: FAIL — cannot find module `./NavIndex`.

- [ ] **Step 3: 구현**

Create `src/components/NavIndex.tsx`:

```tsx
/** 램프줄(A) + CSS 슬라이드 인덱스 서랍. 양쪽 페이지 공유.
 *  열고/닫기는 체크박스 훅(무JS), 목차 링크는 진짜 앵커(BASE_URL 접두). */
export function NavIndex({ current }: { current: 'now' | 'coming' }) {
  const base = import.meta.env.BASE_URL
  return (
    <nav className="nav-index">
      <input type="checkbox" id="nav-toggle" className="nav-toggle" aria-label="목차 열기" />
      <label htmlFor="nav-toggle" className="nav-cord" aria-hidden="true">
        <svg viewBox="0 0 12 64" fill="none" aria-hidden="true">
          <path d="M6 0 V50" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="6" cy="56" r="5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </label>
      <label htmlFor="nav-toggle" className="nav-backdrop" aria-hidden="true" />
      <div className="nav-panel">
        <p className="nav-panel-title">목차</p>
        <a href={base} aria-current={current === 'now' ? 'page' : undefined}>지금 담기 좋은 것</a>
        <a href={`${base}coming`} aria-current={current === 'coming' ? 'page' : undefined}>다가오는 제철</a>
      </div>
    </nav>
  )
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/components/NavIndex.test.tsx && npx tsc --noEmit`
Expected: 2 tests PASS, tsc clean.

- [ ] **Step 5: 커밋**

```bash
git add src/components/NavIndex.tsx src/components/NavIndex.test.tsx
git commit -m "feat: NavIndex — 램프줄 + CSS 슬라이드 인덱스 서랍(가로 읽기 목차)"
```

---

### Task R4: `Coming` 페이지 카드형 재작업 + `IndexTab` 폐기

전용 페이지를 카드형으로: 머리말 + `NavIndex` + 달별 섹션(각 달 `.list` 안에 `ComingCard`). 옛 `IndexTab`은 이제 아무도 안 쓰므로 제거.

**Files:**
- Modify: `src/components/Coming.tsx`, `src/components/Coming.test.tsx`
- Delete: `src/components/IndexTab.tsx`, `src/components/IndexTab.test.tsx`

**Interfaces:**
- Consumes: `ComingView`(R1), `ComingCard`(R2), `NavIndex`(R3), `Sprig`, `weekLabel`.

- [ ] **Step 1: 테스트 재작성(실패 상태로)**

`src/components/Coming.test.tsx` 전체를 아래로 교체:

```tsx
// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Coming } from './Coming'
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
  test('머리말·달 헤더·카드·절정 배지·목차를 그린다', () => {
    const { container } = render(<Coming view={base} />)
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

  test('다가오는 게 없으면 담백한 안내', () => {
    const { container } = render(<Coming view={{ ...base, months: [] }} />)
    expect(container.textContent).toContain('다가오는 제철 정보가 아직 없어요')
    expect(container.querySelector('h2')).toBeNull()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/Coming.test.tsx`
Expected: FAIL — `.coming-card`/`.nav-index` 없음(현재 Coming은 옛 리스트/IndexTab).

- [ ] **Step 3: `Coming.tsx` 재작성**

`src/components/Coming.tsx` 전체를 아래로 교체:

```tsx
import type { ComingView } from '../view-types'
import { weekLabel } from '../week'
import { Sprig } from './Sprig'
import { NavIndex } from './NavIndex'
import { ComingCard } from './ComingCard'

/** 다가오는 제철 전용 페이지. 카드형(껍데기 재활용), 예고는 가볍게. 표시 전용. */
export function Coming({ view }: { view: ComingView }) {
  const { months, date, term } = view
  const eyebrow = term ? `${term} · ${weekLabel(date)}` : weekLabel(date)
  return (
    <>
      <NavIndex current="coming" />
      <header>
        <Sprig />
        <p className="week">{eyebrow}</p>
        <h1>다가오는 제철</h1>
      </header>
      <main>
        {months.length > 0 ? (
          months.map((m) => (
            <section className="coming-month" key={m.month}>
              <h2>{m.month}월</h2>
              <div className="list">
                {m.items.map((it, i) => (
                  <ComingCard key={i} item={it} season={m.season} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <p className="empty">다가오는 제철 정보가 아직 없어요</p>
        )}
      </main>
    </>
  )
}
```

- [ ] **Step 4: 옛 `IndexTab` 제거**

`IndexTab`은 이제 App(R5 전까지)만 참조한다. R5에서 App을 바꾸기 전이라 아직 삭제하면 App이 깨진다 → **삭제는 R5에서** 한다. 이 태스크에선 삭제하지 않는다. (이 스텝은 확인용: `grep -rn "IndexTab" src` 하면 App.tsx·App.test.tsx·IndexTab 파일만 남아야 한다.)

- [ ] **Step 5: 통과 + 타입 확인**

Run: `npx vitest run src/components/Coming.test.tsx && npm test && npx tsc --noEmit`
Expected: Coming 2 tests PASS, 전체 초록, tsc clean.

- [ ] **Step 6: 커밋**

```bash
git add src/components/Coming.tsx src/components/Coming.test.tsx
git commit -m "feat: Coming 페이지 카드형 재작업 — ComingCard·NavIndex, 달별 섹션"
```

---

### Task R5: 메인 배선 — `NavIndex`로 교체 + `IndexTab` 삭제

메인이 옛 오른쪽 `IndexTab` 대신 `NavIndex`를 쓰게 하고, 이제 아무도 안 쓰는 `IndexTab`을 삭제.

**Files:**
- Modify: `src/components/App.tsx`, `src/components/App.test.tsx`
- Delete: `src/components/IndexTab.tsx`, `src/components/IndexTab.test.tsx`

**Interfaces:**
- Consumes: `NavIndex`(R3).

- [ ] **Step 1: 테스트 수정(실패 상태로)**

`src/components/App.test.tsx`에서 옛 인덱스 탭 테스트를 아래로 교체:

```tsx
test('목차(NavIndex)로 다가오는 제철에 갈 수 있다', () => {
  const { container, getByText } = render(<App view={base} />)
  expect(container.querySelector('.nav-index')).not.toBeNull()
  const coming = getByText('다가오는 제철') as HTMLAnchorElement
  expect(coming.getAttribute('href')).toContain('coming')
})
```

(‘맨 아래 옛 "곧 제철" 한 줄은 없다’ 테스트는 그대로 유지.)

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/App.test.tsx`
Expected: FAIL — `.nav-index` 없음(App은 아직 `.index-tab-right`).

- [ ] **Step 3: `App.tsx` 수정**

`src/components/App.tsx`:
- import 교체: `import { IndexTab } from './IndexTab'` → `import { NavIndex } from './NavIndex'`.
- 반환 `<>` 첫 자식 교체: `<IndexTab side="right" path="coming" label="다가오는 제철" ariaLabel="다가오는 제철" />` → `<NavIndex current="now" />`.

- [ ] **Step 4: `IndexTab` 삭제**

```bash
git rm src/components/IndexTab.tsx src/components/IndexTab.test.tsx
```

Verify: `grep -rn "IndexTab" src` → 매치 없음.

- [ ] **Step 5: 통과 + 타입 확인**

Run: `npm test && npx tsc --noEmit`
Expected: 전체 초록(IndexTab 테스트 사라짐), tsc clean, 남은 `IndexTab` 참조 없음.

- [ ] **Step 6: 커밋**

```bash
git add src/components/App.tsx src/components/App.test.tsx
git commit -m "feat: 메인에 NavIndex 배선 + 옛 IndexTab 삭제"
```

---

### Task R6: 스타일 — 램프줄·서랍·카드형 계절색 + 옛 index-tab CSS 제거 + 브라우저 검증

스타일은 자동 테스트 대상이 아니므로 **브라우저 실측**으로 게이트한다(user 규칙). 값은 `style.css`의 토큰·관례를 따르고, 확정 전 사용자 확인.

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: 옛 초안 CSS 제거**

`src/style.css`에서 아래를 삭제:
- `.index-tab`, `.index-tab-right`, `.index-tab-left`, 그 hover/focus, 그리고 그것들을 끄는 `@media (prefers-reduced-motion)` 블록(=`.index-tab`용) 전부.
- 옛 다가오는-리스트 규칙 `.coming-month ul`, `.coming-month li`, `.coming-month li.peak`, `.peak-tag`.
- (유지: `.coming-month`, `.coming-month h2`, `@view-transition` 블록.)

`grep -n "index-tab\|peak-tag\|coming-month li\|coming-month ul" src/style.css` → 삭제 후 매치 없음.

- [ ] **Step 2: 계절 토큰을 요소 단위로 스코프**

`body[data-season='…']` 4줄을 `[data-season='…']`로 일반화(body도 여전히 매치돼 전역 기본 유지, 카드가 자기 계절 재정의 가능):

```css
[data-season='spring'] { --accent: #a2d3a6; --tint: #eaf4e9; }
[data-season='summer'] { --accent: #ffc400; --tint: #fff4ce; }
[data-season='autumn'] { --accent: #ed7328; --tint: #fbe7d6; }
[data-season='winter'] { --accent: #bc6e79; --tint: #f6e7ea; }
```

- [ ] **Step 3: 절정 배지 + 다가오는 페이지 여백**

```css
/* 다가오는 카드의 절정 배지 — peak-dot의 점 비주얼 재사용(카드 로컬 계절색) */
.peak-badge { display: inline-flex; }
.peak-badge b {
  display: block;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 3px var(--tint);
}
/* 달 섹션 간 여백(카드 목록은 기존 .list 재사용) */
.coming-month { margin-top: 1.6rem; }
.coming-month h2 { font-size: 1rem; letter-spacing: 0.04em; margin-bottom: 0.8rem; }
```

- [ ] **Step 4: 램프줄 + CSS 슬라이드 서랍**

```css
/* 램프줄(A) + 인덱스 서랍 — 체크박스 훅(무JS) */
.nav-index { position: fixed; top: 0; right: 1rem; z-index: 20; }
/* 토글: 시각적으로 숨기되 포커스 가능 */
.nav-toggle {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
/* 램프줄: 얇은 쪽빛 선 + 끝점 링(Sprig 어휘 라임) */
.nav-cord { display: block; cursor: pointer; color: var(--ink); transition: transform 160ms ease; }
.nav-cord svg { display: block; width: 12px; height: 64px; }
.nav-cord:hover,
.nav-toggle:focus-visible + .nav-cord { transform: translateY(3px); } /* 당김 */
/* 바깥 클릭 닫기용 투명 백드롭 */
.nav-backdrop { display: none; position: fixed; inset: 0; z-index: 20; background: transparent; }
#nav-toggle:checked ~ .nav-backdrop { display: block; }
/* 서랍: 오른쪽에서 슬라이드 */
.nav-panel {
  position: fixed; top: 0; right: 0; z-index: 21; height: 100%;
  width: min(16rem, 80vw); padding: 3rem 1.4rem;
  background: var(--card); border-left: 1px solid var(--line); box-shadow: var(--lift);
  transform: translateX(100%); transition: transform 220ms ease;
}
#nav-toggle:checked ~ .nav-panel { transform: translateX(0); }
.nav-panel-title { font-size: 0.8rem; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 0.6rem; }
.nav-panel a {
  display: block; padding: 0.75rem 0; color: var(--ink); text-decoration: none;
  border-bottom: 1px solid var(--line); font-size: 1.05rem;
}
.nav-panel a[aria-current='page'] { font-weight: 600; }
@media (prefers-reduced-motion: reduce) {
  .nav-cord, .nav-panel { transition: none; }
  .nav-cord:hover, .nav-toggle:focus-visible + .nav-cord { transform: none; }
}
```

- [ ] **Step 5: 빌드 + 브라우저 실측**

Run: `npm run build` (성공 확인) → `npm run dev` 후 브라우저로:
- 메인 우측 상단 램프줄(선+링) 보임, hover 시 살짝 당겨짐.
- 램프줄 클릭 → 오른쪽에서 서랍 슬라이드, 목차 두 줄("지금 담기 좋은 것"·"다가오는 제철", 현재 페이지 굵게). 바깥 클릭/재클릭으로 닫힘.
- "다가오는 제철" 클릭 → `/coming`. 카드형(마스킹테이프·이모지·이름·손글씨 한마디·절정 점), **8월 카드=여름 노랑 / 9월 카드=가을 오렌지** 테이프 색.
- 글자는 전부 쪽빛. 콘솔 에러 없음(favicon 404는 무관).
- reduced-motion 환경에서 램프줄 당김·서랍 슬라이드 애니메이션 꺼짐.

Expected: 위가 모두 맞음. **사용자에게 스크린샷/확인 요청, 색·간격·모션 조정 의견 반영 후 확정.**

- [ ] **Step 6: 커밋**

```bash
git add src/style.css
git commit -m "style: 램프줄 인덱스 서랍 + 카드형 다가오는 페이지(미래 계절색) + 옛 탭 CSS 제거"
```

---

### Task R7: 문서 (CONTEXT.md · DESIGN.md)

**Files:**
- Modify: `CONTEXT.md`, `DESIGN.md`

- [ ] **Step 1: `CONTEXT.md` 용어 추가**

- 도메인/심: **ComingView (`view-types.ts`) · buildComingView (`app.ts`)** — `/coming` 표시 데이터. 달별(`ComingMonth`: month·season·items) + 품목(`ComingItem`: emoji·name·peak·미래월 whyNow). 프로필+시계만, `whyNowLine`·`seasonOf` 재사용. 가격·영양·레시피 안 씀.
- 심/components: **NavIndex** — 램프줄(A) + CSS 슬라이드 인덱스 서랍(체크박스 훅), 양쪽 페이지 공유. **ComingCard** — 냉장고-메모 카드 껍데기 재활용(정적 div, 가격·펼침 없음, `data-season`으로 미래 계절색).
- 레이어 요약에 `/coming`이 `buildComingView`를 프리렌더한다는 점 한 줄.

- [ ] **Step 2: `DESIGN.md` 결정 기록 추가**

"결정 기록" 절 맨 아래에:

```
- "다가오는 제철"을 별도 경로(`/coming`)로 세우고 **램프줄 인덱스 서랍**으로 넘나든다 (2026-07-12).
  우측 상단 램프줄(얇은 쪽빛 선+끝점 링 — Sprig 라인아트 어휘와 라임) → 당기면 오른쪽에서 인덱스
  서랍이 슬라이드(가로 읽기 목차). 열고/닫기는 체크박스 훅(무JS), reduced-motion이면 즉시.
  (초안의 좌/우 세로 탭은 넘김 연상이 약하고 모바일 본문을 가려 폐기.)
  다가오는 페이지는 냉장고-메모 **카드 껍데기 재활용** — 마스킹테이프·이모지·이름·손글씨 한마디·
  절정 점은 그대로, 가격·스파크·영양·레시피·펼침은 제거(예고는 가볍게). 마스킹테이프 색은 그 품목의
  **미래 계절색**(8월 여름·9월 가을) — 계절 토큰을 `[data-season]` 요소 단위로 스코프해 카드별로 물든다.
  스펙: `docs/superpowers/specs/2026-07-12-coming-seasonal-index-tab-design.md`
```

- [ ] **Step 3: 커밋**

```bash
git add CONTEXT.md DESIGN.md
git commit -m "docs: 램프줄 인덱스·카드형 다가오는 페이지 — 용어·결정 기록"
```

---

## Self-Review

**Spec coverage:**
- 미래월 whyNow·달별 season 확장 → R1. ✓
- 카드 껍데기 재활용(정적·경량·절정 배지) → R2. ✓
- 램프줄 + CSS 슬라이드 서랍(가로 읽기 목차·현재 표시·BASE_URL) → R3(마크업)+R6(CSS). ✓
- 카드형 페이지(달별 섹션·미래 계절색·빈 상태) → R4. ✓
- 계절 토큰 요소 스코프 → R6 Step 2. ✓
- IndexTab 폐기 → R4(확인)+R5(삭제). ✓
- 메인 NavIndex 배선 → R5. ✓
- View Transitions 유지 → R6(기존 블록 보존). ✓
- 문서 → R7. ✓
- 이미 완료(comingMonths·Sprig·route·옛 곧제철 제거) → "이미 완료" 절. ✓

**Placeholder scan:** 모든 코드 스텝에 실제 코드·정확 경로·명령·기대 출력. 없음. ✓

**Type consistency:** `ComingItem{emoji,name,peak,whyNow}`·`ComingMonth{month,season,items}`·`ComingView{months,date,term?}`(R1)를 `ComingCard`(R2: `item`+`season`)·`Coming`(R4: `m.season`·`it`)·테스트가 일관 소비. `NavIndex` props `{current:'now'|'coming'}`(R3) ↔ App `current="now"`(R5)·Coming `current="coming"`(R4). 클래스명 `.coming-card`/`.peak-badge`/`.nav-index`/`.nav-panel`/`.nav-cord`/`.nav-toggle`가 컴포넌트(R2/R3/R4)·CSS(R6)·테스트에서 일치. `data-season` 값 `Season`('spring'|'summer'|'autumn'|'winter') ↔ CSS `[data-season='…']`(R6). ✓
