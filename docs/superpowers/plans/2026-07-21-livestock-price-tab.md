# 축산물 값 탭 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 제철이 없는 축산물(소·돼지·닭·달걀)을 별도 `/livestock` 탭에서 "값이 내려온 순"으로 보여준다. 제철 달력은 그대로 둔다.

**Architecture:** 축산물도 기존 `ProduceProfile`로 표현하고(제철 필드는 빈 배열), `/coming` 라우트 선례 그대로 새 순수 함수 `buildLivestockView` + `Livestock` 컴포넌트 + `/livestock` 라우트를 만든다. 제철 라우트(`buildAppView`/`buildComingView`)는 축산물을 카테고리로 걸러 누수를 막는다. 수집은 KAMIS 부류 500을 `CATEGORY_CODES`에 추가한다.

**Tech Stack:** TanStack Start (React 19), Vite, Vitest + RTL, CSS Modules, Node ≥ 22, KAMIS 소매 가격 API.

## Global Constraints

- 런타임 의존성 0, 런타임 외부요청 0. 가격은 CI 커밋 JSON만 읽는다.
- 사용자 문구는 담백한 한국어. 이커머스 화법 금지. **축산물엔 "제철" 표현 금지**(자연 제철 없음).
- KAMIS 매칭은 코드가 아니라 `item_name`·`kind_name` **문자열**로.
- KAMIS 키는 코드·저장소에 절대 넣지 않는다 (env `KAMIS_CERT_KEY`/`KAMIS_CERT_ID`).
- 완료 게이트 = `npm test` **와** `npx tsc --noEmit` 둘 다. UI 변경은 `npm run dev` 브라우저 실측.
- 순수 로직 테스트는 `tests/`에 `'../src/…'` 임포트. 컴포넌트 테스트는 `src/components/*.test.tsx` + `// @vitest-environment jsdom`. 라우터 필요 컴포넌트는 `renderWithRouter`.
- 테스트 픽스처도 유효한 타입값. `categoryCode`는 `'100'|'200'|'400'|'600'|'500'`, `category`는 유니온에 추가된 `'livestock'`.

---

### Task 1: KAMIS 부류 500 응답 실측 — 품목·등급 문자열 확정

축산물 프로필의 `itemName`/`kindName`을 추측이 아니라 KAMIS 실제 응답으로 확정한다. 수산물 때 `scripts/probe-seafood.mjs`가 한 역할. 이 산출물(확정된 문자열 목록)이 Task 8의 프로필 authoring 입력이다.

> **환경:** `KAMIS_CERT_KEY`·`KAMIS_CERT_ID` 필요. 로컬에 키가 없으면(저장소 규칙상 키는 CI 시크릿) 이 태스크는 **키를 가진 환경에서 수동 실행**하거나, Lambda 수동 invoke로 500 응답을 받아 문자열을 기록한다. Task 2~7·9는 이 산출물 없이도(픽스처로) 진행 가능하니, 확정 전엔 Task 8만 대기한다.

**Files:**
- Create: `scripts/probe-livestock.mjs`

**Interfaces:**
- Produces: 콘솔에 부류 500의 `(itemName, kindName, rank, unit)` 목록 출력. 사람이 읽어 Task 8의 잠정표를 실제 문자열로 교체.

- [ ] **Step 1: probe 스크립트 작성**

`scripts/probe-seafood.mjs`와 같은 형태. 부류 500만 조회해 품목·품종을 덤프한다.

```javascript
// scripts/probe-livestock.mjs
// KAMIS 부류 500(축산물) 소매 응답을 덤프해 itemName/kindName 문자열을 확정한다.
// env: KAMIS_CERT_KEY, KAMIS_CERT_ID
const API_BASE = 'https://www.kamis.or.kr/service/price/xml.do'
const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; jecheori/1.0; +https://github.com/haneulcha/jecheori)',
  Accept: 'application/json, text/javascript, */*; q=0.01',
}
const key = process.env.KAMIS_CERT_KEY
const id = process.env.KAMIS_CERT_ID
if (!key || !id) throw new Error('KAMIS_CERT_KEY / KAMIS_CERT_ID 필요')

const now = new Date()
const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
const day = kst.toISOString().slice(0, 10)

const url = new URL(API_BASE)
url.searchParams.set('action', 'dailyPriceByCategoryList')
url.searchParams.set('p_product_cls_code', '01') // 01 소매
url.searchParams.set('p_item_category_code', '500') // 축산물
url.searchParams.set('p_country_code', '1101') // 서울(전국 대표) — fetch-prices와 동일 기준 확인
url.searchParams.set('p_regday', day)
url.searchParams.set('p_cert_key', key)
url.searchParams.set('p_cert_id', id)
url.searchParams.set('p_returntype', 'json')

const res = await fetch(url, { headers: REQUEST_HEADERS })
console.log('HTTP', res.status)
const text = await res.text()
console.log(text.slice(0, 4000))
```

