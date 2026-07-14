# 가격 도메인 모델링 (A단계) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** KAMIS 가격 데이터의 도메인 개념(조사일·관측·기준선·단위)을 타입으로 표현해, dpr 컬럼 오독 같은 조용한 오염이 애초에 컴파일되지 않게 만든다.

**Architecture:** `CONTEXT.md`에 정의한 네 개념을 그대로 타입에 옮긴다. ① **조사일**을 `PriceSnapshot.surveyedOn`(필수)으로 올려 스냅샷 하나가 하루를 뜻하게 하고, 신선도를 조사일로 잰다. ② **관측**(`price`)은 조사일에 실제로 조사된 값만 담고 다른 날 값으로 메우지 않는다 — 날짜 없는 비교값은 **기준선**(`baseline`)이라는 다른 칸으로 분리한다. ③ **단위**를 `{quantity, measure}` 구조체로 만들고 KAMIS 표기 파싱을 어댑터(`parse-kamis.mjs`)에 가둔다. 화면 출력은 바뀌지 않는다.

**Tech Stack:** TypeScript, React 19, TanStack Start, Vitest, node ≥ 22 (스크립트는 `.mjs` 순수 JS)

## Global Constraints

- **완료 게이트는 `npm test` **와** `npx tsc --noEmit` 둘 다.** Vitest는 타입체크를 하지 않는다.
- **KAMIS 키(`KAMIS_CERT_KEY`/`KAMIS_CERT_ID`)는 코드·저장소·픽스처에 절대 넣지 않는다.** 재수집 스텝은 셸 환경변수로만 키를 넘긴다.
- 사용자 문구는 한국어, 담백한 톤. 이커머스 화법 금지.
- 순수 로직은 `picks`/`card`/`app`에, 표시는 `components`에. 컴포넌트는 비즈니스 로직을 갖지 않는다.
- **이 플랜은 화면을 바꾸지 않는다.** `PriceBlock.tsx`의 마크업·문구는 손대지 않는다. 단위를 화면에 찍는 일(“100g에 315원”)은 별도 B단계 — 시안·사인오프가 먼저다.
- 순수 로직 테스트는 `tests/`에서 `'../src/…'`로 임포트한다. `src/*.test.ts`를 만들지 않는다.
- 테스트 픽스처도 유효한 타입값을 쓴다 (`KamisRef.categoryCode`는 `'100' | '200' | '400'`).

## 왜 데이터 파일을 매 태스크마다 다시 받는가

`src/routes/index.tsx`가 `public/data/prices.json`을 **`as unknown as PriceSnapshot`으로 캐스팅해서** 임포트한다. 즉 타입을 바꿔도 tsc는 커밋된 데이터 파일이 새 shape인지 **검사하지 못한다.** 그래서:

1. shape이 바뀌는 태스크마다 `npm run fetch:prices`로 `prices.json`을 다시 받아 커밋한다.
2. 커밋된 `prices.json`을 현재 타입에 대고 검증하는 테스트(`tests/prices-snapshot.test.ts`)를 Task 1에서 만들고, 태스크마다 단언을 늘린다. 이게 게이트를 실제 데이터까지 확장한다.

재수집에는 KAMIS 키가 필요하다. 셸에서 인라인 환경변수로만 넘긴다:

```bash
KAMIS_CERT_KEY=<키> KAMIS_CERT_ID=<아이디> npm run fetch:prices
```

키를 파일에 쓰거나 커밋하지 않는다.

## File Structure

| 파일 | 책임 | 이 플랜에서 |
| --- | --- | --- |
| `src/types.ts` | 도메인 타입 한 곳 | `PriceSnapshot.surveyedOn` 필수화, `Baseline`·`Unit`·`Measure` 신설, `PriceEntry` 재구성 |
| `scripts/lib/parse-kamis.mjs` | **KAMIS 어댑터** — 응답 형태를 아는 유일한 곳 | dpr2 폴백 제거, `baseline` 생성, `parseUnit` 신설(모르는 표기는 throw) |
| `scripts/fetch-prices.mjs` | 수집·조사일 탐색·원자적 쓰기 | `buildSnapshot`이 `surveyedOn`을 직접 채운다, `schemaVersion` 2 |
| `scripts/report-coverage.mjs` | 매칭 커버리지 리포트 | `priceDate` → `surveyedOn` |
| `src/data.ts` | 로딩 + 신선도 | `snapshotAgeDays`를 조사일 기준으로 |
| `src/picks.ts` | 선정·매칭 (무엇을 고르나) | `PriceView`가 `baseline`·`Unit` 어휘를 그대로 쓴다 |
| `src/card.ts` | 표시 투영 (어떻게 보이나) | `perUnitPrice`가 `Unit`을 받는다 — KAMIS 정규식이 뷰 레이어를 떠난다 |
| `tests/prices-snapshot.test.ts` | **신규** — 커밋된 `prices.json`이 현재 타입과 맞는지 | Task 1에서 생성, 태스크마다 단언 추가 |
| `public/data/prices.json` | CI가 매일 커밋하는 스냅샷 | 태스크마다 재수집 |
| `src/components/PriceBlock.tsx` | 가격 마크업 | **손대지 않는다** (B단계) |

---

### Task 1: 조사일 — 스냅샷 하나가 하루를 뜻하게 한다

스냅샷에 `surveyedOn`(조사일)을 **필수 필드**로 올리고, 신선도를 `fetchedAt`이 아니라 조사일로 잰다.

지금은 `snapshotAgeDays`가 `fetchedAt`(스크립트가 돈 시각)으로 나이를 잰다. cron이 매일 도니까 **`staleDays`는 항상 0**이고, `App.tsx`의 “가격은 N일 전 기준이에요” 경고는 한 번도 뜨지 않는다. 그 사이 `buildLatestSnapshot`은 최대 7일 전 가격까지 거슬러 올라가 가져올 수 있다 — 즉 **일주일 묵은 가격을 오늘 가격인 양 보여줄 수 있다.** 이 태스크가 그 구멍을 막는다.

**Files:**
- Modify: `src/types.ts:50-57` (`PriceSnapshot`)
- Modify: `src/data.ts:23-26` (`snapshotAgeDays`)
- Modify: `scripts/fetch-prices.mjs:34-75` (`buildSnapshot`, `buildLatestSnapshot`)
- Modify: `scripts/report-coverage.mjs:7`, `:40`
- Create: `tests/prices-snapshot.test.ts`
- Modify: `tests/data.test.ts:5-23`
- Modify: `tests/fetch-prices.test.js:50`, `:92`, `:105`
- Modify: `tests/picks.test.ts:36-40` (`snap` 헬퍼)
- Modify: `tests/app.test.ts:18-25` (`snap` 헬퍼)
- Regenerate: `public/data/prices.json`

