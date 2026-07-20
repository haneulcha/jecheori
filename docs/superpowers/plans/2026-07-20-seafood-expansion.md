# 수산물 확대 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 제철 달력에 수산물(KAMIS 부류 600)을 새 카테고리로 추가한다 — 이번 컷은 가격·계절만.

**Architecture:** 영양 확장과 같은 **프로브 우선** 흐름. 부류 600을 로컬(한국 IP)에서 프로브로 실측해
품목·단위를 눈으로 본 뒤, 단위를 가르치고 프로필을 짠다. 순수 로직은 `parse-kamis`/`cardlist`에,
카테고리 배선은 타입·컴포넌트에, 계절 지식은 `produce.json`에. `perUnitPrice`·값어치 비교는 안 건드린다.

**Tech Stack:** TanStack Start (React 19) + Vite + Vitest. ESM `.mjs` 스크립트. node ≥ 22.

## Global Constraints

- node ≥ 22, ESM. **새 npm 의존성 금지.**
- **API 키는 코드·저장소에 절대 넣지 않는다** (env `KAMIS_CERT_KEY`/`KAMIS_CERT_ID`).
- **KAMIS 매칭은 `item_name` 문자열로** (품목 코드 아님).
- **환산 없음** — KAMIS 단위 표기를 그대로 보존. 근(≈600g)도 g으로 안 바꾼다.
  `parseUnit`은 **모르는 단위에 여전히 throw**(조용한 오염 방지 — 안전장치 유지).
- 사용자 문구는 **한국어·담백한 톤, 이커머스 화법 금지**("사세요" ✕).
- **완료 게이트 = `npm test` 와 `npx tsc --noEmit` 둘 다.**
- 순수 로직 테스트는 `tests/`, 컴포넌트 테스트는 `src/components/*.test.tsx`(상단 `// @vitest-environment jsdom`),
  라우터 필요한 컴포넌트는 `src/test-utils.tsx`의 `renderWithRouter`.
- **테스트 픽스처도 유효 타입값**(`KamisRef.categoryCode`는 `'100'|'200'|'400'|'600'`).
- `src/routeTree.gen.ts`는 커밋 대상 아님(빌드시 자동 생성).

---

### Task 1: 부류 600 프로브 스크립트

부류 600을 `parseUnit` **없이** 원시 열거하는 발견 도구. 사용자가 로컬(한국 IP)에서 실행해
실제 품목·단위를 본다. `parseCategoryResponse`는 모르는 단위에 throw하므로 여기선 쓰지 않는다.

**Files:**
- Create: `scripts/probe-seafood.mjs`
- Test: `tests/probe-seafood.test.js`
- Modify: `package.json` (스크립트 `probe:seafood` 추가)

**Interfaces:**
- Produces: `summarizeSeafood(json) → { items: {itemName,kindName,rank,unit,price}[], units: string[] }`
  (units = 중복 제거·정렬된 원시 단위 표기), `probeSeafood({certKey,certId,regday,fetchFn}) → 같은 형태`.

- [ ] **Step 1: 실패 테스트 작성** — `tests/probe-seafood.test.js`

