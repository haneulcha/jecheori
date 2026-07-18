# 제철 월 띠 (Season Strip) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 펼친 품목 카드 상세 안에 "이 품목이 몇 월에 제철인가"를 12칸 달력 띠(원장 프레임 + 색 채우기·명도 차이)로 보인다.

**Architecture:** 순수 파생 `toSeasonStrip`을 `src/card.ts`에 두고(기존 `src/season.ts`의 `seasonLabel()` 재사용) `CardView.season`으로 실어 나른다. 표시는 새 `src/components/SeasonStrip.tsx`가 `AppView`/`CardView` 경계 안에서만 한다(비즈니스 로직 없음). `ProduceCard`의 `.open`에 스파크라인 다음·영양 앞으로 끼운다.

**Tech Stack:** TanStack Start (React 19), Vite, Vitest + Testing Library(jsdom), 순수 CSS 변수(Tailwind 아님).

## Global Constraints

- node ≥ 22.
- **완료 게이트 = `npm test` **와** `npx tsc --noEmit` 둘 다 통과.** (Vitest는 타입체크 안 함.)
- 사용자 문구는 한국어·담백, 이커머스 화법 금지. 감탄사·느낌표 금지, 서술로 끝낸다(DESIGN.md).
- 색 규율: 웜 컬러(`--tint`/`--accent`)는 **배경만**, 글자·마커는 항상 쪽빛(`--ink`). **그라데이션 금지**(채움은 균일 단색).
- 새 색 토큰 만들지 않는다 — 기존 `--tint`/`--accent`/`--ink`/`--line`/`--axis`/`--muted`만. 폰트 토큰 `--font-mono` 하나만 신규.
- 순수 로직 테스트는 `tests/`에서 `'../src/…'` 임포트, 컴포넌트 테스트는 `src/components/*.test.tsx` + 상단 `// @vitest-environment jsdom`.
- 테스트 픽스처도 유효 타입값. `src/routeTree.gen.ts`는 커밋 대상 아님(gitignore).
- 스펙: `docs/superpowers/specs/2026-07-18-season-strip-on-card-design.md`.

---

## File Structure

- `src/card.ts` (수정) — `SeasonMonthCell`·`SeasonStripView` 타입, `toSeasonStrip` 순수 함수, `CardView.season` 필드, `toCardView` 배선. `src/season.ts`의 `seasonLabel` import.
- `tests/season-strip.test.ts` (신규) — `toSeasonStrip` 순수 테스트.
- `tests/card.test.ts` (수정) — `toCardView`가 `season`을 얹는지 1개 단언 추가.
- `src/components/SeasonStrip.tsx` (신규) — `SeasonStripView` → JSX(캡션+원장 12칸+모노 숫자줄).
- `src/components/SeasonStrip.test.tsx` (신규) — 클래스·aria·캡션 렌더 테스트.
- `src/components/ProduceCard.tsx` (수정) — `.open`에 `<SeasonStrip>` 삽입.
- `src/components/ProduceCard.test.tsx` (수정) — `base`/`withRecipes` 픽스처에 `season` 추가 + 렌더 단언.
- `src/components/App.test.tsx` (수정) — `makeCard` 픽스처에 `season` 추가(tsc).
- `tests/cardlist.test.ts` (수정) — `card()` 픽스처에 `season` 추가(tsc).
- `src/style.css` (수정) — `--font-mono` 토큰 + `.season-*` 클래스.

---

## Task 1: `toSeasonStrip` 순수 파생 + 뷰 타입

**Files:**
- Modify: `src/card.ts` (import 추가 + 타입 2개 + 함수 1개)
- Test: `tests/season-strip.test.ts` (신규)

