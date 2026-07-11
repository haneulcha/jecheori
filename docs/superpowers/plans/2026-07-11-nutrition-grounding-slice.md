# 영양 grounding 슬라이스 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 식약처 영양성분DB에서 원물 영양값을 CI/빌드 타임에 수집해 정적 `nutrition.json`으로 커밋하고, 카드에 "100g당 N kcal · 당 Ng · 출처" 한 줄로 표시한다 — 수집→매핑→표시 전 구간을 관통하는 첫 세로 슬라이스.

**Architecture:** 기존 가격 파이프라인(`fetch-prices.mjs` → `prices.json` → `buildAppView` → `CardView` → 컴포넌트)의 데칼코마니. 새 데이터원·콘텐츠도 같은 심(seam)에 얹고, 의존 방향 `picks ← card ← app ← components ← routes`와 "수집은 CI, 앱은 정적·무외부요청" 원칙을 유지한다. 영양은 **선정/정렬에 영향을 주지 않고** 표시 grounding으로만 카드 투영 시점에 붙는다(그래서 `selectPicks`는 손대지 않는다).

**Tech Stack:** TanStack Start (React 19) · Vite · Vitest · Node ≥ 22 · 순수 `.mjs` 수집 스크립트 · TypeScript 순수 로직.

## Global Constraints

- 공개 페이지는 **경량·무추적·런타임 외부요청 0.** API 호출은 CI/빌드 타임에만, 앱은 커밋된 정적 JSON만 읽는다.
- **API 키는 코드·저장소에 절대 넣지 않는다.** 환경변수·CI 시크릿으로만. 영양DB 키 env 이름: `DATA_GO_KR_KEY` (data.go.kr 계정 serviceKey).
- 재배포 데이터는 **출처표시 의무**(KOGL 1유형). 화면에 "출처: 식품의약품안전처" 명시.
- 사용자 문구는 **담백한 한국어, 이커머스 화법 금지.**
- 순수 로직은 `picks/card/app/nutrition`, 표시는 `components`. 컴포넌트는 사용자 텍스트를 직접 이스케이프하지 않는다(React 자동 이스케이프).
- 파싱 로직은 `scripts/lib/`, 수집기는 `scripts/fetch-*.mjs`(순수 `build*` + `writeSnapshot` + main 가드), 순수 로직 테스트는 `tests/*.test.{js,ts}`, 컴포넌트 테스트는 colocated `src/components/*.test.tsx`.
- 커밋 메시지 말미: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

### Task 1: 영양 응답 파서 (`scripts/lib/parse-nutrition.mjs`)

식약처 `FoodNtrCpntDbInfo02` JSON 응답에서 원물 엔트리 하나를 `NutritionEntry` 형태로 추출하는 순수 함수. `parse-kamis.mjs`와 같은 위치·패턴.

**Files:**
- Create: `scripts/lib/parse-nutrition.mjs`
- Create: `tests/parse-nutrition.test.js`
- Create: `tests/fixtures/foodntr-apple.json`

**Interfaces:**
- Produces: `parseNum(s): number | null` — 문자열→숫자(빈문자열/미정의는 null, **"0"은 유효값 0**). `parseNutritionEntry(json, foodName): NutritionEntry | null` — `body.items`에서 `FOOD_NM_KR === foodName` 정확일치 엔트리를 추출; 없으면 null; 오류 응답이면 throw.
- `NutritionEntry` 형태: `{ foodName: string, serving: string, kcal, carbs, protein, fat, sugar, fiber: (number|null) }` (필드값 매핑: `AMT_NUM1`=kcal, `AMT_NUM6`=carbs, `AMT_NUM3`=protein, `AMT_NUM4`=fat, `AMT_NUM7`=sugar, `AMT_NUM8`=fiber, `SERVING_SIZE`=serving).

- [ ] **Step 1: 픽스처 파일 생성**

`tests/fixtures/foodntr-apple.json` — 실 API 응답 축약(사과_부사_생것 + 노이즈 1건). 값은 2026-07-11 실측:

```json
{
  "header": { "resultCode": "00", "resultMsg": "NORMAL SERVICE." },
  "body": {
    "totalCount": 8,
    "items": [
      {
        "FOOD_NM_KR": "사과잼",
        "SERVING_SIZE": "100g",
        "AMT_NUM1": "250.00", "AMT_NUM3": "0.30", "AMT_NUM4": "0.10",
        "AMT_NUM6": "65.00", "AMT_NUM7": "60.00", "AMT_NUM8": "1.00"
      },
      {
        "FOOD_NM_KR": "사과_부사_생것",
        "SERVING_SIZE": "100g",
        "AMT_NUM1": "53.00", "AMT_NUM3": "0.20", "AMT_NUM4": "0.07",
        "AMT_NUM6": "14.28", "AMT_NUM7": "11.13", "AMT_NUM8": "1.70"
      }
    ]
  }
}
```

