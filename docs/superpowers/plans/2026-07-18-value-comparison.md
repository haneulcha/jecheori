# 값어치 비교(평년 대비) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카드 머리기사를 "지난달 대비 등락"에서 "값어치(평년 대비, 폴백 사슬)"로 바꾸고, 펼침 그래프를 최근 4점 궤적 + 평년/작년으로 재설계한다. 정렬·필터는 지난달 공통 축으로 유지한다.

**Architecture:** 수집(`parse-kamis`)이 dpr3·4·7을 baseline에 추가(schema 3). 순수 로직 `picks.valueComparison`이 평년→작년→지난달 폴백으로 표시용 비교를 만들고, `card.toChange`가 basisLabel을 실어 표시한다. 정렬·필터는 별도로 실린 `monthAgoPct`(지난달)로 동작해 **표시(값어치)와 정렬(지난달) 축을 분리**한다. 그래프는 `card.toSpark`(최근 4점 + 평년/작년) + `Sparkline` 재작성.

**Tech Stack:** TanStack Start (React 19) · Vite · Vitest + RTL · 순수 CSS 변수 · Node ESM 수집 스크립트.

## Global Constraints

- node ≥ 22.
- 완료 게이트 = `npm test` **와** `npx tsc --noEmit` 둘 다 통과.
- 사용자 문구 한국어·담백, 이커머스 화법·느낌표 금지 (DESIGN.md).
- 색 규율: 텍스트는 쪽빛 `--ink`(보조 `--muted`)만; 웜 컬러는 배경으로만. 값어치는 **색이 아니라 문구·부호**로.
- 공개 페이지: 런타임 외부요청 없음. KAMIS 키는 코드·저장소에 절대 없음(CI 시크릿). 로컬 재수집 불가 → 재수집은 CI.
- KAMIS 매칭·기준선은 dpr 라벨 의미로 (parse-kamis 주석의 dpr 표: dpr3=1주 dpr4=2주 dpr5=1달 dpr6=1년 dpr7=평년).
- 순수 로직은 `picks/card/app/season/cardlist`, 표시는 `components`. 테스트: 순수는 `tests/`, 컴포넌트는 `src/components/*.test.tsx`(+`// @vitest-environment jsdom`, 라우터 필요시 `renderWithRouter`).
- **축 분리 (핵심 불변식):** 표시 머리기사 = 값어치(평년 폴백, `card.price.change` + `basisLabel`). 정렬·필터 = 지난달(`card.price.monthAgoPct`). cardlist가 표시용 `change`로 정렬/거르면 축이 섞인다 — 반드시 `monthAgoPct`.

---

## File Structure

| 파일 | 책임 | 변경 |
|---|---|---|
| `src/types.ts` | `Baseline` 5필드, `schemaVersion` 3 | 수정 |
| `scripts/lib/parse-kamis.mjs` | dpr3·4·7 저장, schema 3 | 수정 |
| `src/picks.ts` | `valueComparison`(폴백), `PriceView`에 comparison+monthAgoPct | 수정 |
| `src/card.ts` | `ChangeView` basisLabel, `toChange`(값어치), `PriceCardView.monthAgoPct`, `SparkView`+`toSpark`(4점) | 수정 |
| `src/cardlist.ts` | `signedChange`·`PRED.drop`이 `monthAgoPct` 사용 | 수정 |
| `src/components/PriceBlock.tsx` | 하드코딩 라벨 → `change.basisLabel` | 수정 |
| `src/components/Sparkline.tsx` | 4점 궤적 + 평년 점선 + 각주 재작성 | 수정 |
| `src/style.css` | 스파크 평년선·각주 스타일 | 수정 |
| `src/components/App.stories.tsx` | 값어치·그래프 상태 | 수정 |
| `docs/제품-동작-지도.md` | 값어치·축 분리·5기준선 | 수정 |

---

## Task 1: `Baseline` 5필드 + `parse-kamis` dpr3·4·7 + schema 3

