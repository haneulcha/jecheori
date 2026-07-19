# 다가오는 제철 풀 카드 싱크 · 드로워 정리 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/coming`(다가오는 제철) 페이지를 메인과 같은 `ProduceCard`로 싱크하고(간트·펼침·영양·레시피 동일), 가격은 작년 같은 시기 씨앗으로 "작년 기준" 한 줄만 붙이며, 램프줄 드로워를 목차 링크로 정리한다.

**Architecture:** 순수 로직은 `picks`/`card`/`app`, 표시는 `components`(CLAUDE.md 경계). 가격은 기존 `PriceCardView`를 그대로 재사용 — `now`=작년가격·`unit` 그대로, "작년 기준"은 `ChangeView` 유니온에 케이스 하나만 더한다. 작년 가격은 씨앗형 데이터(`coming-prices.json`)로 상시 CI 없이 1회 수집.

**Tech Stack:** TanStack Start (React 19), Vite, Vitest + RTL(jsdom), 순수 CSS 변수, KAMIS `dailyPriceByCategoryList`(과거 소급 조회).

## Global Constraints

- node ≥ 22.
- 사용자 문구는 한국어·담백한 톤. 이커머스 화법 금지.
- **완료 게이트 = `npm test` 와 `npx tsc --noEmit` 둘 다 통과.**
- 순수 로직 테스트는 `tests/`에 `'../src/…'` 임포트. 컴포넌트 테스트는 `src/components/*.test.tsx` + 상단 `// @vitest-environment jsdom`. `<Link>` 있으면 `src/test-utils.tsx`의 `renderWithRouter`.
- 테스트 픽스처도 유효 타입값: `KamisRef.categoryCode`는 `'100' | '200' | '400'`.
- **공개 데이터를 지어내지 않는다.** `coming-prices.json`은 실제 KAMIS 소급 수집물(사용자가 로컬에서 1회 수집). 테스트는 인라인 타입 픽스처만 쓴다.
- KAMIS 키는 코드·저장소에 절대 넣지 않는다 (CI 시크릿 `KAMIS_CERT_KEY`/`KAMIS_CERT_ID`).
- KAMIS 매칭은 품목 코드가 아니라 `itemName` 문자열로.
- 순수는 `picks`/`card`/`app`, 표시는 `components`. 컴포넌트는 사용자 텍스트를 직접 이스케이프하지 않는다.
- UI·CSS·인터랙션 변경은 브라우저로 실측(마지막 태스크).

---

### Task 1: `ChangeView`에 `basis` 케이스 + `PriceBlock` "작년 기준" 렌더

**Files:**
- Modify: `src/card.ts` (ChangeView 유니온, 18-22행 부근)
- Modify: `src/components/PriceBlock.tsx`
- Test: `src/components/PriceBlock.test.tsx`

**Interfaces:**
- Consumes: 기존 `PriceCardView`(card.ts).
- Produces: `ChangeView`에 새 케이스 `{ kind: 'basis'; basisLabel: string }`. `PriceBlock`이 이 케이스에서 칩·화살표 없이 `{basisLabel} 기준` 한 줄을 그린다.

- [ ] **Step 1: 실패 테스트 추가** — `src/components/PriceBlock.test.tsx` 하단에 아래 케이스를 더한다.

```tsx
test('change.kind가 basis면 "작년 기준"만 그리고 등락 칩·화살표는 없다', () => {
  const price: PriceCardView = {
    now: 3200,
    wasMonthAgo: null,
    unit: count(1),
    perUnit: null,
    change: { kind: 'basis', basisLabel: '작년' },
    monthAgoPct: null,
    spark: null,
  }
  const { container } = render(<PriceBlock price={price} />)
  expect(container.textContent).toContain('작년 기준')
  expect(container.textContent).toContain('3,200')
  expect(container.querySelector('.chip')).toBeNull()
  expect(container.querySelector('.arrow')).toBeNull()
})
```

파일 상단 임포트에 `count`가 없으면 추가한다: `import { count } from '../../tests/units'` (기존 테스트가 쓰는 헬퍼와 동일 경로를 따른다 — 파일 상단의 기존 임포트를 확인하고 맞춘다).

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/PriceBlock.test.tsx -t "작년 기준"`
Expected: FAIL — `change.kind: 'basis'`가 타입에 없거나(tsc) 라벨이 안 그려짐.

- [ ] **Step 3: `ChangeView`에 케이스 추가** — `src/card.ts`의 `ChangeView` 유니온을 아래로 바꾼다.

```ts
export type ChangeView =
  | { kind: 'fall'; pct: number; basisLabel: string } // 칩 ↓, 큰가격 쪽빛
  | { kind: 'rise'; pct: number; basisLabel: string } // 칩 ↑, 큰가격 러스트
  | { kind: 'similar'; basisLabel: string } // "비슷" 문구, 칩 없음
  | { kind: 'basis'; basisLabel: string } // "작년 기준" 출처만(다가오는 예고) — 칩·%·화살표 없음
  | null // 비교 기준 없음 → 칩·문구 없음
