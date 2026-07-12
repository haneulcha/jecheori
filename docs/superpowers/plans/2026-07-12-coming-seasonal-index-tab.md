# 다가오는 제철 — 인덱스 탭·전용 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이번 달에 집중된 메인은 그대로 두고, "다가오는 제철"(앞으로 2개월·달별·절정 예고)을 별도 `/coming` 경로로 분리하고, 두 페이지를 다이어리 옆면 인덱스 탭으로 넘나들게 한다.

**Architecture:** 순수 선정(`comingMonths`) → 순수 조립(`buildComingView`) → 표시(`Coming`·`IndexTab`) → 라우트(`coming.tsx` 프리렌더). 기존 `picks ← app ← components ← routes` 의존 방향과 `selectPicks`/`buildAppView` 패턴을 그대로 따른다. 탭은 평범한 `<a>` 앵커 — 프리렌더 크롤(`crawlLinks`)이 `/coming`을 발견해 정적 페이지로 굽고, 넘김은 브라우저 네비게이션(무JS). View Transitions는 CSS 크로스도큐먼트(`@view-transition`)로만, 지원 브라우저·모션 허용 시에만 얹는 선택적 향상.

**Tech Stack:** TanStack Start(React 19) · Vite · Vitest · Testing Library. node ≥ 22.

## Global Constraints

- 정적 프리렌더·서버 없음·런타임 외부요청 없음·무추적. 새 경로도 정적 산출물 한 장.
- 다가오는 페이지는 **`produce.json`(프로필)과 시계만** 쓴다 — 가격·영양·레시피 파이프라인·심에 손대지 않는다.
- 예고는 카드보다 가볍다: 가격 없음, `<details>` 펼침 없음. "볼 것"이지 "살 것" 아님.
- 텍스트·글리프는 오직 쪽빛(`--ink`). 계절 웜 컬러(`--tint`)는 배경·채움으로만, 글자에 안 싣는다.
- 문구는 계절의 목소리로, 감탄사·느낌표 금지, 서술로 끝낸다.
- 기본 무JS(탭은 진짜 앵커). View Transitions는 미지원·`prefers-reduced-motion: reduce`에서 무효화.
- 하위경로 배포 대비: 탭 href는 `import.meta.env.BASE_URL`을 접두로 붙여 만든다(루트 `/`, 하위경로 `/jecheori/`).
- 순수 로직은 `picks`/`app`, 표시는 `components`, 로드·프리렌더는 `routes`.

---

## File Structure

- `src/picks.ts` — **수정.** `comingMonths` + 도메인 타입 `ComingPick`/`ComingGroup` 추가. `comingSoon`은 Task 7에서 제거.
- `src/view-types.ts` — **수정.** 표시 타입 `ComingItem`/`ComingMonth`/`ComingView` 추가. `AppView.coming`은 Task 7에서 제거.
- `src/app.ts` — **수정.** `buildComingView` 추가. `buildAppView`의 `coming` 조립은 Task 7에서 제거.
- `src/components/Sprig.tsx` — **생성.** `App.tsx`의 로컬 `Sprig`를 꺼내 두 페이지가 공유하는 머리말 스케치.
- `src/components/IndexTab.tsx` — **생성.** 양쪽 페이지 공유 인덱스 탭(`<a>`).
- `src/components/Coming.tsx` — **생성.** 다가오는 제철 전용 페이지.
- `src/routes/coming.tsx` — **생성.** `/coming` 로더+컴포넌트(프리렌더).
- `src/components/App.tsx` — **수정.** `Sprig` 임포트로 교체, 오른쪽 `IndexTab` 추가, 맨 아래 "곧 제철" 한 줄 제거.
- `src/style.css` — **수정.** 인덱스 탭·다가오는 페이지 규칙 + 선택적 `@view-transition`.
- `src/routeTree.gen.ts` — **재생성**(`npm run generate-routes`).
- 테스트: `src/picks.test.ts`·`src/app.test.ts`(순수, 신규) · `src/components/IndexTab.test.tsx`·`Coming.test.tsx`(신규) · `App.test.tsx`(수정).
- `DESIGN.md`·`CONTEXT.md` — **수정.** 결정 기록·새 용어.

각 태스크는 커밋 시점마다 빌드·테스트가 초록이도록 순서를 잡았다(선정→조립→표시 부품→라우트→배선→정리).

---

### Task 1: 순수 선정 `comingMonths`

앞으로 N개월을 훑어 각 달에 새로 드는 품목을 달별로 묶는다. 현재 달 제외, 가장 이른 달에 한 번만, 연말 랩어라운드, 절정 플래그. 이 태스크는 **추가만** 한다(`comingSoon`은 아직 남겨 빌드 초록 유지).

