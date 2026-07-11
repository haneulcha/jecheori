# 레시피 grounding 슬라이스 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 식약처 조리식품 레시피 DB(COOKRCP01)에서 수기 지정한 레시피를 CI/빌드 타임에 수집해 정적 `recipes.json`으로 커밋하고, 카드 펼침 영역의 진입점 → 바텀시트로 요리명·재료·조리단계를 표시한다 — 수집→매핑→표시 전 구간을 관통하는 세로 슬라이스.

**Architecture:** 영양 파이프라인(`fetch-nutrition.mjs` → `nutrition.json` → `buildAppView` → `CardView` → 컴포넌트)의 데칼코마니. 소스·키만 다르다(식품안전나라, `FOODSAFETY_API_KEY`). 레시피는 **선정/정렬에 영향 없이** 카드 투영 시점에 붙는 표시 grounding이다(`selectPicks` 불변). 표시는 카드 진입점(클라이언트 `useState`) → `RecipeSheet` 오버레이(새 라우트 없음).

**Tech Stack:** TanStack Start (React 19) · Vite · Vitest · Node ≥ 22 · 순수 `.mjs` 수집 스크립트 · TypeScript 순수 로직.

## Global Constraints

- 공개 페이지는 **경량·무추적·런타임 외부요청 0.** API 호출은 CI/빌드 타임에만, 앱은 커밋된 정적 JSON만 읽는다.
- **API 키는 코드·저장소에 절대 넣지 않는다.** 환경변수·CI 시크릿으로만. 레시피 DB 키 env 이름: `FOODSAFETY_API_KEY` (식품안전나라 계정 키, **경로 삽입식**).
- 재배포 데이터는 **출처표시 의무**(KOGL 1유형). 화면에 "식품의약품안전처 조리식품 레시피 DB" 명시.
- 사용자 문구는 **담백한 한국어, 이커머스 화법 금지** ("드셔보세요" ✕). **텍스트만** — 사진 없음.
- 순수 로직은 `picks/card/app/recipe`, 표시는 `components`. 컴포넌트는 사용자 텍스트를 직접 이스케이프하지 않는다(React 자동 이스케이프).
- 파싱 로직은 `scripts/lib/`, 수집기는 `scripts/fetch-*.mjs`(순수 `build*` + `writeSnapshot` + main 가드), 순수 로직 테스트는 `tests/*.test.{js,ts}`, 컴포넌트 테스트는 colocated `src/components/*.test.tsx`.
- 레시피 매칭은 품목 코드가 아니라 `RCP_NM` 문자열 정확일치(`produce.json`의 `recipeRef.names`).
- 커밋 메시지 말미: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

### Task 1: 레시피 응답 파서 (`scripts/lib/parse-recipe.mjs`)

식품안전나라 COOKRCP01 JSON 응답에서 `RCP_NM` 정확일치 행 하나를 `RecipeEntry` 형태로 추출하는 순수 함수. `parse-nutrition.mjs`와 같은 위치·방어 패턴.

**Files:**
- Create: `scripts/lib/parse-recipe.mjs`
- Create: `tests/parse-recipe.test.js`
- Create: `tests/fixtures/cookrcp-tomato.json`

**Interfaces:**
- Produces: `cleanStep(s): string` — 조리단계 문자열의 앞 번호 접두("1. ", "2 ", "3." 등) 제거·trim.
- Produces: `parseRecipeEntry(json, name): RecipeEntry | null` — `json.COOKRCP01.row`에서 `RCP_NM === name` 정확일치 행을 추출; 없으면 `null`; `COOKRCP01` 루트가 없거나 `RESULT.CODE`가 `ERROR`로 시작하면 `throw`.
- `RecipeEntry` 형태: `{ name: string, ingredients: string, steps: string[] }` (`RCP_NM`=name, `RCP_PARTS_DTLS`=ingredients, `MANUAL01`~`MANUAL20` 중 비어있지 않은 값을 `cleanStep`으로 정리해 순서대로 steps).

- [ ] **Step 1: 픽스처 파일 생성**

`tests/fixtures/cookrcp-tomato.json` — COOKRCP01 응답 축약. 대상 1건(`토마토달걀볶음`) + 노이즈 1건(`토마토스튜`). `MANUAL01~03`에 번호 접두, `MANUAL04`는 빈 문자열(제거 검증):

```json
{
  "COOKRCP01": {
    "total_count": "2",
    "RESULT": { "MSG": "정상처리되었습니다.", "CODE": "INFO-000" },
    "row": [
      {
        "RCP_NM": "토마토스튜",
        "RCP_PARTS_DTLS": "토마토 2개, 양파 1개, 당근 1/2개",
        "MANUAL01": "1. 재료를 큼직하게 썬다.",
        "MANUAL02": "2. 냄비에 넣고 끓인다.",
        "MANUAL03": ""
      },
      {
        "RCP_NM": "토마토달걀볶음",
        "RCP_PARTS_DTLS": "토마토 2개, 달걀 3개, 소금 약간",
        "MANUAL01": "1. 토마토를 한입 크기로 썬다.",
        "MANUAL02": "2 달걀을 풀어 반숙으로 볶는다.",
        "MANUAL03": "3. 토마토를 넣고 살짝 더 볶는다.",
        "MANUAL04": "  "
      }
    ]
  }
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/parse-recipe.test.js`:

```js
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { cleanStep, parseRecipeEntry } from '../scripts/lib/parse-recipe.mjs'

const tomato = JSON.parse(
  readFileSync(new URL('./fixtures/cookrcp-tomato.json', import.meta.url), 'utf-8'),
)

describe('cleanStep', () => {
  test('앞 번호 접두를 떼고 trim', () => {
    expect(cleanStep('1. 토마토를 썬다.')).toBe('토마토를 썬다.')
    expect(cleanStep('2 달걀을 푼다.')).toBe('달걀을 푼다.')
    expect(cleanStep('  3.볶는다.  ')).toBe('볶는다.')
    expect(cleanStep('번호 없는 단계')).toBe('번호 없는 단계')
  })
})

describe('parseRecipeEntry', () => {
  test('RCP_NM 정확일치 행을 RecipeEntry로', () => {
    const e = parseRecipeEntry(tomato, '토마토달걀볶음')
    expect(e).toEqual({
      name: '토마토달걀볶음',
      ingredients: '토마토 2개, 달걀 3개, 소금 약간',
      steps: ['토마토를 한입 크기로 썬다.', '달걀을 풀어 반숙으로 볶는다.', '토마토를 넣고 살짝 더 볶는다.'],
    })
  })

  test('빈 MANUAL 단계는 steps에서 제거된다', () => {
    const e = parseRecipeEntry(tomato, '토마토달걀볶음')
    expect(e.steps).toHaveLength(3) // MANUAL04("  ")는 빠짐
  })

  test('이름이 없으면 null', () => {
    expect(parseRecipeEntry(tomato, '없는요리')).toBeNull()
  })

  test('단일객체 row 응답도 처리한다', () => {
    const single = { COOKRCP01: { RESULT: { CODE: 'INFO-000' }, row: tomato.COOKRCP01.row[1] } }
    expect(parseRecipeEntry(single, '토마토달걀볶음')?.name).toBe('토마토달걀볶음')
  })

  test('COOKRCP01 루트가 없으면 throw', () => {
    expect(() => parseRecipeEntry({ foo: 1 }, '토마토달걀볶음')).toThrow(/COOKRCP01/)
  })

  test('RESULT.CODE가 ERROR면 throw', () => {
    const err = { COOKRCP01: { RESULT: { CODE: 'ERROR-300', MSG: '키 오류' } } }
    expect(() => parseRecipeEntry(err, '토마토달걀볶음')).toThrow(/키 오류/)
  })

  test('데이터 없음(INFO-200, row 없음)은 null', () => {
    const none = { COOKRCP01: { RESULT: { CODE: 'INFO-200', MSG: '데이터가 없습니다.' } } }
    expect(parseRecipeEntry(none, '토마토달걀볶음')).toBeNull()
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run tests/parse-recipe.test.js`
Expected: FAIL — "cleanStep is not a function" / 모듈 없음.

- [ ] **Step 4: 최소 구현 작성**

`scripts/lib/parse-recipe.mjs`:

```js
/** 조리단계 문자열 앞의 번호 접두("1. ", "2 ", "3.")를 떼고 trim. */
export function cleanStep(s) {
  return String(s).trim().replace(/^\d+\s*\.?\s*/, '').trim()
}

/** COOKRCP01 응답에서 RCP_NM === name 행 하나를 RecipeEntry로.
 *  없으면 null, 루트 없음/오류 응답이면 throw. */
export function parseRecipeEntry(json, name) {
  const root = json?.COOKRCP01
  if (!root) throw new Error('COOKRCP01 응답 이상: 루트 없음')
  const code = root?.RESULT?.CODE ?? ''
  if (code.startsWith('ERROR')) {
    throw new Error(`COOKRCP01 오류: ${root?.RESULT?.MSG ?? code}`)
  }
  const rawRows = root.row
  if (rawRows === undefined || rawRows === null) return null
  // 결과가 1건이면 REST 응답이 row를 배열이 아닌 단일 객체로 주기도 한다.
  const rows = Array.isArray(rawRows) ? rawRows : [rawRows]
  const r = rows.find((x) => x.RCP_NM === name)
  if (!r) return null
  const steps = []
  for (let i = 1; i <= 20; i++) {
    const v = r[`MANUAL${String(i).padStart(2, '0')}`]
    if (v && String(v).trim() !== '') steps.push(cleanStep(v))
  }
  return {
    name: r.RCP_NM,
    ingredients: (r.RCP_PARTS_DTLS ?? '').trim(),
    steps,
  }
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run tests/parse-recipe.test.js`
Expected: PASS (8 tests).

- [ ] **Step 6: 커밋**

```bash
git add scripts/lib/parse-recipe.mjs tests/parse-recipe.test.js tests/fixtures/cookrcp-tomato.json
git commit -m "feat: COOKRCP01 레시피 응답 파서 (parse-recipe)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 레시피 수집기 (`scripts/fetch-recipes.mjs`)

`recipeRef` 있는 프로필의 각 `RCP_NM`을 조회해 `RecipeSnapshot`을 만드는 수집기. `fetch-nutrition.mjs`와 같은 구조(`build*` + `writeSnapshot` + main 가드), `fetchFn` 주입으로 테스트.

**Files:**
- Create: `scripts/fetch-recipes.mjs`
- Create: `tests/fetch-recipes.test.js`

**Interfaces:**
- Consumes: `parseRecipeEntry` (Task 1), `writeSnapshot` (기존 `scripts/fetch-prices.mjs`).
- Produces: `buildRecipeSnapshot({ key, profiles, fetchFn }): Promise<RecipeSnapshot>` — `{ schemaVersion: 1, fetchedAt: ISO, entries: RecipeEntry[] }`. `recipeRef` 없는 프로필 스킵, 중복 `name`은 한 번만 호출.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/fetch-recipes.test.js`:

```js
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { buildRecipeSnapshot } from '../scripts/fetch-recipes.mjs'

const tomato = JSON.parse(
  readFileSync(new URL('./fixtures/cookrcp-tomato.json', import.meta.url), 'utf-8'),
)
const profiles = [
  { name: '토마토', recipeRef: { names: ['토마토달걀볶음'] } },
  { name: '감자' }, // recipeRef 없음 → 건너뜀
  { name: '방울토마토', recipeRef: { names: ['토마토달걀볶음'] } }, // 중복 name
]

test('recipeRef 있는 프로필만 조회하고 중복 name은 한 번만 호출한다', async () => {
  const calls = []
  const fetchFn = async (url) => {
    calls.push(decodeURIComponent(url.split('RCP_NM=')[1]))
    return { ok: true, json: async () => tomato }
  }
  const snap = await buildRecipeSnapshot({ key: 'K', profiles, fetchFn })
  expect(calls).toEqual(['토마토달걀볶음']) // 감자 스킵, 중복 1회
  expect(snap.schemaVersion).toBe(1)
  expect(snap.entries).toHaveLength(1)
  expect(snap.entries[0].name).toBe('토마토달걀볶음')
  expect(new Date(snap.fetchedAt).getTime()).not.toBeNaN()
})

test('요청 URL에 키가 경로로, RCP_NM이 인코딩되어 들어간다', async () => {
  let url
  const fetchFn = async (u) => { url = u; return { ok: true, json: async () => tomato } }
  await buildRecipeSnapshot({ key: 'MYKEY', profiles: [profiles[0]], fetchFn })
  expect(url).toContain('/api/MYKEY/COOKRCP01/json/1/50/RCP_NM=')
  expect(url).toContain(encodeURIComponent('토마토달걀볶음'))
})

test('HTTP 오류면 throw', async () => {
  const fetchFn = async () => ({ ok: false, status: 500 })
  await expect(
    buildRecipeSnapshot({ key: 'K', profiles, fetchFn }),
  ).rejects.toThrow(/500/)
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/fetch-recipes.test.js`
Expected: FAIL — 모듈/함수 없음.

- [ ] **Step 3: 최소 구현 작성**

`scripts/fetch-recipes.mjs`:

```js
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseRecipeEntry } from './lib/parse-recipe.mjs'
import { writeSnapshot } from './fetch-prices.mjs'

// https — 키가 URL 경로에 실려 나가므로 평문(http) 전송 금지 (보안).
const BASE = 'https://openapi.foodsafetykorea.go.kr/api'

/** recipeRef 있는 프로필의 각 RCP_NM을 조회해 RecipeSnapshot 생성. fetchFn 주입으로 테스트. */
export async function buildRecipeSnapshot({ key, profiles, fetchFn = fetch }) {
  const entries = []
  const seen = new Set()
  for (const p of profiles) {
    if (!p.recipeRef) continue
    for (const name of p.recipeRef.names) {
      if (seen.has(name)) continue
      seen.add(name)
      const url = `${BASE}/${key}/COOKRCP01/json/1/50/RCP_NM=${encodeURIComponent(name)}`
      const res = await fetchFn(url)
      if (!res.ok) throw new Error(`COOKRCP01 HTTP ${res.status} (${name})`)
      const entry = parseRecipeEntry(await res.json(), name)
      if (entry) entries.push(entry)
    }
  }
  return { schemaVersion: 1, fetchedAt: new Date().toISOString(), entries }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const key = process.env.FOODSAFETY_API_KEY
  if (!key) {
    console.error('FOODSAFETY_API_KEY 환경변수가 필요합니다')
    process.exit(1)
  }
  const profiles = JSON.parse(
    readFileSync(new URL('../public/data/produce.json', import.meta.url), 'utf-8'),
  )
  const outPath = fileURLToPath(new URL('../public/data/recipes.json', import.meta.url))
  try {
    const snapshot = await buildRecipeSnapshot({ key, profiles })
    if (snapshot.entries.length === 0) throw new Error('수집된 레시피 엔트리가 없습니다')
    writeSnapshot(snapshot, outPath)
    console.log(`recipes.json 갱신: ${snapshot.entries.length}개`)
  } catch (err) {
    console.error('레시피 수집 실패 — recipes.json은 변경하지 않음:', err.message)
    process.exit(1)
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/fetch-recipes.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: 커밋**

```bash
git add scripts/fetch-recipes.mjs tests/fetch-recipes.test.js
git commit -m "feat: 레시피 수집 스크립트 (fetch:recipes)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: 레시피 타입·매칭·뷰 (`src/types.ts` · `src/recipe.ts`)

레시피 도메인 타입과 순수 매칭/뷰 파생. `src/nutrition.ts`와 같은 패턴.

**Files:**
- Modify: `src/types.ts` (RecipeRef·RecipeEntry·RecipeSnapshot 추가, ProduceProfile에 `recipeRef?` 추가)
- Create: `src/recipe.ts`
- Create: `tests/recipe.test.ts`

**Interfaces:**
- Produces (types): `RecipeRef { names: string[] }`, `RecipeEntry { name: string; ingredients: string; steps: string[] }`, `RecipeSnapshot { schemaVersion: number; fetchedAt: string; entries: RecipeEntry[] }`, `ProduceProfile.recipeRef?: RecipeRef`.
- Produces (recipe.ts): `RecipeView = RecipeEntry[]` (비어있지 않은 목록), `matchRecipes(profile, snapshot): RecipeEntry[]` (recipeRef.names 순서 보존, 스냅샷에 없는 이름은 제외), `recipeView(entries): RecipeView | null` (빈 배열이면 null).

- [ ] **Step 1: 타입 추가**

`src/types.ts` — `FoodDbRef`/`NutritionSnapshot` 블록 근처에 추가:

```ts
/** 식약처 조리식품 레시피 DB(COOKRCP01)에서 요리를 집기 위한 수기 참조.
 *  실제 RCP_NM과 정확일치하는 이름만 넣는다 (KamisRef·FoodDbRef와 같은 패턴). */
export interface RecipeRef {
  names: string[]
}

export interface RecipeEntry {
  /** RCP_NM */
  name: string
  /** RCP_PARTS_DTLS 원문 한 줄 */
  ingredients: string
  /** MANUAL01~20 중 비어있지 않은 조리단계 (번호 접두 제거) */
  steps: string[]
}

export interface RecipeSnapshot {
  schemaVersion: number
  /** ISO 8601 */
  fetchedAt: string
  entries: RecipeEntry[]
}
```