```js
import { describe, expect, test } from 'vitest'
import { probeSeafood, summarizeSeafood } from '../scripts/probe-seafood.mjs'

const item = (item_name, kind_name, unit, dpr1 = '1000') => ({ item_name, kind_name, unit, rank: '상', dpr1 })
const ok = (json) => async () => ({ ok: true, json: async () => json })

describe('summarizeSeafood', () => {
  test('원시 단위를 중복 제거·정렬해 열거한다 (parseUnit 없이)', () => {
    const json = { data: { item: [item('굴', '', '1kg'), item('고등어', '', '1마리'), item('갈치', '', '1마리')] } }
    const { items, units } = summarizeSeafood(json)
    expect(items).toHaveLength(3)
    expect(units).toEqual(['1kg', '1마리']) // 마리를 몰라도 throw하지 않고 열거
    expect(items[0]).toMatchObject({ itemName: '굴', unit: '1kg', price: '1000' })
  })
  test('item이 단일 객체여도 배열로 감싼다', () => {
    const { items } = summarizeSeafood({ data: { item: item('굴', '', '1kg') } })
    expect(items).toHaveLength(1)
  })
  test("data가 ['001']이면 빈 결과 (그날 조사 없음)", () => {
    expect(summarizeSeafood({ data: ['001'] })).toEqual({ items: [], units: [] })
  })
  test('error_code가 000이 아니면 throw', () => {
    expect(() => summarizeSeafood({ data: { error_code: '900' } })).toThrow(/900/)
  })
  test('오류 코드 배열이면 throw', () => {
    expect(() => summarizeSeafood({ data: ['900'] })).toThrow(/KAMIS 오류/)
  })
})

describe('probeSeafood', () => {
  test('부류 600·단위 보존(p_convert_kg_yn=N)으로 조회한다', async () => {
    let seen
    const fetchFn = async (url) => { seen = new URL(url); return { ok: true, json: async () => ({ data: { item: [item('굴', '', '1kg')] } }) } }
    const out = await probeSeafood({ certKey: 'K', certId: 'I', regday: '2026-07-20', fetchFn })
    expect(seen.searchParams.get('p_item_category_code')).toBe('600')
    expect(seen.searchParams.get('p_convert_kg_yn')).toBe('N')
    expect(seen.searchParams.get('p_product_cls_code')).toBe('01')
    expect(out.units).toEqual(['1kg'])
  })
  test('HTTP 실패면 throw', async () => {
    const fetchFn = async () => ({ ok: false, status: 406 })
    await expect(probeSeafood({ certKey: 'K', certId: 'I', regday: '2026-07-20', fetchFn })).rejects.toThrow(/406/)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/probe-seafood.test.js`
Expected: FAIL ("probe-seafood.mjs" 없음 / import 실패)

- [ ] **Step 3: 구현** — `scripts/probe-seafood.mjs`

```js
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const API_BASE = 'https://www.kamis.or.kr/service/price/xml.do'

/** KAMIS가 UA·Accept 없는 요청을 406으로 막는다(fetch-prices와 동일). */
const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; jecheori/1.0; +https://github.com/haneulcha/jecheori)',
  Accept: 'application/json, text/javascript, */*; q=0.01',
}

/** 부류 600 원시 응답을 parseUnit 없이 열거한다 — 단위를 **가르치기 전에** 발견하는 게 목적.
 *  parseCategoryResponse는 모르는 단위(마리·근)에 throw하므로 여기선 원시 필드를 직접 읽는다. */
export function summarizeSeafood(json) {
  const data = json?.data
  if (Array.isArray(data)) {
    if (data.length === 1 && data[0] === '001') return { items: [], units: [] }
    throw new Error(`KAMIS 오류 응답: ${JSON.stringify(data)}`)
  }
  if (!data) throw new Error(`KAMIS 오류 응답: ${JSON.stringify(json)}`)
  if (data.error_code && data.error_code !== '000') throw new Error(`KAMIS error_code=${data.error_code}`)
  const raw = Array.isArray(data.item) ? data.item : [data.item].filter(Boolean)
  const items = raw.map((it) => ({
    itemName: String(it.item_name ?? '').trim(),
    kindName: String(it.kind_name ?? '').trim(),
    rank: String(it.rank ?? '').trim(),
    unit: String(it.unit ?? '').trim(),
    price: it.dpr1 ?? null,
  }))
  const units = [...new Set(items.map((i) => i.unit).filter(Boolean))].sort()
  return { items, units }
}

/** 부류 600 하루치를 조회해 품목·단위를 요약. fetchFn 주입으로 테스트. */
export async function probeSeafood({ certKey, certId, regday, fetchFn = fetch }) {
  const url = new URL(API_BASE)
  url.searchParams.set('action', 'dailyPriceByCategoryList')
  url.searchParams.set('p_product_cls_code', '01') // 소매
  url.searchParams.set('p_item_category_code', '600') // 수산물
  url.searchParams.set('p_country_code', '') // 전체 평균
  url.searchParams.set('p_regday', regday)
  url.searchParams.set('p_convert_kg_yn', 'N') // 단위 보존 — 마리·근을 그대로 보려면 필수
  url.searchParams.set('p_cert_key', certKey)
  url.searchParams.set('p_cert_id', certId)
  url.searchParams.set('p_returntype', 'json')
  const res = await fetchFn(url.toString(), { headers: REQUEST_HEADERS })
  if (!res.ok) throw new Error(`KAMIS HTTP ${res.status} (부류 600)`)
  return summarizeSeafood(await res.json())
}

const isMain =
  import.meta.url && process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  ;(async () => {
    const certKey = process.env.KAMIS_CERT_KEY
    const certId = process.env.KAMIS_CERT_ID
    if (!certKey || !certId) {
      console.error('KAMIS_CERT_KEY / KAMIS_CERT_ID 환경변수가 필요합니다')
      process.exit(1)
    }
    // regday 미지정이면 KST 오늘 (KAMIS는 YYYY-MM-DD)
    const regday = process.argv[2] ?? new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)
    try {
      const { items, units } = await probeSeafood({ certKey, certId, regday })
      console.log(`부류 600 (${regday}): ${items.length}개 항목, 단위 ${units.length}종 → ${units.join(', ')}`)
      for (const it of items) {
        console.log(`  ${it.itemName} / ${it.kindName || '-'} / ${it.unit} / ${it.price ?? '-'} [${it.rank}]`)
      }
    } catch (err) {
      console.error('프로브 실패:', err.message)
      process.exit(1)
    }
  })()
}
```