**Files:**
- Modify: `src/picks.ts`
- Test: `src/picks.test.ts` (생성)

**Interfaces:**
- Consumes: `ProduceProfile`(`src/types.ts`) — `id`, `seasonMonths: number[]`, `peakMonths: number[]`.
- Produces:
  - `interface ComingPick { profile: ProduceProfile; peak: boolean }`
  - `interface ComingGroup { month: number; items: ComingPick[] }`
  - `function comingMonths(profiles: ProduceProfile[], month: number, horizon?: number): ComingGroup[]` (기본 `horizon = 2`, `month`·`ComingGroup.month`은 1–12)

- [ ] **Step 1: 실패 테스트 작성**

Create `src/picks.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { comingMonths } from './picks'
import type { ProduceProfile } from './types'

const p = (id: string, seasonMonths: number[], peakMonths: number[] = []): ProduceProfile => ({
  id, name: id, emoji: '·', category: 'fruit',
  kamis: { categoryCode: '0', itemName: id },
  seasonMonths, peakMonths,
  whyNow: { default: '' }, howToPick: '', howToStore: '', howToUse: '',
})

describe('comingMonths', () => {
  test('다음 두 달을 달별로 묶고, 겹치면 먼저 드는 달에만 놓는다', () => {
    const grape = p('grape', [8, 9])
    const chestnut = p('chestnut', [9, 10])
    const g = comingMonths([grape, chestnut], 7)
    expect(g.map((x) => x.month)).toEqual([8, 9])
    expect(g[0].items.map((i) => i.profile.id)).toEqual(['grape'])
    expect(g[1].items.map((i) => i.profile.id)).toEqual(['chestnut']) // grape는 8에 이미 배정
  })

  test('이번 달에 이미 제철인 품목은 제외한다', () => {
    const peach = p('peach', [7, 8]) // 7월이 현재 → 8월에도 안 나온다
    expect(comingMonths([peach], 7)).toEqual([])
  })

  test('연말을 넘어 다음 해로 랩어라운드한다', () => {
    const g = comingMonths([p('mandarin', [1])], 12)
    expect(g.map((x) => x.month)).toEqual([1])
    expect(g[0].items.map((i) => i.profile.id)).toEqual(['mandarin'])
  })

  test('배정된 달에 절정이면 peak=true', () => {
    const g = comingMonths([p('fig', [9], [9])], 8)
    expect(g[0].month).toBe(9)
    expect(g[0].items[0].peak).toBe(true)
  })

  test('새로 드는 품목이 없는 달은 결과에서 뺀다', () => {
    const g = comingMonths([p('chestnut', [9])], 7) // 8월엔 없음, 9월에만
    expect(g.map((x) => x.month)).toEqual([9])
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/picks.test.ts`
Expected: FAIL — `comingMonths` is not exported / not a function.

- [ ] **Step 3: 최소 구현**

`src/picks.ts` 상단 `import` 아래(예: `comingSoon` 정의 근처)에 추가:

```ts
export interface ComingPick {
  profile: ProduceProfile
  peak: boolean
}

export interface ComingGroup {
  month: number
  items: ComingPick[]
}

/** 앞으로 horizon개월, 각 달에 새로 드는 품목을 달별로. 현재 달 제외,
 *  가장 이른 달에 한 번만, 연말 랩어라운드, 배정된 달의 절정 여부 표시. */
export function comingMonths(
  profiles: ProduceProfile[],
  month: number,
  horizon = 2,
): ComingGroup[] {
  const wrap = (m: number) => ((m - 1) % 12) + 1
  const assigned = new Set<string>()
  const groups: ComingGroup[] = []
  for (let k = 1; k <= horizon; k++) {
    const mk = wrap(month + k)
    const items: ComingPick[] = []
    for (const profile of profiles) {
      if (profile.seasonMonths.includes(month)) continue // 이번 달은 "지금"
      if (assigned.has(profile.id)) continue // 먼저 든 달에만
      if (!profile.seasonMonths.includes(mk)) continue
      assigned.add(profile.id)
      items.push({ profile, peak: profile.peakMonths.includes(mk) })
    }
    if (items.length > 0) groups.push({ month: mk, items })
  }
  return groups
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/picks.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/picks.ts src/picks.test.ts
git commit -m "feat: comingMonths — 앞으로 2개월 달별 다가오는 제철 선정(순수)"
```

---

### Task 2: 순수 조립 `buildComingView`

