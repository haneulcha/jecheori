# 영양 정보 커버리지 확장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 영양 정보가 40개 프로필 중 3종에만 있던 것을, 탐색 스크립트로 식약처 DB에서 정확한 `FOOD_NM_KR`을 실측해 나머지 품목까지 `foodDb` 참조를 채운다.

**Architecture:** 3단계 흐름 — (1) 커밋형 탐색 스크립트가 식약처 API로 변형 후보를 모아 순위를 매겨 `nutrition-candidates.json` 출력(유저가 키로 실행), (2) 에이전트가 그 산출물에서 정확한 참조를 골라 `produce.json`의 `foodDb`를 채움, (3) 기존 `fetch:nutrition`이 채워진 참조로 `nutrition.json` 생성(유저가 실행). 순수 순위 로직은 lib로 분리·테스트, I/O 셸과 분리.

**Tech Stack:** Node ≥ 22 (ESM `.mjs` 스크립트), Vitest. 식약처 영양성분DB API(`FoodNtrCpntDbInfo02`).

## Global Constraints

- node ≥ 22.
- **식약처 키(`DATA_GO_KR_KEY`)는 코드·저장소에 절대 넣지 않는다** (env로만).
- 영양은 **씨앗형** — 상시 CI 없이 로컬 1회 수집해 커밋.
- 영양 매칭은 품목 코드가 아니라 **`FOOD_NM_KR` 문자열 정확일치**로 한다.
- **순수 로직은 lib에, I/O는 스크립트에.** 순수 로직 테스트는 `tests/`에 두고 `'../scripts/…'`로 임포트.
- **완료 게이트 = `npm test` 와 `npx tsc --noEmit` 둘 다.** UI 변화는 브라우저 실측.
- `NutritionSnapshot.schemaVersion`은 `1` 유지 — 새 필드 없음(kcal·carbs·protein·fat·sugar·fiber).
- 사용자 문구는 한국어, 담백한 톤.

## File Structure

- **Create** `scripts/lib/rank-nutrition-candidates.mjs` — 순위·플래그 판정 순수 함수.
- **Create** `tests/rank-nutrition-candidates.test.js` — 위 순수 함수 테스트.
- **Modify** `scripts/lib/parse-nutrition.mjs` — 영양수치 필드 추출을 `nutritionFieldsOf(it)` 헬퍼로 분리(동작 불변), `parseNutritionEntry`가 재사용.
- **Create** `scripts/explore-nutrition.mjs` — 탐색 도구. `buildNutritionCandidates`(fetchFn 주입 테스트 가능) + main.
- **Create** `tests/explore-nutrition.test.js` — `buildNutritionCandidates` 테스트.
- **Modify** `package.json` — `explore:nutrition` 스크립트 추가.
- **Modify** `.gitignore` — `nutrition-candidates.json` 무시.
- **Modify** `public/data/produce.json` — 37종에 `foodDb` 참조 추가(Task 4, 탐색 산출물 기반).
- **Modify** `public/data/nutrition.json` — 수집 결과(Task 5, 유저 실행).
- **Modify** `docs/제품-동작-지도.md`, `docs/아이디어-백로그.md` — 커버리지·정책 갱신.

---

### Task 1: 순위 판정 순수 함수 (`rank-nutrition-candidates.mjs`)

**Files:**
- Create: `scripts/lib/rank-nutrition-candidates.mjs`
- Test: `tests/rank-nutrition-candidates.test.js`

**Interfaces:**
- Consumes: 없음(순수).
- Produces:
  - `classifyPrep(foodName: string) => 'raw' | 'cooked' | 'processed'`
  - `rankNutritionCandidates(candidates: Array<{foodName, category1, kcal, carbs, protein, fat, sugar, fiber}>) => { pick: Candidate | null, ranked: Candidate[], flag: 'ok' | 'cooked' | 'no-match' }`
    — `ranked`는 중가공 제외 후 생것 우선 정렬, `pick`은 그 첫 항목, `flag`는 `pick`이 없으면 `'no-match'`, 조리 기준이면 `'cooked'`, 아니면 `'ok'`.

- [ ] **Step 1: Write the failing test**

`tests/rank-nutrition-candidates.test.js`:

```js
import { describe, expect, test } from 'vitest'
import { classifyPrep, rankNutritionCandidates } from '../scripts/lib/rank-nutrition-candidates.mjs'

const c = (foodName, extra = {}) => ({ foodName, category1: '채소류', kcal: 1, ...extra })

describe('classifyPrep', () => {
  test('상태 접미가 없으면 생것으로 본다', () => expect(classifyPrep('오이')).toBe('raw'))
  test('생것 명시는 raw', () => expect(classifyPrep('사과_부사_생것')).toBe('raw'))
  test('데친것·삶은것은 cooked', () => {
    expect(classifyPrep('시금치_데친것')).toBe('cooked')
    expect(classifyPrep('감자_삶은것')).toBe('cooked')
  })
  test('통조림·주스·말린것은 processed', () => {
    expect(classifyPrep('사과잼')).toBe('processed')
    expect(classifyPrep('복숭아_통조림')).toBe('processed')
    expect(classifyPrep('포도_주스')).toBe('processed')
  })
  test('생강처럼 이름에 생이 들어가도 상태 토큰이 아니면 raw', () =>
    expect(classifyPrep('생강_생것')).toBe('raw'))
})

describe('rankNutritionCandidates', () => {
  test('생것을 조리보다 먼저 고른다', () => {
    const r = rankNutritionCandidates([c('사과_구운것'), c('사과_부사_생것')])
    expect(r.pick.foodName).toBe('사과_부사_생것')
    expect(r.flag).toBe('ok')
  })
  test('생것이 없으면 조리를 고르고 cooked 플래그', () => {
    const r = rankNutritionCandidates([c('시금치_데친것')])
    expect(r.pick.foodName).toBe('시금치_데친것')
    expect(r.flag).toBe('cooked')
  })
  test('중가공만 있으면 no-match (pick null)', () => {
    const r = rankNutritionCandidates([c('사과잼'), c('복숭아_통조림')])
    expect(r.pick).toBeNull()
    expect(r.flag).toBe('no-match')
    expect(r.ranked).toHaveLength(0)
  })
  test('빈 후보는 no-match', () => {
    expect(rankNutritionCandidates([]).flag).toBe('no-match')
  })
  test('같은 상태면 이름이 짧은(더 일반적인) 것을 먼저', () => {
    const r = rankNutritionCandidates([c('무_알타리_생것'), c('무_생것')])
    expect(r.pick.foodName).toBe('무_생것')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/rank-nutrition-candidates.test.js`
Expected: FAIL — "Failed to resolve import ... rank-nutrition-candidates.mjs"

- [ ] **Step 3: Write minimal implementation**

`scripts/lib/rank-nutrition-candidates.mjs`:

```js
/** 식약처 원물명의 상태 접미(마지막 토큰류)로 조리 상태를 분류.
 *  이름에 상태 토큰이 없으면 생것(raw)으로 본다. */
const COOKED = ['데친것', '삶은것', '찐것', '구운것', '볶은것', '조림', '튀김', '부침', '삶은']
const PROCESSED = [
  '통조림', '주스', '말린것', '건조', '냉동', '당절임', '설탕', '시럽',
  '분말', '가루', '잼', '농축', '절임', '장아찌', '액상',
]

export function classifyPrep(foodName) {
  if (PROCESSED.some((t) => foodName.includes(t))) return 'processed'
  if (COOKED.some((t) => foodName.includes(t))) return 'cooked'
  return 'raw'
}

const PREP_RANK = { raw: 0, cooked: 1 }

/** 중가공 제외 후 생것 우선 정렬. pick=첫 항목, flag=상태.
 *  같은 상태끼리는 토큰 수·이름 길이가 짧은(더 일반적인) 것을 먼저 둔다. */
export function rankNutritionCandidates(candidates) {
  const ranked = candidates
    .map((cand) => ({ ...cand, prep: classifyPrep(cand.foodName) }))
    .filter((cand) => cand.prep !== 'processed')
    .sort(
      (a, b) =>
        PREP_RANK[a.prep] - PREP_RANK[b.prep] ||
        a.foodName.split('_').length - b.foodName.split('_').length ||
        a.foodName.length - b.foodName.length,
    )
  const pick = ranked[0] ?? null
  const flag = pick === null ? 'no-match' : pick.prep === 'cooked' ? 'cooked' : 'ok'
  return { pick, ranked, flag }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/rank-nutrition-candidates.test.js`