- [ ] **Step 4: `package.json`에 스크립트 추가** — `scripts` 객체에 한 줄:

```json
"probe:seafood": "node scripts/probe-seafood.mjs",
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run tests/probe-seafood.test.js`
Expected: PASS

- [ ] **Step 6: 게이트 + 커밋**

Run: `npm test && npx tsc --noEmit`
```bash
git add scripts/probe-seafood.mjs tests/probe-seafood.test.js package.json
git commit -m "feat(seafood): 부류 600 프로브 스크립트 (단위 발견용, parseUnit 우회)"
```

---

### Task 2: 카테고리·필터 배선 (수산물 칩 + 3자 상호배타)

프로브 결과와 무관하게 결정적인 순수 배선. 수산 프로필이 아직 없어도 칩·필터·타입은 완성된다.

**Files:**
- Modify: `src/types.ts` (Category), `src/view-types.ts` (Filter), `src/cardlist.ts` (PRED),
  `src/components/FilterBar.tsx` (칩), `src/components/App.tsx` (3자 상호배타)
- Test: `tests/cardlist.test.ts`, `src/components/App.test.tsx`

**Interfaces:**
- Consumes: `Category`, `Filter`, `CardView.category`.
- Produces: `Filter`에 `'seafood'` 포함; `filterCards`가 `seafood` 술어 지원.

- [ ] **Step 1: 실패 테스트 작성** — `tests/cardlist.test.ts`에 추가

```ts
test('seafood 필터는 수산 카드만 남긴다', () => {
  const cards = [
    { name: '굴', category: 'seafood' },
    { name: '수박', category: 'fruit' },
  ] as unknown as CardView[]
  const out = filterCards(cards, new Set(['seafood']))
  expect(out.map((c) => c.name)).toEqual(['굴'])
})
```

`src/components/App.test.tsx`에 3자 상호배타 테스트 추가(기존 `필터 칩 토글…` 테스트 아래):