프로필+시계 → 표시용 `ComingView`. 도메인 픽을 이모지+이름+절정 칩으로 투영하고 절기만 곁들인다. 추가만 한다.

**Files:**
- Modify: `src/view-types.ts`, `src/app.ts`
- Test: `src/app.test.ts` (생성)

**Interfaces:**
- Consumes: `comingMonths`(Task 1), `currentTerm`(`src/season.ts`, 이미 `app.ts`가 임포트).
- Produces:
  - `interface ComingItem { emoji: string; name: string; peak: boolean }`
  - `interface ComingMonth { month: number; items: ComingItem[] }`
  - `interface ComingView { months: ComingMonth[]; date: Date; term?: string }`
  - `function buildComingView(profiles: ProduceProfile[], now: Date): ComingView`

- [ ] **Step 1: 실패 테스트 작성**

Create `src/app.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { buildComingView } from './app'
import type { ProduceProfile } from './types'

const p = (id: string, name: string, emoji: string, seasonMonths: number[], peakMonths: number[] = []): ProduceProfile => ({
  id, name, emoji, category: 'fruit',
  kamis: { categoryCode: '0', itemName: id },
  seasonMonths, peakMonths,
  whyNow: { default: '' }, howToPick: '', howToStore: '', howToUse: '',
})

describe('buildComingView', () => {
  test('달별 품목을 이모지+이름+절정으로 투영하고 절기를 곁들인다', () => {
    const grape = p('grape', '포도', '🍇', [8, 9], [8])
    const view = buildComingView([grape], new Date('2026-07-15T00:00:00'))
    expect(view.months).toHaveLength(1)
    expect(view.months[0].month).toBe(8)
    expect(view.months[0].items[0]).toEqual({ emoji: '🍇', name: '포도', peak: true })
    expect(view.term).toBe('소서') // 7/15 → 소서
  })

  test('다가오는 품목이 없으면 months는 빈 배열', () => {
    const peach = p('peach', '복숭아', '🍑', [7], []) // 7월 현재만 → 다가오는 것 없음
    expect(buildComingView([peach], new Date('2026-07-15T00:00:00')).months).toEqual([])
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/app.test.ts`
Expected: FAIL — `buildComingView` is not exported.

- [ ] **Step 3: 최소 구현**

`src/view-types.ts`에 추가(파일 맨 아래):

```ts
export interface ComingItem {
  emoji: string
  name: string
  peak: boolean
}

export interface ComingMonth {
  month: number
  items: ComingItem[]
}

export interface ComingView {
  months: ComingMonth[]
  date: Date
  /** 현재 절기 이름 — 아이브로용 */
  term?: string
}
```

`src/app.ts`에서 import에 `comingMonths` 추가, `view-types` import에 `ComingView` 추가, 파일 맨 아래에 함수 추가:

```ts
// import 줄 수정:
// import { comingSoon, hasDrops, seasonalThisMonth, selectPicks } from './picks'
//   → comingMonths 추가:
import { comingMonths, comingSoon, hasDrops, seasonalThisMonth, selectPicks } from './picks'
// import type { AppView } from './view-types'
//   → ComingView 추가:
import type { AppView, ComingView } from './view-types'
```

```ts
/** 원시 프로필+시계 → 다가오는 제철 뷰. 순수. 가격·영양·레시피 안 씀. */
export function buildComingView(profiles: ProduceProfile[], now: Date): ComingView {
  const month = now.getMonth() + 1
  const months = comingMonths(profiles, month).map((g) => ({
    month: g.month,
    items: g.items.map((it) => ({ emoji: it.profile.emoji, name: it.profile.name, peak: it.peak })),
  }))
  return { months, date: now, term: currentTerm(now) }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/app.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/view-types.ts src/app.ts src/app.test.ts
git commit -m "feat: buildComingView — 프로필+시계 → 다가오는 제철 뷰(순수)"
```

---

### Task 3: 머리말 스케치 `Sprig` 추출

두 페이지가 같은 보태니컬 머리말을 쓰도록 `App.tsx`의 로컬 `Sprig`를 컴포넌트로 꺼낸다. 동작 불변(순수 리팩터).

**Files:**
- Create: `src/components/Sprig.tsx`
- Modify: `src/components/App.tsx`

**Interfaces:**
- Produces: `function Sprig(): JSX.Element` — `className="sprig"`인 SVG 한 점.

- [ ] **Step 1: `Sprig.tsx` 생성**

`src/components/App.tsx`의 `const Sprig = () => (...)` 본문을 그대로 옮긴다. Create `src/components/Sprig.tsx`:

```tsx
/** 머리말 보태니컬 라인아트 한 점 (쪽빛 단색, currentColor). DESIGN.md: 머리말 1점. */
export function Sprig() {
  return (
    <svg className="sprig" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <path d="M20 110 C 45 85, 70 55, 98 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M46 82 C 38 68, 40 58, 52 50 C 56 62, 54 72, 46 82 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M64 60 C 74 46, 86 42, 98 46 C 92 58, 80 64, 64 60 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M34 96 C 26 88, 24 78, 30 70 C 38 76, 40 88, 34 96 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="98" cy="18" r="4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
```

- [ ] **Step 2: `App.tsx`에서 로컬 정의 제거·임포트**

`src/components/App.tsx`에서 `const Sprig = () => ( ... )` 블록(6–14행) 전체를 삭제하고, 상단 import에 추가:

```tsx
import { Sprig } from './Sprig'
```

(본문 `<Sprig />` 사용부는 그대로 둔다.)

- [ ] **Step 3: 기존 테스트가 여전히 통과하는지 확인**

Run: `npx vitest run src/components/App.test.tsx`
Expected: PASS — `.sprig`를 찾는 기존 단언(`App.test.tsx`)이 그대로 통과.

- [ ] **Step 4: 커밋**

```bash
git add src/components/Sprig.tsx src/components/App.tsx
git commit -m "refactor: Sprig를 공유 컴포넌트로 추출 (동작 불변)"
```

---

### Task 4: 인덱스 탭 `IndexTab`

다이어리 옆면 북마크. 평범한 `<a>` 앵커 — `import.meta.env.BASE_URL` 접두로 href를 만들어 하위경로 배포에도 맞는다.

**Files:**
- Create: `src/components/IndexTab.tsx`
- Test: `src/components/IndexTab.test.tsx`

**Interfaces:**
- Produces: `function IndexTab(props: { side: 'left' | 'right'; path: string; label: string; ariaLabel: string }): JSX.Element` — `<a class="index-tab index-tab-{side}" href="{BASE_URL}{path}" aria-label="{ariaLabel}"><span>{label}</span></a>`.

- [ ] **Step 1: 실패 테스트 작성**

Create `src/components/IndexTab.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { IndexTab } from './IndexTab'

describe('IndexTab', () => {
  test('오른쪽 탭은 다가오는 제철로 가는 앵커', () => {
    const { container } = render(
      <IndexTab side="right" path="coming" label="다가오는 제철" ariaLabel="다가오는 제철" />,
    )
    const a = container.querySelector('a')!
    expect(a.className).toContain('index-tab-right')
    expect(a.getAttribute('href')).toContain('coming')
    expect(a.getAttribute('aria-label')).toBe('다가오는 제철')
    expect(a.textContent).toContain('다가오는 제철')
  })

  test('왼쪽 탭은 홈(BASE_URL)으로 가고 coming을 포함하지 않는다', () => {
    const { container } = render(
      <IndexTab side="left" path="" label="지금" ariaLabel="지금 담기 좋은 것" />,
    )
    const a = container.querySelector('a')!
    expect(a.className).toContain('index-tab-left')
    expect(a.getAttribute('href')).toBe(import.meta.env.BASE_URL)
    expect(a.getAttribute('aria-label')).toBe('지금 담기 좋은 것')
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/components/IndexTab.test.tsx`
Expected: FAIL — cannot find module `./IndexTab`.

- [ ] **Step 3: 최소 구현**

Create `src/components/IndexTab.tsx`:

```tsx
/** 다이어리 옆면 인덱스 북마크. 진짜 앵커(무JS 네비게이션).
 *  href는 BASE_URL 접두 — 루트('/')·하위경로('/jecheori/') 모두 맞는다. */
export function IndexTab({
  side,
  path,
  label,
  ariaLabel,
}: {
  side: 'left' | 'right'
  path: string
  label: string
  ariaLabel: string
}) {
  const href = `${import.meta.env.BASE_URL}${path}`
  return (
    <a className={`index-tab index-tab-${side}`} href={href} aria-label={ariaLabel}>
      <span>{label}</span>
    </a>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/components/IndexTab.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/components/IndexTab.tsx src/components/IndexTab.test.tsx
git commit -m "feat: IndexTab — 다이어리 옆면 인덱스 탭(앵커)"
```

---

### Task 5: 다가오는 페이지 `Coming`

전용 페이지 마크업. 머리말(Sprig+아이브로) + 달별 섹션 + 절정 태그 + 왼쪽 "지금" 탭 + 빈 상태.

**Files:**
- Create: `src/components/Coming.tsx`
- Test: `src/components/Coming.test.tsx`