**Files:**
- Modify: `src/types.ts` (`Baseline`)
- Modify: `scripts/lib/parse-kamis.mjs`
- Test: `tests/parse-kamis.test.js`, `tests/prices-snapshot.test.ts`
- Modify (fixture factories): `tests/picks.test.ts`, `tests/app.test.ts`, `tests/card.test.ts`가 만드는 `Baseline` 리터럴

**Interfaces:**
- Produces: `Baseline`가 `weekAgo`·`twoWeeksAgo`·`monthAgo`·`yearAgo`·`normalYear`(각 `number | null`). 스냅샷 `schemaVersion: 3`.

- [ ] **Step 1: parse-kamis 실패 테스트**

`tests/parse-kamis.test.js`에 dpr3·4·7 매핑을 검증 추가(기존 픽스처 `kamis-daily-200.json`이 dpr1~7 보유):

```js
test('baseline에 1주·2주·평년(dpr3·4·7)을 담는다', () => {
  const snap = parseKamisDaily(fixture) // 기존 파서 진입점 이름에 맞춘다
  const e = snap.entries.find((x) => x.itemName === '배추')
  expect(e.baseline.weekAgo).not.toBeUndefined()
  expect(e.baseline.twoWeeksAgo).not.toBeUndefined()
  expect(e.baseline.normalYear).not.toBeUndefined()
})
test('schemaVersion은 3', () => {
  expect(parseKamisDaily(fixture).schemaVersion).toBe(3)
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/parse-kamis.test.js`
Expected: FAIL — 필드/스키마 아직 2.

- [ ] **Step 3: `Baseline` 확장 + parse-kamis 구현**

`src/types.ts`의 `Baseline`:

```ts
export interface Baseline {
  weekAgo: number | null      // dpr3
  twoWeeksAgo: number | null  // dpr4
  monthAgo: number | null     // dpr5
  yearAgo: number | null      // dpr6
  normalYear: number | null   // dpr7 평년 — 그 날짜의 역대 평균가
}
```

`scripts/lib/parse-kamis.mjs`의 baseline 조립부:

```js
baseline: {
  weekAgo: parseNum(it.dpr3),
  twoWeeksAgo: parseNum(it.dpr4),
  monthAgo: parseNum(it.dpr5),
  yearAgo: parseNum(it.dpr6),
  normalYear: parseNum(it.dpr7),
},
```

그리고 스냅샷 조립의 `schemaVersion`을 `3`으로.

- [ ] **Step 4: 순수 테스트의 Baseline 리터럴 갱신**

`tests/picks.test.ts`의 `entry()`, `tests/app.test.ts`의 `snap()`/PriceEntry 헬퍼, `tests/card.test.ts`가 만드는 `baseline` 리터럴에 새 3필드를 추가한다(값은 테스트 의미에 맞게, 기본은 `weekAgo: null, twoWeeksAgo: null, normalYear: null`). `prices-snapshot.test.ts`의 schema 기대값 3으로.

예 — `tests/picks.test.ts` `entry()`:

```ts
baseline: { weekAgo: null, twoWeeksAgo: null, monthAgo: 1000, yearAgo: 1000, normalYear: null },
```

- [ ] **Step 5: 게이트**

Run: `npm test && npx tsc --noEmit`
Expected: PASS. (실데이터 `public/data/prices.json`은 아직 schema 2 — `as unknown as PriceSnapshot` 캐스팅이라 컴파일은 통과. 런타임 결측은 이후 태스크의 `?? null`이 흡수.)

- [ ] **Step 6: 커밋**

```bash
git add src/types.ts scripts/lib/parse-kamis.mjs tests/parse-kamis.test.js tests/prices-snapshot.test.ts tests/picks.test.ts tests/app.test.ts tests/card.test.ts
git commit -m "feat(prices): baseline에 1주·2주·평년(dpr3·4·7) 수집 + schema 3"
```

---

## Task 2: `valueComparison` (picks.ts) — 평년→작년→지난달 폴백

**Files:**
- Modify: `src/picks.ts`
- Test: `tests/picks.test.ts`