**Interfaces:**
- Consumes: `ProduceProfile`(`src/types.ts` — `seasonMonths: number[]`, `peakMonths: number[]`), `seasonLabel(months: number[]): string`(`src/season.ts`).
- Produces:
  - `interface SeasonMonthCell { month: number; inSeason: boolean; isPeak: boolean; isCurrent: boolean }`
  - `interface SeasonStripView { months: SeasonMonthCell[]; seasonLabel: string; peakLabel: string; currentMonth: number }`
  - `function toSeasonStrip(profile: ProduceProfile, month: number): SeasonStripView`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `tests/season-strip.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { toSeasonStrip } from '../src/card'
import type { ProduceProfile } from '../src/types'

function profile(over: Partial<ProduceProfile> = {}): ProduceProfile {
  return {
    id: 'x', name: '수박', emoji: '🍉', category: 'fruit',
    seasonMonths: [6, 7, 8], peakMonths: [7], whyNow: {},
    howToPick: '', howToStore: '', howToUse: '',
    ...over,
  }
}

describe('toSeasonStrip', () => {
  test('12개월을 1→12 순서로 만든다', () => {
    const s = toSeasonStrip(profile(), 7)
    expect(s.months).toHaveLength(12)
    expect(s.months.map((c) => c.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  test('여름 품목·이번 달 7월: 7월 칸은 제철·절정·이번 달', () => {
    const s = toSeasonStrip(profile(), 7)
    expect(s.months[6]).toEqual({ month: 7, inSeason: true, isPeak: true, isCurrent: true })
    expect(s.months[8]).toEqual({ month: 9, inSeason: false, isPeak: false, isCurrent: false })
    expect(s.currentMonth).toBe(7)
    expect(s.seasonLabel).toBe('6~8월')
    expect(s.peakLabel).toBe('7월')
  })

  test('랩어라운드(12→4월) 라벨·제철 판정', () => {
    const s = toSeasonStrip(profile({ seasonMonths: [12, 1, 2, 3, 4], peakMonths: [1, 2, 3] }), 7)
    expect(s.seasonLabel).toBe('12~4월')
    expect(s.peakLabel).toBe('1~3월')
    expect(s.months[11].inSeason).toBe(true) // 12월
    expect(s.months[0].inSeason).toBe(true) // 1월
    expect(s.months[5].inSeason).toBe(false) // 6월
  })

  test('이번 달이 제철 밖이어도 isCurrent만 붙는다', () => {
    const s = toSeasonStrip(profile({ seasonMonths: [6, 7, 8], peakMonths: [7] }), 1)
    expect(s.months[0]).toEqual({ month: 1, inSeason: false, isPeak: false, isCurrent: true })
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run tests/season-strip.test.ts`
Expected: FAIL — `toSeasonStrip` is not exported / not a function.

- [ ] **Step 3: 최소 구현**

`src/card.ts` 상단 import 블록에 한 줄 추가 (기존 `import type … from './recipe'` 아래):

```ts
import { seasonLabel } from './season'
```

`src/card.ts`에 타입·함수 추가 (기존 `whyNowLine` 함수 근처, `toCardView` 위):

```ts
export interface SeasonMonthCell {
  month: number
  inSeason: boolean
  isPeak: boolean
  isCurrent: boolean
}

/** 카드 펼침의 12칸 제철 달력 띠. months는 1→12 고정 순서.
 *  seasonLabel/peakLabel은 season.ts의 seasonLabel() 재사용(랩어라운드 병합·aria용). */
export interface SeasonStripView {
  months: SeasonMonthCell[]
  seasonLabel: string
  peakLabel: string
  currentMonth: number
}

/** 프로필 + 이번 달 → 12칸 띠 파생. 순수. 색·픽셀은 컴포넌트 소관(여기선 사실만). */
export function toSeasonStrip(profile: ProduceProfile, month: number): SeasonStripView {
  const season = new Set(profile.seasonMonths)
  const peak = new Set(profile.peakMonths)
  const months: SeasonMonthCell[] = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    return { month: m, inSeason: season.has(m), isPeak: peak.has(m), isCurrent: m === month }
  })
  return {
    months,
    seasonLabel: seasonLabel(profile.seasonMonths),
    peakLabel: seasonLabel(profile.peakMonths),
    currentMonth: month,
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/season-strip.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (아직 `CardView`는 안 바꿨으므로 픽스처 안 깨짐).

- [ ] **Step 6: 커밋**

```bash
git add src/card.ts tests/season-strip.test.ts
git commit -m "feat(card): toSeasonStrip 순수 파생 + SeasonStripView 타입"
```

---

## Task 2: `CardView.season` 배선 + 픽스처 갱신

**Files:**
- Modify: `src/card.ts` (`CardView`에 필드 + `toCardView` 본문)
- Modify: `tests/card.test.ts` (단언 1개 추가)
- Modify: `src/components/ProduceCard.test.tsx`, `src/components/App.test.tsx`, `tests/cardlist.test.ts` (픽스처에 `season` 추가 — tsc)

**Interfaces:**
- Consumes: `toSeasonStrip`·`SeasonStripView`(Task 1).
- Produces: `CardView.season: SeasonStripView` (nullable 아님 — 모든 프로필에 `seasonMonths`가 있음). `SeasonStrip` 컴포넌트(Task 3)가 이 필드를 소비.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/card.test.ts`의 `describe('toCardView', …)` 블록 안에 추가 (기존 `test('nutrition 인자를 CardView에 얹는다', …)` 근처):