> `p_country_code`·`p_product_cls_code`의 실제 값은 `scripts/fetch-prices.mjs`를 열어 그 스크립트가 쓰는 값과 **똑같이** 맞춘다(전국/소매 기준 일관성). 위 값은 예시다.

- [ ] **Step 2: 실행해 200과 목록 확인**

Run: `KAMIS_CERT_KEY=… KAMIS_CERT_ID=… node scripts/probe-livestock.mjs`
Expected: `HTTP 200` + 축산물 품목/품종 JSON. (406이면 IP ASN 차단 — `docs/aws-lambda.md`대로 Lambda 수동 invoke로 대체.)

- [ ] **Step 3: 문자열 기록**

응답에서 소고기 등급별 `item_name`/`kind_name`, 돼지고기(삼겹살·목살), 닭고기, 계란의 정확한 문자열과 단위(`unit`)를 메모한다. 이 메모가 Task 8 입력이다.

- [ ] **Step 4: Commit**

```bash
git add scripts/probe-livestock.mjs
git commit -m "feat(livestock): KAMIS 부류 500 실측 probe 스크립트"
```

---

### Task 2: 타입 확장 — `livestock` 카테고리·부류 `500`

**Files:**
- Modify: `src/types.ts` (`Category` 유니온, `KamisRef.categoryCode` 유니온)

**Interfaces:**
- Produces: `Category = 'fruit' | 'vegetable' | 'seafood' | 'livestock'`; `KamisRef.categoryCode: '100' | '200' | '400' | '600' | '500'`.

- [ ] **Step 1: 타입 수정**

`src/types.ts` 최상단:

```typescript
export type Category = 'fruit' | 'vegetable' | 'seafood' | 'livestock'
```

`KamisRef` 안:

```typescript
export interface KamisRef {
  /** 100 식량작물 | 200 채소류 | 400 과일류 | 500 축산물 | 600 수산물 */
  categoryCode: '100' | '200' | '400' | '500' | '600'
  itemName: string
  kindName?: string
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: PASS (기존 코드는 유니온 확장에 영향 없음)

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(livestock): Category에 livestock·KamisRef에 부류 500 추가"
```

---

### Task 3: `buildLivestockView` 순수 함수 + `LivestockView` 타입

제철 게이팅 없이 `category==='livestock'` 프로필 전체를 카드로, 하락순 정렬. null 가격은 `sortCards('drop')`이 자동으로 뒤로 보낸다.

**Files:**
- Modify: `src/view-types.ts` (`LivestockView` 추가)
- Modify: `src/app.ts` (`buildLivestockView` 추가)
- Test: `tests/livestock.test.ts` (Create)

**Interfaces:**
- Consumes: `Category='livestock'` (Task 2); 기존 `matchEntry`, `priceView` (`src/picks`), `toCardView` (`src/card`), `sortCards` (`src/cardlist`), `freshnessOf`(app.ts 내부), `matchNutrition`/`nutritionView`, `matchRecipes`/`recipeView`, `currentTerm`.
- Produces: `buildLivestockView(profiles: ProduceProfile[], snapshot: PriceSnapshot | null, nutrition: NutritionSnapshot | null, recipes: RecipeSnapshot | null, now: Date): LivestockView`; `interface LivestockView { cards: CardView[]; date: Date; term?: string; freshness: Freshness }`.

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// tests/livestock.test.ts
import { describe, expect, test } from 'vitest'
import { buildLivestockView } from '../src/app'
import type { PriceSnapshot, ProduceProfile } from '../src/types'

function profile(over: Partial<ProduceProfile>): ProduceProfile {
  return {
    id: 'x', name: '품목', emoji: '🥩', category: 'livestock',
    kamis: { categoryCode: '500', itemName: '품목' },
    seasonMonths: [], peakMonths: [], whyNow: { default: '설명' },
    howToPick: 'p', howToStore: 's', howToUse: 'u', ...over,
  }
}
const entry = (itemName: string, price: number | null) => ({
  itemName, kindName: '', rank: '상품',
  unit: { quantity: 100, measure: { kind: 'weight' as const, unit: 'g' as const } },
  price,
  baseline: { weekAgo: null, twoWeeksAgo: null, monthAgo: price === null ? null : price + 1000, yearAgo: null, normalYear: null },
})
function snapshot(entries: ReturnType<typeof entry>[]): PriceSnapshot {
  return { schemaVersion: 1, fetchedAt: '2026-07-21T00:00:00Z', surveyedOn: '2026-07-21', entries }
}
const now = new Date('2026-07-21T09:00:00+09:00')