- [ ] **Step 2: 실패 테스트 작성** — `tests/parse-nutrition.test.js`

```js
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { parseNum, parseNutritionEntry } from '../scripts/lib/parse-nutrition.mjs'

const apple = JSON.parse(
  readFileSync(new URL('./fixtures/foodntr-apple.json', import.meta.url), 'utf-8'),
)

describe('parseNum', () => {
  test('숫자 문자열을 숫자로', () => expect(parseNum('53.00')).toBe(53))
  test('빈 문자열·미정의는 null', () => {
    expect(parseNum('')).toBeNull()
    expect(parseNum(null)).toBeNull()
    expect(parseNum(undefined)).toBeNull()
  })
  test('"0"은 유효한 0 (가격 파서와 다름)', () => expect(parseNum('0')).toBe(0))
})

describe('parseNutritionEntry', () => {
  test('정확일치 원물을 NutritionEntry로 변환한다', () => {
    expect(parseNutritionEntry(apple, '사과_부사_생것')).toEqual({
      foodName: '사과_부사_생것',
      serving: '100g',
      kcal: 53, carbs: 14.28, protein: 0.2, fat: 0.07, sugar: 11.13, fiber: 1.7,
    })
  })
  test('노이즈(사과잼)는 고르지 않는다 — 정확일치만', () => {
    expect(parseNutritionEntry(apple, '사과_부사_생것').kcal).toBe(53)
  })
  test('일치 항목 없으면 null', () => {
    expect(parseNutritionEntry(apple, '없는이름')).toBeNull()
  })
  test('오류 응답이면 throw', () => {
    expect(() => parseNutritionEntry({ header: { resultMsg: 'LIMIT' } }, 'x')).toThrow(/FoodNtr/)
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- parse-nutrition`
Expected: FAIL — "parse-nutrition.mjs" 모듈 없음.

- [ ] **Step 4: 파서 구현** — `scripts/lib/parse-nutrition.mjs`

```js
/** 문자열 영양수치를 숫자로. 빈문자열·미정의는 null. "0"은 유효한 0. */
export function parseNum(s) {
  if (s === null || s === undefined) return null
  const t = String(s).trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isNaN(n) ? null : n
}

/** FoodNtrCpntDbInfo02 응답에서 FOOD_NM_KR === foodName 원물 하나를 NutritionEntry로.
 *  없으면 null, 오류 응답(body.items 없음)이면 throw. */
export function parseNutritionEntry(json, foodName) {
  const items = json?.body?.items
  if (!Array.isArray(items)) {
    const msg = json?.header?.resultMsg ?? 'unknown'
    throw new Error(`FoodNtr 응답 이상: ${msg}`)
  }
  const it = items.find((x) => x.FOOD_NM_KR === foodName)
  if (!it) return null
  return {
    foodName: it.FOOD_NM_KR,
    serving: it.SERVING_SIZE ?? '',
    kcal: parseNum(it.AMT_NUM1),
    carbs: parseNum(it.AMT_NUM6),
    protein: parseNum(it.AMT_NUM3),
    fat: parseNum(it.AMT_NUM4),
    sugar: parseNum(it.AMT_NUM7),
    fiber: parseNum(it.AMT_NUM8),
  }
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- parse-nutrition`
Expected: PASS (전부 녹색).

- [ ] **Step 6: 커밋**

```bash
git add scripts/lib/parse-nutrition.mjs tests/parse-nutrition.test.js tests/fixtures/foodntr-apple.json
git commit -m "feat: 영양성분 응답 파서 (parse-nutrition)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 수집 스크립트 (`scripts/fetch-nutrition.mjs`)

`foodDb` 참조가 있는 프로필만 조회해 `NutritionSnapshot`을 만드는 순수 `buildNutritionSnapshot` + main 가드. `fetch-prices.mjs`의 골격을 그대로 따르고 `writeSnapshot`은 거기서 재사용(import 시 main 블록은 실행되지 않음).

**Files:**
- Create: `scripts/fetch-nutrition.mjs`
- Create: `tests/fetch-nutrition.test.js`
- Modify: `package.json` (scripts에 `fetch:nutrition` 추가)

**Interfaces:**
- Consumes: `parseNutritionEntry` (Task 1); `writeSnapshot(snapshot, outPath)` (from `scripts/fetch-prices.mjs`).
- Produces: `buildNutritionSnapshot({ key, profiles, fetchFn }): Promise<NutritionSnapshot>` — `foodDb` 있는 프로필만 `FOOD_NM_KR`+`FOOD_CAT1_NM`으로 조회, 엔트리 수집. HTTP 오류면 throw. `NutritionSnapshot = { schemaVersion: 1, fetchedAt: ISO, entries: NutritionEntry[] }`.

- [ ] **Step 1: 실패 테스트 작성** — `tests/fetch-nutrition.test.js`

```js
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { buildNutritionSnapshot } from '../scripts/fetch-nutrition.mjs'