```ts
  test('season 스트립을 CardView에 얹는다', () => {
    const c = toCardView(pick(), 7)
    expect(c.season.currentMonth).toBe(7)
    expect(c.season.months).toHaveLength(12)
    expect(c.season.months[6]).toEqual({ month: 7, inSeason: true, isPeak: true, isCurrent: true })
    expect(c.season.seasonLabel).toBe('7~8월')
  })
```

(card.test.ts의 `profile`은 `seasonMonths:[7,8]`·`peakMonths:[7]` — 7월 칸은 제철·절정·이번 달.)

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run tests/card.test.ts -t "season 스트립"`
Expected: FAIL — `c.season` is undefined.

- [ ] **Step 3: `CardView`에 필드 + `toCardView` 배선**

`src/card.ts`의 `CardView` 인터페이스에 필드 추가 (기존 `recipes: RecipeView | null` 아래):

```ts
  season: SeasonStripView
```

`src/card.ts`의 `toCardView` 반환 객체에 배선 (기존 `recipes,` 아래, `profile`·`month`는 이미 스코프에 있음):

```ts
    season: toSeasonStrip(profile, month),
```

- [ ] **Step 4: tsc가 픽스처에서 깨지는지 확인**

Run: `npx tsc --noEmit`
Expected: FAIL — `ProduceCard.test.tsx`·`App.test.tsx`·`cardlist.test.ts`의 `CardView` 리터럴에 `season` 누락.

- [ ] **Step 5: 픽스처에 `season` 추가**

`src/components/ProduceCard.test.tsx`의 `import` 블록 아래에 상수 추가하고 `base`에 실는다:

```ts
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
```

(`withRecipes`는 `...base`라 자동 상속 — 손대지 않는다.)

`src/components/App.test.tsx`의 `makeCard` 반환 리터럴에 추가. 먼저 import 줄을 확장:

```ts
import type { CardView, SeasonStripView } from '../card'
```

`makeCard` 위에 상수, 반환에 실는다:

```ts
const emptyStrip: SeasonStripView = {
  months: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1, inSeason: false, isPeak: false, isCurrent: false,
  })),
  seasonLabel: '', peakLabel: '', currentMonth: 7,
}

function makeCard(overrides: Partial<CardView> = {}): CardView {
  return {
    emoji: '🥕', name: '당근', kind: '', category: 'fruit', inPeak: true,
    whyNow: '', note: { pick: '', store: '', use: '' },
    price: null, nutrition: null, recipes: null, season: emptyStrip,
    ...overrides,
  }
}
```

`tests/cardlist.test.ts`의 `card()` 리터럴에 추가. import 확장:

```ts
import type { CardView, SeasonStripView } from '../src/card'
```

`card()` 위에 상수, 반환에 실는다:

```ts
const emptyStrip: SeasonStripView = {
  months: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1, inSeason: false, isPeak: false, isCurrent: false,
  })),
  seasonLabel: '', peakLabel: '', currentMonth: 7,
}

