# 제철 전체 목록 · 검색 · 필터 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/` 페이지의 top-5 컷을 걷고 이번 달 제철 전체를 검색·필터·정렬 가능한 목록으로 보여준다.

**Architecture:** 순수 로직은 `picks.ts`(선정)·`season.ts`(라벨)·신규 `cardlist.ts`(목록 필터/정렬/검색, `CardView[]` 대상)에, 뷰 조립은 `app.ts`(전체 카드 + 비제철 검색 인덱스)에, 상호작용은 `App.tsx`의 클라이언트 상태에 둔다. 프리렌더가 기본 정렬(하락 큰 순) 목록을 그려 무JS 폴백을 보장하고, 검색·필터·정렬 컨트롤은 하이드레이션 후 마운트되는 점진 향상이다.

**Tech Stack:** TanStack Start (React 19) · Vite · Vitest + RTL · 순수 CSS 변수(Tailwind 아님).

## Global Constraints

- node ≥ 22.
- 완료 게이트 = `npm test` **와** `npx tsc --noEmit` **둘 다** 통과.
- 사용자 문구는 한국어·담백, 이커머스 화법·느낌표 금지 (DESIGN.md 문구 규율).
- 색 규율: 텍스트·링크는 쪽빛(`--ink`)만, 계절 웜 컬러는 배경·칩에만 (DESIGN.md).
- 공개 페이지: 런타임 외부요청 없음·무추적. 모든 상호작용은 클라이언트 로컬.
- 순수 로직은 `picks/card/app/season/cardlist`에, 표시는 `components`에. 컴포넌트는 사용자 텍스트를 직접 이스케이프하지 않는다(React 자동).
- 테스트 픽스처도 유효한 타입값 (`KamisRef.categoryCode`는 `'100'|'200'|'400'`).
- 순수 테스트는 `tests/`에 `'../src/…'` 임포트. 컴포넌트 테스트는 `src/components/*.test.tsx` + `// @vitest-environment jsdom`, `<Link>` 필요 시 `src/test-utils.tsx`의 `renderWithRouter`.
- UI/CSS 변경은 `npm run dev`로 브라우저 실측 + 스크린샷 사인오프.

---

## File Structure

| 파일 | 책임 | 변경 |
|---|---|---|
| `src/picks.ts` | 선정 (순수) — `selectPicks` 전체 반환 | 수정 |
| `src/season.ts` | 계절·라벨 (순수) — `seasonLabel` 추가 | 수정 |
| `src/cardlist.ts` | 목록 필터/정렬/검색 (순수, `CardView[]`) | **신규** |
| `src/view-types.ts` | 뷰 타입 — `Filter`/`SortMode`/`OffSeasonHint`, `AppView.searchIndex` | 수정 |
| `src/app.ts` | `buildAppView` — 전체 카드 + 검색 인덱스 + 기본 정렬 | 수정 |
| `src/components/App.tsx` | 클라이언트 상태 + 컨트롤 + 목록 | 수정 |
| `src/components/FilterBar.tsx` | 필터 칩 | **신규** |
| `src/components/SortControl.tsx` | 정렬 셀렉트 | **신규** |
| `src/components/SearchBar.tsx` | 검색 입력 | **신규** |
| `src/components/SeasonHint.tsx` | 비제철 힌트 행 | **신규** |
| `src/style.css` | 테이프 축소 + 컨트롤 스타일 | 수정 |
| `src/components/App.stories.tsx` | 새 상태 스토리 | 수정 |
| `docs/제품-동작-지도.md` | 지렛대 지도·검색 범위·전국평균 | 수정 |

---

## Task 1: `selectPicks` — 5-cap·정렬 제거 (전체 반환)

**Files:**
- Modify: `src/picks.ts:83-109` (`selectPicks`)
- Test: `tests/picks.test.ts`

**Interfaces:**
- Produces: `selectPicks(profiles: ProduceProfile[], snapshot: PriceSnapshot | null, today: Date): PickResult[]` — 이번 달 제철 **전체**를 `PickResult`로 반환(cap·정렬 없음). 정렬은 `cardlist.sortCards`가 담당(Task 3). `PickResult` 필드(`profile`·`inPeak`·`price`)는 불변.

- [ ] **Step 1: 기존 정렬·cap 테스트를 새 동작으로 교체 (실패 테스트)**

`tests/picks.test.ts`의 `selectPicks` 관련 테스트를 찾아, "상위 5장"·"절정 먼저"·"하락률 정렬"을 검증하던 케이스를 지우고 아래로 바꾼다:

```ts
test('selectPicks: 이번 달 제철 전체를 cap 없이 반환한다', () => {
  const profiles = Array.from({ length: 8 }, (_, i) =>
    profile({ id: `p${i}`, name: `품목${i}`, seasonMonths: [7] }),
  )
  const picks = selectPicks(profiles, null, new Date('2026-07-15'))
  expect(picks).toHaveLength(8) // 5로 안 자른다
})

test('selectPicks: 제철 아닌 달 품목은 뺀다', () => {
  const picks = selectPicks(
    [profile({ seasonMonths: [7] }), profile({ id: 'q', seasonMonths: [1] })],
    null,
    new Date('2026-07-15'),
  )
  expect(picks.map((p) => p.profile.id)).toEqual(['x'])
})

test('selectPicks: inPeak·price 필드는 그대로 채운다', () => {
  const snapshot: PriceSnapshot = {
    schemaVersion: 2, fetchedAt: '2026-07-15T00:00:00Z', surveyedOn: '2026-07-15',
    entries: [entry({ price: 900, baseline: { monthAgo: 1000, yearAgo: 1000 } })],
  }
  const [p] = selectPicks([profile({ peakMonths: [7] })], snapshot, new Date('2026-07-15'))
  expect(p.inPeak).toBe(true)
  expect(p.price?.price).toBe(900)
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/picks.test.ts`
Expected: FAIL — 아직 `selectPicks`가 `limit`으로 자르고 정렬한다.

- [ ] **Step 3: `selectPicks` 재작성 (cap·정렬·`groupOf` 제거)**

`src/picks.ts`의 `selectPicks`를 아래로 교체:

```ts
/** 이번 달 제철 전체를 픽으로. cap·정렬 없음 — 정렬은 cardlist.sortCards, 표시 조립은 app.ts. */
export function selectPicks(
  profiles: ProduceProfile[],
  snapshot: PriceSnapshot | null,
  today: Date,
): PickResult[] {
  const month = today.getMonth() + 1
  return seasonalThisMonth(profiles, month).map((profile) => {
    const entry = snapshot ? matchEntry(profile, snapshot.entries) : null
    return {
      profile,
      inPeak: profile.peakMonths.includes(month),
      price: entry ? priceView(entry) : null,
    }
  })
}
```