**Interfaces:**
- Consumes: `ComingView`(Task 2), `IndexTab`(Task 4), `Sprig`(Task 3), `weekLabel`(`src/week.ts`).
- Produces: `function Coming(props: { view: ComingView }): JSX.Element`.

- [ ] **Step 1: 실패 테스트 작성**

Create `src/components/Coming.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Coming } from './Coming'
import type { ComingView } from '../view-types'

const base: ComingView = {
  months: [
    { month: 8, items: [{ emoji: '🍑', name: '복숭아', peak: false }] },
    { month: 9, items: [{ emoji: '🌰', name: '밤', peak: true }] },
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
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/components/Coming.test.tsx`
Expected: FAIL — cannot find module `./Coming`.

- [ ] **Step 3: 최소 구현**

Create `src/components/Coming.tsx`:

```tsx
import type { ComingView } from '../view-types'
import { weekLabel } from '../week'
import { IndexTab } from './IndexTab'
import { Sprig } from './Sprig'

/** 다가오는 제철 전용 페이지. 예고는 카드보다 가볍게 — 가격·펼침 없음. 표시 전용. */
export function Coming({ view }: { view: ComingView }) {
  const { months, date, term } = view
  const eyebrow = term ? `${term} · ${weekLabel(date)}` : weekLabel(date)
  return (
    <>
      <IndexTab side="left" path="" label="지금" ariaLabel="지금 담기 좋은 것" />
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
              <ul>
                {m.items.map((it, i) => (
                  <li key={i} className={it.peak ? 'peak' : undefined}>
                    {it.emoji} {it.name}
                    {it.peak && <span className="peak-tag">절정</span>}
                  </li>
                ))}
              </ul>
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

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/components/Coming.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/components/Coming.tsx src/components/Coming.test.tsx
git commit -m "feat: Coming — 다가오는 제철 전용 페이지(달별·절정 예고)"
```

---

### Task 6: 라우트 `/coming` + 라우트 트리 재생성

정적 프리렌더되는 새 경로. `index.tsx` 패턴과 동형이되 스냅샷 인자 없이 `produce.json`만 읽는다.

**Files:**
- Create: `src/routes/coming.tsx`
- Regenerate: `src/routeTree.gen.ts`

**Interfaces:**
- Consumes: `buildComingView`(Task 2), `Coming`(Task 5).

- [ ] **Step 1: 라우트 파일 생성**

Create `src/routes/coming.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import produce from '../../public/data/produce.json'
import { buildComingView } from '../app'
import { Coming } from '../components/Coming'
import type { ProduceProfile } from '../types'

export const Route = createFileRoute('/coming')({
  loader: async () => buildComingView(produce as unknown as ProduceProfile[], new Date()),
  component: ComingPage,
})

function ComingPage() {
  const view = Route.useLoaderData()
  // date는 로더 직렬화 경계를 넘으며 문자열이 될 수 있어 Date로 되살린다.
  return <Coming view={{ ...view, date: new Date(view.date) }} />
}
```

- [ ] **Step 2: 라우트 트리 재생성**

Run: `npm run generate-routes`
Expected: `src/routeTree.gen.ts`에 `/coming` 라우트가 추가됨(파일이 갱신됨).

- [ ] **Step 3: 전체 테스트 통과 확인(회귀 없음)**

Run: `npm test`
Expected: PASS — 기존 + 신규 테스트 전부 초록.

- [ ] **Step 4: 프리렌더가 두 페이지를 굽는지 확인**

Run: `npm run build`
Then: `ls dist/client && ls dist/client/coming 2>/dev/null || true`
Expected: 빌드 성공. `dist/client`에 루트 페이지와 함께 `coming/` (또는 `coming.html`) 산출물이 생긴다(메인에서 아직 링크되진 않았어도 `createFileRoute('/coming')` 등록으로 프리렌더 대상). 산출물이 없으면 Task 7에서 탭 링크가 붙은 뒤 `crawlLinks`가 반드시 발견하므로, 여기선 빌드 성공만 확인하고 넘어가도 된다.

- [ ] **Step 5: 커밋**

```bash
git add src/routes/coming.tsx src/routeTree.gen.ts
git commit -m "feat: /coming 라우트 — 다가오는 제철 정적 프리렌더"
```

---

### Task 7: 메인 배선 + 옛 "곧 제철" 제거

메인에 오른쪽 인덱스 탭을 달고, 맨 아래 "곧 제철" 한 줄과 그 데이터 경로(`AppView.coming`·`buildAppView`의 조립·`comingSoon`)를 걷어낸다.