const apple = JSON.parse(
  readFileSync(new URL('./fixtures/foodntr-apple.json', import.meta.url), 'utf-8'),
)
const profiles = [
  { name: '사과', foodDb: { category1: '과일류', foodName: '사과_부사_생것' } },
  { name: '감자' }, // foodDb 없음 → 건너뜀
]

test('foodDb 있는 프로필만 조회하고 엔트리를 모은다', async () => {
  const calls = []
  const fetchFn = async (url) => {
    calls.push(new URL(url).searchParams.get('FOOD_NM_KR'))
    return { ok: true, json: async () => apple }
  }
  const snap = await buildNutritionSnapshot({ key: 'K', profiles, fetchFn })
  expect(calls).toEqual(['사과_부사_생것']) // 감자는 호출 안 함
  expect(snap.schemaVersion).toBe(1)
  expect(snap.entries).toHaveLength(1)
  expect(snap.entries[0].kcal).toBe(53)
  expect(new Date(snap.fetchedAt).getTime()).not.toBeNaN()
})

test('요청에 serviceKey와 카테고리 필터가 들어간다', async () => {
  let sp
  const fetchFn = async (url) => {
    sp = new URL(url).searchParams
    return { ok: true, json: async () => apple }
  }
  await buildNutritionSnapshot({ key: 'MYKEY', profiles, fetchFn })
  expect(sp.get('serviceKey')).toBe('MYKEY')
  expect(sp.get('FOOD_CAT1_NM')).toBe('과일류')
  expect(sp.get('type')).toBe('json')
})