```tsx
test('과일·채소·수산 칩은 3자 상호배타 (하나 켜면 나머지 해제)', async () => {
  const view = viewWithCards([
    { name: '수박', category: 'fruit' },
    { name: '오이', category: 'vegetable' },
    { name: '굴', category: 'seafood' },
  ])
  const { container, getByRole } = await renderWithRouter(<App view={view} />)
  fireEvent.click(getByRole('button', { name: '과일' }))
  expect(container.textContent).toContain('수박')
  expect(container.textContent).not.toContain('굴')
  fireEvent.click(getByRole('button', { name: '수산물' })) // 과일 해제되고 수산만
  expect(container.textContent).toContain('굴')
  expect(container.textContent).not.toContain('수박')
  expect(getByRole('button', { name: '과일' }).getAttribute('aria-pressed')).toBe('false')
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/cardlist.test.ts src/components/App.test.tsx`
Expected: FAIL (`seafood`가 `Filter`에 없음 → tsc/런타임, 수산물 칩 없음)

- [ ] **Step 3: 타입 확장**

`src/types.ts` 1행:
```ts
export type Category = 'fruit' | 'vegetable' | 'seafood'
```

`src/view-types.ts` `Filter`:
```ts
export type Filter = 'fruit' | 'vegetable' | 'seafood' | 'drop' | 'peak' | 'priced'
```

- [ ] **Step 4: 필터 술어 추가** — `src/cardlist.ts` `PRED`에 한 줄:

```ts
const PRED: Record<Filter, (c: CardView) => boolean> = {
  fruit: (c) => c.category === 'fruit',
  vegetable: (c) => c.category === 'vegetable',
  seafood: (c) => c.category === 'seafood',
  drop: (c) => (c.price?.monthAgoPct ?? 0) < 0,
  peak: (c) => c.inPeak,
  priced: (c) => c.price != null,
}
```

- [ ] **Step 5: 칩 추가** — `src/components/FilterBar.tsx` `CHIPS`:

```tsx
const CHIPS: { key: Filter; label: string }[] = [
  { key: 'peak', label: '한창 제철' },
  { key: 'fruit', label: '과일' },
  { key: 'vegetable', label: '채소' },
  { key: 'seafood', label: '수산물' },
  { key: 'drop', label: '가격 하락' },
  { key: 'priced', label: '가격 있음' },
]
```

- [ ] **Step 6: 3자 상호배타** — `src/components/App.tsx`

컴포넌트 밖(파일 상단, import 아래)에 상수 추가:
```tsx
const EXCLUSIVE_FILTERS: Filter[] = ['fruit', 'vegetable', 'seafood']
```

`toggle`의 상호배타 블록을 교체:
```tsx
  const toggle = (f: Filter) =>
    setFilters((prev) => {
      const next = new Set(prev)
      if (next.has(f)) next.delete(f)
      else {
        next.add(f)
        // 카테고리 칩(과일·채소·수산)은 상호배타 — 하나 켜면 나머지 해제
        if (EXCLUSIVE_FILTERS.includes(f)) {
          for (const other of EXCLUSIVE_FILTERS) if (other !== f) next.delete(other)
        }
      }
      return next
    })
```

- [ ] **Step 7: 통과 + 게이트**