**Files:**
- Modify: `src/components/App.tsx`, `src/components/App.test.tsx`, `src/view-types.ts`, `src/app.ts`, `src/picks.ts`

**Interfaces:**
- Consumes: `IndexTab`(Task 4).
- Removes: `AppView.coming`, `buildAppView`의 `coming` 필드, `comingSoon`(picks.ts).

- [ ] **Step 1: 테스트 먼저 수정(실패 상태로)**

`src/components/App.test.tsx`를 다음처럼 고친다.

`base` 객체에서 `coming: []`를 삭제:

```tsx
const base: AppView = {
  cards: [toCardView(pick, 7)], noDrop: false, hasNutrition: false, hasRecipes: false,
  seasonal: [{ emoji: '🍑', name: '복숭아' }],
  date: new Date('2026-07-10'), staleDays: 0,
}
```

기존 `test('noDrop·곧 제철', ...)`를 아래로 교체(곧 제철 부분 제거):

```tsx
test('noDrop이면 담백한 안내를 보인다', () => {
  const { container } = render(<App view={{ ...base, noDrop: true }} />)
  expect(container.textContent).toContain('크게 내려온 게 없어요')
})
```

그리고 새 테스트 두 개를 `describe('App', ...)` 안에 추가:

```tsx
test('오른쪽 인덱스 탭으로 다가오는 제철로 간다', () => {
  const { container } = render(<App view={base} />)
  const tab = container.querySelector('.index-tab-right')!
  expect(tab.getAttribute('href')).toContain('coming')
  expect(tab.getAttribute('aria-label')).toBe('다가오는 제철')
})

test('맨 아래 옛 "곧 제철" 한 줄은 없다', () => {
  const { container } = render(<App view={base} />)
  expect(container.querySelector('.coming')).toBeNull()
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/components/App.test.tsx`
Expected: FAIL — `.index-tab-right`가 아직 없고, `AppView`에 `coming`이 아직 필수라 `base` 타입 에러 또는 단언 실패.

- [ ] **Step 3: `App.tsx` 수정**

`src/components/App.tsx`:

1. import에 추가: `import { IndexTab } from './IndexTab'`
2. 구조분해에서 `coming` 제거:

```tsx
const { cards, noDrop, hasNutrition, hasRecipes, seasonal, date, staleDays, term } = view
```

3. 최상단(반환 `<>` 바로 안, `<header>` 앞)에 오른쪽 탭 추가:

```tsx
<IndexTab side="right" path="coming" label="다가오는 제철" ariaLabel="다가오는 제철" />
```

4. 맨 아래 "곧 제철" 블록 전체를 삭제:

```tsx
{/* 삭제:
{coming.length > 0 && (
  <p className="coming">
    <span>곧 제철</span> · {coming.map((c) => `${c.emoji} ${c.name}`).join(' · ')}
  </p>
)} */}
```

- [ ] **Step 4: `view-types.ts`·`app.ts`·`picks.ts`에서 옛 경로 제거**

`src/view-types.ts`: `AppView`에서 `coming: Chip[]` 줄 삭제. (`Chip`이 `seasonal`에서 여전히 쓰이면 인터페이스는 유지. `seasonal: Chip[]`가 남으므로 `Chip`은 그대로 둔다.)

`src/app.ts`:
- import를 `import { comingMonths, hasDrops, seasonalThisMonth, selectPicks } from './picks'`로(→ `comingSoon` 제거).
- `buildAppView` 반환 객체에서 `coming: comingSoon(profiles, month).map(label),` 줄 삭제.
- `label` 헬퍼가 `seasonal`에서 계속 쓰이면 유지(현재 `seasonal: seasonalThisMonth(...).map(label)`에 쓰이므로 유지).

`src/picks.ts`: `comingSoon` 함수 정의(48–52행) 삭제.

- [ ] **Step 5: 전체 테스트 통과 확인**

Run: `npm test`
Expected: PASS — 회귀 없음. (`comingSoon` 제거로 깨지는 임포트가 없어야 한다. 남은 참조가 있으면 컴파일 에러로 드러난다.)

- [ ] **Step 6: 커밋**

```bash
git add src/components/App.tsx src/components/App.test.tsx src/view-types.ts src/app.ts src/picks.ts
git commit -m "feat: 메인에 다가오는 제철 인덱스 탭 배선 + 옛 곧 제철 한 줄 제거"
```

---

### Task 8: 스타일 + 선택적 View Transitions + 브라우저 검증