test('HTTP 오류면 throw', async () => {
  const fetchFn = async () => ({ ok: false, status: 500 })
  await expect(
    buildNutritionSnapshot({ key: 'K', profiles, fetchFn }),
  ).rejects.toThrow(/500/)
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- fetch-nutrition`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 수집 스크립트 구현** — `scripts/fetch-nutrition.mjs`

```js
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseNutritionEntry } from './lib/parse-nutrition.mjs'
import { writeSnapshot } from './fetch-prices.mjs'

const API = 'https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02'

/** foodDb 참조가 있는 프로필만 조회해 NutritionSnapshot 생성. fetchFn 주입으로 테스트. */
export async function buildNutritionSnapshot({ key, profiles, fetchFn = fetch }) {
  const entries = []
  for (const p of profiles) {
    if (!p.foodDb) continue
    const url = new URL(API)
    url.searchParams.set('serviceKey', key)
    url.searchParams.set('type', 'json')
    url.searchParams.set('numOfRows', '50')
    url.searchParams.set('FOOD_NM_KR', p.foodDb.foodName)
    url.searchParams.set('FOOD_CAT1_NM', p.foodDb.category1)
    const res = await fetchFn(url.toString())
    if (!res.ok) throw new Error(`FoodNtr HTTP ${res.status} (${p.name})`)
    const entry = parseNutritionEntry(await res.json(), p.foodDb.foodName)
    if (entry) entries.push(entry)
  }
  return { schemaVersion: 1, fetchedAt: new Date().toISOString(), entries }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const key = process.env.DATA_GO_KR_KEY
  if (!key) {
    console.error('DATA_GO_KR_KEY 환경변수가 필요합니다')
    process.exit(1)
  }
  const profiles = JSON.parse(
    readFileSync(new URL('../public/data/produce.json', import.meta.url), 'utf-8'),
  )
  const outPath = fileURLToPath(new URL('../public/data/nutrition.json', import.meta.url))
  try {
    const snapshot = await buildNutritionSnapshot({ key, profiles })
    if (snapshot.entries.length === 0) throw new Error('수집된 영양 엔트리가 없습니다')
    writeSnapshot(snapshot, outPath)
    console.log(`nutrition.json 갱신: ${snapshot.entries.length}개`)
  } catch (err) {
    console.error('영양 수집 실패 — nutrition.json은 변경하지 않음:', err.message)
    process.exit(1)
  }
}
```

- [ ] **Step 4: package.json에 스크립트 추가** — `"fetch:prices"` 줄 아래에:

```json
    "fetch:nutrition": "node scripts/fetch-nutrition.mjs",
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- fetch-nutrition`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add scripts/fetch-nutrition.mjs tests/fetch-nutrition.test.js package.json
git commit -m "feat: 영양성분 수집 스크립트 (fetch:nutrition)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: 타입 + 매칭·뷰 (`src/types.ts`, `src/nutrition.ts`)

앱 쪽 타입(`FoodDbRef`·`NutritionEntry`·`NutritionSnapshot`)과 순수 매칭·뷰 함수. `picks.ts`의 `matchEntry`/`priceView` 데칼코마니이되, 별도 모듈로 두어 `picks.ts`(무엇을 고르나)를 손대지 않는다.

**Files:**
- Modify: `src/types.ts` (끝에 타입 추가 + `ProduceProfile`에 `foodDb?` 필드)
- Create: `src/nutrition.ts`
- Create: `tests/nutrition.test.ts`

**Interfaces:**
- Produces (types.ts): `FoodDbRef { category1: string; foodName: string }`; `NutritionEntry { foodName, serving: string; kcal, carbs, protein, fat, sugar, fiber: number|null }`; `NutritionSnapshot { schemaVersion: number; fetchedAt: string; entries: NutritionEntry[] }`; `ProduceProfile.foodDb?: FoodDbRef`.
- Produces (nutrition.ts): `NutritionView { serving: string; kcal, sugar, fiber: number|null }`; `matchNutrition(profile, snapshot): NutritionEntry | null`; `nutritionView(entry): NutritionView | null`.

- [ ] **Step 1: types.ts에 타입 추가** — 파일 끝(`PriceSnapshot` 아래)에:

```ts
/** 식약처 영양DB에서 원물 하나를 집기 위한 수기 참조 (KamisRef와 같은 패턴).
 *  FOOD_CAT1_NM 필터 + 대표 엔트리명(FOOD_NM_KR 정확일치)으로 매칭. */
export interface FoodDbRef {
  /** FOOD_CAT1_NM 필터값: '과일류' | '채소류' */
  category1: string
  /** 대표 원물 엔트리명 (예: "사과_부사_생것") */
  foodName: string
}

export interface NutritionEntry {
  foodName: string
  /** 1회 제공량 표기 (예: "100g") */
  serving: string
  /** 에너지 kcal */
  kcal: number | null
  carbs: number | null
  protein: number | null
  fat: number | null
  /** 당류 g */
  sugar: number | null
  /** 식이섬유 g */
  fiber: number | null
}

export interface NutritionSnapshot {
  schemaVersion: number
  fetchedAt: string
  entries: NutritionEntry[]
}
```

그리고 `ProduceProfile` 인터페이스의 `kamis: KamisRef` 줄 **바로 아래**에 추가:

```ts
  /** 영양 grounding 참조 (선택). 없으면 카드에 영양 줄 없음. */
  foodDb?: FoodDbRef
```

- [ ] **Step 2: 실패 테스트 작성** — `tests/nutrition.test.ts`

```ts
import { describe, expect, test } from 'vitest'
import { matchNutrition, nutritionView } from '../src/nutrition'
import type { NutritionSnapshot, ProduceProfile } from '../src/types'

const snapshot: NutritionSnapshot = {
  schemaVersion: 1,
  fetchedAt: '2026-07-11T00:00:00.000Z',
  entries: [
    { foodName: '사과_부사_생것', serving: '100g', kcal: 53, carbs: 14.28, protein: 0.2, fat: 0.07, sugar: 11.13, fiber: 1.7 },
  ],
}
const apple = { name: '사과', foodDb: { category1: '과일류', foodName: '사과_부사_생것' } } as ProduceProfile
const potato = { name: '감자' } as ProduceProfile

describe('matchNutrition', () => {
  test('foodDb.foodName으로 엔트리를 찾는다', () => {
    expect(matchNutrition(apple, snapshot)?.kcal).toBe(53)
  })
  test('foodDb 없으면 null', () => expect(matchNutrition(potato, snapshot)).toBeNull())
  test('스냅샷 null이면 null', () => expect(matchNutrition(apple, null)).toBeNull())
})

describe('nutritionView', () => {
  test('표시값(serving·kcal·sugar·fiber)만 추린다', () => {
    const entry = snapshot.entries[0]
    expect(nutritionView(entry)).toEqual({ serving: '100g', kcal: 53, sugar: 11.13, fiber: 1.7 })
  })
  test('null이면 null', () => expect(nutritionView(null)).toBeNull())
})
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- nutrition`
Expected: FAIL — `src/nutrition` 모듈 없음.

- [ ] **Step 4: nutrition.ts 구현** — `src/nutrition.ts`

```ts
import type { NutritionEntry, NutritionSnapshot, ProduceProfile } from './types'

/** 카드 표시용 순수 파생. 원시 NutritionEntry에서 담백하게 쓸 값만 추린다. */
export interface NutritionView {
  serving: string
  kcal: number | null
  sugar: number | null
  fiber: number | null
}

/** 프로필의 foodDb 참조로 스냅샷에서 엔트리 하나를 찾는다. 없으면 null. */
export function matchNutrition(
  profile: ProduceProfile,
  snapshot: NutritionSnapshot | null,
): NutritionEntry | null {
  if (!snapshot || !profile.foodDb) return null
  const { foodName } = profile.foodDb
  return snapshot.entries.find((e) => e.foodName === foodName) ?? null
}

/** 엔트리 → 표시 뷰 (순수 파생). */
export function nutritionView(entry: NutritionEntry | null): NutritionView | null {
  if (!entry) return null
  return { serving: entry.serving, kcal: entry.kcal, sugar: entry.sugar, fiber: entry.fiber }
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- nutrition`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/types.ts src/nutrition.ts tests/nutrition.test.ts
git commit -m "feat: 영양 타입·매칭·뷰 (FoodDbRef·matchNutrition·nutritionView)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: 카드 투영 (`src/card.ts`)

`CardView`에 `nutrition` 필드를 더하고, `toCardView`가 (기본값 null인) 3번째 인자로 받아 얹는다. 기존 호출부(`toCardView(pick, month)`)는 기본값 덕에 그대로 동작한다.

**Files:**
- Modify: `src/card.ts`
- Modify: `tests/card.test.ts` (기존 toEqual 기대에 `nutrition` 반영 + 신규 테스트)

**Interfaces:**
- Consumes: `NutritionView` (Task 3).
- Produces: `CardView.nutrition: NutritionView | null`; `toCardView(pick, month, nutrition?: NutritionView | null): CardView` (nutrition 기본값 `null`).

- [ ] **Step 1: 신규 실패 테스트 작성** — `tests/card.test.ts` 끝에 추가

```ts
import { nutritionView } from '../src/nutrition'
// (기존 import 유지)

test('nutrition 인자를 CardView에 얹는다', () => {
  const pick = {
    profile: { emoji: '🍎', name: '사과', category: 'fruit', kamis: { itemName: '사과' }, whyNow: {}, howToPick: '', howToStore: '', howToUse: '', seasonMonths: [7], peakMonths: [] },
    inPeak: false,
    price: null,
  } as any
  const nv = nutritionView({ foodName: '사과_부사_생것', serving: '100g', kcal: 53, carbs: 14.28, protein: 0.2, fat: 0.07, sugar: 11.13, fiber: 1.7 })
  expect(toCardView(pick, 7, nv).nutrition).toEqual({ serving: '100g', kcal: 53, sugar: 11.13, fiber: 1.7 })
})

test('nutrition 인자 없으면 null', () => {
  const pick = {
    profile: { emoji: '🥔', name: '감자', category: 'vegetable', kamis: { itemName: '감자' }, whyNow: {}, howToPick: '', howToStore: '', howToUse: '', seasonMonths: [7], peakMonths: [] },
    inPeak: false,
    price: null,
  } as any
  expect(toCardView(pick, 7).nutrition).toBeNull()
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- card`
Expected: FAIL — `toCardView`에 3번째 인자 없음 / `nutrition` 프로퍼티 없음.

- [ ] **Step 3: card.ts 수정**

파일 상단 import에 추가:

```ts
import type { NutritionView } from './nutrition'
```

`CardView` 인터페이스의 `price: PriceCardView | null` 줄 **아래**에 추가:

```ts
  nutrition: NutritionView | null
```

`toCardView` 시그니처와 반환을 수정:

```ts
/** 픽 → 카드 뷰. 순수 함수. nutrition은 표시 grounding(선정엔 영향 없음). */
export function toCardView(pick: PickResult, month: number, nutrition: NutritionView | null = null): CardView {
  const { profile, inPeak, price } = pick
  return {
    emoji: profile.emoji,
    name: profile.name,
    kind: profile.kamis.kindName ?? '',
    category: profile.category,
    inPeak,
    whyNow: whyNowLine(profile, month),
    note: { pick: profile.howToPick, store: profile.howToStore, use: profile.howToUse },
    price: price ? toPriceCardView(price) : null,
    nutrition,
  }
}
```

- [ ] **Step 4: 기존 테스트 회귀 확인**

Run: `npm test -- card`
`tests/card.test.ts`의 기존 테스트는 `c.note`·`c.kind`·`c.price?.change`처럼 **프로퍼티 단위**로 검증하므로(전체 객체 `toEqual` 아님) 수정할 필요가 없다. 신규 2건 포함 전부 PASS인지만 확인.
Expected: 전부 PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/card.ts tests/card.test.ts
git commit -m "feat: CardView에 nutrition 투영 (toCardView 3번째 인자)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: 앱 조립 (`src/app.ts`)

`buildAppView`가 영양 스냅샷을 받아, 카드마다 `nutritionView(matchNutrition(...))`를 계산해 `toCardView`에 넘긴다. 선정/정렬(`selectPicks`)은 손대지 않는다.

**Files:**
- Modify: `src/app.ts`
- Modify: `tests/app.test.ts` (호출부 시그니처 갱신 + 신규 테스트)

**Interfaces:**
- Consumes: `matchNutrition`·`nutritionView` (Task 3); `toCardView` 3-인자형 (Task 4).
- Produces: `buildAppView(profiles, snapshot: PriceSnapshot | null, nutrition: NutritionSnapshot | null, now: Date): AppView` — **3번째 인자로 nutrition 삽입**(now는 4번째로 밀림).

- [ ] **Step 1: 신규 실패 테스트 작성** — `tests/app.test.ts`

먼저 기존 5개 호출에 3번째 인자 `null`을 삽입한다(`buildAppView`는 `tests/app.test.ts`에서만 호출됨):

```ts
// 31, 39행:  buildAppView([peach, grape], snap(), JULY)        → buildAppView([peach, grape], snap(), null, JULY)
// 45행:      buildAppView([peach], snap(), JULY)               → buildAppView([peach], snap(), null, JULY)
// 52행:      buildAppView([peach], snap({ price: 18200, ... }), JULY) → ..., snap({ ... }), null, JULY)
// 57행:      buildAppView([peach], null, JULY)                 → buildAppView([peach], null, null, JULY)
```

그다음 신규 테스트 추가:

```ts
import type { NutritionSnapshot } from '../src/types'

test('foodDb 매칭 시 카드에 nutrition이 실린다', () => {
  const profiles = [
    { id: 'apple', emoji: '🍎', name: '사과', category: 'fruit', kamis: { categoryCode: '400', itemName: '사과' }, foodDb: { category1: '과일류', foodName: '사과_부사_생것' }, seasonMonths: [7], peakMonths: [], whyNow: {}, howToPick: '', howToStore: '', howToUse: '' },
  ] as any
  const nutrition: NutritionSnapshot = {
    schemaVersion: 1, fetchedAt: '2026-07-11T00:00:00.000Z',
    entries: [{ foodName: '사과_부사_생것', serving: '100g', kcal: 53, carbs: 14.28, protein: 0.2, fat: 0.07, sugar: 11.13, fiber: 1.7 }],
  }
  const view = buildAppView(profiles, null, nutrition, new Date('2026-07-11T00:00:00Z'))
  expect(view.cards[0].nutrition).toEqual({ serving: '100g', kcal: 53, sugar: 11.13, fiber: 1.7 })
})

test('nutrition 스냅샷 null이면 카드 nutrition은 null', () => {
  const profiles = [
    { id: 'apple', emoji: '🍎', name: '사과', category: 'fruit', kamis: { categoryCode: '400', itemName: '사과' }, foodDb: { category1: '과일류', foodName: '사과_부사_생것' }, seasonMonths: [7], peakMonths: [], whyNow: {}, howToPick: '', howToStore: '', howToUse: '' },
  ] as any
  const view = buildAppView(profiles, null, null, new Date('2026-07-11T00:00:00Z'))
  expect(view.cards[0].nutrition).toBeNull()
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- app.test`
Expected: FAIL — `buildAppView`가 아직 4-인자형 아님 / nutrition 미반영.

- [ ] **Step 3: app.ts 수정**

상단 import에 추가:

```ts
import type { NutritionSnapshot } from './types'
import { matchNutrition, nutritionView } from './nutrition'
```

`buildAppView`를 수정:

```ts
export function buildAppView(
  profiles: ProduceProfile[],
  snapshot: PriceSnapshot | null,
  nutrition: NutritionSnapshot | null,
  now: Date,
): AppView {
  const month = now.getMonth() + 1
  const picks = selectPicks(profiles, snapshot, now)
  return {
    cards: picks.map((p) => toCardView(p, month, nutritionView(matchNutrition(p.profile, nutrition)))),
    noDrop: picks.length > 0 && !hasDrops(picks),
    seasonal: seasonalThisMonth(profiles, month).map(label),
    coming: comingSoon(profiles, month).map(label),
    date: now,
    staleDays: snapshot ? snapshotAgeDays(snapshot, now) : 0,
    term: currentTerm(now),
  }
}
```

- [ ] **Step 4: 전체 테스트 통과 확인**

Run: `npm test`
Expected: 전부 PASS. (`buildAppView` 호출부는 `app.test.ts`와 `routes/index.tsx`뿐 — 라우트는 Task 6에서 갱신하므로 이 시점엔 `app.test.ts`만 손대면 된다.)

- [ ] **Step 5: 커밋**

```bash
git add src/app.ts tests/app.test.ts
git commit -m "feat: buildAppView가 영양 스냅샷을 카드에 조립

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: 데이터 배선 — foodDb 참조 + nutrition.json + 라우트 로더

프로필 3개에 `foodDb`를 달고, 수집기로 실제 `nutrition.json`을 생성해 커밋하고, 라우트 로더가 이를 `buildAppView`에 넘기게 한다. 여기서 파이프라인이 처음으로 **끝에서 끝까지** 흐른다.

**Files:**
- Modify: `public/data/produce.json` (사과·복숭아·토마토에 `foodDb`)
- Create: `public/data/nutrition.json` (수집기 산출물)
- Modify: `src/routes/index.tsx` (nutrition import + 전달)

**Interfaces:**
- Consumes: `buildNutritionSnapshot` main 가드 (Task 2); `buildAppView` 4-인자형 (Task 5).

- [ ] **Step 1: produce.json에 foodDb 추가**

`public/data/produce.json`에서 세 품목의 `kamis` 줄 아래에 `foodDb`를 추가한다.

사과:
```json
      "foodDb": { "category1": "과일류", "foodName": "사과_부사_생것" },
```
복숭아:
```json
      "foodDb": { "category1": "과일류", "foodName": "복숭아_백도_생것" },
```
토마토:
```json
      "foodDb": { "category1": "채소류", "foodName": "토마토_생것" },
```

- [ ] **Step 2: 실제 nutrition.json 생성**

data.go.kr serviceKey를 환경변수로 주고 수집기를 실행한다(키는 셸에만, 저장소에 넣지 않는다):

```bash
DATA_GO_KR_KEY='<data.go.kr serviceKey>' npm run fetch:nutrition
```

Expected 출력: `nutrition.json 갱신: 3개`
생성된 `public/data/nutrition.json`에 사과_부사_생것 엔트리가 `"kcal": 53` 근처로 들어있는지 확인.

> 키를 지금 쓸 수 없으면, 아래 내용으로 `public/data/nutrition.json`을 직접 만들어 진행하고(2026-07-11 실측값), 키 확보 후 위 명령으로 재생성한다:
> ```json
> {
>   "schemaVersion": 1,
>   "fetchedAt": "2026-07-11T00:00:00.000Z",
>   "entries": [
>     { "foodName": "사과_부사_생것", "serving": "100g", "kcal": 53, "carbs": 14.28, "protein": 0.2, "fat": 0.07, "sugar": 11.13, "fiber": 1.7 },
>     { "foodName": "복숭아_백도_생것", "serving": "100g", "kcal": 49, "carbs": null, "protein": null, "fat": null, "sugar": 9.45, "fiber": null },
>     { "foodName": "토마토_생것", "serving": "100g", "kcal": 19, "carbs": null, "protein": null, "fat": null, "sugar": 2.37, "fiber": null }
>   ]
> }
> ```

- [ ] **Step 3: 라우트 로더 배선** — `src/routes/index.tsx`

import 블록에 추가:
```ts
import nutrition from '../../public/data/nutrition.json'
import type { NutritionSnapshot, PriceSnapshot, ProduceProfile } from '../types'
```
(기존 `PriceSnapshot, ProduceProfile` import 줄과 병합.)

`buildAppView` 호출을 4-인자형으로:
```ts
    buildAppView(
      produce as unknown as ProduceProfile[],
      prices as unknown as PriceSnapshot,
      nutrition as unknown as NutritionSnapshot,
      new Date(),
    ),
```

- [ ] **Step 4: 빌드·테스트 확인**

Run: `npm test && npm run build`
Expected: 테스트 PASS, 빌드 성공(`dist/client/` 생성). nutrition.json 정적 import가 해결되어 프리렌더가 통과.

- [ ] **Step 5: 커밋**

```bash
git add public/data/produce.json public/data/nutrition.json src/routes/index.tsx
git commit -m "feat: 사과·복숭아·토마토 영양 데이터 배선 (수집→로더)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: 카드 표시 (`src/components/NutritionLine.tsx` + `ProduceCard.tsx`)

카드 펼침 영역에 "100g당 53kcal · 당 11.1g" + 출처 한 줄을 담백하게 표시한다.

**Files:**
- Create: `src/components/NutritionLine.tsx`
- Create: `src/components/NutritionLine.test.tsx`
- Modify: `src/components/ProduceCard.tsx`
- Modify: `src/style.css` (`.nutrition`·`.nutrition .src` 최소 스타일)

**Interfaces:**
- Consumes: `NutritionView` (Task 3); `CardView.nutrition` (Task 4).
- Produces: `NutritionLine({ nutrition }: { nutrition: NutritionView })` — kcal·당류가 모두 null이면 `null` 반환.

- [ ] **Step 1: 실패 테스트 작성** — `src/components/NutritionLine.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { NutritionLine } from './NutritionLine'

describe('NutritionLine', () => {
  test('serving·kcal·당류·출처를 담백하게 보인다', () => {
    render(<NutritionLine nutrition={{ serving: '100g', kcal: 53, sugar: 11.13, fiber: 1.7 }} />)
    expect(screen.getByText(/100g당/)).toBeInTheDocument()
    expect(screen.getByText(/53kcal/)).toBeInTheDocument()
    expect(screen.getByText(/당 11.1g/)).toBeInTheDocument()
    expect(screen.getByText(/식품의약품안전처/)).toBeInTheDocument()
  })
  test('kcal·당류가 모두 없으면 아무것도 렌더하지 않는다', () => {
    const { container } = render(
      <NutritionLine nutrition={{ serving: '100g', kcal: null, sugar: null, fiber: null }} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- NutritionLine`
Expected: FAIL — 컴포넌트 없음.

- [ ] **Step 3: NutritionLine 구현** — `src/components/NutritionLine.tsx`

```tsx
import type { NutritionView } from '../nutrition'

/** 소수 첫째 자리까지, 정수면 정수로 (11.13 → "11.1", 53 → "53"). */
function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export function NutritionLine({ nutrition }: { nutrition: NutritionView }) {
  const parts: string[] = []
  if (nutrition.kcal !== null) parts.push(`${fmt(nutrition.kcal)}kcal`)
  if (nutrition.sugar !== null) parts.push(`당 ${fmt(nutrition.sugar)}g`)
  if (parts.length === 0) return null
  return (
    <p className="nutrition">
      <span className="serving">{nutrition.serving}당</span> {parts.join(' · ')}
      <span className="src">출처: 식품의약품안전처</span>
    </p>
  )
}
```

- [ ] **Step 4: ProduceCard에 배선** — `src/components/ProduceCard.tsx`

import 추가:
```tsx
import { NutritionLine } from './NutritionLine'
```

`.open` div 안, `<Note note={card.note} />` **위**에:
```tsx
        {card.nutrition && <NutritionLine nutrition={card.nutrition} />}
```

- [ ] **Step 5: 최소 스타일** — `src/style.css` 끝에 추가 (DESIGN.md 톤: 쪽빛 글자, 웜은 배경만, 장식 아님)

```css
.nutrition {
  margin: 0.4rem 0 0;
  font-size: 0.8rem;
  color: var(--ink);
}
.nutrition .serving {
  font-weight: 600;
}
.nutrition .src {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.68rem;
  opacity: 0.55;
}
```

- [ ] **Step 6: 컴포넌트 테스트 통과 확인**

Run: `npm test -- NutritionLine`
Expected: PASS.

- [ ] **Step 7: 전체 회귀 확인**

Run: `npm test`
Expected: 전부 PASS.

- [ ] **Step 8: 커밋**

```bash
git add src/components/NutritionLine.tsx src/components/NutritionLine.test.tsx src/components/ProduceCard.tsx src/style.css
git commit -m "feat: 카드에 영양 한 줄 표시 (NutritionLine)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: 브라우저 실측 검증 (수동)

> 프로젝트 규칙: 디자인/UI 변경은 브라우저로 확인한다. 슬라이스가 실제로 끝에서 끝까지 도는지 눈으로 본다.

**Files:** (없음 — 검증 전용)

- [ ] **Step 1: 개발 서버 실행**

Run: `npm run dev`

- [ ] **Step 2: 브라우저 확인**

`http://localhost:3000` 접속. 사과·복숭아·토마토가 이번 달(7월) 픽에 뜨면 카드를 펼쳐 영양 줄을 확인한다:
- "100g당 53kcal · 당 11.1g" 형태로 보이는가
- "출처: 식품의약품안전처"가 담백하게(작게, opacity 낮게) 붙는가
- foodDb 없는 다른 품목엔 영양 줄이 **없는가**
- DESIGN.md 톤(쪽빛 글자, 이커머스 화법 없음)을 지키는가

> 세 품목이 픽 상위 5에 안 보이면, 카테고리 필터 토글로 과일/채소를 오가거나, 확인용으로 `foodDb`를 제철 품목 1~2개에 더 달아 재확인.

- [ ] **Step 3: 결과 기록**

문제 없으면 슬라이스 완료. 어긋난 점(레이아웃·톤·값)이 있으면 해당 Task로 돌아가 수정 후 재검증.

---

## 슬라이스 완료 후

이 슬라이스가 검증되면 파이프라인 뼈대가 선다. 다음 슬라이스(스펙의 구현 순서 2·3):
- **과일 궁합** — `pairings` 필드 + 과일 에디토리얼 (수집 없는 순수 에디토리얼 경로)
- **채소 레시피** — `SimpleRecipe` + COOKRCP01 근거 (식품안전나라 키·`fetch:recipes`)

CI 자동화(`.github/workflows/`로 `fetch:nutrition` 배선, `DATA_GO_KR_KEY` 시크릿)는 영양이 정적이라 급하지 않으므로 별도 후속으로 둔다. 필요 시 `update-prices.yml` 패턴을 그대로 복제.