**Interfaces:**
- Produces: `PriceSnapshot { schemaVersion: number; fetchedAt: string; surveyedOn: string; entries: PriceEntry[] }` — `surveyedOn`은 `'YYYY-MM-DD'`. Task 2·3이 같은 스냅샷 위에 `PriceEntry`를 바꾼다.
- Produces: `snapshotAgeDays(snapshot: PriceSnapshot, now: Date): number` — 시그니처 그대로, 계산 근거만 조사일로 바뀐다.
- Produces: `buildSnapshot({certKey, certId, regday, fetchFn})` → `surveyedOn: regday`가 채워진 스냅샷. `buildLatestSnapshot`은 더 이상 필드를 덧붙이지 않고 그대로 반환한다.

---

- [ ] **Step 1: 실패하는 테스트를 쓴다 — 신선도는 조사일로 잰다**

`tests/data.test.ts`의 상단 픽스처와 `snapshotAgeDays` describe 블록을 통째로 아래로 교체한다.

```ts
import { afterEach, describe, expect, test, vi } from 'vitest'
import { loadProfiles, loadSnapshot, snapshotAgeDays } from '../src/data'
import type { PriceSnapshot, ProduceProfile } from '../src/types'

const snap: PriceSnapshot = {
  schemaVersion: 2,
  // 수집은 7/10에 돌았지만 실제 조사일은 7/7 — 공표 전·휴장일이면 이렇게 벌어진다
  fetchedAt: '2026-07-10T08:00:00Z',
  surveyedOn: '2026-07-07',
  entries: [],
}

afterEach(() => vi.unstubAllGlobals())

describe('snapshotAgeDays', () => {
  test('조사일로 잰다 — 수집시각이 아니다', () => {
    // 조사일 7/7 KST 자정 기준, 7/10 09:00 KST = 만 3일
    expect(snapshotAgeDays(snap, new Date('2026-07-10T00:00:00Z'))).toBe(3)
  })

  test('조사 당일이면 0', () => {
    expect(snapshotAgeDays(snap, new Date('2026-07-07T11:00:00Z'))).toBe(0)
  })

  test('now가 조사일보다 이르면 음수 대신 0', () => {
    expect(snapshotAgeDays(snap, new Date('2026-07-05T00:00:00Z'))).toBe(0)
  })

  test('fetchedAt이 오늘이어도 조사일이 오래됐으면 오래된 것이다', () => {
    // cron이 매일 도니까 fetchedAt으로 재면 늘 0이 된다 — 그 구멍을 막는 테스트
    const daily: PriceSnapshot = { ...snap, fetchedAt: '2026-07-13T08:00:00Z' }
    expect(snapshotAgeDays(daily, new Date('2026-07-13T08:00:00Z'))).toBe(6)
  })
})
```

`loadSnapshot`/`loadProfiles` describe 블록은 그대로 둔다 (같은 `snap` 상수를 쓴다).

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run tests/data.test.ts`
Expected: FAIL — `surveyedOn`이 `PriceSnapshot`에 없다는 타입 오류는 vitest가 안 잡지만, `'조사일로 잰다'`가 `2`(fetchedAt 기준)를 받아 `3`과 다르다며 실패한다.

- [ ] **Step 3: 타입에 조사일을 필수로 올린다**

`src/types.ts`의 `PriceSnapshot`을 교체:

```ts
export interface PriceSnapshot {
  schemaVersion: number
  /** 스크립트가 KAMIS를 호출한 시각 (ISO 8601). 신선도 판단엔 쓰지 않는다 — 조사일을 쓴다 */
  fetchedAt: string
  /** 이 스냅샷 전체의 조사일 (YYYY-MM-DD). 엔트리마다 다르지 않다.
   *  당일 가격은 오후에 공표되고 일요일·공휴일엔 조사가 없어 fetchedAt보다 며칠 앞설 수 있다 */
  surveyedOn: string
  entries: PriceEntry[]
}
```

- [ ] **Step 4: 신선도를 조사일로 잰다**

`src/data.ts:23-26`을 교체:

```ts
/** 가격의 신선도 — 조사일 KST 자정을 기준으로 잰다.
 *  fetchedAt으로 재면 cron이 매일 도는 한 항상 0이라, 일주일 묵은 가격도 오늘 것처럼 보인다. */
export function snapshotAgeDays(snapshot: PriceSnapshot, now: Date): number {
  const surveyedAt = new Date(`${snapshot.surveyedOn}T00:00:00+09:00`)
  const ms = now.getTime() - surveyedAt.getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
}
```

- [ ] **Step 5: 테스트가 통과하는지 확인한다**

Run: `npx vitest run tests/data.test.ts`
Expected: PASS (4개 신선도 테스트 + 기존 load 테스트)

- [ ] **Step 6: 수집 스크립트가 조사일을 직접 채우게 한다**

`scripts/fetch-prices.mjs`에서 스키마 버전 상수를 추가하고 `buildSnapshot`이 `surveyedOn`을 채우게 바꾼다. `MIN_PRICED_RATIO` 선언 바로 위에 추가:

```js
/** 스냅샷 shape 버전. 2 = 조사일(surveyedOn)·관측/기준선 분리·구조화된 단위 */
const SCHEMA_VERSION = 2
```

`buildSnapshot`의 `return`(현재 `:51`)을 교체:

```js
  return {
    schemaVersion: SCHEMA_VERSION,
    fetchedAt: new Date().toISOString(),
    surveyedOn: regday,
    entries,
  }
```

`buildLatestSnapshot`의 성공 반환(현재 `:71`)을 교체 — 더 이상 필드를 덧붙이지 않는다:

```js
    if (pricedRatio(snapshot.entries) >= MIN_PRICED_RATIO) return snapshot
```

메인 블록의 로그(현재 `:100-102`)에서 `snapshot.priceDate` → `snapshot.surveyedOn`:

```js
    console.log(
      `prices.json 갱신: ${priced}/${snapshot.entries.length}개 항목에 가격 (조사일 ${snapshot.surveyedOn})`,
    )
```

- [ ] **Step 7: 커버리지 리포트가 조사일을 읽게 한다**

`scripts/report-coverage.mjs:7`:

```js
const month = Number(snapshot.surveyedOn.slice(5, 7))
```

`scripts/report-coverage.mjs:39-41`:

```js
console.log(
  `스냅샷: 조사일 ${snapshot.surveyedOn} — ${priced}/${snapshot.entries.length}개 항목에 가격`,
)
```

- [ ] **Step 8: 수집 스크립트 테스트를 새 필드명으로 고친다**

`tests/fetch-prices.test.js`에서 세 곳을 바꾼다.

`buildSnapshot` 첫 테스트(현재 `:50-52`)의 단언을 교체:

```js
    expect(snap.schemaVersion).toBe(2)
    expect(snap.surveyedOn).toBe('2026-07-13')
    expect(snap.entries).toHaveLength(12) // 픽스처 4행 × 3부류
    expect(new Date(snap.fetchedAt).getTime()).not.toBeNaN()