`limit` 파라미터, `results.sort`, `groupOf`를 모두 지운다. `hasDrops`·`matchEntry`·`priceView`·`seasonalThisMonth`·`comingMonths`는 그대로 둔다.

- [ ] **Step 4: 통과 확인 + 다운스트림 컴파일**

Run: `npx vitest run tests/picks.test.ts && npx tsc --noEmit`
Expected: 테스트 PASS. `tsc`는 이 시점에 `app.ts`가 아직 `selectPicks(..., now)`를 4-인자로 부르면 실패할 수 있다 → `app.ts` 호출부에서 `limit` 인자를 안 넘기고 있으면 문제없다(현재 `selectPicks(profiles, snapshot, now)` 3-인자 호출이라 OK). `tsc` 통과 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/picks.ts tests/picks.test.ts
git commit -m "refactor(picks): selectPicks가 제철 전체를 반환 (5-cap·정렬 제거)"
```

---

## Task 2: `seasonLabel` — 제철 월 배열 → 한국어 구간 라벨

**Files:**
- Modify: `src/season.ts`
- Test: `tests/season.test.ts`

**Interfaces:**
- Produces: `seasonLabel(months: number[]): string` — 연속 구간을 `"12~4월"`로. 12→1 랩어라운드 병합, 여러 구간은 `, `로 연결. 단일 월은 `"7월"`.

- [ ] **Step 1: 실패 테스트**

`tests/season.test.ts`에 추가:

```ts
import { seasonLabel } from '../src/season'