**Interfaces:**
- Consumes: `Baseline`(Task 1).
- Produces:
  - `CompareBasis = 'normalYear' | 'yearAgo' | 'monthAgo'`
  - `ValueComparison { basis: CompareBasis; basisLabel: string; pct: number }`
  - `valueComparison(price: number, b: Baseline): ValueComparison | null` — 첫 non-null 기준(평년→작년→지난달) 대비 %. 다 null이면 null.
  - `PriceView`에 `comparison: ValueComparison | null` 추가. 기존 `changeVsMonthAgoPct` **유지**(정렬·필터용).

- [ ] **Step 1: 실패 테스트**

`tests/picks.test.ts`에:

```ts
import { valueComparison } from '../src/picks'

const base = (over: Partial<Baseline> = {}): Baseline =>
  ({ weekAgo: null, twoWeeksAgo: null, monthAgo: null, yearAgo: null, normalYear: null, ...over })

describe('valueComparison', () => {
  test('평년 우선', () => {
    expect(valueComparison(80, base({ normalYear: 100, yearAgo: 90, monthAgo: 95 })))
      .toEqual({ basis: 'normalYear', basisLabel: '평년', pct: -20 })
  })
  test('평년 없으면 작년', () => {
    expect(valueComparison(88, base({ yearAgo: 100, monthAgo: 95 })))
      .toEqual({ basis: 'yearAgo', basisLabel: '작년', pct: -12 })
  })
  test('평년·작년 없으면 지난달', () => {
    expect(valueComparison(95, base({ monthAgo: 100 })))
      .toEqual({ basis: 'monthAgo', basisLabel: '지난달', pct: -5 })
  })
  test('다 없으면 null', () => {
    expect(valueComparison(100, base())).toBeNull()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/picks.test.ts`
Expected: FAIL — `valueComparison` 미정의.

- [ ] **Step 3: 구현**

`src/picks.ts`:

```ts
export type CompareBasis = 'normalYear' | 'yearAgo' | 'monthAgo'
export interface ValueComparison {
  basis: CompareBasis
  basisLabel: string
  pct: number // (price - base)/base*100, 음수 = 기준보다 쌈
}

const BASIS_ORDER: { key: CompareBasis; label: string }[] = [
  { key: 'normalYear', label: '평년' },
  { key: 'yearAgo', label: '작년' },
  { key: 'monthAgo', label: '지난달' },
]

/** 평년→작년→지난달 순 첫 non-null 기준 대비 비교. 다 없으면 null. */
export function valueComparison(price: number, b: Baseline): ValueComparison | null {
  for (const { key, label } of BASIS_ORDER) {
    const ref = b[key]
    if (ref !== null && ref !== undefined) {
      return { basis: key, basisLabel: label, pct: ((price - ref) / ref) * 100 }
    }
  }
  return null
}
```

`PriceView` 인터페이스에 `comparison: ValueComparison | null` 추가. `priceView(entry)`가 이를 채운다:

```ts
comparison: valueComparison(entry.price, entry.baseline),
```

`changeVsMonthAgoPct`는 그대로 둔다(정렬·필터용).

- [ ] **Step 4: 게이트**

Run: `npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/picks.ts tests/picks.test.ts
git commit -m "feat(picks): valueComparison — 평년→작년→지난달 폴백 (표시용)"
```

---

## Task 3: `card.ts` — `ChangeView` basisLabel + `toChange`(값어치) + `PriceCardView.monthAgoPct`

**Files:**
- Modify: `src/card.ts`
- Test: `tests/card.test.ts`

**Interfaces:**
- Consumes: `ValueComparison`(Task 2), `PriceView.comparison`, `PriceView.changeVsMonthAgoPct`.
- Produces:
  - `ChangeView` 케이스에 `basisLabel: string` 추가(similar 포함).
  - `toChange(comparison: ValueComparison | null): ChangeView` — 값어치 비교에서 파생.
  - `PriceCardView`에 `monthAgoPct: number | null` 추가(= `changeVsMonthAgoPct`, 정렬·필터용).

- [ ] **Step 1: 실패 테스트**

`tests/card.test.ts`에:

```ts
import { toChange } from '../src/card'

describe('toChange (값어치)', () => {
  test('아래면 fall + basisLabel', () =>
    expect(toChange({ basis: 'normalYear', basisLabel: '평년', pct: -20 }))
      .toEqual({ kind: 'fall', pct: 20, basisLabel: '평년' }))
  test('위면 rise', () =>
    expect(toChange({ basis: 'yearAgo', basisLabel: '작년', pct: 9 }))
      .toEqual({ kind: 'rise', pct: 9, basisLabel: '작년' }))
  test('±1% 미만은 similar', () =>
    expect(toChange({ basis: 'monthAgo', basisLabel: '지난달', pct: 0.4 }))
      .toEqual({ kind: 'similar', basisLabel: '지난달' }))
  test('null이면 null', () => expect(toChange(null)).toBeNull())
})
```

또한 `toCardView`가 `monthAgoPct`를 싣는지 확인하는 테스트(기존 card.test 스타일에 맞춰): `changeVsMonthAgoPct: -25` → `card.price.monthAgoPct === -25`.

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/card.test.ts`
Expected: FAIL.

- [ ] **Step 3: 구현**

`ChangeView`에 basisLabel 추가:

```ts
export type ChangeView =
  | { kind: 'fall'; pct: number; basisLabel: string }
  | { kind: 'rise'; pct: number; basisLabel: string }
  | { kind: 'similar'; basisLabel: string }
  | null
```

`toChange`를 값어치 비교에서 파생하도록 교체(기존 `toChange(pct)`를 대체):

```ts
function toChange(c: ValueComparison | null): ChangeView {
  if (c === null) return null
  if (Math.abs(c.pct) < 1) return { kind: 'similar', basisLabel: c.basisLabel }
  const rounded = Math.round(Math.abs(c.pct))
  return c.pct < 0
    ? { kind: 'fall', pct: rounded, basisLabel: c.basisLabel }
    : { kind: 'rise', pct: rounded, basisLabel: c.basisLabel }
}
```

`PriceCardView`에 `monthAgoPct: number | null` 추가. `toPriceCardView(v: PriceView)`가:
- `change: toChange(v.comparison)` (값어치)
- `monthAgoPct: v.changeVsMonthAgoPct` (지난달, 정렬·필터용)
`wasMonthAgo`는 이미 표시에서 뺐으니(폴리시 라운드) 유지하되 렌더 안 함 — 또는 제거해도 됨(소비자 없음 확인). `spark`는 Task 4에서.

- [ ] **Step 4: 게이트**

Run: `npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/card.ts tests/card.test.ts
git commit -m "feat(card): 값어치 ChangeView(basisLabel) + monthAgoPct(정렬·필터용) 분리"
```

---

## Task 4: `card.ts` — `SparkView` + `toSpark` (최근 4점 + 평년/작년)

**Files:**
- Modify: `src/card.ts`
- Test: `tests/card.test.ts`

**Interfaces:**
- Produces:
  - `SparkView { points: { label: string; value: number }[]; levels: number[]; normalYear: number | null; yearAgo: number | null }`
  - `toSpark(price: number, b: Baseline): SparkView | null` — 최근 궤적 `[1달, 2주, 1주, 지금]` 중 존재하는 점. 점 2개 미만이면 null. `sparklineLevels`로 상대위치.

- [ ] **Step 1: 실패 테스트**

`tests/card.test.ts`에:

```ts
import { toSpark } from '../src/card'

const b = (o: Partial<Baseline> = {}): Baseline =>
  ({ weekAgo: null, twoWeeksAgo: null, monthAgo: null, yearAgo: null, normalYear: null, ...o })