인덱스 탭과 다가오는 페이지의 시각을 DESIGN.md 토큰으로 입힌다. 스타일은 자동 테스트 대상이 아니므로 **브라우저 실측**으로 게이트한다(user 규칙: 디자인/UI는 브라우저 확인). 값은 기존 `style.css`의 토큰·관례를 따르고, 확정 전에 사용자에게 확인받는다.

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: 인덱스 탭 스타일 추가**

`src/style.css`에 추가(기존 색 토큰 `--ink`/`--tint`/`--line`/`--lift` 재사용, 세로쓰기·바깥 모서리만 둥근 종이 결·hover/focus 미세 들림·모션 축소 가드·터치 타깃 ≥44px):

```css
/* 다이어리 옆면 인덱스 탭 — 진짜 앵커, 종이 북마크 */
.index-tab {
  position: fixed;
  top: 42%;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.75rem; /* ~44px 터치 타깃 */
  padding: 0.9rem 0.4rem;
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 0.06em;
  color: var(--ink);
  background: var(--tint);
  border: 1px solid var(--line);
  text-decoration: none;
  box-shadow: var(--lift); /* 메모 부양 1단 예외 */
  transition: transform 160ms ease;
}
.index-tab-right {
  right: 0;
  border-radius: 0.3rem 0 0 0.3rem; /* 바깥(왼쪽)만 둥글게 */
  border-right: none;
}
.index-tab-left {
  left: 0;
  border-radius: 0 0.3rem 0.3rem 0; /* 바깥(오른쪽)만 둥글게 */
  border-left: none;
}
.index-tab-right:hover,
.index-tab-right:focus-visible {
  transform: translateX(-3px); /* 손끝에 걸리듯 들림 */
}
.index-tab-left:hover,
.index-tab-left:focus-visible {
  transform: translateX(3px);
}
@media (prefers-reduced-motion: reduce) {
  .index-tab {
    transition: none;
  }
  .index-tab:hover,
  .index-tab:focus-visible {
    transform: none;
  }
}
```

(`:focus-visible` 쪽빛 아웃라인은 기존 전역 규칙이 앵커에도 적용되는지 확인하고, 없으면 `.index-tab:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }` 추가.)

- [ ] **Step 2: 다가오는 페이지 스타일 추가**

```css
/* 다가오는 제철 — 달별 섹션 + 절정 태그 */
.coming-month {
  margin-top: 1.5rem;
}
.coming-month h2 {
  font-size: 1rem;
  letter-spacing: 0.04em;
}
.coming-month ul {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0;
}
.coming-month li {
  padding: 0.35rem 0;
  border-bottom: 1px solid var(--line);
}
.coming-month li.peak {
  font-weight: 600;
}
.peak-tag {
  margin-left: 0.4rem;
  padding: 0.05rem 0.4rem;
  font-size: 0.75rem;
  color: var(--ink);
  background: var(--tint); /* 웜 컬러는 배경으로만, 글자는 쪽빛 */
  border-radius: 0.2rem;
}
```

- [ ] **Step 3: (선택) 크로스도큐먼트 View Transitions**

지원 브라우저에서 "/" ↔ "/coming"을 부드럽게. 미지원·모션 축소는 자동으로 일반 이동. 원치 않으면 이 스텝은 건너뛴다.