```

`buildLatestSnapshot`의 `:92`:

```js
    expect(snap.surveyedOn).toBe('2026-07-13')
```

`buildLatestSnapshot`의 `:105`:

```js
    expect(snap.surveyedOn).toBe('2026-07-12')
```

- [ ] **Step 9: 순수 로직 테스트의 스냅샷 픽스처에 조사일을 넣는다**

`tests/picks.test.ts:36-40`의 `snap` 헬퍼:

```ts
const snap = (entries: PriceEntry[]): PriceSnapshot => ({
  schemaVersion: 2,
  fetchedAt: '2026-07-10T00:00:00Z',
  surveyedOn: '2026-07-10',
  entries,
})
```

`tests/app.test.ts:18-25`의 `snap` 헬퍼 — 조사일 7/8, 화면 기준일 7/10이라 `staleDays`는 2로 유지된다:

```ts
const snap = (over: Partial<PriceEntry> = {}): PriceSnapshot => ({
  schemaVersion: 2,
  fetchedAt: '2026-07-08T00:00:00Z',
  surveyedOn: '2026-07-08',
  entries: [{
    itemCode: '413', itemName: '복숭아', kindName: '백도(10개)', rank: '상품', unit: '10개',
    price: 18200, priceMonthAgo: 24500, priceYearAgo: 19800, ...over,
  }],
})
```

- [ ] **Step 10: 커밋된 스냅샷을 타입에 대고 검증하는 테스트를 만든다**

`src/routes/index.tsx`가 `prices.json`을 `as unknown as PriceSnapshot`으로 캐스팅해 읽기 때문에, tsc는 데이터 파일이 새 shape인지 못 잡는다. 게이트를 데이터까지 넓힌다.

Create `tests/prices-snapshot.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import type { PriceSnapshot } from '../src/types'

// 라우트 로더가 이 파일을 `as unknown as PriceSnapshot`으로 캐스팅해 임포트한다.
// 즉 tsc는 shape 불일치를 못 잡는다 — 그래서 여기서 실제 파일을 타입에 대고 확인한다.
const snapshot: PriceSnapshot = JSON.parse(
  readFileSync(new URL('../public/data/prices.json', import.meta.url), 'utf-8'),
)