describe('buildLivestockView', () => {
  test('축산물만 고른다 (제철 카테고리는 배제)', () => {
    const profiles = [
      profile({ id: 'pork', name: '삼겹살', kamis: { categoryCode: '500', itemName: '돼지고기' } }),
      profile({ id: 'apple', name: '사과', category: 'fruit', kamis: { categoryCode: '400', itemName: '사과' }, seasonMonths: [9] }),
    ]
    const view = buildLivestockView(profiles, snapshot([entry('돼지고기', 2000)]), null, null, now)
    expect(view.cards.map((c) => c.name)).toEqual(['삼겹살'])
  })

  test('제철 무관하게 축산물 전부 후보 (seasonMonths 빈 배열이어도 포함)', () => {
    const profiles = [profile({ id: 'egg', name: '계란', kamis: { categoryCode: '500', itemName: '계란' } })]
    const view = buildLivestockView(profiles, snapshot([entry('계란', 6000)]), null, null, now)
    expect(view.cards).toHaveLength(1)
  })

  test('하락 큰 순으로 정렬, null 가격은 맨 뒤', () => {
    const profiles = [
      profile({ id: 'a', name: '작은하락', kamis: { categoryCode: '500', itemName: 'A' } }),
      profile({ id: 'b', name: '큰하락', kamis: { categoryCode: '500', itemName: 'B' } }),
      profile({ id: 'c', name: '무가격', kamis: { categoryCode: '500', itemName: 'C' } }),
    ]
    const snap = snapshot([
      { ...entry('A', 9500), baseline: { weekAgo: null, twoWeeksAgo: null, monthAgo: 10000, yearAgo: null, normalYear: null } }, // -5%
      { ...entry('B', 8000), baseline: { weekAgo: null, twoWeeksAgo: null, monthAgo: 10000, yearAgo: null, normalYear: null } }, // -20%
      entry('C', null),
    ])
    const view = buildLivestockView(profiles, snap, null, null, now)
    expect(view.cards.map((c) => c.name)).toEqual(['큰하락', '작은하락', '무가격'])
  })

  test('축산물 카드에 절정 뱃지 없음 (inPeak=false)', () => {
    const profiles = [profile({ id: 'egg', name: '계란', kamis: { categoryCode: '500', itemName: '계란' }, peakMonths: [7] })]
    const view = buildLivestockView(profiles, snapshot([entry('계란', 6000)]), null, null, now)
    expect(view.cards[0].inPeak).toBe(false)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/livestock.test.ts`
Expected: FAIL — `buildLivestockView` 없음.

- [ ] **Step 3: `LivestockView` 타입 추가**

`src/view-types.ts` 끝에:

```typescript
export interface LivestockView {
  cards: CardView[]
  date: Date
  /** 현재 절기 이름 — 아이브로용 */
  term?: string
  /** 가격 조사일 신선도 (제철 페이지와 동일한 "N일 전 조사 · 전국 평균" 줄) */
  freshness: Freshness
}
```

`Freshness`는 이미 `src/view-types.ts`에 있다(파일 상단). 없으면 상단 `export type Freshness` 확인.

- [ ] **Step 4: `buildLivestockView` 구현**

`src/app.ts`에 추가(파일 상단 import에 `LivestockView` 포함, `toCardView`·`sortCards`·`matchEntry`·`priceView`·`currentTerm`·`nutritionView`/`matchNutrition`·`recipeView`/`matchRecipes`·`freshnessOf`는 이미 이 파일 스코프에 있음):

```typescript
/** 축산물 값 페이지. 제철 없음 — category==='livestock' 전체를 후보로,
 *  하락순 정렬(무가격은 sortCards가 뒤로). 순수 함수. */
export function buildLivestockView(
  profiles: ProduceProfile[],
  snapshot: PriceSnapshot | null,
  nutrition: NutritionSnapshot | null,
  recipes: RecipeSnapshot | null,
  now: Date,
): LivestockView {
  const month = now.getMonth() + 1
  const livestock = profiles.filter((p) => p.category === 'livestock')
  const cards = sortCards(
    livestock.map((profile) => {
      const entry = snapshot ? matchEntry(profile, snapshot.entries) : null
      const price = entry ? priceView(entry) : null
      return toCardView(
        { profile, inPeak: false, price },
        month,
        nutritionView(matchNutrition(profile, nutrition)),
        recipeView(matchRecipes(profile, recipes)),
      )
    }),
    'drop',
  )
  return { cards, date: now, term: currentTerm(now), freshness: freshnessOf(snapshot, now) }
}
```

`src/view-types.ts`에서 `LivestockView`를 import하도록 `src/app.ts` 상단 타입 import 줄에 추가:

```typescript
import type { AppView, ComingView, Freshness, LivestockView, OffSeasonHint } from './view-types'
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run tests/livestock.test.ts && npx tsc --noEmit`
Expected: PASS 둘 다.

- [ ] **Step 6: Commit**

```bash
git add src/view-types.ts src/app.ts tests/livestock.test.ts
git commit -m "feat(livestock): buildLivestockView 순수 함수 + LivestockView"
```

---

### Task 4: 누수 방지 — 제철 라우트에서 축산물 배제

`buildAppView`의 `searchIndex`는 `!seasonMonths.includes(month)`로 뽑아 축산물(빈 배열)을 빨아들인다. 두 빌더 입력에서 축산물을 걸러 회귀를 막는다. (`selectPicks`·`comingMonths`는 `seasonMonths.includes`로 이미 축산물을 제외하지만, 명시적으로 걸러 안전하게.)

**Files:**
- Modify: `src/app.ts` (`buildAppView`, `buildComingView`)
- Test: `tests/livestock.test.ts` (append)

**Interfaces:**
- Consumes: `buildAppView`, `buildComingView` (기존 시그니처 불변).
- Produces: 두 뷰 모두 `category==='livestock'` 프로필을 무시.

- [ ] **Step 1: 실패 테스트 추가**

`tests/livestock.test.ts` 끝에:

```typescript
import { buildAppView } from '../src/app'

describe('제철 라우트 누수 방지', () => {
  test('buildAppView.searchIndex에 축산물이 들어가지 않는다', () => {
    const profiles = [
      profile({ id: 'beef', name: '한우 1등급', kamis: { categoryCode: '500', itemName: '쇠고기' } }),
      profile({ id: 'apple', name: '사과', category: 'fruit', kamis: { categoryCode: '400', itemName: '사과' }, seasonMonths: [9] }),
    ]
    const view = buildAppView(profiles, null, null, null, now)
    expect(view.searchIndex.map((h) => h.name)).not.toContain('한우 1등급')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/livestock.test.ts`
Expected: FAIL — searchIndex에 '한우 1등급' 포함됨.

- [ ] **Step 3: 두 빌더에서 축산물 필터**

`src/app.ts` `buildAppView` 본문 첫 줄들 수정 — `month` 계산 다음에 축산물 제외 배열을 만들고 이후 `profiles` 대신 이 배열을 쓴다:

```typescript
export function buildAppView(
  profiles: ProduceProfile[],
  snapshot: PriceSnapshot | null,
  nutrition: NutritionSnapshot | null,
  recipes: RecipeSnapshot | null,
  now: Date,
): AppView {
  const month = now.getMonth() + 1
  // 축산물은 제철이 없다 — 제철 달력·검색 인덱스에서 제외(전용 /livestock 탭에서만 보인다).
  const seasonal = profiles.filter((p) => p.category !== 'livestock')
  const picks = selectPicks(seasonal, snapshot, now)
  const cards = sortCards(
    picks.map((p) =>
      toCardView(
        p,
        month,
        nutritionView(matchNutrition(p.profile, nutrition)),
        recipeView(matchRecipes(p.profile, recipes)),
      ),
    ),
    'drop',
  )
  const comingIds = new Set(
    comingMonths(seasonal, month).flatMap((g) => g.items.map((it) => it.profile.id)),
  )
  const searchIndex: OffSeasonHint[] = seasonal
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
    searchIndex,
    date: now,
    freshness: freshnessOf(snapshot, now),
    term: currentTerm(now),
  }
}
```

`buildComingView` 본문에서 `comingMonths(profiles, month)`를 `comingMonths(profiles.filter((p) => p.category !== 'livestock'), month)`로 바꾼다:

```typescript
  const month = now.getMonth() + 1
  const seasonal = profiles.filter((p) => p.category !== 'livestock')
  const months = comingMonths(seasonal, month).map((g) => ({
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run tests/livestock.test.ts && npx vitest run tests/ && npx tsc --noEmit`
Expected: PASS 전부 (기존 제철 테스트도 그대로 통과).

- [ ] **Step 5: Commit**

```bash
git add src/app.ts tests/livestock.test.ts
git commit -m "fix(livestock): 제철 라우트(buildAppView/buildComingView)에서 축산물 배제"
```

---

### Task 5: `Livestock` 컴포넌트

`/coming`의 `Coming` 컴포넌트를 본떠 카드 그리드 + 제철 페이지식 조사일 줄 + 빈 상태. 제철·절정 UI는 데이터가 없으니(빈 seasonMonths, inPeak=false) 자연히 안 뜬다.

**Files:**
- Create: `src/components/Livestock.tsx`
- Create: `src/components/Livestock.module.css`
- Test: `src/components/Livestock.test.tsx`

**Interfaces:**
- Consumes: `LivestockView` (Task 3), 기존 `NavIndex`(Task 6에서 'livestock' 추가), `ProduceCard`, `Sprig`, `weekLabel`/`relativeDayLabel`/`surveyedDateLabel` (`src/week`).
- Produces: `export function Livestock({ view }: { view: LivestockView })`.

- [ ] **Step 1: 실패 테스트 작성**

```tsx
// src/components/Livestock.test.tsx
// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import { screen } from '@testing-library/react'
import { Livestock } from './Livestock'
import { renderWithRouter } from '../test-utils'
import type { LivestockView } from '../view-types'
import type { CardView } from '../card'

const card = (name: string): CardView => ({
  emoji: '🥩', name, kind: '', category: 'livestock', inPeak: false,
  whyNow: '설명', note: { pick: 'p', store: 's', use: 'u' },
  price: null, nutrition: null, recipes: null,
  season: { months: [], seasonLabel: '', peakLabel: '', currentMonth: 7 },
})

const view = (cards: CardView[]): LivestockView => ({
  cards, date: new Date('2026-07-21T09:00:00+09:00'), term: undefined,
  freshness: { kind: 'dated', surveyedOn: '2026-07-21', days: 0 },
})

describe('Livestock', () => {
  test('카드 이름을 렌더한다', () => {
    renderWithRouter(<Livestock view={view([card('삼겹살'), card('계란')])} />)
    expect(screen.getByText('삼겹살')).toBeInTheDocument()
    expect(screen.getByText('계란')).toBeInTheDocument()
  })

  test('빈 목록이면 담백한 안내', () => {
    renderWithRouter(<Livestock view={view([])} />)
    expect(screen.getByText(/축산물 값 정보가 아직 없어요/)).toBeInTheDocument()
  })

  test('제목에 "제철"을 쓰지 않는다', () => {
    renderWithRouter(<Livestock view={view([card('삼겹살')])} />)
    expect(screen.queryByText(/제철/)).toBeNull()
  })
})
```

> `src/test-utils.tsx`가 `@testing-library/jest-dom`을 셋업에 포함하는지 확인. 기존 컴포넌트 테스트(`src/components/App.test.tsx`)가 `toBeInTheDocument`를 쓰면 셋업은 이미 있다. 없으면 그 파일이 하는 import 방식을 그대로 따른다.

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/Livestock.test.tsx`
Expected: FAIL — `Livestock` 없음.

- [ ] **Step 3: 컴포넌트 구현**

```tsx
// src/components/Livestock.tsx
import type { LivestockView } from '../view-types'
import { relativeDayLabel, surveyedDateLabel, weekLabel } from '../week'
import { Sprig } from './Sprig'
import { NavIndex } from './NavIndex'
import { ProduceCard } from './ProduceCard'
import styles from './Livestock.module.css'

/** 축산물 값 페이지. 제철이 아니라 "값이 내려온 순". 표시 전용. */
export function Livestock({ view }: { view: LivestockView }) {
  const { cards, date, term, freshness } = view
  const eyebrow = term ? `${term} · ${weekLabel(date)}` : weekLabel(date)
  return (
    <>
      <NavIndex current="livestock" />
      <header>
        <Sprig />
        <p className="week">{eyebrow}</p>
        <h1>요즘 값이 내려온 축산물</h1>
        {freshness.kind === 'dated' && (
          <p className={styles.surveyed}>
            {relativeDayLabel(freshness.days)} · {surveyedDateLabel(freshness.surveyedOn)} · 전국 평균
          </p>
        )}
      </header>
      <main>
        {cards.length > 0 ? (
          <div className="list">
            {cards.map((c) => (
              <ProduceCard key={c.name} card={c} />
            ))}
          </div>
        ) : (
          <p className="empty">축산물 값 정보가 아직 없어요</p>
        )}
      </main>
    </>
  )
}
```

- [ ] **Step 4: CSS 작성**

`src/components/Coming.module.css`의 톤을 참고하되 축산물엔 계절 섹션이 없으니 최소만. 조사일 줄만 있으면 된다.

```css
/* src/components/Livestock.module.css */
.surveyed {
  font-size: var(--text-sm, 0.8125rem);
  color: var(--ink-soft, #6b7280);
  margin-top: 0.25rem;
}
```

> `--text-sm`·`--ink-soft` 등 실제 토큰명은 `src/global.css`/`DESIGN.md`에서 확인해 맞춘다. 없으면 `App.module.css`의 `.surveyed`가 쓰는 토큰을 그대로 쓴다.

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/components/Livestock.test.tsx && npx tsc --noEmit`
Expected: PASS 둘 다.

- [ ] **Step 6: Commit**

```bash
git add src/components/Livestock.tsx src/components/Livestock.module.css src/components/Livestock.test.tsx
git commit -m "feat(livestock): Livestock 페이지 컴포넌트"
```

---

### Task 6: `NavIndex` — 축산물 링크 추가

**Files:**
- Modify: `src/components/NavIndex.tsx`
- Test: `src/components/NavIndex.test.tsx` (Create — 없으면)

**Interfaces:**
- Consumes: 기존 `NavIndex`.
- Produces: `NavIndex({ current }: { current: 'now' | 'coming' | 'livestock' })`, 드로워에 `/livestock` 링크("축산물 값").

- [ ] **Step 1: 실패 테스트 작성**

```tsx
// src/components/NavIndex.test.tsx
// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import { screen } from '@testing-library/react'
import { NavIndex } from './NavIndex'
import { renderWithRouter } from '../test-utils'

describe('NavIndex', () => {
  test('축산물 값 링크가 /livestock을 가리킨다', () => {
    renderWithRouter(<NavIndex current="now" />)
    const link = screen.getByText('축산물 값') as HTMLAnchorElement
    expect(link.getAttribute('href')).toContain('livestock')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/NavIndex.test.tsx`
Expected: FAIL — '축산물 값' 없음.

- [ ] **Step 3: `current` 타입 확장 + 링크 추가**

`src/components/NavIndex.tsx`:

```tsx
export function NavIndex({ current }: { current: 'now' | 'coming' | 'livestock' }) {
```

`navPanelInner` 안, `/coming` `<Link>` 다음에:

```tsx
            <Link to="/livestock" viewTransition aria-current={current === 'livestock' ? 'page' : undefined} onClick={close}>
              축산물 값
            </Link>
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/components/NavIndex.test.tsx && npx vitest run src/components/ && npx tsc --noEmit`
Expected: PASS (기존 App/Coming 컴포넌트 테스트도 `current` 유니온 확장에 영향 없음).

- [ ] **Step 5: Commit**

```bash
git add src/components/NavIndex.tsx src/components/NavIndex.test.tsx
git commit -m "feat(livestock): NavIndex에 축산물 값 링크"
```

---

### Task 7: `/livestock` 라우트

`src/routes/coming.tsx`를 본떠 로더가 JSON을 읽어 `buildLivestockView`로 조립하고 프리렌더.

**Files:**
- Create: `src/routes/livestock.tsx`

**Interfaces:**
- Consumes: `buildLivestockView` (Task 3), `Livestock` (Task 5), `produce.json`·`prices.json`·`nutrition.json`·`recipes.json`.
- Produces: `/livestock` 라우트.

- [ ] **Step 1: 라우트 작성**

```tsx
// src/routes/livestock.tsx
import { createFileRoute } from '@tanstack/react-router'
import produce from '../../public/data/produce.json'
import prices from '../../public/data/prices.json'
import nutrition from '../../public/data/nutrition.json'
import recipes from '../../public/data/recipes.json'
import { buildLivestockView } from '../app'
import { Livestock } from '../components/Livestock'
import type { NutritionSnapshot, PriceSnapshot, ProduceProfile, RecipeSnapshot } from '../types'

export const Route = createFileRoute('/livestock')({
  loader: async () =>
    buildLivestockView(
      produce as unknown as ProduceProfile[],
      prices as unknown as PriceSnapshot,
      nutrition as unknown as NutritionSnapshot,
      recipes as unknown as RecipeSnapshot,
      new Date(),
    ),
  component: LivestockPage,
})

function LivestockPage() {
  const view = Route.useLoaderData()
  // date는 로더 직렬화 경계를 넘으며 문자열이 될 수 있어 Date로 되살린다.
  return <Livestock view={{ ...view, date: new Date(view.date) }} />
}
```

> `src/routes/index.tsx`가 `prices.json`을 어떻게 import/캐스팅하는지 확인해 동일 방식으로 맞춘다(널 허용·타입 캐스팅 관례).

- [ ] **Step 2: 라우트 트리 생성 + 타입체크**

Run: `npm run generate-routes && npx tsc --noEmit`
Expected: `src/routeTree.gen.ts`에 `/livestock` 포함, PASS. (`routeTree.gen.ts`는 gitignore — 커밋 안 함.)

- [ ] **Step 3: 브라우저 실측**

Run: `npm run dev` → `http://localhost:3000/livestock` 접속. 카드 그리드·조사일 줄·빈 상태 확인, 좌측 램프줄 드로워에 "축산물 값" 링크로 이동 확인. `/`(제철)에 축산물이 안 섞였는지도 확인.

- [ ] **Step 4: Commit**

```bash
git add src/routes/livestock.tsx
git commit -m "feat(livestock): /livestock 라우트"
```

---

### Task 8: 축산물 프로필 authoring (`produce.json`)

Task 1에서 확정한 실제 KAMIS 문자열로 축산물 프로필을 채운다. 소고기는 등급마다 별도 프로필. whyNow는 월별이 아니라 `default` 한 줄(사실 기반, 이커머스 톤 금지).

**Files:**
- Modify: `public/data/produce.json`

**Interfaces:**
- Consumes: Task 1 확정 문자열, Task 2 타입.
- Produces: `category:'livestock'` 프로필 N개.

- [ ] **Step 1: 프로필 추가**

`public/data/produce.json` 배열 끝에 축산물 프로필들을 추가. 각 항목 형식(값은 Task 1 실측으로 교체):

```json
{
  "id": "hanwoo-sirloin-1",
  "name": "한우 등심 1등급",
  "emoji": "🐂",
  "category": "livestock",
  "kamis": { "categoryCode": "500", "itemName": "쇠고기", "kindName": "한우 등심(1등급)" },
  "seasonMonths": [],
  "peakMonths": [],
  "whyNow": { "default": "구이용 등심. 1등급은 마블링이 적당해 담백하게 즐기기 좋아요." },
  "howToPick": "선홍색이 선명하고 지방이 희고 탄력 있는 것.",
  "howToStore": "냉장 2~3일, 오래 둘 거면 한 끼씩 나눠 냉동.",
  "howToUse": "센 불에 겉면부터 굽고 레스팅. 소금·후추만으로 충분해요."
}
```

최소 세트(Task 1 응답에 있는 것만): 한우 등심 1++/1+/1등급, 수입 소고기, 삼겹살(국산), 목살(국산), 닭고기, 계란(특란). 응답에 없는 품목은 넣지 않고, 뺀 이유를 커밋 메시지에 한 줄 남긴다.

> **whyNow 사실 기반 원칙**(메모 [[whynow-copy-research-first]]): 등급·부위 특성은 인상 클리셰가 아니라 사실로. 예: "1++는 마블링이 가장 촘촘", "삼겹살은 지방층이 세 겹" 등 확인 가능한 서술만.

- [ ] **Step 2: JSON 유효성 + 타입체크**

Run: `node -e "JSON.parse(require('fs').readFileSync('public/data/produce.json','utf8'))" && npx tsc --noEmit`
Expected: 파싱 성공, PASS.

- [ ] **Step 3: 라우트 실측**

Run: `npm run dev` → `/livestock`에 실제 축산물 카드들이 뜨는지, 등급별 별도 카드인지 확인. (가격은 `prices.json`에 500이 아직 없으면 "오늘 조사 없음"으로 뒤에 — Task 9 이후 실제 값.)

- [ ] **Step 4: Commit**

```bash
git add public/data/produce.json
git commit -m "feat(livestock): 축산물 프로필(소 등급별·돼지·닭·계란) 추가"
```

---

### Task 9: 수집 파이프라인 — 부류 500 + 커버리지 리포트

**Files:**
- Modify: `scripts/fetch-prices.mjs:8` (`CATEGORY_CODES`)
- Modify: `scripts/report-coverage.mjs` (축산물 인지 분기)

**Interfaces:**
- Consumes: 기존 수집 스크립트.
- Produces: `prices.json`에 부류 500 포함; 리포트가 축산물 미스를 정상(off-season)이 아니라 실제 미스로 표시.

- [ ] **Step 1: `CATEGORY_CODES`에 500 추가**

`scripts/fetch-prices.mjs`:

```javascript
// 식량작물(감자·고구마·옥수수), 채소류, 과일류, 축산물, 수산물
const CATEGORY_CODES = ['100', '200', '400', '500', '600']
```

- [ ] **Step 2: report-coverage 축산물 분기**

`scripts/report-coverage.mjs`의 분류 루프에서, 축산물은 `seasonMonths`가 비어 항상 "off-season"으로 새는 걸 막는다. `for (const p of profiles)` 안 `else if (!p.seasonMonths.includes(month))` 앞에 축산물 우선 분기를 넣는다:

```javascript
  const { hit, reason } = match(p)
  if (hit) matched.push(p)
  else if (p.category === 'livestock') broken.push({ profile: p, reason }) // 축산물은 제철 없음 — 미스는 진짜 문제
  else if (!p.seasonMonths.includes(month)) offSeason.push(p)
  else broken.push({ profile: p, reason })
```

- [ ] **Step 3: 리포트 실행(가능하면)**

Run: `npm run report:coverage`
Expected: 축산물 프로필이 리포트에 나타남. (`prices.json`에 실제 500 데이터가 있어야 매칭 확인 가능 — 없으면 축산물이 `broken`에 뜨는 게 정상; 실 데이터는 Lambda 수집 후.)

- [ ] **Step 4: 타입체크·테스트**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch-prices.mjs scripts/report-coverage.mjs
git commit -m "feat(livestock): KAMIS 부류 500 수집 + 커버리지 리포트 축산물 인지"
```

> **게이트(문서화만, 이 플랜 밖 운영):** 실제 500 데이터는 서울 Lambda 수동 invoke로 200 확인 후 반영한다(`docs/aws-lambda.md`). 코드만 확장하므로 EventBridge 변경은 없다.

---

### Task 10: 문서 갱신 + 전체 실측

**Files:**
- Modify: `docs/제품-동작-지도.md`
- Modify: `CLAUDE.md` (필요 시)

- [ ] **Step 1: 제품-동작-지도 갱신**

`docs/제품-동작-지도.md`의 수집 정책·지렛대 지도에 축산물 항목 추가: 부류 500, **제철 무시(가격 축)**, 소고기 등급 전부 별도 카드, 결측=명단 뒤로, 별도 `/livestock` 탭, 제철 라우트에서 배제.

- [ ] **Step 2: CLAUDE.md 검토**

명령어/규칙에 축산물 한 줄 반영(예: "축산물은 부류 500, 제철 없이 가격축, `/livestock` 별도 탭"). 과하면 생략.

- [ ] **Step 3: 전체 게이트**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: 테스트 PASS, 타입 PASS, 프리렌더 빌드 성공(`/livestock` 정적 산출 포함).

- [ ] **Step 4: 브라우저 최종 실측**

Run: `npm run dev` — (a) `/livestock` 카드·정렬·조사일·빈 상태, (b) 드로워 3개 링크 이동, (c) `/`·`/coming`에 축산물 미출현, (d) 검색에 축산물 미노출. 사용자향 시각 변경이니 스크린샷으로 사인오프.

- [ ] **Step 5: Commit**

```bash
git add docs/제품-동작-지도.md CLAUDE.md
git commit -m "docs(livestock): 제품 동작 지도·CLAUDE.md에 축산물 정책 반영"
```

---

## Self-Review

**Spec coverage:**
- 가격만 축 → Task 3 (제철 게이팅 없음). ✅
- 별도 탭 → Task 5·7 (`/livestock`), Task 6 (NavIndex). ✅
- 가급적 전체 품목 → Task 8 (실측 기반 authoring), Task 1 (문자열 확정). ✅
- 소고기 등급 전부·등급마다 별도 카드 → Task 8 (프로필 분리) + 기존 카드 재사용. ✅
- 누수 방지 심 → Task 4. ✅
- 데이터 모델(ProduceProfile 재사용, 500·livestock 유니온) → Task 2. ✅
- 수집(500) + 커버리지 → Task 9. ✅
- 결측 규칙(뒤로) → Task 3 (sortCards 'drop' 자동) + 테스트. ✅
- 문서 갱신 → Task 10. ✅

**Placeholder scan:** 잠정 KAMIS 문자열은 Task 1이 실측으로 확정하는 명시적 단계 — 미완 구멍이 아니라 계획된 게이트. 그 외 TBD 없음. ✅

**Type consistency:** `buildLivestockView`·`LivestockView`·`current: 'now'|'coming'|'livestock'`·`categoryCode '500'`·`category 'livestock'`가 Task 2·3·5·6·7에서 일관. `toCardView({profile,inPeak,price}, month, …)` 시그니처는 기존 `src/card.ts`와 일치. ✅