describe('seasonLabel', () => {
  test('단일 월', () => expect(seasonLabel([7])).toBe('7월'))
  test('연속 구간', () => expect(seasonLabel([7, 8])).toBe('7~8월'))
  test('연말 랩어라운드 병합', () => expect(seasonLabel([12, 1, 2, 3, 4])).toBe('12~4월'))
  test('랩어라운드 (짧은)', () => expect(seasonLabel([1, 2, 3, 12])).toBe('12~3월'))
  test('분리된 두 구간', () => expect(seasonLabel([5, 6, 9, 10, 11])).toBe('5~6월, 9~11월'))
  test('순서 무관', () => expect(seasonLabel([4, 3, 5])).toBe('3~5월'))
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/season.test.ts`
Expected: FAIL — `seasonLabel` 미정의.

- [ ] **Step 3: 구현**

`src/season.ts` 끝에 추가:

```ts
/** 제철 월 배열 → "12~4월" 같은 구간 라벨 (표시용, 순수).
 *  연속 정수를 구간으로 묶고, 12→1로 이어지면(랩어라운드) 병합한다. */
export function seasonLabel(months: number[]): string {
  const uniq = [...new Set(months)].sort((a, b) => a - b)
  if (uniq.length === 0) return ''
  // 연속 구간(runs) 나누기
  const runs: [number, number][] = []
  for (const m of uniq) {
    const last = runs[runs.length - 1]
    if (last && m === last[1] + 1) last[1] = m
    else runs.push([m, m])
  }
  // 랩어라운드: 1로 시작하는 첫 구간과 12로 끝나는 마지막 구간을 하나로
  if (runs.length > 1 && runs[0][0] === 1 && runs[runs.length - 1][1] === 12) {
    const first = runs.shift()!
    runs[runs.length - 1][1] = first[1] // [12,12] → [12,4]
  }
  return runs.map(([a, b]) => (a === b ? `${a}월` : `${a}~${b}월`)).join(', ')
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run tests/season.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/season.ts tests/season.test.ts
git commit -m "feat(season): seasonLabel — 제철 월 배열을 구간 라벨로"
```

---

## Task 3: `cardlist.ts` — `signedChange` + `sortCards`

**Files:**
- Create: `src/cardlist.ts`
- Create test: `tests/cardlist.test.ts`

**Interfaces:**
- Consumes: `CardView` (`src/card.ts`), `SortMode` (Task 6에서 `view-types.ts`에 정의 — 이 태스크에선 로컬 타입 별칭으로 먼저 두고 Task 6에서 교체).
- Produces:
  - `signedChange(card: CardView): number | null` — 하락 음수, 상승 양수, 비슷 0, 무가격·기준선없음 `null`.
  - `sortCards(cards: CardView[], mode: SortMode): CardView[]` — `'drop'|'name'|'priceLow'`. 원본 불변(복사 후 정렬).

- [ ] **Step 1: 실패 테스트**

`tests/cardlist.test.ts` 생성. `CardView`를 만드는 헬퍼부터:

```ts
import { describe, expect, test } from 'vitest'
import { signedChange, sortCards } from '../src/cardlist'
import type { CardView } from '../src/card'
import { count } from './units'

function card(over: Partial<CardView>): CardView {
  return {
    emoji: '🥬', name: '품목', kind: '', category: 'vegetable', inPeak: false,
    whyNow: '', note: { pick: 'p', store: 's', use: 'u' },
    price: null, nutrition: null, recipes: null, ...over,
  }
}
function withPrice(name: string, now: number, ch: { kind: 'fall' | 'rise'; pct: number } | { kind: 'similar' } | null): CardView {
  return card({ name, price: { now, wasMonthAgo: null, unit: count(1, '개'), perUnit: null, change: ch, spark: null } })
}

describe('signedChange', () => {
  test('하락은 음수', () => expect(signedChange(withPrice('a', 100, { kind: 'fall', pct: 23 }))).toBe(-23))
  test('상승은 양수', () => expect(signedChange(withPrice('a', 100, { kind: 'rise', pct: 13 }))).toBe(13))
  test('비슷은 0', () => expect(signedChange(withPrice('a', 100, { kind: 'similar' }))).toBe(0))
  test('기준선 없으면 null', () => expect(signedChange(withPrice('a', 100, null))).toBeNull())
  test('무가격이면 null', () => expect(signedChange(card({ price: null }))).toBeNull())
})

describe('sortCards', () => {
  test('drop: 큰 하락 먼저, 상승은 아래, 무가격 맨 뒤', () => {
    const cards = [
      withPrice('상승', 100, { kind: 'rise', pct: 13 }),
      card({ name: '무가격', price: null }),
      withPrice('큰하락', 100, { kind: 'fall', pct: 26 }),
      withPrice('작은하락', 100, { kind: 'fall', pct: 11 }),
      withPrice('기준선없음', 100, null),
    ]
    expect(sortCards(cards, 'drop').map((c) => c.name)).toEqual([
      '큰하락', '작은하락', '상승', '기준선없음', '무가격',
    ])
  })
  test('name: 가나다', () => {
    const cards = [card({ name: '나' }), card({ name: '가' }), card({ name: '다' })]
    expect(sortCards(cards, 'name').map((c) => c.name)).toEqual(['가', '나', '다'])
  })
  test('priceLow: 가격 낮은 순, 무가격 뒤', () => {
    const cards = [withPrice('비쌈', 900, null), card({ name: '무', price: null }), withPrice('쌈', 100, null)]
    expect(sortCards(cards, 'priceLow').map((c) => c.name)).toEqual(['쌈', '비쌈', '무'])
  })
  test('원본 불변', () => {
    const cards = [card({ name: '나' }), card({ name: '가' })]
    sortCards(cards, 'name')
    expect(cards.map((c) => c.name)).toEqual(['나', '가'])
  })
})
```

> `tests/units.ts`에 `count(1, '개')`가 있는지 확인(있음 — `tests/picks.test.ts`가 `weight`를 쓰고 `app.test.ts`가 `count`를 쓴다). 없으면 `count`를 `units.ts`에 추가한다.

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/cardlist.test.ts`
Expected: FAIL — `src/cardlist.ts` 없음.

- [ ] **Step 3: 구현**

`src/cardlist.ts` 생성:

```ts
import type { CardView } from './card'

// SortMode는 Task 6에서 view-types.ts로 옮긴다. 그때 이 로컬 정의를 import로 교체.
export type SortMode = 'drop' | 'name' | 'priceLow'

/** CardView의 부호 있는 등락률(하락 음수). 무가격·기준선없음이면 null. */
export function signedChange(card: CardView): number | null {
  const ch = card.price?.change
  if (!ch) return null // price 없음 or change === null(기준선 없음)
  if (ch.kind === 'fall') return -ch.pct
  if (ch.kind === 'rise') return ch.pct
  return 0 // similar
}

function dropGroup(c: CardView): number {
  if (!c.price) return 2 // 무가격 맨 뒤
  if (signedChange(c) === null) return 1 // 가격은 있으나 등락 모름
  return 0
}

/** CardView 목록 정렬 (순수, 원본 불변). drop = 큰 하락 먼저. */
export function sortCards(cards: CardView[], mode: SortMode): CardView[] {
  const arr = [...cards]
  if (mode === 'name') return arr.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  if (mode === 'priceLow')
    return arr.sort((a, b) => (a.price?.now ?? Infinity) - (b.price?.now ?? Infinity))
  return arr.sort((a, b) => {
    const ga = dropGroup(a)
    const gb = dropGroup(b)
    if (ga !== gb) return ga - gb
    if (ga === 0) return signedChange(a)! - signedChange(b)!
    return 0
  })
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run tests/cardlist.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/cardlist.ts tests/cardlist.test.ts tests/units.ts
git commit -m "feat(cardlist): signedChange + sortCards (하락 큰 순 정렬)"
```

---

## Task 4: `cardlist.ts` — `filterCards`

**Files:**
- Modify: `src/cardlist.ts`
- Modify test: `tests/cardlist.test.ts`

**Interfaces:**
- Produces: `filterCards(cards: CardView[], filters: Set<Filter>): CardView[]` — 술어 AND. `Filter = 'fruit'|'vegetable'|'drop'|'peak'|'priced'`(Task 6에서 view-types로 이전 예정, 지금은 cardlist 로컬).

- [ ] **Step 1: 실패 테스트**

`tests/cardlist.test.ts`에 추가:

```ts
import { filterCards } from '../src/cardlist'

describe('filterCards', () => {
  const fruit = card({ name: '수박', category: 'fruit', inPeak: true, price: { now: 100, wasMonthAgo: null, unit: count(1, '개'), perUnit: null, change: { kind: 'fall', pct: 11 }, spark: null } })
  const vegRise = card({ name: '토마토', category: 'vegetable', inPeak: true, price: { now: 100, wasMonthAgo: null, unit: count(1, '개'), perUnit: null, change: { kind: 'rise', pct: 13 }, spark: null } })
  const vegNoPrice = card({ name: '가지', category: 'vegetable', inPeak: false, price: null })
  const all = [fruit, vegRise, vegNoPrice]

  test('빈 필터면 전부', () => expect(filterCards(all, new Set())).toHaveLength(3))
  test('과일만', () => expect(filterCards(all, new Set(['fruit'])).map((c) => c.name)).toEqual(['수박']))
  test('내려간 것만', () => expect(filterCards(all, new Set(['drop'])).map((c) => c.name)).toEqual(['수박']))
  test('절정만', () => expect(filterCards(all, new Set(['peak'])).map((c) => c.name)).toEqual(['수박', '토마토']))
  test('가격 있는 것만', () => expect(filterCards(all, new Set(['priced'])).map((c) => c.name)).toEqual(['수박', '토마토']))
  test('AND: 채소 + 가격있음', () => expect(filterCards(all, new Set(['vegetable', 'priced'])).map((c) => c.name)).toEqual(['토마토']))
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/cardlist.test.ts`
Expected: FAIL — `filterCards` 미정의.

- [ ] **Step 3: 구현**

`src/cardlist.ts`에 추가:

```ts
export type Filter = 'fruit' | 'vegetable' | 'drop' | 'peak' | 'priced'

const PRED: Record<Filter, (c: CardView) => boolean> = {
  fruit: (c) => c.category === 'fruit',
  vegetable: (c) => c.category === 'vegetable',
  drop: (c) => c.price?.change?.kind === 'fall',
  peak: (c) => c.inPeak,
  priced: (c) => c.price != null,
}

/** 필터 술어 AND (순수). 과일/채소 상호배타는 UI(FilterBar)가 관장. */
export function filterCards(cards: CardView[], filters: Set<Filter>): CardView[] {
  return cards.filter((c) => [...filters].every((f) => PRED[f](c)))
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run tests/cardlist.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/cardlist.ts tests/cardlist.test.ts
git commit -m "feat(cardlist): filterCards (과일/채소·내려간것·절정·가격 술어)"
```

---

## Task 5: `cardlist.ts` — `searchCards` + `searchHints`

**Files:**
- Modify: `src/cardlist.ts`
- Modify test: `tests/cardlist.test.ts`

**Interfaces:**
- Produces:
  - `searchCards(cards: CardView[], query: string): CardView[]` — 이름 부분일치(공백 트림). 빈 쿼리면 전체.
  - `searchHints(index: OffSeasonHint[], query: string): OffSeasonHint[]` — 이름 부분일치. `OffSeasonHint`는 이 태스크에서 cardlist에 최소 정의로 두고 Task 6에서 view-types로 이전.

- [ ] **Step 1: 실패 테스트**

`tests/cardlist.test.ts`에 추가:

```ts
import { searchCards, searchHints } from '../src/cardlist'

describe('searchCards / searchHints', () => {
  const cards = [card({ name: '오이' }), card({ name: '참외' }), card({ name: '수박' })]
  test('이름 부분일치', () => expect(searchCards(cards, '외').map((c) => c.name)).toEqual(['참외']))
  test('공백 트림', () => expect(searchCards(cards, ' 오이 ').map((c) => c.name)).toEqual(['오이']))
  test('빈 쿼리는 전체', () => expect(searchCards(cards, '  ')).toHaveLength(3))

  const index = [
    { emoji: '🍓', name: '딸기', seasonLabel: '12~4월', comingSoon: false },
    { emoji: '🍇', name: '포도', seasonLabel: '8~9월', comingSoon: true },
  ]
  test('힌트 부분일치', () => expect(searchHints(index, '딸').map((h) => h.name)).toEqual(['딸기']))
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/cardlist.test.ts`
Expected: FAIL — `searchCards`/`searchHints` 미정의.

- [ ] **Step 3: 구현**

`src/cardlist.ts`에 추가:

```ts
// OffSeasonHint는 Task 6에서 view-types.ts로 옮긴다. 그때 이 로컬 정의를 import로 교체.
export interface OffSeasonHint {
  emoji: string
  name: string
  seasonLabel: string
  comingSoon: boolean
}

/** 이름 부분일치로 제철 카드 검색 (순수). 빈 쿼리면 전체. */
export function searchCards(cards: CardView[], query: string): CardView[] {
  const q = query.trim()
  return q ? cards.filter((c) => c.name.includes(q)) : cards
}

/** 이름 부분일치로 비제철 힌트 검색 (순수). */
export function searchHints(index: OffSeasonHint[], query: string): OffSeasonHint[] {
  const q = query.trim()
  return q ? index.filter((h) => h.name.includes(q)) : []
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run tests/cardlist.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/cardlist.ts tests/cardlist.test.ts
git commit -m "feat(cardlist): searchCards + searchHints (이름 부분일치)"
```

---

## Task 6: `view-types` + `app.ts` — 타입 이전 · 검색 인덱스 · 기본 정렬

**Files:**
- Modify: `src/view-types.ts`
- Modify: `src/cardlist.ts` (로컬 타입을 view-types import로 교체)
- Modify: `src/app.ts:18-46` (`buildAppView`)
- Test: `tests/app.test.ts`

**Interfaces:**
- Produces:
  - `view-types.ts`: `Filter`, `SortMode`, `OffSeasonHint` (정식 위치), `AppView.searchIndex: OffSeasonHint[]`. `AppView.seasonal`은 이 태스크에서 **유지**(App.tsx가 아직 쓴다 — Task 9에서 제거).
  - `buildAppView`가 `cards`를 `sortCards(cards, 'drop')`로 미리 정렬하고 `searchIndex`(비제철 프로필)를 싣는다.

- [ ] **Step 1: 타입을 view-types로 이전 (컴파일 유지)**

`src/view-types.ts`에 추가:

```ts
export type Filter = 'fruit' | 'vegetable' | 'drop' | 'peak' | 'priced'
export type SortMode = 'drop' | 'name' | 'priceLow'

/** 검색이 이번 달 제철 밖의 품목을 찾았을 때 보여줄 힌트 (가격 없음). */
export interface OffSeasonHint {
  emoji: string
  name: string
  /** "12~4월" */
  seasonLabel: string
  /** 다음 제철이 /coming 범위(2개월) 안인가 */
  comingSoon: boolean
}
```

`AppView`에 `searchIndex: OffSeasonHint[]` 추가(`seasonal`은 그대로 둔다).

`src/cardlist.ts`의 로컬 `SortMode`·`Filter`·`OffSeasonHint` 정의를 지우고 맨 위에서 import:

```ts
import type { CardView } from './card'
import type { Filter, OffSeasonHint, SortMode } from './view-types'
```

- [ ] **Step 2: 실패 테스트 (app.ts)**

`tests/app.test.ts`에 추가(기존 `peach`·`grape`·`snap` 헬퍼 재사용):

```ts
test('buildAppView: 카드는 하락 큰 순으로 정렬된다', () => {
  const a = { ...peach, id: 'a', name: '작은하락', seasonMonths: [7], peakMonths: [] }
  const b = { ...peach, id: 'b', name: '큰하락', seasonMonths: [7], peakMonths: [] }
  const snapshot: PriceSnapshot = {
    schemaVersion: 2, fetchedAt: '2026-07-15T00:00:00Z', surveyedOn: '2026-07-15',
    entries: [
      { itemName: '작은하락', kindName: '기본', rank: '상품', unit: count(1, '개'), price: 90, baseline: { monthAgo: 100, yearAgo: 100 } },
      { itemName: '큰하락', kindName: '기본', rank: '상품', unit: count(1, '개'), price: 50, baseline: { monthAgo: 100, yearAgo: 100 } },
    ],
  }
  const withKamis = (p: ProduceProfile, itemName: string) => ({ ...p, kamis: { categoryCode: '400' as const, itemName } })
  const view = buildAppView([withKamis(a, '작은하락'), withKamis(b, '큰하락')], snapshot, null, null, new Date('2026-07-15'))
  expect(view.cards.map((c) => c.name)).toEqual(['큰하락', '작은하락'])
})

test('buildAppView: 비제철 프로필이 searchIndex에 든다', () => {
  const view = buildAppView([peach, grape], snap(), null, null, new Date('2026-07-15'))
  // 7월: peach 제철(cards), grape 비제철(searchIndex)
  expect(view.cards.map((c) => c.name)).toContain('복숭아')
  expect(view.searchIndex.map((h) => h.name)).toEqual(['포도'])
  expect(view.searchIndex[0].seasonLabel).toBe('8~9월')
})
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run tests/app.test.ts`
Expected: FAIL — `searchIndex` 없음, 정렬 안 됨.

- [ ] **Step 4: `buildAppView` 구현**

`src/app.ts` 상단 import에 추가:

```ts
import { sortCards } from './cardlist'
import { seasonLabel } from './season'
import type { AppView, ComingView, Freshness, OffSeasonHint } from './view-types'
```

`buildAppView`를 수정 — 카드 정렬 + 검색 인덱스. `seasonal`은 유지:

```ts
export function buildAppView(
  profiles: ProduceProfile[],
  snapshot: PriceSnapshot | null,
  nutrition: NutritionSnapshot | null,
  recipes: RecipeSnapshot | null,
  now: Date,
): AppView {
  const month = now.getMonth() + 1
  const picks = selectPicks(profiles, snapshot, now)
  const cards = sortCards(
    picks.map((p) =>
      toCardView(
        p, month,
        nutritionView(matchNutrition(p.profile, nutrition)),
        recipeView(matchRecipes(p.profile, recipes)),
      ),
    ),
    'drop',
  )
  const comingIds = new Set(
    comingMonths(profiles, month).flatMap((g) => g.items.map((it) => it.profile.id)),
  )
  const searchIndex: OffSeasonHint[] = profiles
    .filter((p) => !p.seasonMonths.includes(month))
    .map((p) => ({
      emoji: p.emoji,
      name: p.name,
      seasonLabel: seasonLabel(p.seasonMonths),
      comingSoon: comingIds.has(p.id),
    }))
  return {
    cards,
    noDrop: picks.length > 0 && !hasDrops(picks),
    hasNutrition: cards.some((c) => c.nutrition !== null),
    hasRecipes: cards.some((c) => c.recipes !== null),
    seasonal: seasonalThisMonth(profiles, month).map(label),
    searchIndex,
    date: now,
    freshness: freshnessOf(snapshot, now),
    term: currentTerm(now),
  }
}
```

`comingMonths`를 `./picks`에서 import하고 있는지 확인(상단 import에 `comingMonths` 추가). `label`·`seasonalThisMonth`는 그대로.

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run tests/app.test.ts && npx tsc --noEmit`
Expected: PASS. (App.tsx는 `seasonal`을 아직 쓰므로 컴파일 OK.)

- [ ] **Step 6: 커밋**

```bash
git add src/view-types.ts src/cardlist.ts src/app.ts tests/app.test.ts
git commit -m "feat(app): 카드 하락 큰 순 정렬 + 비제철 searchIndex"
```

---

## Task 7: `App.tsx` — 클라이언트 상태 + FilterBar + SortControl

**Files:**
- Modify: `src/components/App.tsx`
- Create: `src/components/FilterBar.tsx`
- Create: `src/components/SortControl.tsx`
- Test: `src/components/App.test.tsx`

**Interfaces:**
- Consumes: `filterCards`, `sortCards` (cardlist), `Filter`, `SortMode` (view-types).
- Produces:
  - `FilterBar({ filters, onToggle }: { filters: Set<Filter>; onToggle: (f: Filter) => void })` — 칩 5개. 과일/채소 상호배타는 부모가 처리.
  - `SortControl({ sort, onChange }: { sort: SortMode; onChange: (s: SortMode) => void })` — 셀렉트.
  - `App`이 `useState`로 `filters`·`sort`를 쥐고, 컨트롤은 마운트 후(`ready`)만 렌더(무JS 폴백은 정렬된 전체 목록).

- [ ] **Step 1: 실패 컴포넌트 테스트**

`src/components/App.test.tsx`(기존 파일)에 추가:

```tsx
// (파일 상단에 이미 있어야 함) // @vitest-environment jsdom
import { fireEvent, screen } from '@testing-library/react'
import { renderWithRouter } from '../test-utils'
// buildAppView로 view를 만드는 기존 헬퍼가 있으면 그것을, 없으면 아래처럼 직접 구성

test('필터 칩 토글로 카드가 걸러진다', () => {
  renderWithRouter(<App view={viewWithCards([
    { name: '수박', category: 'fruit' }, { name: '오이', category: 'vegetable' },
  ])} />)
  fireEvent.click(screen.getByRole('button', { name: '과일' }))
  expect(screen.getByText('수박')).toBeInTheDocument()
  expect(screen.queryByText('오이')).not.toBeInTheDocument()
})

test('정렬 변경이 순서를 바꾼다 (이름)', () => {
  renderWithRouter(<App view={viewWithCards([{ name: '수박' }, { name: '가지' }])} />)
  fireEvent.change(screen.getByLabelText('정렬'), { target: { value: 'name' } })
  const names = screen.getAllByTestId('card-name').map((n) => n.textContent)
  expect(names).toEqual(['가지', '수박'])
})
```

> `viewWithCards` 헬퍼(기존 App.test.tsx의 `pageView`류가 있으면 재사용, 없으면 파일 상단에 `buildAppView`로 만드는 최소 헬퍼 추가). `ProduceCard`가 이름에 `data-testid="card-name"`를 달도록 Step 3에서 처리.

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/App.test.tsx`
Expected: FAIL — 필터 클릭해도 안 걸러짐(현재 CSS 라디오), `정렬` 라벨 없음.

- [ ] **Step 3: `FilterBar` + `SortControl` 생성, `App` 상태화**

`src/components/FilterBar.tsx`:

```tsx
import type { Filter } from '../view-types'

const CHIPS: { key: Filter; label: string }[] = [
  { key: 'fruit', label: '과일' },
  { key: 'vegetable', label: '채소' },
  { key: 'drop', label: '내려간 것' },
  { key: 'peak', label: '절정' },
  { key: 'priced', label: '가격 있음' },
]

export function FilterBar({ filters, onToggle }: { filters: Set<Filter>; onToggle: (f: Filter) => void }) {
  return (
    <div className="filter">
      {CHIPS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={`fchip${filters.has(key) ? ' on' : ''}`}
          aria-pressed={filters.has(key)}
          onClick={() => onToggle(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

`src/components/SortControl.tsx`:

```tsx
import type { SortMode } from '../view-types'

const OPTS: { value: SortMode; label: string }[] = [
  { value: 'drop', label: '하락 큰 순' },
  { value: 'name', label: '이름' },
  { value: 'priceLow', label: '가격 낮은 순' },
]

export function SortControl({ sort, onChange }: { sort: SortMode; onChange: (s: SortMode) => void }) {
  return (
    <label className="sort">
      정렬
      <select aria-label="정렬" value={sort} onChange={(e) => onChange(e.target.value as SortMode)}>
        {OPTS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}
```

`src/components/App.tsx` — 상태 도입, CSS 라디오 필터를 제거하고 `FilterBar`+`SortControl`로 교체. `list` 렌더를 걸러진 카드로:

```tsx
import { useEffect, useState } from 'react'
import { filterCards, sortCards } from '../cardlist'
import type { AppView, Filter, SortMode } from '../view-types'
import { FilterBar } from './FilterBar'
import { SortControl } from './SortControl'
// ...기존 import 유지

export function App({ view }: { view: AppView }) {
  const { cards, noDrop, hasNutrition, hasRecipes, seasonal, date, freshness, term } = view
  usePeakDotTooltip()
  const [ready, setReady] = useState(false)
  const [filters, setFilters] = useState<Set<Filter>>(new Set())
  const [sort, setSort] = useState<SortMode>('drop')
  useEffect(() => setReady(true), [])

  const toggle = (f: Filter) =>
    setFilters((prev) => {
      const next = new Set(prev)
      if (next.has(f)) next.delete(f)
      else {
        next.add(f)
        if (f === 'fruit') next.delete('vegetable') // 상호배타
        if (f === 'vegetable') next.delete('fruit')
      }
      return next
    })

  const shown = sortCards(filterCards(cards, filters), sort)
  const month = date.getMonth() + 1
  const eyebrow = term ? `${term} · ${weekLabel(date)}` : weekLabel(date)

  return (
    <>
      <NavIndex current="now" />
      <header>
        <Sprig />
        <p className="week">{eyebrow}</p>
        <h1>이 계절을 맛보는 가장 알뜰한 방법</h1>
        {freshness.kind === 'dated' && (
          <p className="surveyed">{surveyedLabel(freshness.days, freshness.surveyedOn)}</p>
        )}
      </header>
      <main>
        <section className="picks">
          {cards.length > 0 ? (
            <>
              {ready && (
                <div className="controls">
                  <FilterBar filters={filters} onToggle={toggle} />
                  <SortControl sort={sort} onChange={setSort} />
                </div>
              )}
              {noDrop && (
                <p className="nodrop">이번 주는 크게 내려온 게 없어요. 제철은 그대로 곁에 있어요.</p>
              )}
              {shown.length > 0 ? (
                <div className="list">
                  {shown.map((c, i) => (
                    <ProduceCard key={c.name + i} card={c} />
                  ))}
                </div>
              ) : (
                <p className="empty">조건에 맞는 제철 품목이 없어요</p>
              )}
            </>
          ) : (
            <p className="empty">이번 달 제철 정보가 아직 없어요</p>
          )}
        </section>
        <section className="seasonal">
          <h2>{month}월의 제철</h2>
          <ul>
            {seasonal.map((c, i) => (
              <li key={i}>{c.emoji} {c.name}</li>
            ))}
          </ul>
        </section>
      </main>
      <footer>
        <p>가격: KAMIS(한국농수산식품유통공사) 일별 소매가격 · 전국 평균</p>
        {hasNutrition && <p>영양: 식품의약품안전처 국가표준식품성분 · 100g 기준</p>}
        {hasRecipes && <p>레시피: 식품의약품안전처 조리식품 레시피 DB</p>}
      </footer>
    </>
  )
}
```

`ProduceCard.tsx`의 이름 `<span className="card-title">`에 `data-testid="card-name"`를 단다(테스트 셀렉터용):

```tsx
<span className="card-title" data-testid="card-name">
  {card.name}
  {card.inPeak && <PeakDot />}
</span>
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/components/App.test.tsx && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/components/FilterBar.tsx src/components/SortControl.tsx src/components/App.tsx src/components/ProduceCard.tsx src/components/App.test.tsx
git commit -m "feat(app): 필터/정렬 컨트롤 (CSS 라디오 → JS 상태), 무JS 폴백 유지"
```

---

## Task 8: `App.tsx` — SearchBar + SeasonHint (검색 흐름 + 빈 화면)

**Files:**
- Modify: `src/components/App.tsx`
- Create: `src/components/SearchBar.tsx`
- Create: `src/components/SeasonHint.tsx`
- Test: `src/components/App.test.tsx`

**Interfaces:**
- Consumes: `searchCards`, `searchHints` (cardlist), `OffSeasonHint` (view-types), `AppView.searchIndex`.
- Produces:
  - `SearchBar({ query, onChange }: { query: string; onChange: (q: string) => void })`.
  - `SeasonHint({ hint }: { hint: OffSeasonHint })` — `🍓 딸기 · 12~4월 제철`, `comingSoon`이면 `/coming` `<Link>`.

- [ ] **Step 1: 실패 컴포넌트 테스트**

`src/components/App.test.tsx`에 추가:

```tsx
import { searchIndexView } from '...' // 아래 헬퍼로 searchIndex 포함 view 구성

test('검색: 제철 매치는 카드로, 비제철 매치는 힌트로', () => {
  renderWithRouter(<App view={viewWith({
    cards: [{ name: '오이' }],
    searchIndex: [{ emoji: '🍓', name: '딸기', seasonLabel: '12~4월', comingSoon: false }],
  })} />)
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '딸' } })
  expect(screen.queryByTestId('card-name')).not.toBeInTheDocument() // 오이 안 보임
  expect(screen.getByText(/딸기/)).toBeInTheDocument()
  expect(screen.getByText(/12~4월 제철/)).toBeInTheDocument()
})

test('검색 무매치면 담백한 안내', () => {
  renderWithRouter(<App view={viewWith({ cards: [{ name: '오이' }], searchIndex: [] })} />)
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } })
  expect(screen.getByText(/찾지 못했어요/)).toBeInTheDocument()
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/App.test.tsx`
Expected: FAIL — searchbox 없음.

- [ ] **Step 3: `SearchBar` + `SeasonHint` 생성, `App` 검색 분기**

`src/components/SearchBar.tsx`:

```tsx
export function SearchBar({ query, onChange }: { query: string; onChange: (q: string) => void }) {
  return (
    <input
      type="search"
      className="search"
      placeholder="품목 검색 — 오이, 참외…"
      value={query}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
```

`src/components/SeasonHint.tsx`:

```tsx
import { Link } from '@tanstack/react-router'
import type { OffSeasonHint } from '../view-types'

export function SeasonHint({ hint }: { hint: OffSeasonHint }) {
  return (
    <li className="season-hint">
      <span className="emoji">{hint.emoji}</span>
      <span className="hint-name">{hint.name}</span>
      <span className="hint-when">{hint.seasonLabel} 제철</span>
      {hint.comingSoon && (
        <Link to="/coming" className="hint-coming">다가오는 제철에서 보기</Link>
      )}
    </li>
  )
}
```

`App.tsx` — `query` 상태 추가, 검색 시 `searchCards`로 in-season 좁히고, 아래에 힌트 섹션. 빈 화면 두 갈래:

```tsx
import { filterCards, searchCards, searchHints, sortCards } from '../cardlist'
import { SearchBar } from './SearchBar'
import { SeasonHint } from './SeasonHint'
// App 내부:
const [query, setQuery] = useState('')
const q = query.trim()
const searching = q.length > 0
const base = searchCards(cards, q)
const shown = sortCards(filterCards(base, filters), sort)
const hints = searchHints(view.searchIndex, q)
```

`ready && (...)` 컨트롤 블록 맨 위에 `<SearchBar query={query} onChange={setQuery} />` 추가.
목록 렌더 부분을 검색 상태까지 반영하도록 교체:

```tsx
{shown.length > 0 && (
  <div className="list">
    {shown.map((c, i) => <ProduceCard key={c.name + i} card={c} />)}
  </div>
)}
{searching && hints.length > 0 && (
  <div className="off-season">
    <p className="off-divider">지금은 제철이 아니에요</p>
    <ul className="hint-list">
      {hints.map((h, i) => <SeasonHint key={i} hint={h} />)}
    </ul>
  </div>
)}
{searching && shown.length === 0 && hints.length === 0 && (
  <p className="empty">'{q}' 제철 품목을 찾지 못했어요</p>
)}
{!searching && shown.length === 0 && (
  <p className="empty">조건에 맞는 제철 품목이 없어요</p>
)}
```

> Step 7의 단일 `shown.length>0 ? list : empty` 분기를 위 4-갈래로 대체한다. `React` 자동 이스케이프로 `'{q}'`는 그대로 안전.

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/components/App.test.tsx && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/components/SearchBar.tsx src/components/SeasonHint.tsx src/components/App.tsx src/components/App.test.tsx
git commit -m "feat(app): 전체 40종 검색 + 비제철 힌트 + 빈 화면 문구"
```

---

## Task 9: 하단 칩 목록 제거 · 조사일 줄 "· 전국 평균"

**Files:**
- Modify: `src/components/App.tsx`
- Test: `src/components/App.test.tsx`

**Interfaces:**
- Produces: `App`이 더 이상 `view.seasonal`을 렌더하지 않는다(하단 `<section className="seasonal">` 제거). 조사일 줄에 `· 전국 평균` 접미.

- [ ] **Step 1: 실패 테스트**

`src/components/App.test.tsx`에 추가:

```tsx
test('하단 "○월의 제철" 이름 칩 목록은 없다', () => {
  renderWithRouter(<App view={viewWith({ cards: [{ name: '오이' }] })} />)
  expect(screen.queryByText(/월의 제철/)).not.toBeInTheDocument()
})

test('조사일 줄에 전국 평균 표기', () => {
  renderWithRouter(<App view={viewWith({
    cards: [{ name: '오이' }],
    freshness: { kind: 'dated', surveyedOn: '2026-07-13', days: 0 },
  })} />)
  expect(screen.getByText(/전국 평균/)).toBeInTheDocument()
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/App.test.tsx`
Expected: FAIL — 칩 목록 존재, 조사일 줄에 전국 평균 없음.

- [ ] **Step 3: 구현**

`App.tsx`에서:
- `<section className="seasonal">…</section>` 블록 **전체 삭제**.
- `view`·구조분해에서 `seasonal` 제거, `month` 변수도 이 섹션에서만 썼으면 제거.
- 조사일 줄 수정:

```tsx
{freshness.kind === 'dated' && (
  <p className="surveyed">{surveyedLabel(freshness.days, freshness.surveyedOn)} · 전국 평균</p>
)}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/components/App.test.tsx && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/components/App.tsx src/components/App.test.tsx
git commit -m "feat(app): 하단 제철 칩 목록 제거 + 조사일 줄 전국 평균 표기"
```

---

## Task 10: `AppView.seasonal` 정리 (더 이상 소비자 없음)

**Files:**
- Modify: `src/view-types.ts`, `src/app.ts`
- Test: `tests/app.test.ts`

**Interfaces:**
- Produces: `AppView`에서 `seasonal` 필드 제거. `Chip` 타입이 다른 곳에서 안 쓰이면 함께 제거(coming 뷰가 쓰면 유지).

- [ ] **Step 1: 소비 확인**

Run: `grep -rn "\.seasonal\b\|seasonal:" src/ tests/`
Expected: `app.ts`(생성)와 `app.test.ts`만 남아야 한다(App.tsx는 Task 9에서 제거됨). 다른 소비자 있으면 이 태스크를 멈추고 확인.

- [ ] **Step 2: 실패 테스트 갱신**

`tests/app.test.ts`에서 `view.seasonal`을 검증하던 케이스가 있으면 제거하거나 `searchIndex` 검증으로 대체. `seasonal` 참조가 사라지도록.

- [ ] **Step 3: 제거**

- `src/view-types.ts`: `AppView`에서 `seasonal: Chip[]` 줄 삭제. `Chip`이 `grep`상 미사용이면 인터페이스도 삭제.
- `src/app.ts`: `buildAppView` 반환 객체에서 `seasonal: seasonalThisMonth(...).map(label)` 줄 삭제. `label` 헬퍼가 미사용이 되면 삭제(단, `seasonalThisMonth`는 다른 곳에서 쓰이면 유지).

- [ ] **Step 4: 통과 확인**

Run: `npm test && npx tsc --noEmit`
Expected: 전체 PASS. (전체 스위트를 돌려 회귀 확인.)

- [ ] **Step 5: 커밋**

```bash
git add src/view-types.ts src/app.ts tests/app.test.ts
git commit -m "refactor(view): AppView.seasonal 제거 (칩 목록 폐지 후 미사용)"
```

---

## Task 11: 스타일 — 테이프 축소 + 컨트롤 · 힌트 CSS (브라우저 실측)

**Files:**
- Modify: `src/style.css`

**Interfaces:** 없음(순수 표시). DESIGN.md 색 규율·칩 어휘 재사용.

- [ ] **Step 1: 테이프 축소**

`src/style.css`의 `.card::before`에서 크기를 줄인다(정확값은 Step 4 실측으로 확정, 시작값):

```css
.card::before {
  /* 19장으로 늘어난 목록에서 큰 테이프가 반복돼 시끄러워 살짝 줄인다 */
  width: 3.4rem;   /* was 4.6rem */
  height: 1rem;    /* was 1.3rem */
  top: -0.5rem;    /* 높이에 맞춰 */
}
```

- [ ] **Step 2: 컨트롤 · 힌트 스타일**

`src/style.css`에 추가(쪽빛 규율: 텍스트 `--ink`, 켜진 칩 배경 `--tint`; 박스·그라데이션 금지):

```css
.controls { display: flex; flex-direction: column; gap: var(--space-sm); margin-bottom: var(--space-lg); }
.search {
  width: 100%; background: var(--card); border: 1px solid var(--line); color: var(--ink);
  border-radius: var(--radius-crisp); padding: var(--space-sm) var(--space-md); font-size: var(--text-md);
}
.search::placeholder { color: var(--muted); }
.search:focus-visible { outline: 2px solid var(--ink); outline-offset: 0; border-color: transparent; }
.filter { display: flex; flex-wrap: wrap; gap: var(--space-xs); }
.fchip {
  font-size: var(--text-sm); padding: var(--space-2xs) var(--space-sm); border-radius: 99px;
  border: 1px solid var(--line); background: var(--card); color: var(--ink); cursor: pointer;
}
.fchip.on { background: var(--tint); border-color: var(--accent); }
.fchip:focus-visible { outline: 2px solid var(--ink); outline-offset: 1px; }
.sort { display: inline-flex; align-items: center; gap: var(--space-xs); color: var(--muted); font-size: var(--text-sm); }
.sort select {
  background: var(--card); border: 1px solid var(--line); color: var(--ink);
  border-radius: var(--radius-crisp); padding: var(--space-2xs) var(--space-sm); font-size: var(--text-sm);
}
.off-season { margin-top: var(--space-xl); }
.off-divider { color: var(--muted); font-size: var(--text-sm); border-top: 1px solid var(--line); padding-top: var(--space-md); }
.hint-list { list-style: none; margin: 0; padding: 0; }
.season-hint { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm) 0; color: var(--muted); }
.season-hint .hint-name { color: var(--ink); font-weight: 600; }
.hint-when { font-size: var(--text-sm); }
.hint-coming { margin-left: auto; font-size: var(--text-sm); color: var(--ink); }
```

> `--space-2xs`·`--space-md` 등 실제 토큰명은 `src/style.css`의 `:root`에서 확인해 맞춘다(design-tokens 스펙 기준). 없는 토큰은 가장 가까운 것으로.

- [ ] **Step 3: 옛 CSS 라디오 필터 규칙 제거**

`src/style.css`에서 `#f-fruit:checked ~ .list …`·`#f-veg:checked ~ …`(276~277줄 근방)와 관련 라디오 필터 규칙을 삭제(이제 JS 필터).

- [ ] **Step 4: 브라우저 실측 + 사인오프 (완료 게이트)**

```bash
npm run dev
```
브라우저에서 `/` 열어 확인:
- 19장 목록이 하락 큰 순으로, 테이프 축소가 시끄럽지 않은지.
- 검색창에 "오이"·"딸기"(비제철) 입력 → 카드/힌트 분기.
- 필터 칩 토글·상호배타(과일↔채소), 정렬 셀렉트.
- 빈 화면 두 문구.
- **무JS**: 개발자도구로 JS 비활성 후 새로고침 → 컨트롤 없이 정렬된 전체 목록이 보이는지.
- `prefers-reduced-motion` 무관(모션 추가 없음).

스크린샷으로 사용자 사인오프. 실측값(테이프 크기·간격)을 CSS에 확정 반영.

- [ ] **Step 5: 커밋**

```bash
git add src/style.css
git commit -m "style: 테이프 축소 + 검색·필터·정렬·힌트 스타일 (브라우저 실측 반영)"
```

---

## Task 12: 스토리북 + 문서 갱신

**Files:**
- Modify: `src/components/App.stories.tsx`
- Modify: `docs/제품-동작-지도.md`

- [ ] **Step 1: 스토리 갱신**

`App.stories.tsx`에서 `buildAppView` 헬퍼가 `searchIndex`를 포함하도록 반영(타입이 바뀌었으니 컴파일부터 맞춘다). 스토리 추가:
- 전체 목록(하락 큰 순, 7월 19종 픽스처).
- 검색 결과(제철 카드 + 비제철 힌트).
- 필터 적용 결과.
- 빈 결과(검색 무매치 / 필터 무매치).

`seasonal`을 참조하던 스토리가 있으면 제거.

Run: `npm run storybook` 로 각 상태를 눈으로 확인(노브).

- [ ] **Step 2: 제품 동작 지도 갱신**

`docs/제품-동작-지도.md`:
- **문 3(상위 5장)** 서술을 "전체 표시 + 검색·필터·정렬"로 갱신. "왜 5장만" 절(4절)은 "이제 전체를 보이고, 하락 큰 순으로 정렬한다"로 개정. 절정이 정렬 키가 아님을 명시.
- **9절 지렛대 지도**: `카드 장수(limit)` 줄 → "정렬/필터/검색은 `cardlist.ts`, 목록 전체는 `selectPicks`(cap 없음)"으로 갱신. 검색 범위 = 프로필 40종 전체(비제철 힌트) 추가. 조사일 줄 "· 전국 평균" 반영.

- [ ] **Step 3: 최종 게이트**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: 전체 PASS + 프리렌더 빌드 성공(정적 산출물에 전체 목록이 그려지는지).

- [ ] **Step 4: 커밋**

```bash
git add src/components/App.stories.tsx docs/제품-동작-지도.md
git commit -m "docs: 제품 동작 지도 갱신 + 전체 목록·검색 스토리"
```

---

## Self-Review (작성자 점검 결과)

**Spec coverage** — 스펙 결정 8가지 대응: ①전체표시 T1·T6, ②카드 현행+테이프축소 T11, ③기본정렬 하락큰순 T3·T6, ④검색 40종 T5·T6·T8, ⑤필터 T4·T7, ⑥정렬 컨트롤 T7, ⑦칩목록 제거 T9·T10, ⑧전국평균 라벨 T9. 빈화면·무JS·데이터정책문서 T8·T7·T12. 누락 없음.

**Placeholder scan** — 모든 코드 스텝에 실제 코드. `viewWithCards`/`viewWith` 테스트 헬퍼는 "기존 App.test.tsx 헬퍼 재사용, 없으면 buildAppView로 구성"으로 지정(구현자가 파일을 열어 확인) — 이 저장소 관례상 App.test.tsx에 이미 view 빌더가 있을 가능성이 높다. 실측 CSS 토큰명은 `:root` 확인 지시로 명시.

**Type consistency** — `Filter`·`SortMode`·`OffSeasonHint`는 T3~T5에서 cardlist 로컬 → T6에서 view-types로 이전(import 교체)까지 경로 명시. `sortCards`/`filterCards`/`searchCards`/`searchHints`/`signedChange`/`seasonLabel` 시그니처가 태스크 간 일치. `selectPicks` 3-인자 시그니처 T1 확정 후 T6 호출부 일치.