function card(over: Partial<CardView>): CardView {
  return {
    emoji: '🥬', name: '품목', kind: '', category: 'vegetable', inPeak: false,
    whyNow: '', note: { pick: 'p', store: 's', use: 'u' },
    price: null, nutrition: null, recipes: null, season: emptyStrip, ...over,
  }
}
```

- [ ] **Step 6: 게이트 (테스트 + 타입체크)**

Run: `npm test`
Expected: PASS (전체 그린, 새 `season 스트립` 테스트 포함).

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 7: 커밋**

```bash
git add src/card.ts tests/card.test.ts src/components/ProduceCard.test.tsx src/components/App.test.tsx tests/cardlist.test.ts
git commit -m "feat(card): CardView.season 배선 + 픽스처 갱신"
```

---

## Task 3: `SeasonStrip` 컴포넌트 + CSS

**Files:**
- Create: `src/components/SeasonStrip.tsx`
- Test: `src/components/SeasonStrip.test.tsx` (신규)
- Modify: `src/style.css` (`--font-mono` 토큰 + `.season-*` 클래스)

**Interfaces:**
- Consumes: `SeasonStripView`(Task 1).
- Produces: `function SeasonStrip({ strip }: { strip: SeasonStripView }): JSX` — 루트 `div.season-strip`, `role="img"` 그래픽 `.season-cells`.

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/components/SeasonStrip.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { SeasonStrip } from './SeasonStrip'
import type { SeasonStripView } from '../card'

function strip(over: Partial<SeasonStripView> = {}): SeasonStripView {
  return {
    months: Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      return { month: m, inSeason: m >= 6 && m <= 8, isPeak: m === 7, isCurrent: m === 7 }
    }),
    seasonLabel: '6~8월', peakLabel: '7월', currentMonth: 7,
    ...over,
  }
}

describe('SeasonStrip', () => {
  test('12칸을 그린다', () => {
    const { container } = render(<SeasonStrip strip={strip()} />)
    expect(container.querySelectorAll('.season-cell')).toHaveLength(12)
  })

  test('제철·절정·이번 달 칸에 클래스가 붙는다', () => {
    const { container } = render(<SeasonStrip strip={strip()} />)
    const cells = container.querySelectorAll('.season-cell')
    expect(cells[6].classList.contains('is-season')).toBe(true) // 7월
    expect(cells[6].classList.contains('is-peak')).toBe(true)
    expect(cells[6].classList.contains('is-current')).toBe(true)
    expect(cells[8].classList.contains('is-season')).toBe(false) // 9월
  })

  test('그래픽에 문장형 aria-label을 싣는다', () => {
    const { container } = render(<SeasonStrip strip={strip()} />)
    const img = container.querySelector('.season-cells')!
    expect(img.getAttribute('role')).toBe('img')
    expect(img.getAttribute('aria-label')).toBe('제철 6~8월, 절정 7월, 이번 달 7월')
  })

  test('캡션에 이번 달을 적는다', () => {
    const { container } = render(<SeasonStrip strip={strip()} />)
    expect(container.querySelector('.season-cap')!.textContent).toBe('제철 달력 · 이번 달 7월')
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/components/SeasonStrip.test.tsx`
Expected: FAIL — `./SeasonStrip` 모듈 없음.

- [ ] **Step 3: 컴포넌트 구현**

Create `src/components/SeasonStrip.tsx`:

```tsx
import type { SeasonStripView } from '../card'

/** 카드 펼침의 12칸 제철 달력 띠. 원장 프레임에 색을 채우고(제철=옅음, 절정=진함),
 *  이번 달은 ▼로 가리킨다. 표시만 — 파생은 card.ts의 toSeasonStrip. */
export function SeasonStrip({ strip }: { strip: SeasonStripView }) {
  const { months, seasonLabel, peakLabel, currentMonth } = strip
  return (
    <div className="season-strip">
      <p className="season-cap">제철 달력 · 이번 달 {currentMonth}월</p>
      <div
        className="season-cells"
        role="img"
        aria-label={`제철 ${seasonLabel}, 절정 ${peakLabel}, 이번 달 ${currentMonth}월`}
      >
        {months.map((c) => (
          <span
            key={c.month}
            className={
              'season-cell' +
              (c.inSeason ? ' is-season' : '') +
              (c.isPeak ? ' is-peak' : '') +
              (c.isCurrent ? ' is-current' : '')
            }
          />
        ))}
      </div>
      <div className="season-nums" aria-hidden="true">
        {months.map((c) => (
          <span
            key={c.month}
            className={
              'season-num' +
              (c.isCurrent ? ' is-current' : c.inSeason ? ' is-season' : '')
            }
          >
            {c.month}
          </span>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/components/SeasonStrip.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: CSS 토큰 + 클래스 추가**

`src/style.css`의 `:root`에 폰트 토큰 한 줄 추가 (기존 `--font-body: …` 줄 아래):

```css
  --font-mono: 'SF Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace;
```

`src/style.css` 끝(파일 맨 아래)에 `.season-*` 블록 추가:

```css
/* 제철 월 띠 — 원장 프레임 + 색 채우기(명도 차이). 색은 카드 상속 계절색.
   웜색은 배경만, 잉크는 프레임·▼·숫자에만 (색 규율). */
.season-strip { margin-top: var(--space-sm); }
.season-cap {
  margin: 0 0 var(--space-2xs);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}
.season-cells { display: flex; border: 1px solid var(--ink); }
.season-cell {
  position: relative;
  flex: 1;
  height: 0.8rem;
  border-right: 1px solid var(--ink);
}
.season-cell:last-child { border-right: 0; }
.season-cell.is-season { background: var(--tint); }
.season-cell.is-peak { background: var(--accent); }
.season-cell.is-current::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 100%;
  transform: translateX(-50%);
  border-left: 0.25rem solid transparent;
  border-right: 0.25rem solid transparent;
  border-top: 0.3rem solid var(--ink);
}
.season-nums { display: flex; margin-top: var(--space-3xs); }
.season-num {
  flex: 1;
  text-align: center;
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--axis);
}
.season-num.is-season { color: var(--muted); }
.season-num.is-current { color: var(--ink); font-weight: 700; }
```

- [ ] **Step 6: 게이트 (테스트 + 타입체크)**

Run: `npm test`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 7: 커밋**

```bash
git add src/components/SeasonStrip.tsx src/components/SeasonStrip.test.tsx src/style.css
git commit -m "feat(components): SeasonStrip 컴포넌트 + 원장 프레임 CSS"
```

---

## Task 4: `ProduceCard`에 배치 + 브라우저 실측

**Files:**
- Modify: `src/components/ProduceCard.tsx` (import + `.open`에 삽입)
- Modify: `src/components/ProduceCard.test.tsx` (렌더 단언 1개)

**Interfaces:**
- Consumes: `SeasonStrip`(Task 3), `CardView.season`(Task 2).
- Produces: (없음 — 최종 통합 지점.)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/ProduceCard.test.tsx`에 `describe` 블록 추가 (파일 하단, 기존 describe들 밖):

```tsx
describe('ProduceCard 제철 띠', () => {
  test('펼치면 season 띠를 보인다', () => {
    const { container } = render(<ProduceCard card={base} />)
    expect(container.querySelectorAll('.season-cell')).toHaveLength(12)
    expect(container.querySelector('.season-cap')!.textContent).toBe('제철 달력 · 이번 달 7월')
  })
})
```