```

- [ ] **Step 4: `PriceBlock`에 렌더 추가** — `src/components/PriceBlock.tsx`에서 `similar` 줄 바로 아래에 한 줄을 더한다. (`.near` 스타일 재사용 — 중립 muted. `dir`은 basis에서 기존대로 `'fall'`이 되어 큰 숫자는 중립 ink, 색 왜곡 없음.)

```tsx
      {p.change?.kind === 'similar' && p.change && <span className="near">{p.change.basisLabel}과 비슷</span>}
      {p.change?.kind === 'basis' && <span className="near">{p.change.basisLabel} 기준</span>}
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/components/PriceBlock.test.tsx`
Expected: PASS (신규 + 기존 모두).

- [ ] **Step 6: 타입 게이트**

Run: `npx tsc --noEmit`
Expected: 통과.

- [ ] **Step 7: 커밋**

```bash
git add src/card.ts src/components/PriceBlock.tsx src/components/PriceBlock.test.tsx
git commit -m "feat(card): ChangeView에 basis(작년 기준) 케이스 + PriceBlock 렌더"
```

---

### Task 2: `toComingCardView` — 다가오는 품목 → 풀 CardView (순수)

**Files:**
- Modify: `src/card.ts`
- Test: `tests/card.test.ts`

**Interfaces:**
- Consumes: `ChangeView.basis`(Task 1), 기존 `perUnitPrice`·`toSeasonStrip`·`whyNowLine`·`CardView`·`PriceCardView`(card.ts), `PriceEntry`·`ProduceProfile`(types.ts), `NutritionView`(nutrition.ts), `RecipeView`(recipe.ts).
- Produces:
  - `toComingPriceCardView(entry: PriceEntry): PriceCardView | null`
  - `toComingCardView(profile: ProduceProfile, targetMonth: number, currentMonth: number, entry: PriceEntry | null, nutrition?: NutritionView | null, recipes?: RecipeView | null): CardView`

- [ ] **Step 1: 실패 테스트 추가** — `tests/card.test.ts` 하단에 추가. (파일 상단 임포트에 `toComingCardView`·`toComingPriceCardView`를 더하고, 없으면 `PriceEntry`·`ProduceProfile` 타입 임포트도 맞춘다.)

```ts
const comingProfile: ProduceProfile = {
  id: 'grape', name: '포도', emoji: '🍇', category: 'fruit',
  kamis: { categoryCode: '400', itemName: '포도' },
  seasonMonths: [8, 9], peakMonths: [8],
  whyNow: { '8': '8월이 절정이에요', default: '가을 포도' },
  howToPick: 'p', howToStore: 's', howToUse: 'u',
}
const grapeEntry: PriceEntry = {
  itemName: '포도', kindName: '캠벨', rank: '상품',
  unit: { quantity: 1, measure: { kind: 'count', unit: '개' } },
  price: 3200,
  baseline: { weekAgo: null, twoWeeksAgo: null, monthAgo: null, yearAgo: null, normalYear: null },
}