그리고 `ProduceProfile`에 필드 추가 (`foodDb?` 바로 아래):

```ts
  /** 레시피 grounding 참조 (선택). 없으면 카드에 레시피 진입점 없음. */
  recipeRef?: RecipeRef
```

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/recipe.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { matchRecipes, recipeView } from '../src/recipe'
import type { RecipeSnapshot, ProduceProfile } from '../src/types'

const snapshot: RecipeSnapshot = {
  schemaVersion: 1,
  fetchedAt: '2026-07-11T00:00:00.000Z',
  entries: [
    { name: '토마토달걀볶음', ingredients: '토마토, 달걀', steps: ['썬다', '볶는다'] },
    { name: '토마토스파게티', ingredients: '토마토, 면', steps: ['삶는다'] },
  ],
}
const tomato = { name: '토마토', recipeRef: { names: ['토마토스파게티', '토마토달걀볶음'] } } as ProduceProfile
const potato = { name: '감자' } as ProduceProfile

describe('matchRecipes', () => {
  test('recipeRef.names 순서대로 엔트리를 고른다', () => {
    expect(matchRecipes(tomato, snapshot).map((e) => e.name)).toEqual(['토마토스파게티', '토마토달걀볶음'])
  })
  test('recipeRef 없으면 빈 배열', () => expect(matchRecipes(potato, snapshot)).toEqual([]))
  test('스냅샷 null이면 빈 배열', () => expect(matchRecipes(tomato, null)).toEqual([]))
  test('스냅샷에 없는 이름은 제외', () => {
    const ref = { name: '토마토', recipeRef: { names: ['없는요리', '토마토달걀볶음'] } } as ProduceProfile
    expect(matchRecipes(ref, snapshot).map((e) => e.name)).toEqual(['토마토달걀볶음'])
  })
})

describe('recipeView', () => {
  test('비어있지 않으면 그대로', () => {
    const es = snapshot.entries
    expect(recipeView(es)).toBe(es)
  })
  test('빈 배열이면 null', () => expect(recipeView([])).toBeNull())
})
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run tests/recipe.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 4: 최소 구현 작성**

`src/recipe.ts`:

```ts
import type { RecipeEntry, RecipeSnapshot, ProduceProfile } from './types'

/** 카드 표시용 — 비어있지 않은 레시피 목록. */
export type RecipeView = RecipeEntry[]

/** 프로필의 recipeRef.names 순서대로 스냅샷에서 엔트리를 고른다. 없는 이름은 제외. */
export function matchRecipes(
  profile: ProduceProfile,
  snapshot: RecipeSnapshot | null,
): RecipeEntry[] {
  if (!snapshot || !profile.recipeRef) return []
  return profile.recipeRef.names
    .map((n) => snapshot.entries.find((e) => e.name === n))
    .filter((e): e is RecipeEntry => e !== undefined)
}

/** 엔트리 목록 → 표시 뷰. 비면 null (카드 진입점 없음). */
export function recipeView(entries: RecipeEntry[]): RecipeView | null {
  return entries.length > 0 ? entries : null
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run tests/recipe.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: 커밋**

```bash
git add src/types.ts src/recipe.ts tests/recipe.test.ts
git commit -m "feat: 레시피 타입·매칭·뷰 (RecipeRef·matchRecipes·recipeView)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: CardView에 recipes 투영 (`src/card.ts`)

`toCardView`가 4번째 인자로 `RecipeView`를 받아 `CardView.recipes`에 얹는다. 영양과 동형(선정엔 영향 없음).

**Files:**
- Modify: `src/card.ts`
- Modify: `tests/card.test.ts`

**Interfaces:**
- Consumes: `RecipeView` (Task 3).
- Produces: `CardView.recipes: RecipeView | null`, `toCardView(pick, month, nutrition?, recipes?): CardView`.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/card.test.ts` — Task 3의 `nutrition 인자를 CardView에 얹는다` 테스트 아래에 추가 (`import { recipeView } from '../src/recipe'`도 상단에 추가):

```ts
  test('recipes 인자를 CardView에 얹는다', () => {
    const pick = {
      profile: { emoji: '🍅', name: '토마토', category: 'vegetable', kamis: { itemName: '토마토' }, whyNow: {}, howToPick: '', howToStore: '', howToUse: '' },
      inPeak: false,
      price: null,
    } as any
    const rv = recipeView([{ name: '토마토달걀볶음', ingredients: '토마토, 달걀', steps: ['썬다'] }])
    expect(toCardView(pick, 7, null, rv).recipes).toEqual([
      { name: '토마토달걀볶음', ingredients: '토마토, 달걀', steps: ['썬다'] },
    ])
  })

  test('recipes 인자 없으면 null', () => {
    const pick = {
      profile: { emoji: '🥔', name: '감자', category: 'vegetable', kamis: { itemName: '감자' }, whyNow: {}, howToPick: '', howToStore: '', howToUse: '' },
      inPeak: false,
      price: null,
    } as any
    expect(toCardView(pick, 7).recipes).toBeNull()
  })
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/card.test.ts`
Expected: FAIL — `recipes` 프로퍼티 없음 / 4번째 인자 미지원.

- [ ] **Step 3: 구현 — card.ts 수정**

`src/card.ts` 상단 import에 추가:

```ts
import type { RecipeView } from './recipe'
```

`CardView` 인터페이스에 필드 추가 (`nutrition` 아래):

```ts
  recipes: RecipeView | null