(`base`의 `season`은 Task 2에서 `emptyStrip`(currentMonth 7)으로 설정됨 — 12칸·캡션만 확인.)

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/components/ProduceCard.test.tsx -t "제철 띠"`
Expected: FAIL — `.season-cell` 0개.

- [ ] **Step 3: `ProduceCard`에 삽입**

`src/components/ProduceCard.tsx` import 블록에 추가 (기존 `import { PeakDot } …` 아래):

```tsx
import { SeasonStrip } from './SeasonStrip'
```

`.open` div 안, 스파크라인 다음·`NutritionLine` 앞에 삽입:

```tsx
      <div className="open">
        {card.price?.spark && <Sparkline spark={card.price.spark} />}
        <SeasonStrip strip={card.season} />
        {card.nutrition && <NutritionLine nutrition={card.nutrition} />}
        <Note note={card.note} />
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/components/ProduceCard.test.tsx`
Expected: PASS (기존 + 새 테스트).

- [ ] **Step 5: 게이트 (전체 테스트 + 타입체크)**

Run: `npm test`
Expected: PASS (전체).

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 6: 브라우저 실측 (UI 변경 필수 게이트)**

Storybook으로 제철 띠 상태를 실측 (story-utils가 `toCardView`로 `season`을 자동 채움 — 스토리 코드 변경 불필요):

Run: `npm run storybook`
확인 (ProduceCard 스토리, 카드 펼침):
- 12칸 원장 프레임(잉크 테두리·칸선)이 뜨고, 제철 칸=옅은 계절색·절정 칸=진한 계절색으로 **명도 차이**가 보인다.
- 이번 달 칸 위에 ▼(잉크)가 그 칸을 가리키고, 아래 모노 숫자에서 이번 달이 볼드 잉크다.
- ▼가 캡션 글자와 겹치지 않는다(캡션 `margin-bottom`이 자리를 준다). 겹치면 `.season-cap` margin 또는 `.season-strip` margin-top을 한 단계 키운다.

개발 서버로도 실제 데이터에서 확인:

Run: `npm run dev` → 브라우저에서 아무 카드나 펼쳐 위 3가지를 확인. 여름 품목(수박·복숭아)은 이번 달(7월)이 절정 안, 랩어라운드 품목은 `/coming`/검색엔 안 걸리지만 데이터가 맞으면 띠가 12→다음해로 이어져 보인다.

사용자향 시각 변경이므로 스크린샷으로 사인오프.

- [ ] **Step 7: 커밋**

```bash
git add src/components/ProduceCard.tsx src/components/ProduceCard.test.tsx
git commit -m "feat(components): ProduceCard 펼침에 제철 띠 배치"
```

---

## 문서 갱신 (마지막)

- [ ] `DESIGN.md`의 "결정 기록"에 한 줄 추가: 제철 띠(원장 프레임 + 색 채우기·명도 차이, 모노 숫자·▼ 이번 달) 채택, 색 규율 준수·현재 계절색 상속. 시안 반복 경로는 스펙 참조.
- [ ] `docs/제품-동작-지도.md`의 "카드가 무엇을 보이나"에 제철 띠 한 줄 추가(펼침 상세, 스파크라인 다음).
- [ ] 커밋: `git commit -m "docs: 제철 띠 결정 기록·제품 동작 지도 갱신"`

---

## Self-Review (작성자 점검 결과)

- **스펙 커버리지**: 파생(toSeasonStrip)=T1, CardView 배선=T2, 컴포넌트+CSS(원장·색·▼·모노·납작 0.8rem·캡션·aria)=T3, 배치(스파크라인 다음·영양 앞)+브라우저 실측=T4, 스코프 밖(ComingCard·SeasonHint·정적 띠)=건드리지 않음(문서로 확인). 문서 갱신 항목 포함. 누락 없음.
- **플레이스홀더**: 없음 — 모든 코드 단계에 실제 코드/명령/기대출력.
- **타입 일관성**: `SeasonStripView`/`SeasonMonthCell` 필드명(`months`·`inSeason`·`isPeak`·`isCurrent`·`seasonLabel`·`peakLabel`·`currentMonth`), 클래스명(`.season-strip`·`.season-cap`·`.season-cells`·`.season-cell`·`.is-season`·`.is-peak`·`.is-current`·`.season-nums`·`.season-num`)이 T1→T3→T4에서 일치. `toSeasonStrip(profile, month)` 시그니처가 T2 호출과 일치.