describe('toComingCardView', () => {
  test('가격은 작년 기준 단일값 — 등락·스파크 없음', () => {
    const card = toComingCardView(comingProfile, 8, 7, grapeEntry)
    expect(card.price?.now).toBe(3200)
    expect(card.price?.change).toEqual({ kind: 'basis', basisLabel: '작년' })
    expect(card.price?.monthAgoPct).toBeNull()
    expect(card.price?.spark).toBeNull()
  })

  test('간트 현재월은 오늘 달(7), whyNow는 대상월(8) 기준', () => {
    const card = toComingCardView(comingProfile, 8, 7, grapeEntry)
    expect(card.season.currentMonth).toBe(7)
    expect(card.whyNow).toBe('8월이 절정이에요')
    expect(card.inPeak).toBe(true) // 8월이 절정
  })

  test('가격 엔트리가 없으면 price는 null(무가격 카드)', () => {
    const card = toComingCardView(comingProfile, 8, 7, null)
    expect(card.price).toBeNull()
    expect(card.name).toBe('포도')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/card.test.ts -t "toComingCardView"`
Expected: FAIL — 함수 미정의.

- [ ] **Step 3: 구현 추가** — `src/card.ts` 하단(파일 끝 `toCardView` 뒤)에 추가.

```ts
/** 다가오는 품목의 가격 — 작년 같은 시기 단일값. 등락·궤적 없음(예고용 참고치). */
export function toComingPriceCardView(entry: PriceEntry): PriceCardView | null {
  if (entry.price === null) return null
  const per = perUnitPrice(entry.price, entry.unit)
  return {
    now: entry.price,
    wasMonthAgo: null,
    unit: entry.unit,
    perUnit: per ? per.each : null,
    change: { kind: 'basis', basisLabel: '작년' },
    monthAgoPct: null,
    spark: null,
  }
}

/** 다가오는 품목 → 풀 CardView. 메인과 같은 카드지만 두 시계가 갈린다:
 *  간트 현재월은 **오늘 달**(currentMonth, "지금은 비었고 대상월부터 제철"),
 *  whyNow·절정은 **대상월**(targetMonth) 기준. 가격은 작년 씨앗(entry)에서. */
export function toComingCardView(
  profile: ProduceProfile,
  targetMonth: number,
  currentMonth: number,
  entry: PriceEntry | null,
  nutrition: NutritionView | null = null,
  recipes: RecipeView | null = null,
): CardView {
  return {
    emoji: profile.emoji,
    name: profile.name,
    kind: profile.kamis?.kindName ?? '',
    category: profile.category,
    inPeak: profile.peakMonths.includes(targetMonth),
    whyNow: whyNowLine(profile, targetMonth),
    note: { pick: profile.howToPick, store: profile.howToStore, use: profile.howToUse },
    price: entry ? toComingPriceCardView(entry) : null,
    nutrition,
    recipes,
    season: toSeasonStrip(profile, currentMonth),
  }
}
```

`src/card.ts` 상단 타입 임포트에 `PriceEntry`가 없으면 더한다: `import type { Baseline, Category, PriceEntry, ProduceProfile, Unit } from './types'`.

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run tests/card.test.ts`
Expected: PASS.

- [ ] **Step 5: 타입 게이트**

Run: `npx tsc --noEmit`
Expected: 통과.

- [ ] **Step 6: 커밋**

```bash
git add src/card.ts tests/card.test.ts
git commit -m "feat(card): toComingCardView — 다가오는 품목을 풀 카드로(작년 기준 가격)"
```

---

### Task 3: `ComingPriceSeed` 타입 + 빈 씨앗 파일 + `buildComingView` 재작성 (순수)

**Files:**
- Modify: `src/types.ts` (Baseline/PriceEntry 뒤)
- Create: `public/data/coming-prices.json` (빈 씨앗)
- Modify: `src/view-types.ts` (ComingItem 폐기, ComingMonth.items 타입)
- Modify: `src/app.ts` (buildComingView 시그니처·조립)
- Modify: `tests/app.test.ts` (buildComingView 테스트 갱신)

**Interfaces:**
- Consumes: `toComingCardView`(Task 2), 기존 `matchEntry`(picks.ts)·`matchNutrition`/`nutritionView`(nutrition.ts)·`matchRecipes`/`recipeView`(recipe.ts)·`comingMonths`(picks.ts)·`seasonOf`/`currentTerm`(season.ts).
- Produces:
  - `ComingPriceSeed { collectedYear: number | null; months: Record<string, PriceEntry[]> }` (types.ts).
  - `buildComingView(profiles: ProduceProfile[], comingSeed: ComingPriceSeed, nutrition: NutritionSnapshot | null, recipes: RecipeSnapshot | null, now: Date): ComingView` — `ComingView.months[i].items: CardView[]`.

- [ ] **Step 1: 타입 추가** — `src/types.ts`의 `PriceSnapshot` 인터페이스(84행 부근) 바로 뒤에 추가.

```ts
/** 다가오는 제철 카드용 작년 같은 시기 가격 씨앗. 월(1~12)별 작년 미니 스냅샷.
 *  씨앗형 — 상시 CI 없이 로컬 1회 수집해 커밋(영양·레시피와 동급). 비면 다가오는 카드는 무가격. */
export interface ComingPriceSeed {
  /** 이 값들을 수집한 연도. 아직 미수집이면 null(전부 무가격). */
  collectedYear: number | null
  /** "1"~"12" → 그 달 작년 조사 엔트리들 */
  months: Record<string, PriceEntry[]>
}
```

- [ ] **Step 2: 빈 씨앗 파일 생성** — `public/data/coming-prices.json` (실데이터는 Task 6에서 로컬 수집해 교체. 지어낸 값이 아니라 "아직 없음" 상태다.)

```json
{
  "collectedYear": null,
  "months": {}
}
```

- [ ] **Step 3: `view-types.ts` 갱신** — `ComingItem` 인터페이스(40-46행)를 **삭제**하고, `ComingMonth`의 `items` 타입을 바꾼다. 파일 상단 `import type { CardView } from './card'`는 이미 있다.

`ComingMonth`를 아래로 교체:

```ts
export interface ComingMonth {
  month: number
  /** 그 달의 계절 — 카드 마스킹테이프 색(섹션 data-season) */
  season: Season
  items: CardView[]
}
```

(`ComingView`·`AppView`·`OffSeasonHint`·`Freshness`는 그대로.)

- [ ] **Step 4: 실패 테스트로 `app.test.ts` 갱신** — `tests/app.test.ts`의 `describe('buildComingView', …)` 블록(162-184행)을 아래로 교체.

```ts
const EMPTY_SEED = { collectedYear: null, months: {} }

const priceEntry = (itemName: string, price: number): PriceEntry => ({
  itemName, kindName: '', rank: '상품',
  unit: { quantity: 1, measure: { kind: 'count', unit: '개' } },
  price,
  baseline: { weekAgo: null, twoWeeksAgo: null, monthAgo: null, yearAgo: null, normalYear: null },
})

describe('buildComingView', () => {
  test('달별 계절과 품목별 미래월 한마디를 풀 카드로 싣는다', () => {
    const grape = cp('grape', '포도', '🍇', [8, 9], [8], { '8': '8월이 절정이에요', default: '가을' })
    const view = buildComingView([grape], EMPTY_SEED, null, null, new Date('2026-07-15T00:00:00'))
    expect(view.months).toHaveLength(1)
    expect(view.months[0].month).toBe(8)
    expect(view.months[0].season).toBe('summer')
    const card = view.months[0].items[0]
    expect(card.name).toBe('포도')
    expect(card.whyNow).toBe('8월이 절정이에요')
    expect(card.inPeak).toBe(true)
    expect(card.season.currentMonth).toBe(7) // 간트 현재월 = 오늘 달
    expect(view.term).toBe('소서')
  })

  test('씨앗에 그 달·그 품목이 있으면 작년 기준 가격이 붙는다', () => {
    const grape = cp('grape', '포도', '🍇', [8], [8], { default: '가을' })
    const seed = { collectedYear: 2025, months: { '8': [priceEntry('grape', 3200)] } }
    const view = buildComingView([grape], seed, null, null, new Date('2026-07-15T00:00:00'))
    const card = view.months[0].items[0]
    expect(card.price?.now).toBe(3200)
    expect(card.price?.change).toEqual({ kind: 'basis', basisLabel: '작년' })
  })

  test('씨앗이 비면 무가격 카드', () => {
    const grape = cp('grape', '포도', '🍇', [8], [8], { default: '가을' })
    const view = buildComingView([grape], EMPTY_SEED, null, null, new Date('2026-07-15T00:00:00'))
    expect(view.months[0].items[0].price).toBeNull()
  })

  test('다가오는 게 없으면 months는 빈 배열', () => {
    const peach = cp('peach', '복숭아', '🍑', [7], [], { default: '여름' })
    expect(buildComingView([peach], EMPTY_SEED, null, null, new Date('2026-07-15T00:00:00')).months).toEqual([])
  })
})
```

(`cp`는 `kamis.itemName = id`로 프로필을 만든다 — 그래서 씨앗 엔트리 `itemName`을 `'grape'`로 맞췄다.)

- [ ] **Step 5: 실패 확인**

Run: `npx vitest run tests/app.test.ts -t "buildComingView"`
Expected: FAIL — buildComingView 시그니처 불일치.

- [ ] **Step 6: `app.ts` 구현** — `buildComingView`(61-75행)를 교체하고 임포트를 보강한다.

상단 임포트에 `matchEntry`·`toComingCardView`·타입을 더한다:

```ts
import { comingMonths, hasDrops, matchEntry, selectPicks } from './picks'
import { toCardView, toComingCardView, whyNowLine } from './card'
```

그리고 `import type { AppView, ComingView, Freshness, OffSeasonHint } from './view-types'` 아래에 `ComingPriceSeed`를 types 임포트에 더한다:

```ts
import type { ComingPriceSeed, NutritionSnapshot, PriceSnapshot, ProduceProfile, RecipeSnapshot } from './types'
```

`buildComingView`를 아래로 교체:

```ts
/** 원시 프로필+씨앗+시계 → 다가오는 제철 뷰. 순수. 메인과 같은 풀 카드,
 *  가격은 작년 같은 시기 씨앗에서(있으면), 영양·레시피는 계절 무관 씨앗에서. */
export function buildComingView(
  profiles: ProduceProfile[],
  comingSeed: ComingPriceSeed,
  nutrition: NutritionSnapshot | null,
  recipes: RecipeSnapshot | null,
  now: Date,
): ComingView {
  const month = now.getMonth() + 1
  const months = comingMonths(profiles, month).map((g) => ({
    month: g.month,
    season: seasonOf(g.month),
    items: g.items.map((it) => {
      const entry = matchEntry(it.profile, comingSeed.months[String(g.month)] ?? [])
      return toComingCardView(
        it.profile,
        g.month,
        month,
        entry,
        nutritionView(matchNutrition(it.profile, nutrition)),
        recipeView(matchRecipes(it.profile, recipes)),
      )
    }),
  }))
  return { months, date: now, term: currentTerm(now) }
}
```

(`whyNowLine` 임포트는 `buildAppView`가 여전히 안 쓰면 제거 가능하나, `card.ts`에서 재수출·타 사용이 있으면 유지. `tsc`가 미사용을 경고하면 임포트에서 뺀다.)

- [ ] **Step 7: 통과 확인**

Run: `npx vitest run tests/app.test.ts`
Expected: PASS.

- [ ] **Step 8: 타입 게이트**

Run: `npx tsc --noEmit`
Expected: 통과. (route·컴포넌트가 아직 옛 시그니처면 다음 태스크에서 고친다 — 이 시점엔 `coming.tsx`·`Coming.tsx`가 깨질 수 있으므로, Task 4까지 한 흐름으로 본다. tsc가 그 둘만 문제 삼으면 Task 4로 진행.)

- [ ] **Step 9: 커밋**

```bash
git add src/types.ts public/data/coming-prices.json src/view-types.ts src/app.ts tests/app.test.ts
git commit -m "feat(app): buildComingView가 풀 카드+작년 씨앗 가격 조립, ComingPriceSeed 타입"
```

---

### Task 4: `Coming.tsx`가 `ProduceCard` 사용 + `ComingCard` 폐기 + 로더 배선

**Files:**
- Modify: `src/components/Coming.tsx`
- Delete: `src/components/ComingCard.tsx`, `src/components/ComingCard.test.tsx`
- Modify: `src/components/Coming.test.tsx`
- Modify: `src/routes/coming.tsx`

**Interfaces:**
- Consumes: `buildComingView`(Task 3), `ProduceCard`(components), `ComingView`(view-types).
- Produces: `/coming`이 월 섹션(`data-season`)마다 `ProduceCard`를 그린다.

- [ ] **Step 1: 실패 테스트로 `Coming.test.tsx` 교체** — 파일 전체를 아래로 바꾼다(풀 카드·펼침·간트 확인).

```tsx
// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import { Coming } from './Coming'
import { renderWithRouter } from '../test-utils'
import { buildComingView } from '../app'
import type { ProduceProfile } from '../types'

const EMPTY_SEED = { collectedYear: null, months: {} }
const prof = (
  id: string, name: string, emoji: string,
  seasonMonths: number[], peakMonths: number[], whyNow: Record<string, string>,
): ProduceProfile => ({
  id, name, emoji, category: 'fruit',
  kamis: { categoryCode: '400', itemName: id },
  seasonMonths, peakMonths, whyNow,
  howToPick: 'p', howToStore: 's', howToUse: 'u',
})

const view = buildComingView(
  [
    prof('peach2', '복숭아', '🍑', [8], [], { default: '여름 복숭아' }),
    prof('chestnut', '밤', '🌰', [9], [9], { '9': '9월이 절정이에요', default: '가을' }),
  ],
  EMPTY_SEED, null, null, new Date('2026-07-15T00:00:00'),
)

describe('Coming', () => {
  test('머리말·달 헤더·풀 카드(펼침 가능)·절정 dot·목차를 그린다', async () => {
    const { container } = await renderWithRouter(<Coming view={view} />)
    expect(container.querySelector('h1')?.textContent).toContain('다가오는 제철')
    expect([...container.querySelectorAll('h2')].map((h) => h.textContent)).toEqual(['8월', '9월'])
    const cards = container.querySelectorAll('.card')
    expect(cards).toHaveLength(2)
    const sections = container.querySelectorAll('.coming-month')
    expect(sections[1].getAttribute('data-season')).toBe('autumn') // 9월 = 가을
    expect(container.textContent).toContain('복숭아')
    expect(container.textContent).toContain('9월이 절정이에요')
    expect(container.querySelectorAll('.peak-dot')).toHaveLength(1) // 밤(9월)만
    expect(container.querySelector('details')).not.toBeNull() // 이제 펼침 가능
    expect(container.querySelector('.season-cell')).not.toBeNull() // 간트 띠
    expect(container.querySelector('.nav-index')).not.toBeNull()
    expect(container.querySelector('.sprig')).not.toBeNull()
  })

  test('다가오는 게 없으면 담백한 안내', async () => {
    const empty = buildComingView(
      [prof('peach', '복숭아', '🍑', [7], [], { default: '여름' })],
      EMPTY_SEED, null, null, new Date('2026-07-15T00:00:00'),
    )
    const { container } = await renderWithRouter(<Coming view={empty} />)
    expect(container.textContent).toContain('다가오는 제철 정보가 아직 없어요')
    expect(container.querySelector('h2')).toBeNull()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/Coming.test.tsx`
Expected: FAIL — `Coming`이 아직 `ComingCard`를 쓰고 `.card`가 없다.

- [ ] **Step 3: `Coming.tsx` 교체** — 파일 전체를 아래로.

```tsx
import type { ComingView } from '../view-types'
import { weekLabel } from '../week'
import { Sprig } from './Sprig'
import { NavIndex } from './NavIndex'
import { ProduceCard } from './ProduceCard'

/** 다가오는 제철 페이지. 메인과 같은 풀 카드(ProduceCard). 표시 전용. */
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
            <section className="coming-month" key={m.month} data-season={m.season}>
              <h2>{m.month}월</h2>
              <div className="list">
                {m.items.map((card, i) => (
                  <ProduceCard key={i} card={card} />
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

- [ ] **Step 4: `ComingCard` 삭제**

```bash
git rm src/components/ComingCard.tsx src/components/ComingCard.test.tsx
```

- [ ] **Step 5: 로더 배선** — `src/routes/coming.tsx`를 아래로 교체.

```tsx
import { createFileRoute } from '@tanstack/react-router'
import produce from '../../public/data/produce.json'
import comingPrices from '../../public/data/coming-prices.json'
import nutrition from '../../public/data/nutrition.json'
import recipes from '../../public/data/recipes.json'
import { buildComingView } from '../app'
import { Coming } from '../components/Coming'
import type { ComingPriceSeed, NutritionSnapshot, ProduceProfile, RecipeSnapshot } from '../types'

export const Route = createFileRoute('/coming')({
  loader: async () =>
    buildComingView(
      produce as unknown as ProduceProfile[],
      comingPrices as unknown as ComingPriceSeed,
      nutrition as unknown as NutritionSnapshot,
      recipes as unknown as RecipeSnapshot,
      new Date(),
    ),
  component: ComingPage,
})

function ComingPage() {
  const view = Route.useLoaderData()
  // date는 로더 직렬화 경계를 넘으며 문자열이 될 수 있어 Date로 되살린다.
  return <Coming view={{ ...view, date: new Date(view.date) }} />
}
```

- [ ] **Step 6: 통과 확인 + 전체 테스트**

Run: `npx vitest run src/components/Coming.test.tsx && npm test`
Expected: PASS (전체).

- [ ] **Step 7: 타입 게이트**

Run: `npx tsc --noEmit`
Expected: 통과.

- [ ] **Step 8: 커밋**

```bash
git add src/components/Coming.tsx src/components/Coming.test.tsx src/routes/coming.tsx
git commit -m "feat(coming): ProduceCard 풀 카드로 교체, ComingCard 폐기, 씨앗·영양·레시피 로드"
```

---

### Task 5: 램프줄 드로워 정리 (`NavIndex`)

**Files:**
- Modify: `src/components/NavIndex.tsx`
- Modify: `src/components/NavIndex.test.tsx`
- Modify: `src/style.css` (`.nav-panel-*`)

**Interfaces:**
- Consumes: 없음(표시 전용).
- Produces: 드로워는 "목차" 제목 없이 두 링크(`지금 제철인 품목`·`다가오는 제철 품목`)만. 터치타깃 ≥44px.

- [ ] **Step 1: 실패 테스트로 `NavIndex.test.tsx` 갱신** — 라벨·제목 제거를 확인하는 케이스로 바꾼다(기존 파일에서 라벨 문자열 검증 부분을 아래에 맞춘다).

```tsx
test('제목 없이 두 링크를 라벨대로 그린다', async () => {
  const { container, getByText } = await renderWithRouter(<NavIndex current="now" />)
  // 목차 제목 제거
  expect(container.querySelector('.nav-panel-title')).toBeNull()
  expect(container.textContent).not.toContain('목차')
  // 새 라벨
  expect(getByText('지금 제철인 품목')).toBeTruthy()
  expect(getByText('다가오는 제철 품목')).toBeTruthy()
})
```

(`aria-label="목차"`/`aria-label="목차 닫기"`는 버튼 접근명이라 유지 가능 — 위 `not.toContain('목차')`가 걸리면 테스트는 화면 텍스트만 보도록 `container.querySelector('.nav-panel-inner')?.textContent`로 좁힌다.)

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/NavIndex.test.tsx`
Expected: FAIL — 옛 라벨/제목.

- [ ] **Step 3: `NavIndex.tsx` 교체** — `nav-panel-inner` 블록을 아래로. (제목 `<p>` 제거, 라벨 변경. `aria-label`은 접근명이라 유지.)

```tsx
          <div className="nav-panel-inner">
            <Link to="/" viewTransition aria-current={current === 'now' ? 'page' : undefined} onClick={close}>
              지금 제철인 품목
            </Link>
            <Link to="/coming" viewTransition aria-current={current === 'coming' ? 'page' : undefined} onClick={close}>
              다가오는 제철 품목
            </Link>
          </div>
```

- [ ] **Step 4: CSS 정리** — `src/style.css`에서 `.nav-panel-title` 규칙(525행 부근)을 삭제하고, 링크 터치타깃·여백을 손본다. `.nav-panel a`(526-529행 부근)를 아래로 교체.

```css
.nav-panel a {
  display: block;
  padding: var(--space-sm) var(--space-lg);
  min-height: 44px;               /* 터치타깃 */
  display: flex;
  align-items: center;
  color: var(--ink);
  text-decoration: none;
}
.nav-panel a[aria-current='page'] { font-weight: 600; }
```

`.nav-panel-inner`의 세로 패딩이 제목 제거로 과하면 `padding: var(--space-sm) 0;`로 좁힌다(브라우저 실측에서 확정 — Task 9).

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/components/NavIndex.test.tsx`
Expected: PASS.

- [ ] **Step 6: 타입 + 전체 테스트 게이트**

Run: `npm test && npx tsc --noEmit`
Expected: 통과.

- [ ] **Step 7: 커밋**

```bash
git add src/components/NavIndex.tsx src/components/NavIndex.test.tsx src/style.css
git commit -m "feat(nav): 드로워 목차 제목·구분선 제거, 라벨 정리, 터치타깃 44px"
```

---

### Task 6: `fetch-coming-prices.mjs` 수집 스크립트 + npm 스크립트 + 실데이터 수집

**Files:**
- Create: `scripts/fetch-coming-prices.mjs`
- Create: `tests/fetch-coming-prices.test.js`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: 기존 `buildLatestSnapshot`·`writeSnapshot`(scripts/fetch-prices.mjs).
- Produces: `buildComingSeed({ year, buildFn }): Promise<{ collectedYear, months }>` (dependency-injected `buildFn`으로 테스트). 실행 시 `public/data/coming-prices.json` 기록.

- [ ] **Step 1: 실패 테스트 작성** — `tests/fetch-coming-prices.test.js`.

```js
import { describe, expect, test } from 'vitest'
import { buildComingSeed } from '../scripts/fetch-coming-prices.mjs'

describe('buildComingSeed', () => {
  test('작년 12개월 각 15일을 조회해 months 맵을 만든다', async () => {
    const calls = []
    const buildFn = async (from) => {
      calls.push(from)
      return { entries: [{ itemName: from }] }
    }
    const seed = await buildComingSeed({ year: 2025, buildFn })
    expect(calls).toHaveLength(12)
    expect(calls[0]).toBe('2025-01-15')
    expect(calls[11]).toBe('2025-12-15')
    expect(seed.collectedYear).toBe(2025)
    expect(Object.keys(seed.months)).toHaveLength(12)
    expect(seed.months['1'][0].itemName).toBe('2025-01-15')
    expect(seed.months['12'][0].itemName).toBe('2025-12-15')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/fetch-coming-prices.test.js`
Expected: FAIL — 모듈/함수 없음.

- [ ] **Step 3: 스크립트 작성** — `scripts/fetch-coming-prices.mjs`.

```js
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { buildLatestSnapshot, writeSnapshot } from './fetch-prices.mjs'

/** 작년 12개월치를 각 달 15일 기준으로 모아 씨앗을 만든다. buildFn 주입으로 테스트 가능.
 *  15일이 휴장이면 buildLatestSnapshot이 최대 7일 소급해 유효 조사일을 찾는다. */
export async function buildComingSeed({ year, buildFn }) {
  const months = {}
  for (let m = 1; m <= 12; m++) {
    const from = `${year}-${String(m).padStart(2, '0')}-15`
    const snap = await buildFn(from)
    months[String(m)] = snap.entries
  }
  return { collectedYear: year, months }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const certKey = process.env.KAMIS_CERT_KEY
  const certId = process.env.KAMIS_CERT_ID
  if (!certKey || !certId) {
    console.error('KAMIS_CERT_KEY / KAMIS_CERT_ID 환경변수가 필요합니다')
    process.exit(1)
  }
  const yearArg = process.argv.find((a) => a.startsWith('--year='))?.slice('--year='.length)
  const year = yearArg ? Number(yearArg) : new Date().getFullYear() - 1 // 기본: 작년
  const outPath = fileURLToPath(new URL('../public/data/coming-prices.json', import.meta.url))
  const buildFn = (from) => buildLatestSnapshot({ certKey, certId, from })
  try {
    const seed = await buildComingSeed({ year, buildFn })
    const counts = Object.entries(seed.months).map(([m, e]) => `${m}월 ${e.length}`).join(' · ')
    writeSnapshot(seed, outPath)
    console.log(`coming-prices.json 갱신(${year}년): ${counts}`)
  } catch (err) {
    console.error('다가오는 가격 수집 실패 — coming-prices.json은 변경하지 않음:', err.message)
    process.exit(1)
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run tests/fetch-coming-prices.test.js`
Expected: PASS.

- [ ] **Step 5: npm 스크립트 추가** — `package.json`의 `scripts`에 한 줄 더한다(기존 `fetch:prices` 옆).

```json
    "fetch:coming-prices": "node scripts/fetch-coming-prices.mjs",
```

- [ ] **Step 6: 커밋(스크립트)**

```bash
git add scripts/fetch-coming-prices.mjs tests/fetch-coming-prices.test.js package.json
git commit -m "feat(scripts): fetch-coming-prices — 작년 12개월 씨앗 수집기"
```

- [ ] **Step 7: 실데이터 수집(로컬, 키 필요)** — 사용자가 KAMIS 키로 1회 실행해 빈 씨앗을 실값으로 교체한다. (에이전트가 키 없이 못 하면 이 스텝은 사용자에게 요청.)

```bash
KAMIS_CERT_KEY=… KAMIS_CERT_ID=… npm run fetch:coming-prices
```

Expected: `coming-prices.json 갱신(2025년): 1월 … · … · 12월 …`. 그 뒤 `git add public/data/coming-prices.json && git commit -m "chore(data): coming-prices 작년 실값 수집"`.

- [ ] **Step 8: 실값 반영 확인**

Run: `npm test && npx tsc --noEmit`
Expected: 통과(실값이 들어와도 스키마 동일).

---

### Task 7: `Coming.stories.tsx` 갱신 (뷰 상태 탐색기)

**Files:**
- Modify: `src/components/Coming.stories.tsx`
- Modify: `src/story-utils.tsx` (REAL에 comingPrices 추가)

**Interfaces:**
- Consumes: `buildComingView`(Task 3), `REAL`(story-utils).
- Produces: 월 노브로 다가오는 풀 카드 상태 탐색.

- [ ] **Step 1: `story-utils.tsx`의 `REAL`에 씨앗 추가** — 파일 상단 json 임포트에 한 줄, `REAL` 객체에 한 필드.

```tsx
import comingPricesJson from '../public/data/coming-prices.json'
```

`REAL` 객체에 추가:

```tsx
  comingPrices: comingPricesJson as unknown as ComingPriceSeed,
```

`import type { … }`에 `ComingPriceSeed`를 더한다.

- [ ] **Step 2: `Coming.stories.tsx` 교체** — `render`가 새 시그니처를 쓰도록.

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Coming } from './Coming'
import { buildComingView } from '../app'
import { currentTerm } from '../season'
import { REAL, withRouter } from '../story-utils'

const meta: Meta = {
  title: '페이지/Coming',
  decorators: [withRouter], // NavIndex가 <Link>를 쓴다
}

export default meta

/** **월 노브를 돌려보라.** 다가오는 품목이 메인과 같은 풀 카드로 뜬다 — 간트·펼침·손질법·영양·
 *  레시피 동일. 가격은 작년 같은 시기 씨앗(coming-prices.json)이 있으면 "작년 기준 3,200원"으로,
 *  없으면 무가격. 월 섹션 data-season이 테이프 색을 그 달 계절로 정한다(8월 여름·9월 가을). */
export const 그달의다가오는제철: StoryObj<{ month: number }> = {
  args: { month: 7 },
  argTypes: { month: { control: { type: 'range', min: 1, max: 12, step: 1 } } },
  render: ({ month }) => (
    <Coming
      view={buildComingView(
        REAL.profiles,
        REAL.comingPrices,
        REAL.nutrition,
        REAL.recipes,
        new Date(2026, month - 1, 15, 9),
      )}
    />
  ),
}

/** 앞으로 두 달에 새로 드는 품목이 하나도 없으면 문구 한 줄만(12월만 해당). */
export const 빈상태: StoryObj = {
  render: () => {
    const date = new Date(2026, 11, 15)
    return <Coming view={{ months: [], date, term: currentTerm(date) }} />
  },
}
```

- [ ] **Step 3: 빌드·타입 게이트** (스토리는 유닛테스트가 없으니 빌드/타입으로 검증)

Run: `npx tsc --noEmit && npm run build`
Expected: 통과(프리렌더 포함).

- [ ] **Step 4: 커밋**

```bash
git add src/components/Coming.stories.tsx src/story-utils.tsx
git commit -m "docs(storybook): Coming 스토리를 풀 카드·씨앗 시그니처로 갱신"
```

---

### Task 8: 문서 갱신 (§7 반전 · 지렛대 지도 · 명령어)

**Files:**
- Modify: `docs/제품-동작-지도.md` (§7, §9 지렛대 지도, §8 "몰랐을 것")
- Modify: `CLAUDE.md` (명령어에 `fetch:coming-prices`)
- Modify: `CONTEXT.md` (ComingCard 항목이 있으면 ProduceCard로 정정)

**Interfaces:**
- Consumes: 없음(문서).
- Produces: 문서가 실제 동작과 일치.

- [ ] **Step 1: `docs/제품-동작-지도.md` §7 교체** — "이 페이지는 가격·영양·레시피를 안 쓴다(프로필과 시계만)."를 아래로 바꾼다.

```
카드는 메인과 **같은 풀 카드**(ProduceCard)다 — 간트·펼침·손질법·영양·레시피 동일. 가격만
다르다: 미래 예고라 "지금 값"이 없어, **작년 같은 시기** 가격을 씨앗(`coming-prices.json`)에서
붙여 "작년 기준 3,200원" 한 줄로 보인다(등락 칩·스파크라인 없음). 씨앗에 그 달·그 품목이
없으면 메인처럼 무가격 카드. 마스킹테이프 색은 월 섹션 `data-season`이 그 달 계절로 정한다.
```

- [ ] **Step 2: §9 지렛대 지도에 행 추가** — 표에 두 줄 더한다.

```
| 다가오는 가격(작년 씨앗) | 수집: `scripts/fetch-coming-prices.mjs`(작년 12개월) → `public/data/coming-prices.json` / 매칭·조립: `src/app.ts` `buildComingView`(기존 `matchEntry`) / 카드 파생: `src/card.ts` `toComingCardView` |
| "작년 기준" 라벨 | `src/card.ts` `ChangeView`의 `basis` 케이스 → `src/components/PriceBlock.tsx` |
```

- [ ] **Step 3: §8에 한 줄** — "다가오는 제철 페이지는 이제 메인과 같은 풀 카드다(가격은 작년 씨앗, 없으면 무가격). 예전의 가벼운 예고 카드는 폐기."

- [ ] **Step 4: `CLAUDE.md` 명령어에 추가** — `npm run fetch:prices` 줄 아래.

```
- `npm run fetch:coming-prices` — 다가오는 제철용 작년 같은 시기 가격 씨앗 수집 (env: `KAMIS_CERT_KEY`, `KAMIS_CERT_ID`)
```

그리고 "레시피·영양은 씨앗형" 규칙 문단에 다가오는 가격도 씨앗형임을 한 구절 더한다: "다가오는-가격(작년 이맘때)도 씨앗형 — 상시 CI 없이 로컬 1회 수집해 커밋."

- [ ] **Step 5: `CONTEXT.md` 정정** — `ComingCard` 언급이 있으면 "다가오는 페이지는 `ProduceCard`(메인과 동일)를 쓴다"로 고친다. (`grep -n ComingCard CONTEXT.md`로 확인 후 해당 줄만.)

- [ ] **Step 6: 커밋**

```bash
git add docs/제품-동작-지도.md CLAUDE.md CONTEXT.md
git commit -m "docs: 다가오는 페이지 풀 카드·작년 씨앗 가격으로 §7 반전 반영"
```

---

### Task 9: 브라우저 실측 + 사인오프 (완료 게이트)

**Files:** 없음(검증). CLAUDE.md 완료 게이트 — 렌더·모션·레이어·터치타깃은 유닛테스트가 못 본다.

- [ ] **Step 1: 개발 서버 기동**

Run: `npm run dev` (별도 터미널/백그라운드)

- [ ] **Step 2: 드로워 실측** — 램프줄 당겨 열고/닫기. 확인:
  - "목차" 제목·구분선 없음, 라벨 `지금 제철인 품목`·`다가오는 제철 품목`.
  - 링크 터치타깃 ≥44px(눈으로/DevTools), 현재 페이지 링크 볼드(`aria-current`).
  - 열고 닫힘 전환 부드럽고 접힘 시 잔여 박스 없음(`0fr`).

- [ ] **Step 3: `/coming` 실측** — 확인:
  - 카드가 메인과 동일한 냉장고-메모 카드(테이프·기울기). 월 섹션 색(8월 여름·9월 가을 테이프).
  - 간트 띠: 현재 달 칸이 비고 대상월부터 제철로 칠해짐.
  - 펼침: 손질법·영양·레시피·(스파크 없음) — 펼침/접힘 정상.
  - 가격: 씨앗 있으면 "작년 기준 · 3,200원", 없으면 가격 줄 없음(무가격 카드).

- [ ] **Step 4: 무JS 폴백** — JS 끈 상태(또는 프리렌더 소스)에서 `/coming`이 전체 목록을 그대로 렌더하는지.

- [ ] **Step 5: 스크린샷 사인오프** — 드로워 열림·`/coming`(가격 있는 카드/없는 카드/펼침) 스크린샷을 사용자에게 제시해 확인받는다.

- [ ] **Step 6: 최종 게이트 재확인**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: 전부 통과.

- [ ] **Step 7: 브랜치 마무리** — `superpowers:finishing-a-development-branch`로 PR/머지 옵션 제시.

---

## Self-Review

**Spec coverage:**
- 드로워(라벨·제목/구분선 제거·터치타깃) → Task 5. ✅
- 다가오는 카드 = ProduceCard(간트·펼침·영양·레시피) → Task 4(+2 파생). ✅
- 가격 = 작년 씨앗, 기존 PriceCardView 재사용, "작년 기준" → Task 1(라벨)·2(파생)·3(조립)·6(수집). ✅
- 월 그룹 유지·data-season 색 → Task 4. ✅
- 가격 매칭 실패는 무가격 → Task 2/3 테스트. ✅
- §7 반전·지렛대 지도·명령어 문서 → Task 8. ✅
- 검증 게이트(test+tsc, 브라우저, 스토리북) → 각 태스크 + Task 7·9. ✅

**Placeholder scan:** 코드 스텝마다 실제 코드/명령/기대출력 포함. TBD 없음. (Task 6 Step 7만 키가 필요한 로컬 수집 — 사용자 실행 명시, 빈 씨앗으로 앱은 항상 빌드됨.)

**Type consistency:** `toComingCardView(profile, targetMonth, currentMonth, entry, nutrition?, recipes?)` — Task 2 정의, Task 3 호출 동일. `ComingPriceSeed { collectedYear, months }` — Task 3 정의, Task 4 route·Task 7 story 동일. `ChangeView.basis {kind,basisLabel}` — Task 1 정의, Task 2·PriceBlock 동일. `buildComingView(profiles, comingSeed, nutrition, recipes, now)` — Task 3 정의, Task 4·7 호출 동일.