```css
/* 선택적 향상 — MPA View Transitions (지원 브라우저에서만). */
@view-transition {
  navigation: auto;
}
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

- [ ] **Step 4: 브라우저 실측**

Run: `npm run dev` (백그라운드) 후 브라우저로 확인:
- 메인 오른쪽에 "다가오는 제철" 탭이 세로로 보이고, hover 시 살짝 들린다.
- 탭 클릭 → `/coming`으로 이동, 달별 섹션("8월"/"9월"…)과 절정 태그가 보인다.
- `/coming` 왼쪽 "지금" 탭 클릭 → 메인으로 복귀.
- 글자는 전부 쪽빛, 웜 컬러는 탭 배경·절정 태그 배경에만.
- (설정 시) 모션 축소 환경에서 탭 들림·페이지 전환 애니메이션이 꺼진다.

Expected: 위가 모두 맞고, 콘솔 에러 없음. **사용자에게 스크린샷/확인을 요청하고, 색·간격·모션 조정 의견을 받아 반영한 뒤 확정.**

- [ ] **Step 5: 커밋**

```bash
git add src/style.css
git commit -m "style: 인덱스 탭·다가오는 페이지 스타일 + 선택적 View Transitions"
```

---

### Task 9: 문서 갱신 (DESIGN.md · CONTEXT.md)

**Files:**
- Modify: `DESIGN.md`, `CONTEXT.md`

- [ ] **Step 1: `CONTEXT.md`에 새 용어 추가**

"도메인"·"아키텍처 심" 절에 각각 한 줄씩:

- 도메인(picks): **다가오는 픽 (ComingPick/ComingGroup)** — 앞으로 N개월 각 달에 새로 드는 프로필 + 그 달 절정 여부. 현재 달 제외·가장 이른 달에 한 번만·연말 랩어라운드. `comingMonths`. `src/picks.ts`.
- 심(app/view): **ComingView (`src/view-types.ts`) · buildComingView (`src/app.ts`)** — `/coming` 페이지 표시 데이터: 달별 그룹(`ComingMonth[]`)·절기. 프로필+시계만 쓰고 가격·영양·레시피는 안 쓴다.
- 심(components): **IndexTab (`src/components/IndexTab.tsx`)** — 두 페이지 공유 옆면 인덱스 탭(앵커). 오른쪽=다가오는(미래)/왼쪽=지금. href는 `BASE_URL` 접두.
- 레이어 요약에 `/coming` 경로가 `index`와 나란히 `buildComingView`를 프리렌더한다는 점 한 줄 보강.

- [ ] **Step 2: `DESIGN.md` 결정 기록 추가**

"결정 기록" 절 맨 아래에:

```
- "다가오는 제철"을 별도 경로(`/coming`)로 분리하고, 다이어리 옆면 **인덱스 탭**으로
  넘나들게 했다 (2026-07-12). 냉장고 메모·마스킹테이프·압정 낱장으로 이어진 문구류
  은유의 다음 형제. 오른쪽=미래(다가오는)/왼쪽=지금 — 두 페이지의 탭이 마주 본다.
  예고는 카드보다 가볍게(가격·펼침 없음), "곧 나온다"가 아니라 "곧 절정"을 싣는다.
  탭은 진짜 앵커(무JS), View Transitions는 CSS 크로스도큐먼트로 지원 브라우저에서만.
  메인 맨 아래 옛 "곧 제철" 한 줄은 이 탭+페이지로 대체·제거.
  스펙: `docs/superpowers/specs/2026-07-12-coming-seasonal-index-tab-design.md`
```

- [ ] **Step 3: 커밋**

```bash
git add DESIGN.md CONTEXT.md
git commit -m "docs: 다가오는 제철·인덱스 탭 — 용어·결정 기록"
```

---

## Self-Review

**Spec coverage:**
- `comingMonths`(2개월·달별·현재 달 제외·먼저 든 달에만·랩어라운드·절정 플래그·빈 달 생략) → Task 1. ✓
- `ComingView`/`buildComingView`(프로필+시계만, 가격·영양·레시피 없음) → Task 2. ✓
- 인덱스 탭(오른쪽=미래/왼쪽=지금, 마주 봄, 미세 모션, ≥44px, focus-visible, aria-label, BASE_URL) → Task 4·8. ✓
- 다가오는 페이지(머리말·달 헤더·절정 태그·빈 상태·출처 각주 없음) → Task 5. ✓
- `/coming` 정적 프리렌더 → Task 6. ✓
- View Transitions 선택적·reduced-motion 가드 → Task 8 Step 3. ✓
- 옛 "곧 제철" 한 줄·`coming`·`comingSoon` 제거, "N월의 제철" 유지 → Task 7. ✓
- 문구·색 규율(쪽빛 글자·웜 배경, 담백 톤) → Task 5·8 및 각 문구 리터럴. ✓
- 문서(CONTEXT·DESIGN) → Task 9. ✓
- 머리말 스케치 두 페이지 공유(시각 정체성) → Task 3(Sprig 추출). ✓ (스펙 명시는 아니나 DESIGN.md "머리말 1점" 준수를 위해 포함.)

**Placeholder scan:** "적절히 처리"류 문구 없음. 모든 코드 스텝에 실제 코드 블록·정확 경로·실행 명령·기대 출력 포함. ✓

**Type consistency:** `comingMonths → ComingGroup{month, items: ComingPick{profile, peak}}`(Task 1)를 `buildComingView`가 소비해 `ComingMonth{month, items: ComingItem{emoji,name,peak}}`(Task 2)로 투영, `Coming`이 `ComingView`(Task 2)를 그대로 소비(Task 5). `IndexTab` props(`side/path/label/ariaLabel`)가 Task 4 정의 ↔ Task 5·7 사용에서 동일. `.index-tab-right`/`.index-tab-left`/`.peak-tag`/`.coming-month` 클래스명이 테스트(Task 4·5·7)와 스타일(Task 8)에서 일치. ✓