describe('커밋된 prices.json', () => {
  test('스키마 버전 2다', () => {
    expect(snapshot.schemaVersion).toBe(2)
  })

  test('조사일이 있고 YYYY-MM-DD 꼴이다', () => {
    expect(snapshot.surveyedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('엔트리가 있고, 과반이 가격을 갖는다 (all-null 스냅샷을 커밋하지 않는다)', () => {
    expect(snapshot.entries.length).toBeGreaterThan(0)
    const priced = snapshot.entries.filter((e) => e.price !== null).length
    expect(priced / snapshot.entries.length).toBeGreaterThan(0.5)
  })
})
```

- [ ] **Step 11: 스냅샷을 다시 받는다 (새 shape으로)**

키는 셸 환경변수로만 넘긴다. 파일에 쓰거나 커밋하지 않는다.

Run:
```bash
KAMIS_CERT_KEY=<키> KAMIS_CERT_ID=<아이디> npm run fetch:prices
```
Expected: `prices.json 갱신: NN/NN개 항목에 가격 (조사일 YYYY-MM-DD)`

확인: `public/data/prices.json`의 첫 줄들에 `"schemaVersion": 2`와 `"surveyedOn"`이 보인다.

- [ ] **Step 12: 게이트를 통과시킨다**

Run: `npm test && npx tsc --noEmit`
Expected: 둘 다 PASS. (`tsc`가 남은 `priceDate` 참조를 잡아준다.)

Run: `npm run report:coverage`
Expected: `broken` 0개, exit 0.

- [ ] **Step 13: 브라우저로 실측한다 — staleDays가 이제 실제로 뜬다**

`staleDays`가 늘 0이던 게 조사일 기준으로 바뀌었다. 오늘 조사일이면 여전히 경고가 없어야 하고, 조사일이 며칠 밀린 스냅샷이면 “가격은 N일 전 기준이에요”가 떠야 한다.

Run: `npm run dev`

1. `/`를 연다 → 카드가 예전과 똑같이 렌더된다 (가격·등락 칩·스파크라인·개당값).
2. `public/data/prices.json`의 `surveyedOn`을 임시로 4일 전 날짜로 바꿔 저장한다 → 상단에 “가격은 4일 전 기준이에요”가 뜬다.
3. **변경을 되돌린다** (`git checkout -- public/data/prices.json` 후 Step 11을 다시 돌리지 말고, 편집 전 값으로 복원).

- [ ] **Step 14: 커밋**

```bash
git add src/types.ts src/data.ts scripts/fetch-prices.mjs scripts/report-coverage.mjs \
  tests/data.test.ts tests/fetch-prices.test.js tests/picks.test.ts tests/app.test.ts \
  tests/prices-snapshot.test.ts public/data/prices.json CONTEXT.md
git commit -m "feat: 조사일(surveyedOn)을 스냅샷 필수 필드로 — 신선도를 수집시각이 아니라 조사일로 잰다"
```

---

### Task 2: 관측과 기준선을 다른 칸에 둔다

`price`(관측)는 **조사일에 실제로 조사된 값**만 담는다. 당일 조사가 없으면 정직하게 `null`이고, KAMIS의 “1일전” 칸으로 메우지 않는다 — 메우면 스냅샷의 `surveyedOn`과 실제 가격의 날짜가 어긋난다. 날짜가 없는 비교값(1개월전·1년전)은 **기준선**(`baseline`)이라는 다른 칸으로 뺀다. KAMIS가 이 값들엔 날짜를 안 주고 라벨만 준다 — 그래서 관측이 아니다.

이 분리가 dpr3/dpr5 오독 버그를 **타입 차원에서** 없앤다. 관측과 기준선이 같은 모양의 `number | null` 셋으로 나란히 있으니 컬럼을 바꿔 꽂아도 아무도 몰랐던 것이다.

폴백 제거는 안전하다: `buildLatestSnapshot`이 이미 값이 찬 조사일까지 거슬러 올라가고, 현재 스냅샷에서 dpr2 폴백으로 채워진 행은 **0개**다.

**Files:**
- Modify: `src/types.ts` (`PriceEntry`, `Baseline` 신설)
- Modify: `scripts/lib/parse-kamis.mjs:26-35`
- Modify: `src/picks.ts:3-10` (`PriceView`), `:32-45` (`priceView`)
- Modify: `src/card.ts:85-104` (`toSpark`, `toPriceCardView`)
- Modify: `tests/parse-kamis.test.js:23-103`
- Modify: `tests/picks.test.ts:22-34` (`entry`), `:89-106`, `:128-192`, `:196`
- Modify: `tests/card.test.ts:22-29` (`priceView` 헬퍼), `:102-111`
- Modify: `tests/app.test.ts:18-25` (`snap`), `:51`
- Modify: `src/components/App.test.tsx:19`
- Modify: `tests/prices-snapshot.test.ts` (단언 추가)
- Regenerate: `public/data/prices.json`

**Interfaces:**
- Consumes: Task 1의 `PriceSnapshot.surveyedOn`.
- Produces: `Baseline { monthAgo: number | null; yearAgo: number | null }`
- Produces: `PriceEntry { itemCode, itemName, kindName, rank, unit: string, price: number | null, baseline: Baseline }` — `priceMonthAgo`/`priceYearAgo` 평면 필드는 사라진다. (`unit`은 Task 3에서 `Unit`이 된다.)
- Produces: `PriceView { price: number; unit: string; changeVsMonthAgoPct: number | null; baseline: Baseline }`
- `PriceCardView`는 **바뀌지 않는다** (`now`/`wasMonthAgo`/`perUnit`/`change`/`spark`) — 화면이 안 바뀐다는 뜻이다.

---

- [ ] **Step 1: 실패하는 테스트를 쓴다 — 어댑터가 폴백하지 않고 기준선을 분리한다**

`tests/parse-kamis.test.js`의 `describe('parseCategoryResponse', …)` 블록 전체를 아래로 교체한다.

```js
// 픽스처는 실제 KAMIS 응답 캡처 (2026-07-13, 부류 200).
// 컬럼 의미: dpr1=당일 dpr2=1일전 dpr3=1주일전 dpr4=2주일전 dpr5=1개월전 dpr6=1년전 dpr7=일평년
describe('parseCategoryResponse', () => {
  const entries = parseCategoryResponse(load('kamis-daily-200.json'))

  test('모든 행을 PriceEntry로 변환한다 — 관측과 기준선은 다른 칸이다', () => {
    expect(entries).toHaveLength(4)
    expect(entries[0]).toEqual({
      itemCode: '211',
      itemName: '배추',
      kindName: '봄(1포기)',
      rank: '상품',
      unit: '1포기',
      price: 3513, // dpr1 (당일 = 조사일의 관측)
      baseline: {
        monthAgo: 3692, // dpr5 — dpr3(1주일전)이 아니다
        yearAgo: 4642, // dpr6 — dpr4(2주일전)이 아니다
      },
    })
  })

  test('기준선은 dpr5·dpr6에서 읽는다 (1·2주일전 컬럼과 혼동 금지)', () => {
    const cabbage = entries[0]
    // 같은 행의 1주일전(3,608)·2주일전(3,818)을 잘못 집으면 실패한다
    expect(cabbage.baseline.monthAgo).not.toBe(3608)
    expect(cabbage.baseline.yearAgo).not.toBe(3818)
  })

  test('당일(dpr1)이 결측이면 1일전으로 메우지 않고 null이다', () => {
    // 스냅샷은 조사일 하나를 뜻한다. 다른 날 값으로 메우면 그 약속이 깨진다.
    const entries = parseCategoryResponse({
      data: {
        error_code: '000',
        item: { item_name: '오이', dpr1: '-', dpr2: '8,420', dpr5: '10,120', dpr6: '9,050' },
      },
    })
    expect(entries[0].price).toBeNull()
  })

  test('관측이 결측이어도 기준선은 남는다', () => {
    // 당근: 당일 조사가 없는 행. 그래도 1년전 값은 KAMIS가 준다.
    const carrot = entries.find((e) => e.itemName === '당근')
    expect(carrot.price).toBeNull()
    expect(carrot.baseline.monthAgo).toBeNull() // dpr5 결측
    expect(carrot.baseline.yearAgo).toBe(2952) // dpr6은 있다
  })

  test('오류 응답이면 throw한다', () => {
    expect(() => parseCategoryResponse(load('kamis-error.json'))).toThrow(/KAMIS/)
  })

  test('error_code가 000이 아니면 throw한다', () => {
    expect(() => parseCategoryResponse({ data: { error_code: '999', item: [] } })).toThrow(
      /KAMIS error_code=999/,
    )
  })

  test('data.item이 단일 객체여도 엔트리 1개로 변환한다', () => {
    const entries = parseCategoryResponse({
      data: {
        error_code: '000',
        item: {
          item_name: '오이',
          item_code: '223',
          kind_name: '가시계통(10개)',
          rank: '상품',
          unit: '10개',
          dpr1: '8,540',
          dpr2: '8,420',
          dpr3: '9,000',
          dpr4: '9,010',
          dpr5: '10,120',
          dpr6: '9,050',
        },
      },
    })
    expect(entries).toEqual([
      {
        itemCode: '223',
        itemName: '오이',
        kindName: '가시계통(10개)',
        rank: '상품',
        unit: '10개',
        price: 8540,
        baseline: { monthAgo: 10120, yearAgo: 9050 },
      },
    ])
  })
})
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run tests/parse-kamis.test.js`
Expected: FAIL — 어댑터가 아직 평면 `priceMonthAgo`를 내놓고, dpr2로 폴백한다.

- [ ] **Step 3: 어댑터를 고친다**

`scripts/lib/parse-kamis.mjs`의 `parseCategoryResponse` docstring과 `map` 본문을 교체:

```js
/** KAMIS dailyPriceByCategoryList 응답 → PriceEntry[] (오류 응답이면 throw)
 *
 *  dpr 컬럼은 순서가 아니라 의미로 골라야 한다 (응답의 day1~day7이 라벨을 준다):
 *    dpr1=당일  dpr2=1일전  dpr3=1주일전  dpr4=2주일전  dpr5=1개월전  dpr6=1년전  dpr7=일평년
 *  1개월전을 dpr3에서 읽으면 조용히 1주일전 값이 들어온다 (실제로 그랬다).
 *
 *  price(관측)는 조사일(dpr1)의 값만 담는다 — dpr2로 메우지 않는다. 메우면 스냅샷의
 *  surveyedOn과 실제 가격의 날짜가 어긋난다. 조사일 찾기는 buildLatestSnapshot이 한다.
 *  baseline(기준선)은 KAMIS가 날짜를 주지 않고 라벨만 주는 비교값이라 관측과 칸을 나눈다.
 */
export function parseCategoryResponse(json) {
  const data = json?.data
  if (!data || Array.isArray(data)) {
    // KAMIS는 인증 실패 등 오류 시 data가 ["200"] 같은 코드 배열로 온다
    throw new Error(`KAMIS 오류 응답: ${JSON.stringify(data ?? json)}`)
  }
  if (data.error_code && data.error_code !== '000') {
    throw new Error(`KAMIS error_code=${data.error_code}`)
  }
  const items = Array.isArray(data.item) ? data.item : [data.item].filter(Boolean)
  return items.map((it) => ({
    itemCode: String(it.item_code ?? ''),
    itemName: String(it.item_name ?? '').trim(),
    kindName: String(it.kind_name ?? '').trim(),
    rank: String(it.rank ?? '').trim(),
    unit: String(it.unit ?? '').trim(),
    price: parseNum(it.dpr1),
    baseline: {
      monthAgo: parseNum(it.dpr5),
      yearAgo: parseNum(it.dpr6),
    },
  }))
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `npx vitest run tests/parse-kamis.test.js`
Expected: PASS

- [ ] **Step 5: 타입에 기준선을 만든다**

`src/types.ts`의 `PriceEntry`(현재 `:38-48`)를 교체:

```ts
/** 비교용 과거 가격. KAMIS가 **날짜를 주지 않고 라벨만 준다** — 그래서 관측이 아니다.
 *  관측과 같은 칸·같은 타입에 두면 컬럼을 바꿔 꽂아도 아무도 모른다 (실제로 그랬다). */
export interface Baseline {
  monthAgo: number | null
  yearAgo: number | null
}

export interface PriceEntry {
  itemCode: string
  itemName: string
  kindName: string
  rank: string
  unit: string
  /** 조사일(`PriceSnapshot.surveyedOn`)에 실제로 조사된 소매가.
   *  그날 그 품목 조사가 없으면 null — 다른 날 값으로 메우지 않는다. */
  price: number | null
  baseline: Baseline
}
```

- [ ] **Step 6: 실패하는 테스트를 쓴다 — picks가 기준선 어휘를 그대로 쓴다**

`tests/picks.test.ts:22-34`의 `entry` 헬퍼를 교체:

```ts
function entry(over: Partial<PriceEntry> = {}): PriceEntry {
  return {
    itemCode: '0',
    itemName: '품목',
    kindName: '기본',
    rank: '상품',
    unit: '1kg',
    price: 1000,
    baseline: { monthAgo: 1000, yearAgo: 1000 },
    ...over,
  }
}
```

`describe('priceView 절댓값 통과', …)`(현재 `:89-106`)를 교체:

```ts
describe('priceView 기준선 통과', () => {
  test('기준선을 그대로 싣는다', () => {
    const v = priceView(entry({ price: 12600, baseline: { monthAgo: 16900, yearAgo: 13400 } }))
    expect(v).toEqual({
      price: 12600,
      unit: '1kg',
      changeVsMonthAgoPct: expect.closeTo(-25.44, 1),
      baseline: { monthAgo: 16900, yearAgo: 13400 },
    })
  })
  test('결측은 null로 통과', () => {
    const v = priceView(entry({ price: 1000, baseline: { monthAgo: null, yearAgo: null } }))
    expect(v?.baseline).toEqual({ monthAgo: null, yearAgo: null })
    expect(v?.changeVsMonthAgoPct).toBeNull()
  })
})
```

`selectPicks` describe 안의 `entry({... priceMonthAgo: X })` 호출을 전부 `baseline`으로 바꾼다 (현재 `:128-129`, `:141-142`, `:153`, `:166-167`, `:189`):

```ts
      entry({ itemName: 'A', price: 500, baseline: { monthAgo: 1000, yearAgo: 1000 } }), // 50% 하락
      entry({ itemName: 'B', price: 1200, baseline: { monthAgo: 1000, yearAgo: 1000 } }), // 20% 상승
```
```ts
      entry({ itemName: 'A', price: 950, baseline: { monthAgo: 1000, yearAgo: 1000 } }),
      entry({ itemName: 'B', price: 600, baseline: { monthAgo: 1000, yearAgo: 1000 } }),
```
```ts
    const entries = [entry({ itemName: 'A', price: 900, baseline: { monthAgo: 1000, yearAgo: 1000 } })]
```
```ts
      entry({ itemName: 'A', price: 1100, baseline: { monthAgo: 1000, yearAgo: 1000 } }), // 상승이라도 그룹 0
      entry({ itemName: 'B', price: 800, baseline: { monthAgo: null, yearAgo: null } }),
```
```ts
    const entries = [entry({ itemName: 'A', price: 880, baseline: { monthAgo: 1000, yearAgo: 1000 } })]
```

`hasDrops` describe의 `mk`(현재 `:196`)를 교체:

```ts
  const mk = (pct: number | null) => ({
    profile: profile({}),
    inPeak: false,
    price: { price: 1, unit: '1kg', changeVsMonthAgoPct: pct, baseline: { monthAgo: 1, yearAgo: 1 } },
  })
```

- [ ] **Step 7: 실패를 확인한다**

Run: `npx vitest run tests/picks.test.ts`
Expected: FAIL — `priceView`가 아직 평면 `priceMonthAgo`/`priceYearAgo`를 내놓는다.

- [ ] **Step 8: picks를 기준선 어휘로 바꾼다**

`src/picks.ts:1-10`을 교체:

```ts
import type { Baseline, PriceEntry, PriceSnapshot, ProduceProfile } from './types'

export interface PriceView {
  price: number
  unit: string
  /** 1개월 전 대비 % (음수 = 하락). 기준선이 없으면 null */
  changeVsMonthAgoPct: number | null
  baseline: Baseline
}
```

`src/picks.ts:32-45`의 `priceView`를 교체:

```ts
export function priceView(entry: PriceEntry): PriceView | null {
  if (entry.price === null) return null
  const { monthAgo } = entry.baseline
  const change = monthAgo !== null ? ((entry.price - monthAgo) / monthAgo) * 100 : null
  return {
    price: entry.price,
    unit: entry.unit,
    changeVsMonthAgoPct: change,
    baseline: entry.baseline,
  }
}
```

- [ ] **Step 9: 실패하는 테스트를 쓴다 — card가 기준선에서 읽는다**

`tests/card.test.ts:22-29`의 `priceView` 헬퍼를 교체:

```ts
const priceView = (over: Partial<PriceView> = {}): PriceView => ({
  price: 12600,
  unit: '10개',
  changeVsMonthAgoPct: -25.4,
  baseline: { monthAgo: 16900, yearAgo: 13400 },
  ...over,
})
```

`:102-111`의 두 테스트를 교체:

```ts
  test('지난달 없으면 change null · spark null', () => {
    const c = toCardView(
      pick({ price: priceView({ changeVsMonthAgoPct: null, baseline: { monthAgo: null, yearAgo: 13400 } }) }),
      7,
    )
    expect(c.price?.change).toBeNull()
    expect(c.price?.spark).toBeNull()
  })

  test('작년 없으면 spark null', () => {
    const c = toCardView(pick({ price: priceView({ baseline: { monthAgo: 16900, yearAgo: null } }) }), 7)
    expect(c.price?.spark).toBeNull()
  })
```

- [ ] **Step 10: card를 기준선에서 읽게 한다**

`src/card.ts:85-104`의 `toSpark`·`toPriceCardView`를 교체:

```ts
function toSpark(v: PriceView): SparkView | null {
  const { monthAgo, yearAgo } = v.baseline
  if (monthAgo === null || yearAgo === null) return null
  return {
    points: sparklineGeometry({ yearAgo, monthAgo, now: v.price }),
    yearAgo,
    monthAgo,
    now: v.price,
  }
}

function toPriceCardView(v: PriceView): PriceCardView {
  const per = perUnitPrice(v.price, v.unit)
  return {
    now: v.price,
    wasMonthAgo: v.baseline.monthAgo,
    perUnit: per ? per.each : null,
    change: toChange(v.changeVsMonthAgoPct),
    spark: toSpark(v),
  }
}
```

- [ ] **Step 11: 남은 픽스처를 고친다**

`tests/app.test.ts:18-25`의 `snap`:

```ts
const snap = (over: Partial<PriceEntry> = {}): PriceSnapshot => ({
  schemaVersion: 2,
  fetchedAt: '2026-07-08T00:00:00Z',
  surveyedOn: '2026-07-08',
  entries: [{
    itemCode: '413', itemName: '복숭아', kindName: '백도(10개)', rank: '상품', unit: '10개',
    price: 18200, baseline: { monthAgo: 24500, yearAgo: 19800 }, ...over,
  }],
})
```

`tests/app.test.ts:50-53`의 '상승만이면 noDrop true' 테스트:

```ts
  test('상승만이면 noDrop true', () => {
    const v = buildAppView([peach], snap({ price: 18200, baseline: { monthAgo: 16000, yearAgo: 19800 } }), null, null, JULY)
    expect(v.noDrop).toBe(true)
  })
```

`src/components/App.test.tsx:19`:

```tsx
const pick: PickResult = {
  profile, inPeak: true,
  price: { price: 18200, unit: '10개', changeVsMonthAgoPct: -25.7, baseline: { monthAgo: 24500, yearAgo: 19800 } },
}
```

- [ ] **Step 12: 커밋된 스냅샷 검증에 기준선 단언을 추가한다**

`tests/prices-snapshot.test.ts`의 `describe` 블록 끝에 추가:

```ts
  test('모든 엔트리가 기준선 칸을 갖는다 (평면 priceMonthAgo가 아니다)', () => {
    for (const e of snapshot.entries) {
      expect(e.baseline).toBeDefined()
      expect(e).not.toHaveProperty('priceMonthAgo')
      expect(e).not.toHaveProperty('priceYearAgo')
    }
  })
```

- [ ] **Step 13: 스냅샷을 다시 받는다**

Run:
```bash
KAMIS_CERT_KEY=<키> KAMIS_CERT_ID=<아이디> npm run fetch:prices
```
Expected: `prices.json 갱신: NN/NN개 항목에 가격 (조사일 YYYY-MM-DD)` — dpr2 폴백을 없앴으니 가격 있는 항목 수가 줄 **수도** 있다. 과반(50%) 아래로 떨어지면 스크립트가 알아서 전날로 물러난다.

- [ ] **Step 14: 게이트를 통과시킨다**

Run: `npm test && npx tsc --noEmit`
Expected: 둘 다 PASS

Run: `npm run report:coverage`
Expected: `broken` 0개, exit 0. (폴백 제거로 매칭이 깨진 품목이 있으면 여기서 잡힌다.)

- [ ] **Step 15: 브라우저로 실측한다**

Run: `npm run dev` → `/`를 연다.
Expected: 카드 렌더가 이전과 동일하다 — 취소선 이전가, 등락 칩(↓/↑ %), 큰 가격, 개당값, 스파크라인. 화면이 바뀌면 안 된다 (이 태스크는 내부 모델만 바꾼다).

- [ ] **Step 16: 커밋**

```bash
git add src/types.ts src/picks.ts src/card.ts scripts/lib/parse-kamis.mjs \
  tests/parse-kamis.test.js tests/picks.test.ts tests/card.test.ts tests/app.test.ts \
  tests/prices-snapshot.test.ts src/components/App.test.tsx public/data/prices.json
git commit -m "feat: 관측(price)과 기준선(baseline)을 다른 칸으로 — 1일전 폴백을 버린다"
```

---

### Task 3: 단위를 구조체로 — KAMIS 표기 파싱을 어댑터에 가둔다

`unit`이 `"10개"` 같은 **문자열**이라, 뷰 레이어(`card.ts:51`)가 `/^(\d+)\s*개$/` 정규식으로 KAMIS 표기법을 다시 뜯고 있다. KAMIS를 몰라야 할 레이어가 KAMIS 표기법을 안다.

`{ quantity, measure }` 구조체로 만들고 파싱은 어댑터에서 한 번만 한다. `measure`는 `'kg' | 'g' | '개' | '포기'` 넷뿐 — 전 계절·전 부류 실측으로 닫힌 집합임을 확인했다. **처음 보는 표기를 만나면 `null`로 뭉개지 않고 throw한다.** 조용한 오염보다 시끄러운 실패가 낫다.

**환산은 하지 않는다.** KAMIS 표기를 그대로 보존한다 — 환산이 없으면 오차도 없다.

**Files:**
- Modify: `src/types.ts` (`Measure`·`Unit` 신설, `PriceEntry.unit`)
- Modify: `scripts/lib/parse-kamis.mjs` (`parseUnit` 신설)
- Modify: `src/picks.ts` (`PriceView.unit`)
- Modify: `src/card.ts:50-57` (`perUnitPrice`)
- Modify: `tests/parse-kamis.test.js` (`parseUnit` describe 추가, 픽스처 단언)
- Modify: `tests/card.test.ts:22-29`, `:38-43`, `:113-116`
- Modify: `tests/picks.test.ts` (`entry`, `hasDrops` mk, `priceView` 단언)
- Modify: `tests/app.test.ts:18-25`
- Modify: `src/components/App.test.tsx:19`
- Modify: `tests/prices-snapshot.test.ts` (단언 추가)
- Regenerate: `public/data/prices.json`
- **손대지 않음:** `src/components/PriceBlock.tsx` — 단위 표시는 B단계

**Interfaces:**
- Consumes: Task 2의 `Baseline`, `PriceEntry`.
- Produces: `Measure = 'kg' | 'g' | '개' | '포기'`
- Produces: `Unit { quantity: number; measure: Measure }`
- Produces: `parseUnit(s): Unit` (`scripts/lib/parse-kamis.mjs`) — 모르는 표기면 throw
- Produces: `perUnitPrice(price: number, unit: Unit): { each: number } | null` — 시그니처가 `string` → `Unit`으로 바뀐다
- `PriceCardView`는 여전히 **바뀌지 않는다.** 단위를 카드에 싣는 건 B단계다.

---

- [ ] **Step 1: 실패하는 테스트를 쓴다 — 어댑터가 단위를 파싱한다**

`tests/parse-kamis.test.js`의 임포트 줄(`:3`)을 교체:

```js
import { parseCategoryResponse, parseNum, parseUnit } from '../scripts/lib/parse-kamis.mjs'
```

`describe('parseNum', …)` 블록 바로 뒤에 추가:

```js
describe('parseUnit', () => {
  test('수량과 계량을 가른다', () => {
    expect(parseUnit('10개')).toEqual({ quantity: 10, measure: '개' })
    expect(parseUnit('1kg')).toEqual({ quantity: 1, measure: 'kg' })
    expect(parseUnit('100g')).toEqual({ quantity: 100, measure: 'g' })
    expect(parseUnit('1포기')).toEqual({ quantity: 1, measure: '포기' })
  })

  test('kg를 g로 잘못 집지 않는다', () => {
    expect(parseUnit('1kg').measure).toBe('kg')
  })

  test('처음 보는 표기는 null로 뭉개지 않고 throw한다', () => {
    // 조용한 오염보다 시끄러운 실패가 낫다 — 단위 없는 가격이 화면까지 새어나가면 안 된다
    expect(() => parseUnit('1단')).toThrow(/단위/)
    expect(() => parseUnit('')).toThrow(/단위/)
    expect(() => parseUnit(null)).toThrow(/단위/)
  })
})
```

`describe('parseCategoryResponse', …)` 안의 두 단언에서 `unit`을 구조체로 바꾼다.

'모든 행을 PriceEntry로 변환한다' 테스트의 `unit`:

```js
      unit: { quantity: 1, measure: '포기' },
```

'data.item이 단일 객체여도…' 테스트의 `unit` (입력 `unit: '10개'`는 그대로 두고, 기대값만):

```js
        unit: { quantity: 10, measure: '개' },
```

같은 테스트 안 '당일(dpr1)이 결측이면…'과 '기준선…' 케이스는 `unit` 필드가 없는 최소 `item`을 넘긴다 — `parseUnit`이 throw하지 않도록 `unit`을 넣어준다. '당일(dpr1)이 결측이면 1일전으로 메우지 않고 null이다' 테스트의 `item`을 교체:

```js
        item: { item_name: '오이', unit: '10개', dpr1: '-', dpr2: '8,420', dpr5: '10,120', dpr6: '9,050' },
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run tests/parse-kamis.test.js`
Expected: FAIL — `parseUnit`이 없다 (`SyntaxError` 또는 `not a function`).

- [ ] **Step 3: 어댑터에 단위 파싱을 넣는다**

`scripts/lib/parse-kamis.mjs`의 `parseNum` 아래에 추가:

```js
/** KAMIS 단위 표기 → { quantity, measure }. "10개" → { quantity: 10, measure: '개' }
 *
 *  measure는 'kg' | 'g' | '개' | '포기' 넷뿐이다 (전 계절·전 부류 실측).
 *  처음 보는 표기는 null로 뭉개지 않고 throw한다 — 단위 없는 가격이 화면까지 새어나가면
 *  아무도 모른 채 틀린 개당값을 본다. 조용한 오염보다 시끄러운 실패가 낫다.
 *  환산은 하지 않는다. KAMIS 표기를 그대로 보존한다 — 환산이 없으면 오차도 없다.
 */
export function parseUnit(s) {
  const m = /^(\d+)\s*(kg|g|개|포기)$/.exec(String(s ?? '').trim())
  if (!m) throw new Error(`KAMIS 단위 표기를 모르겠습니다: ${JSON.stringify(s)}`)
  return { quantity: Number(m[1]), measure: m[2] }
}
```

`parseCategoryResponse`의 `map` 안 `unit` 줄을 교체:

```js
    unit: parseUnit(it.unit),
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `npx vitest run tests/parse-kamis.test.js`
Expected: PASS

- [ ] **Step 5: 타입에 단위를 만든다**

`src/types.ts`에 `Baseline` 위쪽으로 추가:

```ts
/** KAMIS가 쓰는 계량 단위. 전 계절·전 부류 실측 결과 이 넷뿐이다. */
export type Measure = 'kg' | 'g' | '개' | '포기'

/** "10개" = { quantity: 10, measure: '개' }.
 *  KAMIS 표기를 그대로 보존하고 환산하지 않는다 — 환산이 없으면 오차도 없다. */
export interface Unit {
  quantity: number
  measure: Measure
}
```

`PriceEntry.unit`의 타입을 바꾼다:

```ts
  unit: Unit
```

- [ ] **Step 6: 실패하는 테스트를 쓴다 — perUnitPrice가 Unit을 받는다**

`tests/card.test.ts:38-43`의 `perUnitPrice` describe를 교체:

```ts
describe('perUnitPrice', () => {
  test('10개면 개당값', () =>
    expect(perUnitPrice(18200, { quantity: 10, measure: '개' })).toEqual({ each: 1820 }))
  test('반올림', () =>
    expect(perUnitPrice(12600, { quantity: 10, measure: '개' })).toEqual({ each: 1260 }))
  test('1개(단수)는 null', () =>
    expect(perUnitPrice(21400, { quantity: 1, measure: '개' })).toBeNull())
  test('무게 단위는 null', () =>
    expect(perUnitPrice(8000, { quantity: 1, measure: 'kg' })).toBeNull())
  test('100g도 null — 무게는 개당값이 없다', () =>
    expect(perUnitPrice(315, { quantity: 100, measure: 'g' })).toBeNull())
})
```

`tests/card.test.ts:22-29`의 `priceView` 헬퍼에서 `unit`:

```ts
const priceView = (over: Partial<PriceView> = {}): PriceView => ({
  price: 12600,
  unit: { quantity: 10, measure: '개' },
  changeVsMonthAgoPct: -25.4,
  baseline: { monthAgo: 16900, yearAgo: 13400 },
  ...over,
})
```

`tests/card.test.ts:113-116`의 '무게 단위는 perUnit null':

```ts
  test('무게 단위는 perUnit null', () => {
    const c = toCardView(pick({ price: priceView({ unit: { quantity: 1, measure: 'kg' } }) }), 7)
    expect(c.price?.perUnit).toBeNull()
  })
```

- [ ] **Step 7: 실패를 확인한다**

Run: `npx vitest run tests/card.test.ts`
Expected: FAIL — `perUnitPrice`가 아직 문자열에 정규식을 돌린다 (`unit.trim is not a function`).

- [ ] **Step 8: perUnitPrice에서 KAMIS 정규식을 걷어낸다**

`src/card.ts:1-2`의 임포트에 `Unit`을 더한다:

```ts
import type { PickResult, PriceView } from './picks'
import type { Category, ProduceProfile, Unit } from './types'
```

`src/card.ts:50-57`을 교체:

```ts
/** "N개"(N>1) 단위면 개당값을 계산. 단수·무게 단위는 null.
 *  KAMIS 표기 파싱은 어댑터(parse-kamis.mjs)가 이미 끝냈다 — 뷰는 구조체만 본다. */
export function perUnitPrice(price: number, unit: Unit): { each: number } | null {
  if (unit.measure !== '개' || unit.quantity <= 1) return null
  return { each: Math.round(price / unit.quantity) }
}
```

- [ ] **Step 9: picks의 PriceView가 Unit을 싣는다**

`src/picks.ts`의 임포트와 `PriceView.unit`:

```ts
import type { Baseline, PriceEntry, PriceSnapshot, ProduceProfile, Unit } from './types'

export interface PriceView {
  price: number
  unit: Unit
  /** 1개월 전 대비 % (음수 = 하락). 기준선이 없으면 null */
  changeVsMonthAgoPct: number | null
  baseline: Baseline
}
```

`priceView` 본문은 `unit: entry.unit` 그대로 통과하므로 바뀌지 않는다.

- [ ] **Step 10: 남은 픽스처를 고친다**

`tests/picks.test.ts`의 `entry` 헬퍼:

```ts
function entry(over: Partial<PriceEntry> = {}): PriceEntry {
  return {
    itemCode: '0',
    itemName: '품목',
    kindName: '기본',
    rank: '상품',
    unit: { quantity: 1, measure: 'kg' },
    price: 1000,
    baseline: { monthAgo: 1000, yearAgo: 1000 },
    ...over,
  }
}
```

`tests/picks.test.ts`의 `priceView 기준선 통과` 첫 테스트 기대값의 `unit`:

```ts
      unit: { quantity: 1, measure: 'kg' },
```

`tests/picks.test.ts`의 `hasDrops` `mk`:

```ts
  const mk = (pct: number | null) => ({
    profile: profile({}),
    inPeak: false,
    price: {
      price: 1,
      unit: { quantity: 1, measure: 'kg' } as const,
      changeVsMonthAgoPct: pct,
      baseline: { monthAgo: 1, yearAgo: 1 },
    },
  })
```

`tests/app.test.ts`의 `snap` 헬퍼 엔트리:

```ts
    itemCode: '413', itemName: '복숭아', kindName: '백도(10개)', rank: '상품',
    unit: { quantity: 10, measure: '개' },
    price: 18200, baseline: { monthAgo: 24500, yearAgo: 19800 }, ...over,
```

`src/components/App.test.tsx:19`:

```tsx
const pick: PickResult = {
  profile, inPeak: true,
  price: {
    price: 18200,
    unit: { quantity: 10, measure: '개' },
    changeVsMonthAgoPct: -25.7,
    baseline: { monthAgo: 24500, yearAgo: 19800 },
  },
}
```

- [ ] **Step 11: 커밋된 스냅샷 검증에 단위 단언을 추가한다**

`tests/prices-snapshot.test.ts`의 `describe` 블록 끝에 추가:

```ts
  test('모든 엔트리의 단위가 구조체이고, 계량은 닫힌 집합 안에 있다', () => {
    for (const e of snapshot.entries) {
      expect(typeof e.unit.quantity).toBe('number')
      expect(e.unit.quantity).toBeGreaterThan(0)
      expect(['kg', 'g', '개', '포기']).toContain(e.unit.measure)
    }
  })
```

- [ ] **Step 12: 스냅샷을 다시 받는다**

Run:
```bash
KAMIS_CERT_KEY=<키> KAMIS_CERT_ID=<아이디> npm run fetch:prices
```
Expected: `prices.json 갱신: NN/NN개 항목에 가격 (조사일 YYYY-MM-DD)`

**여기서 `KAMIS 단위 표기를 모르겠습니다: "…"` 로 실패하면 그건 버그가 아니라 설계가 작동한 것이다.** 실측하지 못한 표기가 나온 것이니, 그 표기가 실제 KAMIS 값인지 확인하고 `Measure`·`parseUnit`의 닫힌 집합과 `CONTEXT.md`의 단위 정의를 함께 넓힌다.

- [ ] **Step 13: 게이트를 통과시킨다**

Run: `npm test && npx tsc --noEmit`
Expected: 둘 다 PASS. `tsc`가 `card.ts`에 남은 문자열 단위 사용을 잡아준다.

Run: `npm run report:coverage`
Expected: `broken` 0개, exit 0.

- [ ] **Step 14: 브라우저로 실측한다**

Run: `npm run dev` → `/`를 연다.
Expected: 화면이 이전과 **완전히 동일하다.** 특히 개당값(`개당 1,820원`)이 예전처럼 “N개” 단위 카드에만 뜨고, kg·g·포기 카드엔 뜨지 않는다. 단위 문자열이 새로 화면에 나타나면 안 된다 (그건 B단계).

스크린샷을 찍어 이전과 대조한다.

- [ ] **Step 15: 커밋**

```bash
git add src/types.ts src/picks.ts src/card.ts scripts/lib/parse-kamis.mjs \
  tests/parse-kamis.test.js tests/card.test.ts tests/picks.test.ts tests/app.test.ts \
  tests/prices-snapshot.test.ts src/components/App.test.tsx public/data/prices.json
git commit -m "feat: 단위를 {quantity, measure} 구조체로 — KAMIS 표기 파싱을 어댑터에 가둔다"
```

---

## 이 플랜이 끝나면

- `PriceSnapshot`은 **하나의 조사일**을 뜻하고, 신선도가 그 조사일로 재진다 — 7일 묵은 가격이 조용히 오늘 것처럼 보이던 구멍이 막힌다.
- **관측**과 **기준선**이 다른 칸에 산다 — dpr 컬럼을 바꿔 꽂는 오독이 타입에서 걸린다.
- **KAMIS를 아는 코드는 어댑터 하나**뿐이다 — `card.ts`의 KAMIS 표기 정규식이 사라진다.
- 커밋된 `prices.json`이 타입과 맞는지 게이트가 검사한다 — 라우트의 `as unknown as` 캐스팅이 뚫어놓은 구멍이 메워진다.
- **화면은 한 픽셀도 바뀌지 않는다.**

## 남는 것 (B단계 — 사인오프 필요)

단위를 화면에 찍는 일(“100g에 315원”, “1포기에 3,513원”)은 사용자향 시각 변경이다. `CLAUDE.md`의 UI/UX 규칙대로 `impeccable` 렌즈를 열고 시안 2~3개로 사인오프를 받은 뒤에 `PriceCardView`에 `unit`을 얹고 `PriceBlock.tsx`를 고친다.

## 이번에 안 하는 것 (도메인 그릴링에서 나왔지만 선택되지 않음)

- `PriceView` 삭제 — 매칭된 엔트리를 카드까지 그대로 들고 가기 (상추=적상추 문제, 중품 조용한 폴백, 품종/가격 출처 불일치)
- `matchEntry`가 판별 유니온을 반환하기 — 지금 `PickResult.price: null`은 서로 다른 여섯 가지를 뜻한다
- `hasDrops`가 “데이터 없음”을 “안 내렸음”으로 단언하는 문제
- `kindName`이 두 개념(질의 패턴 vs 응답 값)에 한 이름을 쓰는 문제, `rank: string` → `'상품' | '중품'`