describe('toSpark (최근 4점)', () => {
  test('존재하는 최근 점을 시간순 [1달,2주,1주,지금]으로', () => {
    const s = toSpark(3513, b({ monthAgo: 3698, twoWeeksAgo: 3818, weekAgo: 3622, normalYear: 4473, yearAgo: 4622 }))!
    expect(s.points.map((p) => p.label)).toEqual(['1달 전', '2주 전', '1주 전', '지금'])
    expect(s.points.map((p) => p.value)).toEqual([3698, 3818, 3622, 3513])
    expect(s.normalYear).toBe(4473)
    expect(s.yearAgo).toBe(4622)
    expect(s.levels).toHaveLength(4)
  })
  test('결측 점은 건너뛴다', () => {
    const s = toSpark(100, b({ monthAgo: 120, weekAgo: 110 }))!
    expect(s.points.map((p) => p.label)).toEqual(['1달 전', '1주 전', '지금'])
  })
  test('점 2개 미만이면 null', () => {
    expect(toSpark(100, b())).toBeNull()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/card.test.ts`
Expected: FAIL.

- [ ] **Step 3: 구현**

`SparkView` 교체 + `toSpark` 재작성(`sparklineLevels`는 재사용):

```ts
export interface SparkView {
  points: { label: string; value: number }[]
  levels: number[]              // 각 point의 상대위치 0~1
  normalYear: number | null     // 평년 기준선
  yearAgo: number | null        // 작년 각주
}

function toSpark(price: number, b: Baseline): SparkView | null {
  const seq: { label: string; value: number | null }[] = [
    { label: '1달 전', value: b.monthAgo },
    { label: '2주 전', value: b.twoWeeksAgo },
    { label: '1주 전', value: b.weekAgo },
    { label: '지금', value: price },
  ]
  const points = seq.filter((p): p is { label: string; value: number } => p.value !== null && p.value !== undefined)
  if (points.length < 2) return null
  return {
    points,
    levels: sparklineLevels(points.map((p) => p.value)),
    normalYear: b.normalYear ?? null,
    yearAgo: b.yearAgo ?? null,
  }
}
```

`sparklineLevels`가 현재 `{yearAgo, monthAgo, now}` 시그니처면 배열 입력으로 일반화한다(min/max 정규화 로직은 동일). `toPriceCardView`가 `spark: toSpark(v.price, v.baseline)`를 싣도록.

- [ ] **Step 4: 게이트**

Run: `npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/card.ts tests/card.test.ts
git commit -m "feat(card): toSpark 재설계 — 최근 4점 궤적 + 평년/작년"
```

---

## Task 5: `cardlist.ts` — 정렬·필터를 `monthAgoPct`로 (지난달 축 고정)

**Files:**
- Modify: `src/cardlist.ts`
- Test: `tests/cardlist.test.ts`

**Interfaces:**
- Consumes: `PriceCardView.monthAgoPct`(Task 3).
- Produces: `signedChange`·`sortCards('drop')`·`filterCards('drop')`가 표시용 `change`(값어치)가 아니라 `monthAgoPct`(지난달)로 동작. `SortMode`·`Filter`는 불변.

- [ ] **Step 1: 실패 테스트 (축 분리 회귀 방지)**

`tests/cardlist.test.ts`에 — 표시 change(값어치)와 monthAgoPct(지난달)가 다를 때 정렬·필터가 **지난달**을 따르는지:

```ts
// change(값어치)는 rise(평년보다 비쌈)이지만 monthAgoPct는 하락(-5) → 정렬/필터는 지난달을 봐야 한다
function card2(name: string, monthAgoPct: number | null, change: any): CardView {
  return card({ name, price: { now: 100, wasMonthAgo: null, unit: count(1, '개'), perUnit: null, monthAgoPct, change, spark: null } })
}
test('drop 정렬·필터는 monthAgoPct(지난달) 기준 — 표시 값어치와 무관', () => {
  const cards = [
    card2('평년비쌈-지난달하락', -12, { kind: 'rise', pct: 3, basisLabel: '평년' }),
    card2('평년쌈-지난달상승', 8, { kind: 'fall', pct: 20, basisLabel: '평년' }),
  ]
  expect(sortCards(cards, 'drop').map((c) => c.name)).toEqual(['평년비쌈-지난달하락', '평년쌈-지난달상승'])
  expect(filterCards(cards, new Set(['drop'])).map((c) => c.name)).toEqual(['평년비쌈-지난달하락'])
})
```

> `card()` 헬퍼의 price 픽스처에 `monthAgoPct`가 이제 필요하다 — 헬퍼 기본값에 `monthAgoPct: null` 추가.

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/cardlist.test.ts`
Expected: FAIL — 아직 `change`(값어치)로 정렬/거름.

- [ ] **Step 3: 구현**

`signedChange`가 `monthAgoPct`를 읽도록:

```ts
/** 정렬·필터용 지난달 등락(하락 음수). 없으면 null. (표시 change=값어치와 별개 축) */
export function signedChange(card: CardView): number | null {
  return card.price?.monthAgoPct ?? null
}
```

`dropGroup`은 그대로(무가격 2, monthAgoPct null 1, 있으면 0). `PRED.drop`:

```ts
drop: (c) => (c.price?.monthAgoPct ?? 0) < 0,
```

- [ ] **Step 4: 게이트**

Run: `npm test && npx tsc --noEmit`
Expected: PASS. (기존 cardlist 테스트 중 `change` 기반 정렬 기대가 있으면 monthAgoPct로 갱신.)

- [ ] **Step 5: 커밋**

```bash
git add src/cardlist.ts tests/cardlist.test.ts
git commit -m "feat(cardlist): 정렬·필터를 monthAgoPct(지난달)로 — 표시 값어치와 축 분리"
```

---

## Task 6: `PriceBlock.tsx` — 동적 basisLabel

**Files:**
- Modify: `src/components/PriceBlock.tsx`
- Test: `src/components/PriceBlock.test.tsx`

**Interfaces:**
- Consumes: `ChangeView.basisLabel`(Task 3).
- Produces: 비교 줄이 `{basisLabel} 대비` + 칩, similar이면 `{basisLabel}과 비슷`. 레이아웃 불변.

- [ ] **Step 1: 실패 테스트**

`src/components/PriceBlock.test.tsx` 갱신 — 하드코딩 "지난달" 대신 basisLabel:

```tsx
test('평년 기준이면 "평년 대비" 라벨 + 칩', () => {
  const { container } = render(
    <PriceBlock price={{ now: 3513, wasMonthAgo: null, unit: g100, perUnit: null, monthAgoPct: -5, change: { kind: 'fall', pct: 21, basisLabel: '평년' }, spark: null }} />,
  )
  expect(container.querySelector('.compare')?.textContent).toContain('평년 대비')
  expect(container.textContent).toContain('21%')
})
test('작년 폴백이면 "작년 대비"', () => {
  const { container } = render(
    <PriceBlock price={{ now: 100, wasMonthAgo: null, unit: g100, perUnit: null, monthAgoPct: null, change: { kind: 'fall', pct: 12, basisLabel: '작년' }, spark: null }} />,
  )
  expect(container.querySelector('.compare')?.textContent).toContain('작년 대비')
})
test('similar이면 "{기준}과 비슷"', () => {
  const { container } = render(
    <PriceBlock price={{ now: 100, wasMonthAgo: null, unit: g100, perUnit: null, monthAgoPct: 0, change: { kind: 'similar', basisLabel: '평년' }, spark: null }} />,
  )
  expect(container.textContent).toContain('평년과 비슷')
})
```

기존 "지난달 대비" 하드코딩 기대 테스트는 위로 대체.

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/PriceBlock.test.tsx`
Expected: FAIL.

- [ ] **Step 3: 구현**

`PriceBlock.tsx`에서 하드코딩 `지난달 대비`/`지난달과 비슷`을 `change.basisLabel`로:

```tsx
{chip && (
  <span className="compare">
    <span className="cmp-label">{p.change.basisLabel} 대비</span>
    {chip}
  </span>
)}
{p.change?.kind === 'similar' && <span className="near">{p.change.basisLabel}과 비슷</span>}
```

(`p.change`가 fall/rise일 때 `basisLabel` 접근 — 타입 좁히기 위해 chip 계산에서 change 참조. 필요시 `const ch = p.change`로 지역 바인딩.)

- [ ] **Step 4: 게이트**

Run: `npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/components/PriceBlock.tsx src/components/PriceBlock.test.tsx
git commit -m "feat(price-block): 비교 라벨 동적화 (평년/작년/지난달 대비)"
```

---

## Task 7: `Sparkline.tsx` — 4점 궤적 + 평년 점선 + 각주

**Files:**
- Modify: `src/components/Sparkline.tsx`
- Modify: `src/style.css`
- Test: `src/components/Sparkline.test.tsx` (없으면 신설) 또는 `App.test.tsx` 경유

**Interfaces:**
- Consumes: `SparkView`(Task 4: points·levels·normalYear·yearAgo).
- Produces: N점(2~4) 폴리라인 + 평년 수평 점선(+"평년" 라벨) + 하단 각주("평년 X원 · 작년 이맘때 Y원"). x 등간격.

- [ ] **Step 1: 실패 테스트**

`src/components/Sparkline.test.tsx` (`// @vitest-environment jsdom`):

```tsx
import { render } from '@testing-library/react'
import { Sparkline } from './Sparkline'

test('4점 궤적 + 평년 점선 + 각주 렌더', () => {
  const { container } = render(
    <Sparkline spark={{
      points: [
        { label: '1달 전', value: 3698 }, { label: '2주 전', value: 3818 },
        { label: '1주 전', value: 3622 }, { label: '지금', value: 3513 },
      ],
      levels: [0.6, 1, 0.36, 0.28], normalYear: 4473, yearAgo: 4622,
    }} />,
  )
  expect(container.querySelectorAll('polyline').length).toBe(1)
  expect(container.querySelectorAll('.pt').length).toBe(4)
  expect(container.querySelector('.norm-line')).not.toBeNull() // 평년 점선
  expect(container.textContent).toContain('평년')
  expect(container.textContent).toContain('4,473')
  expect(container.textContent).toContain('4,622') // 작년 각주
})
test('평년 없으면 점선·각주 항목 없음', () => {
  const { container } = render(
    <Sparkline spark={{ points: [{ label: '1주 전', value: 110 }, { label: '지금', value: 100 }], levels: [1, 0], normalYear: null, yearAgo: null }} />,
  )
  expect(container.querySelector('.norm-line')).toBeNull()
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/Sparkline.test.tsx`
Expected: FAIL.

- [ ] **Step 3: 구현**

`Sparkline.tsx` 재작성 — N점 등간격, `levels`로 y, 평년선은 `normalYear`를 같은 스케일로 투영:

```tsx
import type { SparkView } from '../card'

const won = (x: number) => x.toLocaleString('ko-KR')
const VW = 300, VH = 76, PAD_X = 24, FLOOR = 48, RISE = 32

export function Sparkline({ spark: s }: { spark: SparkView }) {
  const n = s.points.length
  const x = (i: number) => PAD_X + i * ((VW - 2 * PAD_X) / (n - 1))
  const y = (level: number) => FLOOR - level * RISE
  // 평년을 points와 같은 min/max 스케일로 투영 (levels가 이미 정규화된 것과 동일 기준)
  const vals = s.points.map((p) => p.value)
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1
  const normLevel = s.normalYear !== null ? (s.normalYear - min) / span : null
  const pts = s.points.map((p, i) => `${x(i)},${y(s.levels[i]).toFixed(1)}`).join(' ')
  const label = '가격 추이: ' + s.points.map((p) => `${p.label} ${won(p.value)}`).join(' · ')
  return (
    <div className="spark num">
      <svg viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label={label}>
        {normLevel !== null && (
          <>
            <line className="norm-line" x1={PAD_X} y1={y(normLevel).toFixed(1)} x2={VW - PAD_X} y2={y(normLevel).toFixed(1)} />
            <text className="norm-lab" x={VW - PAD_X} y={(y(normLevel) - 3).toFixed(1)} textAnchor="end">평년</text>
          </>
        )}
        <polyline className="trend" points={pts} />
        {s.points.map((p, i) => (
          <circle key={i} className={`pt${i === n - 1 ? ' now' : ''}`} cx={x(i)} cy={y(s.levels[i]).toFixed(1)} r={i === n - 1 ? 2.3 : 1.9} />
        ))}
        {s.points.map((p, i) => (
          <text key={i} className={`lab${i === n - 1 ? ' now' : ''}`} x={x(i)} y={VH - 4} textAnchor="middle">{p.label}</text>
        ))}
      </svg>
      {(s.normalYear !== null || s.yearAgo !== null) && (
        <p className="spark-foot">
          {s.normalYear !== null && <span>평년 <b>{won(s.normalYear)}원</b></span>}
          {s.yearAgo !== null && <span>작년 이맘때 <b>{won(s.yearAgo)}원</b></span>}
        </p>
      )}
    </div>
  )
}
```

`src/style.css`에 `.norm-line`(점선 muted: `stroke: var(--muted); stroke-width: .8; stroke-dasharray: 3 2;`), `.norm-lab`(작은 muted), `.spark-foot`(muted, flex gap, `b`는 ink) 추가. 기존 `.spark .val`(점 위 숫자)은 4점이라 겹치면 제거하거나 유지 판단 — 겹치면 라벨만 남기고 값 텍스트는 뺀다(브라우저 실측에서 결정).

- [ ] **Step 4: 게이트**

Run: `npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/components/Sparkline.tsx src/components/Sparkline.test.tsx src/style.css
git commit -m "feat(sparkline): 최근 4점 궤적 + 평년 점선 + 작년/평년 각주"
```

---

## Task 8: 스토리 + 문서 + 브라우저 실측

**Files:**
- Modify: `src/components/App.stories.tsx`
- Modify: `docs/제품-동작-지도.md`

- [ ] **Step 1: 스토리**

`App.stories.tsx`의 픽스처가 새 `PriceCardView`(monthAgoPct·값어치 change·4점 spark)·`Baseline`(5필드)를 반영하도록 갱신. 상태 추가: 평년보다 쌈 / 평년보다 비쌈(담담) / 작년 폴백 / 무비교 / 그래프(4점+평년선).

Run: `npm run storybook`로 눈 확인.

- [ ] **Step 2: 제품-동작-지도 갱신**

`docs/제품-동작-지도.md` 5·6절: 값어치(평년 대비) 머리기사 + 폴백 사슬, **축 분리**(표시=값어치, 정렬·필터=지난달) 명시. 기준선 2→5종. 지렛대 지도에 `picks.valueComparison`·`card.toSpark`. **"평년 대비 ≠ 연중 최저 철"** 한계 한 줄.

- [ ] **Step 3: 최종 게이트 + 빌드**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: 전체 PASS + 프리렌더 성공.

- [ ] **Step 4: 브라우저 실측 (컨트롤러)**

`npm run dev` — 값어치 머리기사 4상태(평년 쌈/비쌈/작년 폴백/무비교), 정렬 지난달 하락 순 유지, 필터 "가격 하락"(지난달), 펼침 그래프(4점·평년 점선·각주), 색 규율. **현재 커밋된 prices.json은 schema 2라 평년·1주·2주가 없어 대부분 "지난달 대비"로 폴백됨** — 이는 정상(CI 재수집 전). 폴백 동작 자체를 확인하고, 값어치 상태는 스토리/픽스처로 확인. 스크린샷 사인오프.

- [ ] **Step 5: 커밋**

```bash
git add src/components/App.stories.tsx docs/제품-동작-지도.md
git commit -m "docs: 값어치·축 분리·그래프 반영 + 스토리"
```

---

## Self-Review (작성자 점검)

**Spec coverage** — 스펙 결정: ①값어치 폴백 T2·T3·T6, ②레이아웃 불변 T6, ③정렬·필터 지난달(축 분리) T3·T5, ④필터 유지 T5, ⑤그래프 4점+평년/작년 T4·T7, ⑥데이터 dpr3·4·7 T1. 한계(연중 최저 철 아님) T8 문서. 누락 없음.

**Placeholder scan** — 코드 스텝에 실제 코드. parse-kamis 진입점 함수명·`card()`/`entry()`/`snap()` 헬퍼는 "기존 파일 확인해 맞춘다"로 지정(구현자가 열어 확인) — 이름이 파일마다 있으니 안전.

**Type consistency** — `ValueComparison`/`CompareBasis`(T2) → `toChange`(T3) → `PriceBlock`(T6) 일관. `monthAgoPct`가 T3에서 `PriceCardView`에 추가되고 T5·T6 픽스처가 참조 — 순서 맞음. `SparkView`(T4) → `Sparkline`(T7) 필드 일치(points·levels·normalYear·yearAgo). `signedChange`가 `change`→`monthAgoPct`로 바뀌는 지점(T5)이 축 분리 불변식과 일치.