Expected: PASS (11 assertions)

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/rank-nutrition-candidates.mjs tests/rank-nutrition-candidates.test.js
git commit -m "feat(nutrition): 영양 후보 순위 순수 함수 (생것 우선·중가공 제외)"
```

---

### Task 2: 탐색 스크립트 (`explore-nutrition.mjs`) + 필드 헬퍼 추출

**Files:**
- Modify: `scripts/lib/parse-nutrition.mjs` (필드 추출 헬퍼 분리, 동작 불변)
- Create: `scripts/explore-nutrition.mjs`
- Test: `tests/explore-nutrition.test.js`
- Modify: `package.json` (scripts), `.gitignore`

**Interfaces:**
- Consumes: `nutritionFieldsOf` (아래), `rankNutritionCandidates` (Task 1).
- Produces:
  - `nutritionFieldsOf(it: object) => { serving, kcal, carbs, protein, fat, sugar, fiber }`
  - `buildNutritionCandidates({ key, profiles, fetchFn }) => Promise<Array<{ id, name, searchTerms, flag, pick, candidates }>>`
    — `foodDb` 없는 프로필만 조회, 프로필당 `SEARCH_TERMS[id]`(없으면 `[name]`)로 부분일치 조회, 응답의 `FOOD_CAT1_NM` 캡처, `foodName`으로 dedup, `rankNutritionCandidates`로 순위. 오류 헤더(resultCode≠'00')면 throw(조용한 실패 방지).

- [ ] **Step 1: `parse-nutrition.mjs` 필드 헬퍼 추출 (동작 불변) — 기존 테스트로 검증**

`scripts/lib/parse-nutrition.mjs`의 `parseNutritionEntry`를 헬퍼로 리팩터. `parseNum` 위에 추가:

```js
/** 식약처 원물 raw 항목에서 영양 6필드 + serving 추출 (parse/explore 공용). */
export function nutritionFieldsOf(it) {
  return {
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

그리고 `parseNutritionEntry`의 반환부를 교체:

```js
  const it = items.find((x) => x.FOOD_NM_KR === foodName)
  if (!it) return null
  return { foodName: it.FOOD_NM_KR, ...nutritionFieldsOf(it) }
```

- [ ] **Step 2: 기존 테스트가 여전히 통과하는지(리팩터 안전) 확인**

Run: `npx vitest run tests/parse-nutrition.test.js`
Expected: PASS — 기존 `parseNutritionEntry` 동작 불변(사과_부사_생것 kcal 53 등).

- [ ] **Step 3: `buildNutritionCandidates` 실패 테스트 작성**

`tests/explore-nutrition.test.js`:

```js
import { expect, test } from 'vitest'
import { buildNutritionCandidates } from '../scripts/explore-nutrition.mjs'

const respOf = (items) => ({
  ok: true,
  json: async () => ({ header: { resultCode: '00' }, body: { items } }),
})

const cucumberItems = [
  { FOOD_NM_KR: '오이_취청_생것', FOOD_CAT1_NM: '채소류', SERVING_SIZE: '100g', AMT_NUM1: '9.00' },
  { FOOD_NM_KR: '오이지', FOOD_CAT1_NM: '채소류', SERVING_SIZE: '100g', AMT_NUM1: '11.00' },
]

test('foodDb 없는 프로필만 조회하고 생것을 pick 한다', async () => {
  const calls = []
  const profiles = [
    { id: 'apple', name: '사과', foodDb: { category1: '과일류', foodName: '사과_부사_생것' } },
    { id: 'cucumber', name: '오이' },
  ]
  const fetchFn = async (url) => {
    calls.push(new URL(url).searchParams.get('FOOD_NM_KR'))
    return respOf(cucumberItems)
  }
  const out = await buildNutritionCandidates({ key: 'K', profiles, fetchFn })
  expect(calls).toEqual(['오이']) // 사과는 foodDb 있어 건너뜀
  expect(out).toHaveLength(1)
  expect(out[0].id).toBe('cucumber')
  expect(out[0].pick.foodName).toBe('오이_취청_생것')
  expect(out[0].pick.category1).toBe('채소류') // 실제 FOOD_CAT1_NM 캡처
  expect(out[0].pick.kcal).toBe(9)
  expect(out[0].flag).toBe('ok')
})

test('오류 헤더(resultCode≠00)면 throw — 조용한 실패 방지', async () => {
  const fetchFn = async () => ({
    ok: true,
    json: async () => ({ header: { resultCode: '30', resultMsg: 'LIMITED' }, body: {} }),
  })
  await expect(
    buildNutritionCandidates({ key: 'K', profiles: [{ id: 'cucumber', name: '오이' }], fetchFn }),
  ).rejects.toThrow(/LIMITED/)
})

test('HTTP 오류면 throw', async () => {
  const fetchFn = async () => ({ ok: false, status: 500 })
  await expect(
    buildNutritionCandidates({ key: 'K', profiles: [{ id: 'cucumber', name: '오이' }], fetchFn }),
  ).rejects.toThrow(/500/)
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run tests/explore-nutrition.test.js`
Expected: FAIL — "Failed to resolve import ... explore-nutrition.mjs"

- [ ] **Step 5: `explore-nutrition.mjs` 구현**

`scripts/explore-nutrition.mjs`:

```js
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { nutritionFieldsOf } from './lib/parse-nutrition.mjs'
import { rankNutritionCandidates } from './lib/rank-nutrition-candidates.mjs'

const API = 'https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02'

/** 프로필 id → 식약처 검색어(부분일치). 첫 탐색 후 노이즈/무결과면 조정해 재실행.
 *  category1은 응답에서 실제값을 캡처하므로 여기서 좁히지 않는다. */
const SEARCH_TERMS = {
  watermelon: ['수박'], 'korean-melon': ['참외'], cucumber: ['오이'],
  zucchini: ['애호박', '호박'], potato: ['감자'], corn: ['옥수수'], spinach: ['시금치'],
  pear: ['배'], grape: ['포도'], 'shine-muscat': ['샤인', '포도'], mandarin: ['감귤', '귤'],
  'sweet-persimmon': ['단감', '감'], kiwi: ['참다래', '키위'], strawberry: ['딸기'],
  melon: ['멜론'], 'napa-cabbage': ['배추'], cabbage: ['양배추'], lettuce: ['상추'],
  'eolgari-cabbage': ['얼갈이'], 'garlic-chives': ['부추'], 'perilla-leaf': ['깻잎'],
  'sweet-pumpkin': ['단호박', '호박'], 'cherry-tomato': ['방울토마토', '토마토'],
  eggplant: ['가지'], 'green-chili': ['풋고추', '고추'], paprika: ['파프리카'],
  radish: ['무'], 'young-radish': ['열무'], carrot: ['당근'], broccoli: ['브로콜리'],
  'green-onion': ['대파', '파'], scallion: ['쪽파', '실파'], onion: ['양파'],
  garlic: ['마늘'], ginger: ['생강'], 'sweet-potato': ['고구마'], minari: ['미나리'],
}

/** foodDb 없는 프로필을 식약처 API로 조회해 변형 후보 + 순위를 만든다. fetchFn 주입으로 테스트. */
export async function buildNutritionCandidates({ key, profiles, fetchFn = fetch }) {
  const results = []
  for (const p of profiles) {
    if (p.foodDb) continue
    const terms = SEARCH_TERMS[p.id] ?? [p.name]
    const byName = new Map()
    for (const term of terms) {
      const url = new URL(API)
      url.searchParams.set('serviceKey', key)
      url.searchParams.set('type', 'json')
      url.searchParams.set('numOfRows', '100')
      url.searchParams.set('FOOD_NM_KR', term)
      const res = await fetchFn(url.toString())
      if (!res.ok) throw new Error(`FoodNtr HTTP ${res.status} (${p.name}/${term})`)
      const json = await res.json()
      const raw = json?.body?.items
      if (raw === undefined || raw === null) {
        const code = json?.header?.resultCode
        if (code && code !== '00') {
          throw new Error(`FoodNtr 오류: ${json?.header?.resultMsg ?? code} (${term})`)
        }
        continue // 정상 무결과
      }
      const items = Array.isArray(raw) ? raw : [raw]
      for (const it of items) {
        if (!byName.has(it.FOOD_NM_KR)) {
          byName.set(it.FOOD_NM_KR, {
            foodName: it.FOOD_NM_KR,
            category1: it.FOOD_CAT1_NM ?? '',
            ...nutritionFieldsOf(it),
          })
        }
      }
    }
    const { pick, ranked, flag } = rankNutritionCandidates([...byName.values()])
    results.push({ id: p.id, name: p.name, searchTerms: terms, flag, pick, candidates: ranked })
  }
  return results
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
  const outPath = fileURLToPath(new URL('../nutrition-candidates.json', import.meta.url))
  try {
    const candidates = await buildNutritionCandidates({ key, profiles })
    writeFileSync(outPath, JSON.stringify(candidates, null, 2))
    const flagCount = (f) => candidates.filter((c) => c.flag === f).length
    console.log(
      `nutrition-candidates.json: ${candidates.length}종 ` +
        `(ok ${flagCount('ok')} · cooked ${flagCount('cooked')} · no-match ${flagCount('no-match')})`,
    )
  } catch (err) {
    console.error('탐색 실패:', err.message)
    process.exit(1)
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/explore-nutrition.test.js`
Expected: PASS (3 tests)

- [ ] **Step 7: `package.json` 스크립트 + `.gitignore` 추가**

`package.json`의 `scripts`에 `fetch:nutrition` 아래 추가:

```json
    "explore:nutrition": "node scripts/explore-nutrition.mjs",
```

`.gitignore`의 `storybook-static/` 아래 추가:

```
# 영양 탐색 산출물 (커밋 대상 아님 — produce.json 참조만 커밋)
nutrition-candidates.json
```

- [ ] **Step 8: 전체 테스트·타입체크 게이트**

Run: `npm test && npx tsc --noEmit`
Expected: 전부 PASS.

- [ ] **Step 9: Commit**

```bash
git add scripts/explore-nutrition.mjs scripts/lib/parse-nutrition.mjs tests/explore-nutrition.test.js package.json .gitignore
git commit -m "feat(nutrition): 식약처 영양 후보 탐색 스크립트 (explore:nutrition)"
```

---

### Task 3: [유저 실행] 탐색 스크립트 돌리기 — 핸드오프

**Files:** 없음(유저가 로컬에서 API 실행).

에이전트는 여기서 멈추고 유저에게 다음을 요청한다:

```bash
DATA_GO_KR_KEY=<식약처_키> npm run explore:nutrition
```

- [ ] **Step 1: 유저가 위 명령을 실행**하면 리포지토리 루트에 `nutrition-candidates.json`이 생긴다(gitignore).
- [ ] **Step 2: 출력 요약 확인** — 콘솔의 `ok N · cooked N · no-match N` 수치를 유저가 에이전트에 전달하거나, 에이전트가 파일을 Read.
- [ ] **Step 3: 무결과·노이즈 점검** — `no-match`가 많거나 특정 품목 후보가 비었으면(부분일치 미지원·검색어 부적합), `scripts/explore-nutrition.mjs`의 `SEARCH_TERMS`를 조정하고 Task 2 커밋 없이 재실행(스크립트 수정은 별도 커밋). 부분일치가 아예 안 되는 정황(대다수 무결과)이면 그때 폴백(카테고리 조회) 설계를 다시 잡는다.

---

### Task 4: 탐색 산출물로 `foodDb` 참조 채우기

**Files:**
- Read: `nutrition-candidates.json` (Task 3 산출물)
- Modify: `public/data/produce.json`

**Interfaces:**
- Consumes: `nutrition-candidates.json`의 `{ id, flag, pick: { foodName, category1 }, candidates }`.
- Produces: `produce.json` 각 프로필의 `foodDb: { category1, foodName }` (해당하는 품목만).

- [ ] **Step 1: 후보 파일 Read + 품목별 결정**

`nutrition-candidates.json`을 읽고 품목마다:
- `flag: 'ok'` 또는 `'cooked'` → `pick.foodName`·`pick.category1`을 `foodDb`로 채운다. (`cooked`는 조리 기준임을 인지하고 채운다 — 커버리지 우선 정책.)
- `pick`이 부적절하면(엉뚱한 품종·노이즈) `candidates` 목록에서 더 맞는 항목으로 **오버라이드**한다.
- `flag: 'no-match'` → `foodDb`를 **비운 채 둔다**(정직한 부재). 어떤 품목이 no-match인지 목록을 남긴다.

- [ ] **Step 2: `produce.json`에 `foodDb` 추가**

각 대상 프로필에 기존 3종과 같은 형태로 삽입(예시 — 실제 값은 후보 파일 기준):

```json
  "foodDb": {
    "category1": "채소류",
    "foodName": "오이_취청_생것"
  },
```

(`category1`은 응답의 실제값 — 감자·고구마·옥수수는 `채소류`가 아닐 수 있으니 후보의 `category1`을 그대로 쓴다.)

- [ ] **Step 3: `produce.json` 유효성·타입 확인**

Run: `npx vitest run tests/produce.test.ts && npx tsc --noEmit`
Expected: PASS — JSON 유효, 프로필 스키마 위반 없음.

- [ ] **Step 4: Commit**

```bash
git add public/data/produce.json
git commit -m "data(nutrition): N종에 foodDb 영양 참조 추가 (no-match M종은 미채움)"
```

(커밋 메시지의 N·M·조리기준 품목 목록을 실제 수치로 채운다.)

---

### Task 5: [유저 실행] 영양 수집 — 핸드오프

**Files:**
- Modify: `public/data/nutrition.json` (유저 실행 결과)

에이전트는 유저에게 다음을 요청한다:

```bash
DATA_GO_KR_KEY=<식약처_키> npm run fetch:nutrition
```

- [ ] **Step 1: 유저가 위 명령을 실행** → `public/data/nutrition.json`이 갱신된다(엔트리 3 → N).
- [ ] **Step 2: 콘솔 로그 확인** — `nutrition.json 갱신: N개`. N이 Task 4에서 채운 참조 수와 맞는지 확인(불일치면 정확일치 실패한 참조가 있다는 뜻 → 해당 품목 후보 재확인).
- [ ] **Step 3: Commit**

```bash
git add public/data/nutrition.json
git commit -m "data(nutrition): 영양 스냅샷 확장 수집 (N개)"
```

---

### Task 6: 검증 + 문서 갱신 (완료 게이트)

**Files:**
- Modify: `docs/제품-동작-지도.md`, `docs/아이디어-백로그.md`

- [ ] **Step 1: 게이트 — 테스트 + 타입체크**

Run: `npm test && npx tsc --noEmit`
Expected: 전부 PASS.

- [ ] **Step 2: 브라우저 실측**

`npm run dev` 실행 후, 7월 제철 중 새로 커버된 카드(예: 오이·감자·양파·애호박)를 펼쳐:
- 영양 스탯(kcal·탄·단·지·당·섬유)이 렌더되는지
- 푸터 "영양: 식약처…" 출처 줄이 뜨는지
확인. 사용자향 시각 변경이므로 스크린샷으로 사인오프.

- [ ] **Step 3: `docs/제품-동작-지도.md §8` 갱신**

"영양 정보는 40종 중 3종에만" 문장을 실제 커버리지 수치로 고치고, 조리 기준(`cooked`)을 쓴 품목과 no-match로 남은 품목을 명시.

- [ ] **Step 4: `docs/아이디어-백로그.md` 갱신**

영양 확장 관련 항목을 완료/정리 섹션으로 이동(기존 "완료 (2026-07-16)" 표기 방식 참고).

- [ ] **Step 5: Commit**

```bash
git add docs/제품-동작-지도.md docs/아이디어-백로그.md
git commit -m "docs(nutrition): 영양 커버리지 확장 반영 (동작 지도·백로그)"
```

---

## Self-Review

**Spec coverage:**
- 3단계 흐름(탐색→참조→수집) → Task 2·3 / 4 / 5. ✅
- 제약(식약처 키 없음) → Task 3 유저 핸드오프. ✅
- 선택 정책(생것 우선·조리 폴백·중가공 제외·no-match) → Task 1 `rankNutritionCandidates`. ✅
- category1 실제값 캡처(조용한 누락 방지) → Task 2 `buildNutritionCandidates`가 `FOOD_CAT1_NM` 캡처, Task 4가 실제값 사용. ✅
- 새 컴포넌트(explore 스크립트·rank lib·순수 테스트) → Task 1·2. ✅
- 안 건드리는 것(fetch/parse 로직·schemaVersion·UI) → parse는 동작불변 헬퍼 추출만(Task 2 Step 2가 검증), schemaVersion·UI 무변경. ✅
- 검증(test+tsc+브라우저) → Task 6. ✅
- 문서 갱신(동작 지도·백로그) → Task 6. ✅

**Placeholder scan:** Task 4·5의 N·M은 탐색 결과 의존이라 실행 시점에 확정되는 실값(placeholder 아님). 코드 스텝은 전부 완전한 코드. ✅

**Type consistency:** `nutritionFieldsOf`·`rankNutritionCandidates`·`buildNutritionCandidates` 시그니처가 Task 1·2 정의와 사용처에서 일치. `pick`/`flag`/`candidates` 필드명 일관. ✅