Run: `npx vitest run tests/cardlist.test.ts src/components/App.test.tsx && npm test && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 8: 커밋**

```bash
git add src/types.ts src/view-types.ts src/cardlist.ts src/components/FilterBar.tsx src/components/App.tsx tests/cardlist.test.ts src/components/App.test.tsx
git commit -m "feat(seafood): Category/Filter에 seafood 추가 + 수산물 칩·3자 상호배타"
```

---

### Task 3: 단위 지원 (마리·근) — parseUnit + Measure

프로브가 확정할 단위의 **최유력 후보(마리·근)**를 가르친다. 환산 없이 표기 보존, 모르는 단위엔 throw 유지.
(프로브가 손·팩 등 추가 단위를 밝히면 아래 **프로브 게이트**에서 같은 방식으로 더한다.)

**Files:**
- Modify: `scripts/lib/parse-kamis.mjs` (MEASURES, parseUnit 정규식), `src/types.ts` (Measure 유니온)
- Test: `tests/parse-kamis.test.js`, `tests/card.test.ts`

**Interfaces:**
- Produces: `parseUnit('3마리') → {quantity:3, measure:{kind:'count',unit:'마리'}}`,
  `parseUnit('1근') → {quantity:1, measure:{kind:'weight',unit:'근'}}`.

- [ ] **Step 1: 실패 테스트 작성** — `tests/parse-kamis.test.js`에 추가

```js
test('마리는 count로 파싱', () => {
  expect(parseUnit('3마리')).toEqual({ quantity: 3, measure: { kind: 'count', unit: '마리' } })
})
test('근은 weight로 파싱 (환산 없음)', () => {
  expect(parseUnit('1근')).toEqual({ quantity: 1, measure: { kind: 'weight', unit: '근' } })
})
test('여전히 모르는 단위엔 throw', () => {
  expect(() => parseUnit('2상자')).toThrow(/모르겠습니다/)
})
```

`tests/card.test.ts`에 개당값 경계 추가(마리 개당값 성립·근 무개당값). 파일 상단 `perUnitPrice` import 확인 후:
```ts
test('마리(count)는 수량>1이면 마리당값, 근(weight)은 개당값 없음', () => {
  expect(perUnitPrice(9000, { quantity: 3, measure: { kind: 'count', unit: '마리' } })).toEqual({ each: 3000 })
  expect(perUnitPrice(9000, { quantity: 1, measure: { kind: 'weight', unit: '근' } })).toBeNull()
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/parse-kamis.test.js tests/card.test.ts`
Expected: FAIL (parseUnit이 마리·근에 throw)

- [ ] **Step 3: MEASURES + 정규식** — `scripts/lib/parse-kamis.mjs`

```js
const MEASURES = {
  kg: { kind: 'weight', unit: 'kg' },
  g: { kind: 'weight', unit: 'g' },
  개: { kind: 'count', unit: '개' },
  포기: { kind: 'count', unit: '포기' },
  마리: { kind: 'count', unit: '마리' },
  근: { kind: 'weight', unit: '근' }, // 근≈600g이지만 환산 안 함 — KAMIS 표기 보존
}

export function parseUnit(s) {
  const m = /^(\d+)\s*(kg|g|개|포기|마리|근)$/.exec(String(s ?? '').trim())
  if (!m) throw new Error(`KAMIS 단위 표기를 모르겠습니다: ${JSON.stringify(s)}`)
  return { quantity: Number(m[1]), measure: { ...MEASURES[m[2]] } }
}
```

- [ ] **Step 4: Measure 유니온** — `src/types.ts`

```ts
export type Measure =
  | { kind: 'weight'; unit: 'kg' | 'g' | '근' }
  | { kind: 'count'; unit: '개' | '포기' | '마리' }
```

- [ ] **Step 5: 통과 + 게이트**

Run: `npx vitest run tests/parse-kamis.test.js tests/card.test.ts && npm test && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add scripts/lib/parse-kamis.mjs src/types.ts tests/parse-kamis.test.js tests/card.test.ts
git commit -m "feat(seafood): 단위 마리(count)·근(weight) 지원 — 환산 없이 표기 보존, 모르는 단위 throw 유지"
```

---

### Task 4: 가격 수집에 부류 600 추가

**Files:**
- Modify: `scripts/fetch-prices.mjs` (CATEGORY_CODES), `src/types.ts` (KamisRef.categoryCode)
- Test: `tests/fetch-prices.test.js`

**Interfaces:**
- Consumes: `buildSnapshot({certKey,certId,regday,fetchFn})`.
- Produces: `KamisRef.categoryCode`에 `'600'` 허용.

- [ ] **Step 1: 실패 테스트 작성** — `tests/fetch-prices.test.js`에 추가

부류 600까지 조회하는지 확인(기존 mock 패턴 재사용). 부류별 요청 카테고리를 수집해 단언:
```js
test('buildSnapshot은 부류 100·200·400·600을 모두 조회한다', async () => {
  const seen = []
  const fetchFn = async (url) => {
    seen.push(new URL(url).searchParams.get('p_item_category_code'))
    return { ok: true, json: async () => ({ data: ['001'] }) } // 빈 결과(그날 조사 없음)
  }
  await buildSnapshot({ certKey: 'K', certId: 'I', regday: '2026-07-20', fetchFn })
  expect(seen).toEqual(['100', '200', '400', '600'])
})
```
(`buildSnapshot` import가 없으면 파일 상단 import에 추가. `['001']`은 parseCategoryResponse가
빈 배열로 돌려 throw 없이 통과한다.)

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/fetch-prices.test.js`
Expected: FAIL (`seen`이 `['100','200','400']`)

- [ ] **Step 3: 구현** — `scripts/fetch-prices.mjs`

```js
// 식량작물(감자·고구마·옥수수), 채소류, 과일류, 수산물
const CATEGORY_CODES = ['100', '200', '400', '600']
```

`src/types.ts` `KamisRef`:
```ts
export interface KamisRef {
  /** 100 식량작물 | 200 채소류 | 400 과일류 | 600 수산물 */
  categoryCode: '100' | '200' | '400' | '600'
  itemName: string
  kindName?: string
}
```

- [ ] **Step 4: 통과 + 게이트**

Run: `npx vitest run tests/fetch-prices.test.js && npm test && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add scripts/fetch-prices.mjs src/types.ts tests/fetch-prices.test.js
git commit -m "feat(seafood): 가격 수집 부류 600 추가 + KamisRef.categoryCode 유니온 확장"
```

---

## ⛑ 프로브 게이트 (사용자 실행 — Task 5 전 필수)

Task 1~4가 커밋된 뒤, **사용자가 로컬(한국 IP)에서** 실측한다:

```bash
KAMIS_CERT_KEY=… KAMIS_CERT_ID=… npm run probe:seafood
```

출력에서 확인/결정:
1. **품목 목록** — 부류 600 일일 소매에 실제로 잡히는 `itemName`·`kindName`. → Task 5 프로필 대상 확정.
2. **단위 종류** — `단위 N종 → …`. **마리·근 외 표기(손·팩·봉 등)가 있으면**, Task 3 방식으로
   `MEASURES`·`parseUnit` 정규식·`Measure` 유니온에 그 단위를 추가하고(올바른 kind 판단: 셀 수 있으면
   count, 무게면 weight) 별도 커밋한다. 프로브 전엔 그 단위에 `parseUnit`이 throw하는 게 정상(안전장치).
3. 품목이 매우 적거나 단위가 제각각이면 범위를 그 실측에 맞춘다.

프로브 결과(품목·단위)를 컨트롤러에게 전달하면 Task 5로 진행한다.

---

### Task 5: 수산 프로필 작성 (프로브 확정 품목)

프로브가 밝힌 각 품목에 프로필 작성. 계절성은 수기 도메인 지식. **판단·큐레이션 성격**이라
컨트롤러가 프로브 출력으로 작성한다(영양 확장 때 refs 큐레이션과 동일).

**Files:**
- Modify: `public/data/produce.json` (수산 프로필 추가)
- Test: `tests/prices-snapshot.test.ts` 또는 관련 — 신규 프로필이 스키마·매칭에 어긋나지 않는지(있으면)

**절차:**

- [ ] **Step 1: 프로브 출력의 각 품목마다** 아래 템플릿으로 프로필 작성. `category:'seafood'`,
  `foodDb`·`recipeRef`는 **넣지 않는다**(이번 컷 비범위). 계절은 제철 도메인 지식으로(예: 굴 11~2월,
  전어 9~11월, 고등어 9~11월, 방어 12~2월, 오징어 6~9월, 주꾸미 3~5월). `whyNow`·`howTo*`는
  담백한 톤, 이커머스 화법 금지. 예(굴):

```json
{
  "id": "oyster",
  "name": "굴",
  "emoji": "🦪",
  "category": "seafood",
  "kamis": { "categoryCode": "600", "itemName": "굴", "kindName": "" },
  "seasonMonths": [11, 12, 1, 2],
  "peakMonths": [12, 1],
  "whyNow": {
    "12": "찬물에 살이 오른 굴이 가장 통통할 때예요",
    "1": "한겨울 굴이 향과 단맛의 절정이에요",
    "default": "물이 찰수록 굴이 여물어요"
  },
  "howToPick": "껍데기가 단단히 닫혀 있고 속살이 도톰하며 우윳빛이 도는 것.",
  "howToStore": "가장 차가운 칸에서 하루 이틀 안에. 씻은 굴은 소금물에 담가 냉장.",
  "howToUse": "생으로 초장에, 또는 국·전·굴밥으로. 오래 끓이면 질겨지니 마지막에 넣어요."
}
```

  `itemName`·`kindName`은 **프로브가 준 문자열 그대로**(KAMIS 정확일치). 가격이 안 붙으면
  kindName 불일치를 의심하고 프로브 출력의 `kindName`으로 맞춘다(무가격이어도 계절 카드는 유효).

- [ ] **Step 2: JSON 유효성 + 타입 게이트**

Run: `node -e "JSON.parse(require('fs').readFileSync('public/data/produce.json','utf8')); console.log('JSON ok')" && npx tsc --noEmit && npm test`
Expected: JSON ok · tsc clean · 테스트 green (모든 `category` 값이 유효, `categoryCode:'600'`)

- [ ] **Step 3: 브라우저 실측** — `npm run dev`

수산물 칩 토글 시 수산 카드만 남는지, 카드가 제대로 렌더되는지(영양·레시피 줄 없음 폴백),
가격 붙은 품목은 값어치/개당값(마리면 마리당) 표시가 맞는지 눈으로 확인. 사용자 사인오프.

- [ ] **Step 4: 커밋**

```bash
git add public/data/produce.json
git commit -m "feat(seafood): 수산 프로필 작성 (프로브 확정 품목, 가격·계절)"
```

---

### Task 6: 문서 갱신 (수집 정책 표면화)

**Files:**
- Modify: `docs/제품-동작-지도.md` (수집 정책·지렛대 지도에 부류 600·단위 정책·비범위 추가),
  `docs/아이디어-백로그.md` (`3-수산` 항목에 ✅ 완료 표시)

- [ ] **Step 1: `docs/제품-동작-지도.md` 수집 정책** — 부류 600 추가, 단위(마리 count·근 weight,
  환산 없음), 이번 컷 비범위(영양·레시피·다가오는-씨앗), 프로브로 확정한 품목·단위를 한 단락으로.

- [ ] **Step 2: `docs/아이디어-백로그.md`** — `### 3-수산. 수산물 확대` 제목에 `✅ 완료 (2026-07-20)`
  표시하고, 실제로 밝혀진 단위·품목 수를 한 줄 반전 노트로.

- [ ] **Step 3: 커밋**

```bash
git add docs/제품-동작-지도.md docs/아이디어-백로그.md
git commit -m "docs(seafood): 수집 정책에 부류 600·단위·비범위 표면화 + 백로그 완료 표시"
```

---

## Self-Review 체크

- **스펙 커버리지:** 프로브(T1)·단위(T3)·부류600(T4)·카테고리/필터(T2)·프로필(T5)·문서(T6) — 스펙의
  컴포넌트별 변경·비범위·검증 전부 태스크에 대응. ✅
- **타입 일관성:** `Category`·`Filter`에 `'seafood'`, `Measure`에 `'마리'|'근'`, `KamisRef.categoryCode`에
  `'600'` — 태스크 간 이름·리터럴 일치. `perUnitPrice`는 불변(마리 count 자동 처리). ✅
- **플레이스홀더:** 프로브 결과에 의존하는 T5의 품목 목록은 **의도된 게이트**(스펙에 명시)이며 완전한
  템플릿·절차·예시를 제공. 단위 후보(마리·근)는 T3에서 구체 코드로 확정하고 프로브 게이트에서 보강. ✅