```

`toCardView` 시그니처·반환 수정:

```ts
/** 픽 → 카드 뷰. 순수 함수. nutrition·recipes는 표시 grounding(선정엔 영향 없음). */
export function toCardView(
  pick: PickResult,
  month: number,
  nutrition: NutritionView | null = null,
  recipes: RecipeView | null = null,
): CardView {
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
    recipes,
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/card.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/card.ts tests/card.test.ts
git commit -m "feat: CardView에 recipes 투영 (toCardView 4번째 인자)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: buildAppView가 레시피를 조립 (`src/app.ts` · `src/view-types.ts`)

`buildAppView`가 4번째 인자로 `RecipeSnapshot`을 받아(영양 다음, `now` 앞) 카드에 레시피를 투영하고 `hasRecipes` 파생 플래그를 채운다. **기존 호출부(테스트·로더)를 모두 갱신**한다.

**Files:**
- Modify: `src/app.ts`
- Modify: `src/view-types.ts`
- Modify: `tests/app.test.ts`

**Interfaces:**
- Consumes: `matchRecipes`·`recipeView` (Task 3), `RecipeSnapshot` (Task 3).
- Produces: `buildAppView(profiles, snapshot, nutrition, recipes, now): AppView`, `AppView.hasRecipes: boolean`.

- [ ] **Step 1: 실패하는 테스트 작성 + 기존 호출부 갱신**

`tests/app.test.ts` 상단 import에 `RecipeSnapshot` 추가:

```ts
import type { NutritionSnapshot, PriceEntry, PriceSnapshot, ProduceProfile, RecipeSnapshot } from '../src/types'
```

**기존 `buildAppView` 호출 7곳에 `recipes` 인자(`null`)를 `now` 앞에 추가**한다 (nutrition 다음). 정확히:
- L31: `buildAppView([peach, grape], snap(), null, JULY)` → `buildAppView([peach, grape], snap(), null, null, JULY)`
- L39: `buildAppView([peach, grape], snap(), null, JULY)` → `buildAppView([peach, grape], snap(), null, null, JULY)`
- L45: `buildAppView([peach], snap(), null, JULY)` → `buildAppView([peach], snap(), null, null, JULY)`
- L52: `buildAppView([peach], snap({ ... }), null, JULY)` → `...snap({ ... }), null, null, JULY)`
- L57: `buildAppView([peach], null, null, JULY)` → `buildAppView([peach], null, null, null, JULY)`
- L70: `buildAppView(profiles, null, nutrition, new Date(...))` → `buildAppView(profiles, null, nutrition, null, new Date(...))`
- L79: `buildAppView(profiles, null, null, new Date(...))` → `buildAppView(profiles, null, null, null, new Date(...))`

그리고 새 테스트를 `describe('buildAppView', ...)` 안에 추가:

```ts
  test('recipeRef 매칭 시 카드에 recipes가 실리고 hasRecipes true', () => {
    const profiles = [
      { id: 'tomato', emoji: '🍅', name: '토마토', category: 'vegetable', kamis: { categoryCode: '200', itemName: '토마토' }, recipeRef: { names: ['토마토달걀볶음'] }, seasonMonths: [7], peakMonths: [], whyNow: {}, howToPick: '', howToStore: '', howToUse: '' },
    ] as any
    const recipes: RecipeSnapshot = {
      schemaVersion: 1, fetchedAt: '2026-07-11T00:00:00.000Z',
      entries: [{ name: '토마토달걀볶음', ingredients: '토마토, 달걀', steps: ['썬다', '볶는다'] }],
    }
    const view = buildAppView(profiles, null, null, recipes, new Date('2026-07-11T00:00:00Z'))
    expect(view.cards[0].recipes).toEqual([{ name: '토마토달걀볶음', ingredients: '토마토, 달걀', steps: ['썬다', '볶는다'] }])
    expect(view.hasRecipes).toBe(true)
  })

  test('recipes 스냅샷 null이면 카드 recipes는 null, hasRecipes false', () => {
    const profiles = [
      { id: 'tomato', emoji: '🍅', name: '토마토', category: 'vegetable', kamis: { categoryCode: '200', itemName: '토마토' }, recipeRef: { names: ['토마토달걀볶음'] }, seasonMonths: [7], peakMonths: [], whyNow: {}, howToPick: '', howToStore: '', howToUse: '' },
    ] as any
    const view = buildAppView(profiles, null, null, null, new Date('2026-07-11T00:00:00Z'))
    expect(view.cards[0].recipes).toBeNull()
    expect(view.hasRecipes).toBe(false)
  })
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/app.test.ts`
Expected: FAIL — `hasRecipes` 없음 / 인자 수 불일치.

- [ ] **Step 3: 구현 — view-types.ts**

`src/view-types.ts`의 `AppView`에 필드 추가 (`hasNutrition` 아래):

```ts
  /** 카드 중 하나라도 레시피가 있으면 페이지 하단에 출처를 한 번 표기한다 */
  hasRecipes: boolean
```

- [ ] **Step 4: 구현 — app.ts**

`src/app.ts`:

```ts
import type { NutritionSnapshot, PriceSnapshot, ProduceProfile, RecipeSnapshot } from './types'
import { comingSoon, hasDrops, seasonalThisMonth, selectPicks } from './picks'
import { toCardView } from './card'
import { currentTerm } from './season'
import { snapshotAgeDays } from './data'
import { matchNutrition, nutritionView } from './nutrition'
import { matchRecipes, recipeView } from './recipe'
import type { AppView } from './view-types'

const label = (p: ProduceProfile) => ({ emoji: p.emoji, name: p.name })

/** 원시 데이터(프로필·스냅샷·시계) → 화면 뷰. 순수 함수 — "무엇을 보여줄지" 조립을 한 곳에 모은다. */
export function buildAppView(
  profiles: ProduceProfile[],
  snapshot: PriceSnapshot | null,
  nutrition: NutritionSnapshot | null,
  recipes: RecipeSnapshot | null,
  now: Date,
): AppView {
  const month = now.getMonth() + 1
  const picks = selectPicks(profiles, snapshot, now)
  const cards = picks.map((p) =>
    toCardView(
      p,
      month,
      nutritionView(matchNutrition(p.profile, nutrition)),
      recipeView(matchRecipes(p.profile, recipes)),
    ),
  )
  return {
    cards,
    noDrop: picks.length > 0 && !hasDrops(picks),
    hasNutrition: cards.some((c) => c.nutrition !== null),
    hasRecipes: cards.some((c) => c.recipes !== null),
    seasonal: seasonalThisMonth(profiles, month).map(label),
    coming: comingSoon(profiles, month).map(label),
    date: now,
    staleDays: snapshot ? snapshotAgeDays(snapshot, now) : 0,
    term: currentTerm(now),
  }
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run tests/app.test.ts`
Expected: PASS (기존 + 새 2건).

- [ ] **Step 6: 커밋**

```bash
git add src/app.ts src/view-types.ts tests/app.test.ts
git commit -m "feat: buildAppView가 레시피를 카드에 조립 + hasRecipes 파생

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: 레시피 바텀시트 (`src/components/RecipeSheet.tsx`)

하단 오버레이로 요리명·재료·조리단계를 표시. 클라이언트 컴포넌트, 배경 탭·Esc로 닫기, 기본 접근성. 텍스트만.

**Files:**
- Create: `src/components/RecipeSheet.tsx`
- Create: `src/components/RecipeSheet.test.tsx`
- Modify: `src/style.css` (시트 스타일)

**Interfaces:**
- Consumes: `RecipeView` (Task 3).
- Produces: `RecipeSheet({ recipes, onClose })` — `recipes: RecipeView`, `onClose: () => void`.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/RecipeSheet.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { RecipeSheet } from './RecipeSheet'

const recipes = [
  { name: '토마토달걀볶음', ingredients: '토마토 2개, 달걀 3개', steps: ['토마토를 썬다', '달걀을 볶는다'] },
]

describe('RecipeSheet', () => {
  test('요리명·재료·조리단계를 보인다', () => {
    const { container } = render(<RecipeSheet recipes={recipes} onClose={() => {}} />)
    const text = container.textContent
    expect(text).toContain('토마토달걀볶음')
    expect(text).toContain('토마토 2개, 달걀 3개')
    expect(text).toContain('토마토를 썬다')
    expect(container.querySelectorAll('.steps li')).toHaveLength(2)
  })

  test('단계가 없으면 단계 목록을 그리지 않는다', () => {
    const { container } = render(
      <RecipeSheet recipes={[{ name: '생토마토', ingredients: '토마토', steps: [] }]} onClose={() => {}} />,
    )
    expect(container.querySelector('.steps')).toBeNull()
  })

  test('배경 클릭으로 닫힌다', () => {
    const onClose = vi.fn()
    const { container } = render(<RecipeSheet recipes={recipes} onClose={onClose} />)
    fireEvent.click(container.querySelector('.sheet-backdrop')!)
    expect(onClose).toHaveBeenCalled()
  })

  test('Esc로 닫힌다', () => {
    const onClose = vi.fn()
    render(<RecipeSheet recipes={recipes} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  test('시트 본문 클릭은 닫지 않는다', () => {
    const onClose = vi.fn()
    const { container } = render(<RecipeSheet recipes={recipes} onClose={onClose} />)
    fireEvent.click(container.querySelector('.sheet')!)
    expect(onClose).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/components/RecipeSheet.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현 — RecipeSheet.tsx**

`src/components/RecipeSheet.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import type { RecipeView } from '../recipe'

/** 하단 바텀시트 오버레이 — 요리명·재료·조리단계(텍스트만).
 *  배경 탭·Esc로 닫는다. 출처는 페이지 하단에 별도 표기(여기선 반복 안 함). */
export function RecipeSheet({ recipes, onClose }: { recipes: RecipeView; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="레시피"
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="sheet-close" onClick={onClose} aria-label="닫기">
          ✕
        </button>
        {recipes.map((r) => (
          <article className="recipe" key={r.name}>
            <h3>{r.name}</h3>
            {r.ingredients && <p className="ing">{r.ingredients}</p>}
            {r.steps.length > 0 && (
              <ol className="steps">
                {r.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 스타일 추가 (`src/style.css` 끝에)**

DESIGN.md 톤 준수 — 쪽빛(`--ink`)·종이(`--paper`)·점선 규율:

```css
/* 레시피 바텀시트 — 하단에서 슬라이드업, 텍스트만 */
.recipe-open {
  align-self: center;
  margin-top: 0.2rem;
  background: none;
  border: 1px dashed var(--line);
  border-radius: 0.4rem;
  padding: 0.34rem 0.8rem;
  color: var(--ink);
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;
}
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(43, 69, 134, 0.28);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 50;
}
.sheet {
  position: relative;
  width: 100%;
  max-width: 32rem;
  max-height: 82vh;
  overflow-y: auto;
  background: var(--card);
  border-radius: 1rem 1rem 0 0;
  padding: 1.4rem 1.3rem 2rem;
  box-shadow: 0 -4px 20px rgba(43, 69, 134, 0.14);
}
.sheet-close {
  position: absolute;
  top: 0.8rem;
  right: 0.9rem;
  background: none;
  border: none;
  color: var(--muted);
  font-size: 1.1rem;
  cursor: pointer;
}
.sheet .recipe + .recipe { border-top: 1px dashed var(--line); margin-top: 1.2rem; padding-top: 1.2rem; }
.sheet .recipe h3 { color: var(--ink); font-size: 1rem; margin: 0 0 0.5rem; }
.sheet .recipe .ing { color: var(--muted); font-size: 0.85rem; margin: 0 0 0.7rem; }
.sheet .steps { margin: 0; padding-left: 1.3rem; color: #5a5140; font-size: 0.9rem; line-height: 1.7; }
.sheet .steps li { margin-bottom: 0.3rem; }
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/components/RecipeSheet.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 6: 커밋**

```bash
git add src/components/RecipeSheet.tsx src/components/RecipeSheet.test.tsx src/style.css
git commit -m "feat: 레시피 바텀시트 (RecipeSheet)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: 카드 진입점 + 출처 배선 (`ProduceCard` · `App`)

카드 펼침 영역에 레시피 있을 때만 진입점 버튼, 탭하면 바텀시트. 출처는 페이지 하단 1회.

**Files:**
- Modify: `src/components/ProduceCard.tsx`
- Modify: `src/components/App.tsx`
- Modify: `src/components/App.test.tsx`
- Create: `src/components/ProduceCard.test.tsx`

**Interfaces:**
- Consumes: `RecipeSheet` (Task 6), `CardView.recipes` (Task 4), `AppView.hasRecipes` (Task 5).

- [ ] **Step 1: 실패하는 테스트 작성 — ProduceCard**

`src/components/ProduceCard.test.tsx`:

```tsx
// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { ProduceCard } from './ProduceCard'
import type { CardView } from '../card'

const base: CardView = {
  emoji: '🍅', name: '토마토', kind: '', category: 'vegetable', inPeak: false,
  whyNow: '', note: { pick: 'p', store: 's', use: 'u' }, price: null, nutrition: null, recipes: null,
}

describe('ProduceCard 레시피 진입점', () => {
  test('recipes 없으면 진입점이 없다', () => {
    const { container } = render(<ProduceCard card={base} />)
    expect(container.querySelector('.recipe-open')).toBeNull()
  })

  test('recipes 있으면 진입점을 보이고, 탭하면 바텀시트가 열린다', () => {
    const card = { ...base, recipes: [{ name: '토마토달걀볶음', ingredients: '토마토, 달걀', steps: ['썬다'] }] }
    const { container, getByText } = render(<ProduceCard card={card} />)
    const open = container.querySelector('.recipe-open')!
    expect(open).not.toBeNull()
    expect(container.querySelector('.sheet')).toBeNull() // 처음엔 닫힘
    fireEvent.click(open)
    expect(container.querySelector('.sheet')).not.toBeNull()
    expect(getByText('토마토달걀볶음')).toBeTruthy()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/components/ProduceCard.test.tsx`
Expected: FAIL — `.recipe-open` 없음.

- [ ] **Step 3: 구현 — ProduceCard.tsx**

`src/components/ProduceCard.tsx`:

```tsx
import { useState } from 'react'
import type { CardView } from '../card'
import { PriceBlock } from './PriceBlock'
import { Sparkline } from './Sparkline'
import { NutritionLine } from './NutritionLine'
import { Note } from './Note'
import { PeakDot } from './PeakDot'
import { RecipeSheet } from './RecipeSheet'

export function ProduceCard({ card }: { card: CardView }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  return (
    <details className="card" data-cat={card.category}>
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
        {card.recipes && (
          <button type="button" className="recipe-open" onClick={() => setSheetOpen(true)}>
            레시피 {card.recipes.length}개
          </button>
        )}
      </div>
      {sheetOpen && card.recipes && (
        <RecipeSheet recipes={card.recipes} onClose={() => setSheetOpen(false)} />
      )}
    </details>
  )
}
```

- [ ] **Step 4: ProduceCard 테스트 통과 확인**

Run: `npx vitest run src/components/ProduceCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: 실패하는 테스트 작성 — App 출처**

`src/components/App.test.tsx`의 `base: AppView` 리터럴(L20~24)은 `hasRecipes` 필수 필드가 없어 이제 타입 오류가 난다. `hasNutrition: false` 옆에 `hasRecipes: false`를 추가한다:

```tsx
const base: AppView = {
  cards: [toCardView(pick, 7)], noDrop: false, hasNutrition: false, hasRecipes: false,
  seasonal: [{ emoji: '🍑', name: '복숭아' }], coming: [],
  date: new Date('2026-07-10'), staleDays: 0,
}
```

그리고 `describe('App', ...)` 안에 출처 테스트를 추가:

```tsx
  test('hasRecipes면 레시피 출처를 페이지 하단에 한 번 보인다', () => {
    const { container } = render(<App view={{ ...base, hasRecipes: true }} />)
    expect(container.textContent).toContain('식품의약품안전처 조리식품 레시피 DB')
  })
  test('hasRecipes false면 레시피 출처가 없다', () => {
    const { container } = render(<App view={base} />)
    expect(container.textContent).not.toContain('조리식품 레시피 DB')
  })
```

- [ ] **Step 6: 구현 — App.tsx**

`src/components/App.tsx` — 구조분해에 `hasRecipes` 추가:

```tsx
  const { cards, noDrop, hasNutrition, hasRecipes, seasonal, coming, date, staleDays, term } = view
```

`<footer>` 안, 영양 출처 아래에 추가:

```tsx
      <footer>
        <p>가격: KAMIS(한국농수산식품유통공사) 일별 소매가격 · 전국 평균</p>
        {hasNutrition && <p>영양: 식품의약품안전처 국가표준식품성분 · 100g 기준</p>}
        {hasRecipes && <p>레시피: 식품의약품안전처 조리식품 레시피 DB</p>}
      </footer>
```

- [ ] **Step 7: 전체 컴포넌트 테스트 통과 확인**

Run: `npx vitest run src/components/`
Expected: PASS.

- [ ] **Step 8: 커밋**

```bash
git add src/components/ProduceCard.tsx src/components/ProduceCard.test.tsx src/components/App.tsx src/components/App.test.tsx
git commit -m "feat: 카드 레시피 진입점 + 바텀시트 배선 + 출처

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: 데이터 배선 — recipeRef·recipes.json·로더·npm (`produce.json` · `recipes.json` · `index.tsx` · `package.json`)

시작 세트(복숭아·토마토·사과)에 `recipeRef`를 걸고, 로더가 `recipes.json`을 `buildAppView`에 전달하며, `fetch:recipes` npm 스크립트를 추가한다.

> ⚠️ **키 의존**: 실제 `recipes.json` 채움과 `recipeRef.names`의 실 `RCP_NM` 확정은 `FOODSAFETY_API_KEY`가 있어야 한다(키 보유자가 `npm run fetch:recipes` 실행). 이 태스크는 **빌드가 깨지지 않도록 씨앗 `recipes.json`을 커밋**하고 배선을 완성한다. 키 실행 후 실데이터로 덮어쓴다.

**Files:**
- Modify: `public/data/produce.json` (복숭아·토마토·사과에 `recipeRef`)
- Create: `public/data/recipes.json` (씨앗)
- Modify: `src/routes/index.tsx`
- Modify: `package.json`

- [ ] **Step 1: package.json 스크립트 추가**

`scripts`의 `fetch:nutrition` 아래:

```json
    "fetch:recipes": "node scripts/fetch-recipes.mjs",
```

- [ ] **Step 2: 씨앗 recipes.json 생성**

`public/data/recipes.json` — 로더 import가 성립하도록 유효한 빈 스냅샷(키 실행 전까지):

```json
{
  "schemaVersion": 1,
  "fetchedAt": "2026-07-11T00:00:00.000Z",
  "entries": []
}
```

- [ ] **Step 3: produce.json에 recipeRef 추가**

복숭아·토마토·사과 프로필에 `foodDb` 옆으로 `recipeRef`를 추가한다. **이름은 실제 `RCP_NM` 후보**(키 실행 시 검증되며, 매칭 안 되는 이름은 자동 스킵):

```jsonc
// 복숭아 (커버리지 얇음 — 0~1개 예상, 0이면 진입점 미표시)
"recipeRef": { "names": ["복숭아잼"] },
// 토마토
"recipeRef": { "names": ["토마토달걀볶음", "토마토스파게티"] },
// 사과
"recipeRef": { "names": ["사과잼", "사과샐러드"] },
```

> 구현자 메모: 위 이름은 후보다. 키 보유자가 `fetch:recipes` 실행 후 실제 매칭된 `RCP_NM`으로 조정한다. 코드/테스트는 이름 존재 여부와 무관하게 동작한다(없으면 빈 목록 → 진입점 없음).

- [ ] **Step 4: 로더 배선 — index.tsx**

`src/routes/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import produce from '../../public/data/produce.json'
import prices from '../../public/data/prices.json'
import nutrition from '../../public/data/nutrition.json'
import recipes from '../../public/data/recipes.json'
import { buildAppView } from '../app'
import { App } from '../components/App'
import type { NutritionSnapshot, PriceSnapshot, ProduceProfile, RecipeSnapshot } from '../types'

export const Route = createFileRoute('/')({
  loader: async () =>
    buildAppView(
      produce as unknown as ProduceProfile[],
      prices as unknown as PriceSnapshot,
      nutrition as unknown as NutritionSnapshot,
      recipes as unknown as RecipeSnapshot,
      new Date(),
    ),
  component: Home,
})

function Home() {
  const view = Route.useLoaderData()
  // date는 로더 직렬화 경계를 넘으며 문자열이 될 수 있어 Date로 되살린다.
  return <App view={{ ...view, date: new Date(view.date) }} />
}
```

- [ ] **Step 5: 전체 테스트 + 타입체크 + 빌드 확인**

Run: `npm test`
Expected: 전부 PASS.

Run: `npm run build`
Expected: 프리렌더 성공(씨앗 `recipes.json`으로 레시피 없이 렌더). 오류 없음.

- [ ] **Step 6: 커밋**

```bash
git add public/data/produce.json public/data/recipes.json src/routes/index.tsx package.json
git commit -m "feat: 레시피 데이터 배선 (recipeRef·로더·fetch:recipes·씨앗 recipes.json)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: 문서 갱신 (`CLAUDE.md`)

명령어·규칙에 레시피 파이프라인을 기록한다. 가격·영양과 대칭.

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 명령어 추가**

`- \`npm run fetch:nutrition\` ...` 줄 아래:

```md
- `npm run fetch:recipes` — 식약처 조리식품 레시피DB 수집 (env: `FOODSAFETY_API_KEY`)
```

- [ ] **Step 2: 규칙 추가**

`- 식약처 키도 코드·저장소에 절대 넣지 않는다 ...` 줄 아래:

```md
- 식품안전나라(레시피) 키도 코드·저장소에 절대 넣지 않는다 (CI 시크릿 `FOODSAFETY_API_KEY`).
```

`- 식약처 영양 매칭도 ... foodName ...` 줄 아래:

```md
- 레시피 매칭은 품목 코드가 아니라 `RCP_NM` 문자열로 한다 (`produce.json`의 `recipeRef.names`).
```

- [ ] **Step 3: 커밋**

```bash
git add CLAUDE.md
git commit -m "docs: fetch:recipes 명령어·식품안전나라 키/레시피 매칭 규칙 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## 최종 검증

- [ ] `npm test` — 전체 그린 (파서·수집기·recipe·card·app·RecipeSheet·ProduceCard·App).
- [ ] `npm run build` — 프리렌더 성공.
- [ ] (키 보유자) `FOODSAFETY_API_KEY=… npm run fetch:recipes` → `recipes.json` 실데이터 채움 → `recipeRef.names`를 실 매칭에 맞게 조정 → 재커밋.
- [ ] **브라우저 실측** (메모 규율): `npm run dev`로 토마토·사과 카드 펼쳐 진입점 → 바텀시트 열림/닫힘(배경·Esc)·재료·단계 표시·모바일 폭·출처 1회 확인. 복숭아는 매칭 0이면 진입점 없음이 정상.

## 후속 (이 슬라이스 밖)

- 나머지 품목 `recipeRef` 확장(채소 커버리지 풍부 — 무·가지·단호박 등).
- 궁합(페어링) 에디토리얼 — 레시피 소스 없는 생과일용(별도 슬라이스).
