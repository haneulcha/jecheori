# 이번 주 제철 픽 (wat-to-buy) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이번 달 제철인 과일·채소 중 가격이 떨어진 품목 최대 5개를 카드로 보여주는 모바일 웹앱 (정적 사이트 + KAMIS 일일 가격 파이프라인).

**Architecture:** 서버 없는 정적 사이트. GitHub Actions가 매일 KAMIS 오픈API를 호출해 `public/data/prices.json` 스냅샷을 커밋하고, GitHub Pages로 배포한다. 프론트는 정적 JSON 두 개(제철 프로필 + 가격 스냅샷)를 fetch해 순수 함수로 픽을 계산한다.

**Tech Stack:** Vite + vanilla TypeScript (런타임 프레임워크 없음), Vitest, Node 20+ (파이프라인 스크립트는 의존성 없는 `.mjs`), GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-07-09-seasonal-picks-design.md`

## Global Constraints

- Node 20+, 런타임 의존성 0개 (devDependencies: `vite`, `vitest`, `typescript`만)
- 모든 사용자 대상 문구는 한국어, 담백한 톤 (이커머스 화법 금지: "사세요" ✕, "담기 좋아요" ○)
- 모바일 우선. 광고·로그인·추적·외부 요청 없음 (KAMIS 호출은 CI에서만)
- KAMIS 키는 코드/저장소에 절대 넣지 않는다. CI 시크릿 `KAMIS_CERT_KEY`, `KAMIS_CERT_ID`만 사용
- GitHub Pages 프로젝트 사이트 기준 Vite `base: '/wat-to-buy/'` (저장소 이름과 일치해야 함)
- 선정 로직·데이터 접근은 순수 함수/모듈로 격리 (스펙의 "열린 설계" 원칙)
- 스펙의 `data/` 디렉토리는 Vite 정적 서빙을 위해 `public/data/`로 구현한다 (역할 동일)

---

### Task 1: 프로젝트 스캐폴딩 (Vite + TypeScript + Vitest)

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/style.css`, `.gitignore`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: `npm run dev|build|test` 동작하는 프로젝트 뼈대. 이후 모든 태스크가 이 위에서 작업.

- [ ] **Step 1: 파일 생성**

`package.json`:

```json
{
  "name": "wat-to-buy",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "fetch:prices": "node scripts/fetch-prices.mjs",
    "report:coverage": "node scripts/report-coverage.mjs"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "types": ["vite/client"]
  },
  "include": ["src", "tests"]
}
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/wat-to-buy/',
})
```

`index.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="지금 안 먹으면 아쉬운 제철 과일·채소를 알려드려요" />
    <title>지금 담기 좋은 것</title>
  </head>
  <body>
    <div id="app"><p class="loading">불러오는 중…</p></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/main.ts` (임시 — Task 8에서 교체):

```ts
import './style.css'

document.querySelector('#app')!.innerHTML = '<p>준비 중</p>'
```

`src/style.css` (임시 — Task 8에서 교체):

```css
body { font-family: system-ui, sans-serif; }
```

`.gitignore`:

```
node_modules/
dist/
*.tmp
.DS_Store
```

`tests/smoke.test.ts`:

```ts
import { expect, test } from 'vitest'

test('vitest가 동작한다', () => {
  expect(1 + 1).toBe(2)
})
```

- [ ] **Step 2: 설치 및 확인**

Run: `npm install && npm test && npm run build`
Expected: 테스트 1개 PASS, `dist/` 생성 성공

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: Vite + TypeScript + Vitest 스캐폴딩"
```

---

### Task 2: 타입 정의 & produce.json 시드 10품목 + 스키마 검증 테스트

**Files:**
- Create: `src/types.ts`, `public/data/produce.json`
- Test: `tests/produce.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `src/types.ts`의 `ProduceProfile`, `KamisRef`, `PriceEntry`, `PriceSnapshot`, `Category` — 이후 모든 태스크가 이 타입을 사용
  - `public/data/produce.json`: `ProduceProfile[]` 형태의 JSON 배열

- [ ] **Step 1: 실패하는 검증 테스트 작성**

`tests/produce.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import type { ProduceProfile } from '../src/types'

const profiles: ProduceProfile[] = JSON.parse(
  readFileSync(new URL('../public/data/produce.json', import.meta.url), 'utf-8'),
)

describe('produce.json 스키마', () => {
  test('최소 10개 품목이 있다', () => {
    expect(profiles.length).toBeGreaterThanOrEqual(10)
  })

  test.each(profiles.map((p) => [p.id, p] as const))('%s: 필수 필드가 유효하다', (_id, p) => {
    expect(p.id).toMatch(/^[a-z0-9-]+$/)
    expect(p.name.length).toBeGreaterThan(0)
    expect(p.emoji.length).toBeGreaterThan(0)
    expect(['fruit', 'vegetable']).toContain(p.category)
    expect(['100', '200', '400']).toContain(p.kamis.categoryCode)
    expect(p.kamis.itemName.length).toBeGreaterThan(0)
    for (const m of [...p.seasonMonths, ...p.peakMonths]) {
      expect(m).toBeGreaterThanOrEqual(1)
      expect(m).toBeLessThanOrEqual(12)
    }
    // 절정 월은 제철 월의 부분집합
    for (const m of p.peakMonths) expect(p.seasonMonths).toContain(m)
    expect(p.whyNow.default?.length).toBeGreaterThan(0)
    expect(p.howToPick.length).toBeGreaterThan(0)
    expect(p.howToStore.length).toBeGreaterThan(0)
    expect(p.howToUse.length).toBeGreaterThan(0)
  })

  test('id가 중복되지 않는다', () => {
    const ids = profiles.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- tests/produce.test.ts`
Expected: FAIL — `produce.json` 파일 없음 (ENOENT)

- [ ] **Step 3: 타입 정의 작성**

`src/types.ts`:

```ts
export type Category = 'fruit' | 'vegetable'

/** KAMIS 응답과 프로필을 잇는 참조. 코드가 아니라 품목명으로 매칭한다
 *  (KAMIS 품목 코드는 문서마다 편차가 있어 이름 매칭이 더 안전). */
export interface KamisRef {
  /** 100 식량작물 | 200 채소류 | 400 과일류 */
  categoryCode: '100' | '200' | '400'
  /** KAMIS item_name과 정확히 일치해야 함 (예: "사과") */
  itemName: string
  /** 선호 품종 — KAMIS kind_name에 부분 일치 (예: "샤인") */
  kindName?: string
}

export interface ProduceProfile {
  id: string
  name: string
  emoji: string
  category: Category
  kamis: KamisRef
  /** 제철 월 (1~12) */
  seasonMonths: number[]
  /** 절정 월 — seasonMonths의 부분집합 */
  peakMonths: number[]
  /** 월별 "왜 지금인지" 한 줄. 키는 "1"~"12" 또는 "default" */
  whyNow: Record<string, string>
  howToPick: string
  howToStore: string
  howToUse: string
}

export interface PriceEntry {
  itemCode: string
  itemName: string
  kindName: string
  rank: string
  unit: string
  /** 당일 평균 소매가 (당일 조사 없으면 최근 조사일 가격). 결측이면 null */
  price: number | null
  priceMonthAgo: number | null
  priceYearAgo: number | null
}

export interface PriceSnapshot {
  schemaVersion: number
  /** ISO 8601 */
  fetchedAt: string
  entries: PriceEntry[]
}
```

- [ ] **Step 4: 시드 10품목 작성**

`public/data/produce.json` — 아래 내용 그대로 (7월에 제철인 품목 위주 + 필터 테스트용 겨울 품목 포함):

```json
[
  {
    "id": "peach",
    "name": "복숭아",
    "emoji": "🍑",
    "category": "fruit",
    "kamis": { "categoryCode": "400", "itemName": "복숭아" },
    "seasonMonths": [6, 7, 8, 9],
    "peakMonths": [7, 8],
    "whyNow": {
      "default": "여름 한복판이 복숭아의 계절이에요",
      "7": "7~8월이 노지 복숭아의 절정이에요",
      "8": "말랑한 백도가 가장 달 때예요"
    },
    "howToPick": "봉합선이 뚜렷하고 향이 진한 것. 꼭지 주변까지 붉게 물든 것이 잘 익은 거예요.",
    "howToStore": "실온에서 후숙하고, 먹기 2~3시간 전에만 냉장. 차게 오래 두면 단맛이 떨어져요.",
    "howToUse": "그냥 먹는 게 최고지만, 살짝 무른 것은 요거트에 으깨 넣거나 설탕에 재워 청으로."
  },
  {
    "id": "watermelon",
    "name": "수박",
    "emoji": "🍉",
    "category": "fruit",
    "kamis": { "categoryCode": "200", "itemName": "수박" },
    "seasonMonths": [6, 7, 8],
    "peakMonths": [7],
    "whyNow": {
      "default": "더위가 시작되면 수박이 달아져요",
      "7": "7월 수박이 당도가 가장 높아요"
    },
    "howToPick": "두드렸을 때 맑은 통통 소리가 나고, 줄무늬가 진하고 선명한 것.",
    "howToStore": "자르기 전엔 서늘한 실온, 자른 후엔 단면을 랩으로 덮어 냉장 2~3일.",
    "howToUse": "화채, 주스, 껍질 흰 부분은 무침으로도 먹어요."
  },
  {
    "id": "korean-melon",
    "name": "참외",
    "emoji": "🍈",
    "category": "fruit",
    "kamis": { "categoryCode": "200", "itemName": "참외" },
    "seasonMonths": [5, 6, 7],
    "peakMonths": [6],
    "whyNow": {
      "default": "초여름 성주 참외가 한창이에요",
      "7": "7월 참외는 물량이 많아 가격이 내려와요"
    },
    "howToPick": "골이 깊고 노란색이 진하며, 향이 꼭지까지 올라오는 것.",
    "howToStore": "냉장 보관, 씨를 빼지 말고 통째로. 일주일 안에 먹는 게 좋아요.",
    "howToUse": "껍질째 씻어 깎아 먹고, 씨 부분이 가장 달아요. 장아찌로도."
  },
  {
    "id": "tomato",
    "name": "토마토",
    "emoji": "🍅",
    "category": "vegetable",
    "kamis": { "categoryCode": "200", "itemName": "토마토" },
    "seasonMonths": [5, 6, 7, 8],
    "peakMonths": [6, 7],
    "whyNow": {
      "default": "노지 토마토가 나오는 계절이에요"
    },
    "howToPick": "꼭지가 싱싱하고 전체적으로 붉으며 단단한 것.",
    "howToStore": "꼭지를 아래로 실온 보관. 완숙이면 냉장, 먹기 전 실온에 꺼내두면 맛이 돌아와요.",
    "howToUse": "달걀볶음, 카프레제, 살짝 데쳐 껍질 벗기고 마리네이드."
  },
  {
    "id": "cucumber",
    "name": "오이",
    "emoji": "🥒",
    "category": "vegetable",
    "kamis": { "categoryCode": "200", "itemName": "오이" },
    "seasonMonths": [5, 6, 7, 8],
    "peakMonths": [6, 7],
    "whyNow": {
      "default": "여름 오이는 수분이 많고 시원해요"
    },
    "howToPick": "가시가 살아 있고 굵기가 고른 것. 휘어진 건 맛 차이 없어요.",
    "howToStore": "물기 닦고 키친타월로 감싸 냉장. 냉기에 약하니 문 쪽 칸에.",
    "howToUse": "오이무침, 냉국, 오이소박이. 살짝 절이면 볶음에도 좋아요."
  },
  {
    "id": "zucchini",
    "name": "애호박",
    "emoji": "🥬",
    "category": "vegetable",
    "kamis": { "categoryCode": "200", "itemName": "호박", "kindName": "애호박" },
    "seasonMonths": [6, 7, 8, 9],
    "peakMonths": [7, 8],
    "whyNow": {
      "default": "여름 애호박이 부드럽고 달아요"
    },
    "howToPick": "표면에 윤기가 있고 눌렀을 때 단단한 것. 너무 큰 것보다 중간 크기.",
    "howToStore": "랩으로 감싸 냉장 일주일. 썰어둔 것은 이틀 안에.",
    "howToUse": "된장찌개, 새우젓볶음, 부침. 어디에나 어울리는 여름 채소예요."
  },
  {
    "id": "potato",
    "name": "감자",
    "emoji": "🥔",
    "category": "vegetable",
    "kamis": { "categoryCode": "100", "itemName": "감자" },
    "seasonMonths": [6, 7, 8],
    "peakMonths": [6, 7],
    "whyNow": {
      "default": "햇감자가 나오는 계절 — 껍질이 얇고 포슬포슬해요"
    },
    "howToPick": "단단하고 싹이 없으며 초록빛이 돌지 않는 것.",
    "howToStore": "빛이 안 드는 서늘한 곳에 사과 한 알과 함께 두면 싹이 늦게 나요.",
    "howToUse": "햇감자는 쪄 먹는 게 최고. 감자조림, 볶음, 수제비까지."
  },
  {
    "id": "corn",
    "name": "옥수수",
    "emoji": "🌽",
    "category": "vegetable",
    "kamis": { "categoryCode": "100", "itemName": "옥수수" },
    "seasonMonths": [7, 8],
    "peakMonths": [7, 8],
    "whyNow": {
      "default": "옥수수는 딱 여름 두 달이 제철이에요"
    },
    "howToPick": "수염이 갈색으로 마르고 알이 끝까지 꽉 찬 것. 껍질이 초록색으로 싱싱한 것.",
    "howToStore": "수확 후 당도가 빠르게 떨어져요. 사 온 날 바로 쪄서 냉동하는 게 좋아요.",
    "howToUse": "찜, 구이, 알만 떼어 옥수수밥이나 샐러드에."
  },
  {
    "id": "apple",
    "name": "사과",
    "emoji": "🍎",
    "category": "fruit",
    "kamis": { "categoryCode": "400", "itemName": "사과" },
    "seasonMonths": [9, 10, 11],
    "peakMonths": [10],
    "whyNow": {
      "default": "가을 사과가 아삭하고 달아요",
      "9": "홍로가 나오기 시작하는 때예요",
      "10": "부사(후지)가 가장 맛있는 때예요"
    },
    "howToPick": "들었을 때 묵직하고 꼭지가 싱싱한 것. 향이 진하면 잘 익은 거예요.",
    "howToStore": "비닐에 싸서 냉장. 다른 과일과 따로 (에틸렌 때문에 다른 과일이 빨리 익어요).",
    "howToUse": "생과일, 샐러드, 구워서 시나몬과 함께."
  },
  {
    "id": "spinach",
    "name": "시금치",
    "emoji": "🥗",
    "category": "vegetable",
    "kamis": { "categoryCode": "200", "itemName": "시금치" },
    "seasonMonths": [11, 12, 1, 2, 3],
    "peakMonths": [12, 1],
    "whyNow": {
      "default": "겨울 시금치가 달아요",
      "12": "노지 겨울 시금치(섬초)가 나오는 때 — 단맛이 최고예요"
    },
    "howToPick": "뿌리 쪽이 붉고 잎이 도톰한 것. 겨울엔 키 작은 노지 시금치가 달아요.",
    "howToStore": "젖은 키친타월로 감싸 세워서 냉장. 데쳐서 냉동해도 좋아요.",
    "howToUse": "나물, 된장국, 살짝 데쳐 무침. 겨울 시금치는 생으로도 달아요."
  }
]
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- tests/produce.test.ts`
Expected: PASS (품목 10개 각각 + 스키마 테스트 전부)

- [ ] **Step 6: Commit**

```bash
git add src/types.ts public/data/produce.json tests/produce.test.ts
git commit -m "feat: 타입 정의와 제철 프로필 시드 10품목"
```

---

### Task 3: produce.json 나머지 30품목 작성

**Files:**
- Modify: `public/data/produce.json` (10개 → 40개)
- Test: `tests/produce.test.ts` (기존 테스트가 그대로 검증)

**Interfaces:**
- Consumes: Task 2의 `ProduceProfile` 스키마와 시드 항목 (문체·분량의 기준)
- Produces: 40품목이 담긴 `public/data/produce.json`

- [ ] **Step 1: 테스트의 최소 개수를 40으로 상향 (실패 확인)**

`tests/produce.test.ts`에서 `toBeGreaterThanOrEqual(10)`을 `toBeGreaterThanOrEqual(40)`으로 변경.

Run: `npm test -- tests/produce.test.ts`
Expected: FAIL — "최소 10개" → 40개 미달

- [ ] **Step 2: 아래 표의 30품목을 시드와 같은 문체·구조로 작성**

각 품목마다 `whyNow.default`, `howToPick`, `howToStore`, `howToUse`를 시드 수준(한두 문장, 담백한 톤)으로 작성한다. `id`는 영문 kebab-case.

| 이름 | category | kamis.categoryCode | kamis.itemName | kamis.kindName | seasonMonths | peakMonths |
|---|---|---|---|---|---|---|
| 배 | fruit | 400 | 배 | | 9,10,11 | 9,10 |
| 포도 | fruit | 400 | 포도 | 캠벨 | 8,9,10 | 9 |
| 샤인머스캣 | fruit | 400 | 포도 | 샤인 | 9,10,11 | 9,10 |
| 감귤 | fruit | 400 | 감귤 | | 11,12,1,2 | 12,1 |
| 단감 | fruit | 400 | 단감 | | 10,11,12 | 10,11 |
| 참다래 | fruit | 400 | 참다래 | | 10,11,12 | 11 |
| 딸기 | fruit | 200 | 딸기 | | 12,1,2,3,4 | 1,2,3 |
| 멜론 | fruit | 200 | 멜론 | | 6,7,8,9 | 7,8 |
| 배추 | vegetable | 200 | 배추 | | 4,5,11,12 | 11,12 |
| 양배추 | vegetable | 200 | 양배추 | | 5,6,7 | 6 |
| 상추 | vegetable | 200 | 상추 | | 4,5,6,9,10 | 5 |
| 얼갈이배추 | vegetable | 200 | 얼갈이배추 | | 4,5,6 | 5 |
| 부추 | vegetable | 200 | 부추 | | 3,4,5 | 4 |
| 깻잎 | vegetable | 200 | 깻잎 | | 6,7,8,9 | 7,8 |
| 단호박 | vegetable | 200 | 호박 | 단호박 | 7,8,9 | 8 |
| 방울토마토 | vegetable | 200 | 방울토마토 | | 5,6,7 | 6 |
| 가지 | vegetable | 200 | 가지 | | 6,7,8,9 | 7,8 |
| 풋고추 | vegetable | 200 | 풋고추 | | 6,7,8 | 7,8 |
| 파프리카 | vegetable | 200 | 파프리카 | | 5,6,7,8 | 6,7 |
| 무 | vegetable | 200 | 무 | | 10,11,12 | 11 |
| 열무 | vegetable | 200 | 열무 | | 5,6,7,8 | 6,7 |
| 당근 | vegetable | 200 | 당근 | | 11,12,1 | 12 |
| 브로콜리 | vegetable | 200 | 브로콜리 | | 11,12,1,2 | 12,1 |
| 대파 | vegetable | 200 | 파 | 대파 | 11,12,1 | 12 |
| 쪽파 | vegetable | 200 | 파 | 쪽파 | 9,10,11 | 10 |
| 양파 | vegetable | 200 | 양파 | | 5,6,7 | 6 |
| 마늘 | vegetable | 200 | 마늘 | | 6,7 | 6 |
| 생강 | vegetable | 200 | 생강 | | 10,11 | 10 |
| 고구마 | vegetable | 100 | 고구마 | | 9,10,11 | 10 |
| 미나리 | vegetable | 200 | 미나리 | | 3,4,5 | 4 |

주의: `kamis.itemName`은 KAMIS 응답의 `item_name`과 정확히 일치해야 매칭된다.
일부(멜론, 브로콜리, 미나리, 생강 등)는 KAMIS 소매 조사에 없을 수 있다 —
그 경우 매칭이 안 돼도 앱은 제철 정보만으로 동작하며(스펙의 결측 처리),
Task 9의 리포트와 Task 11의 실데이터 검증에서 이름을 확정한다.

- [ ] **Step 3: 테스트 통과 확인**

Run: `npm test -- tests/produce.test.ts`
Expected: PASS (40품목 전부 스키마 유효, id 중복 없음)

- [ ] **Step 4: Commit**

```bash
git add public/data/produce.json tests/produce.test.ts
git commit -m "feat: 제철 프로필 40품목 완성"
```

---

### Task 4: KAMIS 응답 파서 (`parse-kamis.mjs`)

**Files:**
- Create: `scripts/lib/parse-kamis.mjs`, `tests/fixtures/kamis-daily-200.json`, `tests/fixtures/kamis-error.json`
- Test: `tests/parse-kamis.test.js`

**Interfaces:**
- Consumes: KAMIS `dailyPriceByCategoryList` JSON 응답 형식
- Produces:
  - `parseNum(s: string|null) => number|null` — "4,800" → 4800, "-"/""/"0" → null
  - `parseCategoryResponse(json) => PriceEntry[]` (Task 2의 `PriceEntry` 형태 객체 배열). 오류 응답이면 throw.

KAMIS `dailyPriceByCategoryList` 응답 참고 (공식 오픈API 문서 기준):
`data.item[]`의 각 항목은 `item_name, item_code, kind_name, rank, unit, dpr1(당일), dpr2(1일전), dpr3(1개월전), dpr4(1년전)`을 가진다. 가격은 "4,800" 같은 콤마 문자열이고 조사 없음은 "-". 주말·휴일엔 `dpr1`이 "-"로 오므로 `dpr2`(최근 조사일)로 폴백한다. 인증 실패 등 오류 시 `data`가 `["200"]` 같은 코드 배열로 온다. **Task 11에서 실제 응답으로 픽스처를 갱신해 이 가정을 검증한다.**

- [ ] **Step 1: 픽스처 작성**

`tests/fixtures/kamis-daily-200.json`:

```json
{
  "condition": [
    {
      "p_product_cls_code": "01",
      "p_item_category_code": "200",
      "p_regday": "2026-07-10",
      "p_convert_kg_yn": "N",
      "p_returntype": "json"
    }
  ],
  "data": {
    "error_code": "000",
    "item": [
      {
        "item_name": "오이",
        "item_code": "223",
        "kind_name": "가시계통(10개)",
        "rank": "상품",
        "unit": "10개",
        "day1": "07/10",
        "dpr1": "8,540",
        "day2": "07/09",
        "dpr2": "8,420",
        "day3": "1개월전",
        "dpr3": "10,120",
        "day4": "1년전",
        "dpr4": "9,050"
      },
      {
        "item_name": "오이",
        "item_code": "223",
        "kind_name": "가시계통(10개)",
        "rank": "중품",
        "unit": "10개",
        "day1": "07/10",
        "dpr1": "7,200",
        "day2": "07/09",
        "dpr2": "7,100",
        "day3": "1개월전",
        "dpr3": "8,600",
        "day4": "1년전",
        "dpr4": "7,900"
      },
      {
        "item_name": "배추",
        "item_code": "211",
        "kind_name": "배추(1포기)",
        "rank": "상품",
        "unit": "1포기",
        "day1": "07/10",
        "dpr1": "-",
        "day2": "07/09",
        "dpr2": "3,980",
        "day3": "1개월전",
        "dpr3": "4,500",
        "day4": "1년전",
        "dpr4": "3,200"
      },
      {
        "item_name": "시금치",
        "item_code": "213",
        "kind_name": "시금치(100g)",
        "rank": "상품",
        "unit": "100g",
        "day1": "07/10",
        "dpr1": "-",
        "day2": "07/09",
        "dpr2": "-",
        "day3": "1개월전",
        "dpr3": "-",
        "day4": "1년전",
        "dpr4": "-"
      }
    ]
  }
}
```

`tests/fixtures/kamis-error.json`:

```json
{
  "condition": [{ "p_returntype": "json" }],
  "data": ["200"]
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/parse-kamis.test.js`:

```js
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { parseCategoryResponse, parseNum } from '../scripts/lib/parse-kamis.mjs'

const load = (name) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf-8'))

describe('parseNum', () => {
  test('콤마 문자열을 숫자로', () => expect(parseNum('4,800')).toBe(4800))
  test('결측 표기는 null', () => {
    expect(parseNum('-')).toBeNull()
    expect(parseNum('')).toBeNull()
    expect(parseNum('0')).toBeNull()
    expect(parseNum(null)).toBeNull()
  })
})

describe('parseCategoryResponse', () => {
  const entries = parseCategoryResponse(load('kamis-daily-200.json'))

  test('모든 행을 PriceEntry로 변환한다', () => {
    expect(entries).toHaveLength(4)
    expect(entries[0]).toEqual({
      itemCode: '223',
      itemName: '오이',
      kindName: '가시계통(10개)',
      rank: '상품',
      unit: '10개',
      price: 8540,
      priceMonthAgo: 10120,
      priceYearAgo: 9050,
    })
  })

  test('당일(dpr1)이 결측이면 최근 조사일(dpr2)로 폴백한다', () => {
    const cabbage = entries.find((e) => e.itemName === '배추')
    expect(cabbage.price).toBe(3980)
  })

  test('전부 결측이면 price가 null이다', () => {
    const spinach = entries.find((e) => e.itemName === '시금치')
    expect(spinach.price).toBeNull()
    expect(spinach.priceMonthAgo).toBeNull()
  })

  test('오류 응답이면 throw한다', () => {
    expect(() => parseCategoryResponse(load('kamis-error.json'))).toThrow(/KAMIS/)
  })
})
```

- [ ] **Step 3: 실패 확인**

Run: `npm test -- tests/parse-kamis.test.js`
Expected: FAIL — `parse-kamis.mjs` 모듈 없음

- [ ] **Step 4: 파서 구현**

`scripts/lib/parse-kamis.mjs`:

```js
/** "4,800" → 4800. "-", "", "0", null → null */
export function parseNum(s) {
  if (s == null) return null
  const cleaned = String(s).replace(/,/g, '').trim()
  if (cleaned === '' || cleaned === '-') return null
  const n = Number(cleaned)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** KAMIS dailyPriceByCategoryList 응답 → PriceEntry[] (오류 응답이면 throw) */
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
    price: parseNum(it.dpr1) ?? parseNum(it.dpr2),
    priceMonthAgo: parseNum(it.dpr3),
    priceYearAgo: parseNum(it.dpr4),
  }))
}
```

- [ ] **Step 5: 통과 확인**

Run: `npm test -- tests/parse-kamis.test.js`
Expected: PASS (테스트 7개)

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/parse-kamis.mjs tests/fixtures tests/parse-kamis.test.js
git commit -m "feat: KAMIS 일별 부류별 응답 파서"
```

---

### Task 5: 가격 스냅샷 파이프라인 (`fetch-prices.mjs`) + 시드 prices.json

**Files:**
- Create: `scripts/fetch-prices.mjs`, `public/data/prices.json`
- Test: `tests/fetch-prices.test.js`

**Interfaces:**
- Consumes: Task 4의 `parseCategoryResponse`
- Produces:
  - `kstDateString(now?: Date) => "YYYY-MM-DD"` (KST 기준)
  - `buildSnapshot({certKey, certId, regday, fetchFn}) => Promise<PriceSnapshot>` — 부류 100/200/400을 순회 호출. `fetchFn` 주입으로 네트워크 없이 테스트
  - `writeSnapshot(snapshot, outPath)` — 임시 파일에 쓴 뒤 rename (성공 시에만 교체 — 스펙의 "실패 시 기존 파일 유지")
  - CLI: `node scripts/fetch-prices.mjs [--date=YYYY-MM-DD]` — 실패 시 exit 1, `prices.json` 무변경
  - `public/data/prices.json` — 프론트가 읽는 스냅샷 (시드 데이터 포함)

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/fetch-prices.test.js`:

```js
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { buildSnapshot, kstDateString } from '../scripts/fetch-prices.mjs'

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/kamis-daily-200.json', import.meta.url), 'utf-8'),
)
const errorFixture = JSON.parse(
  readFileSync(new URL('./fixtures/kamis-error.json', import.meta.url), 'utf-8'),
)

const okFetch = (json) => async () => ({ ok: true, json: async () => json })

describe('kstDateString', () => {
  test('UTC 자정 직전은 KST로 다음 날이다', () => {
    // 2026-07-09 22:00 UTC = 2026-07-10 07:00 KST
    expect(kstDateString(new Date('2026-07-09T22:00:00Z'))).toBe('2026-07-10')
  })
})

describe('buildSnapshot', () => {
  test('부류 3개(100/200/400)를 호출해 엔트리를 합친다', async () => {
    const calls = []
    const fetchFn = async (url) => {
      calls.push(new URL(url).searchParams.get('p_item_category_code'))
      return { ok: true, json: async () => fixture }
    }
    const snap = await buildSnapshot({
      certKey: 'k',
      certId: 'i',
      regday: '2026-07-10',
      fetchFn,
    })
    expect(calls).toEqual(['100', '200', '400'])
    expect(snap.schemaVersion).toBe(1)
    expect(snap.entries).toHaveLength(12) // 픽스처 4행 × 3부류
    expect(new Date(snap.fetchedAt).getTime()).not.toBeNaN()
  })

  test('요청 파라미터에 인증키와 소매 구분이 들어간다', async () => {
    let captured
    const fetchFn = async (url) => {
      captured = new URL(url).searchParams
      return { ok: true, json: async () => fixture }
    }
    await buildSnapshot({ certKey: 'MYKEY', certId: 'MYID', regday: '2026-07-10', fetchFn })
    expect(captured.get('action')).toBe('dailyPriceByCategoryList')
    expect(captured.get('p_cert_key')).toBe('MYKEY')
    expect(captured.get('p_cert_id')).toBe('MYID')
    expect(captured.get('p_product_cls_code')).toBe('01')
    expect(captured.get('p_regday')).toBe('2026-07-10')
    expect(captured.get('p_returntype')).toBe('json')
  })

  test('HTTP 오류면 throw한다', async () => {
    const fetchFn = async () => ({ ok: false, status: 500 })
    await expect(
      buildSnapshot({ certKey: 'k', certId: 'i', regday: '2026-07-10', fetchFn }),
    ).rejects.toThrow(/500/)
  })

  test('KAMIS 오류 응답이면 throw한다', async () => {
    await expect(
      buildSnapshot({
        certKey: 'k',
        certId: 'i',
        regday: '2026-07-10',
        fetchFn: okFetch(errorFixture),
      }),
    ).rejects.toThrow(/KAMIS/)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- tests/fetch-prices.test.js`
Expected: FAIL — `fetch-prices.mjs` 모듈 없음

- [ ] **Step 3: 구현**

`scripts/fetch-prices.mjs`:

```js
import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCategoryResponse } from './lib/parse-kamis.mjs'

const API_BASE = 'https://www.kamis.or.kr/service/price/xml.do'
// 식량작물(감자·고구마·옥수수), 채소류, 과일류
const CATEGORY_CODES = ['100', '200', '400']

/** KST 기준 YYYY-MM-DD */
export function kstDateString(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

/** 하루치 스냅샷 생성. regday를 인자로 받아 과거 날짜 소급 수집도 가능 (열린 설계) */
export async function buildSnapshot({ certKey, certId, regday, fetchFn = fetch }) {
  const entries = []
  for (const categoryCode of CATEGORY_CODES) {
    const url = new URL(API_BASE)
    url.searchParams.set('action', 'dailyPriceByCategoryList')
    url.searchParams.set('p_product_cls_code', '01') // 소매
    url.searchParams.set('p_item_category_code', categoryCode)
    url.searchParams.set('p_country_code', '') // 전체 평균
    url.searchParams.set('p_regday', regday)
    url.searchParams.set('p_convert_kg_yn', 'N')
    url.searchParams.set('p_cert_key', certKey)
    url.searchParams.set('p_cert_id', certId)
    url.searchParams.set('p_returntype', 'json')
    const res = await fetchFn(url.toString())
    if (!res.ok) throw new Error(`KAMIS HTTP ${res.status} (부류 ${categoryCode})`)
    entries.push(...parseCategoryResponse(await res.json()))
  }
  return { schemaVersion: 1, fetchedAt: new Date().toISOString(), entries }
}

/** 임시 파일에 쓴 뒤 rename — 도중 실패해도 기존 파일이 깨지지 않는다 */
export function writeSnapshot(snapshot, outPath) {
  mkdirSync(dirname(outPath), { recursive: true })
  const tmp = `${outPath}.tmp`
  writeFileSync(tmp, JSON.stringify(snapshot, null, 2) + '\n')
  renameSync(tmp, outPath)
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const certKey = process.env.KAMIS_CERT_KEY
  const certId = process.env.KAMIS_CERT_ID
  if (!certKey || !certId) {
    console.error('KAMIS_CERT_KEY / KAMIS_CERT_ID 환경변수가 필요합니다')
    process.exit(1)
  }
  const dateArg = process.argv.find((a) => a.startsWith('--date='))?.slice('--date='.length)
  const regday = dateArg ?? kstDateString()
  const outPath = fileURLToPath(new URL('../public/data/prices.json', import.meta.url))
  try {
    const snapshot = await buildSnapshot({ certKey, certId, regday })
    if (snapshot.entries.length === 0) throw new Error('응답에 품목이 없습니다')
    writeSnapshot(snapshot, outPath)
    console.log(`prices.json 갱신: ${snapshot.entries.length}개 항목 (${regday})`)
  } catch (err) {
    console.error('가격 수집 실패 — prices.json은 변경하지 않음:', err.message)
    process.exit(1)
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- tests/fetch-prices.test.js`
Expected: PASS (테스트 5개)

- [ ] **Step 5: 시드 prices.json 작성**

KAMIS 키가 나오기 전 개발·데모용. `public/data/prices.json`:

```json
{
  "schemaVersion": 1,
  "fetchedAt": "2026-07-09T22:00:00.000Z",
  "entries": [
    {
      "itemCode": "413",
      "itemName": "복숭아",
      "kindName": "백도(10개)",
      "rank": "상품",
      "unit": "10개",
      "price": 18200,
      "priceMonthAgo": 24500,
      "priceYearAgo": 19800
    },
    {
      "itemCode": "221",
      "itemName": "수박",
      "kindName": "수박(1개)",
      "rank": "상품",
      "unit": "1개",
      "price": 21400,
      "priceMonthAgo": 23800,
      "priceYearAgo": 22100
    },
    {
      "itemCode": "222",
      "itemName": "참외",
      "kindName": "참외(10개)",
      "rank": "상품",
      "unit": "10개",
      "price": 12600,
      "priceMonthAgo": 16900,
      "priceYearAgo": 13400
    },
    {
      "itemCode": "223",
      "itemName": "오이",
      "kindName": "가시계통(10개)",
      "rank": "상품",
      "unit": "10개",
      "price": 8540,
      "priceMonthAgo": 10120,
      "priceYearAgo": 9050
    },
    {
      "itemCode": "225",
      "itemName": "토마토",
      "kindName": "토마토(1kg)",
      "rank": "상품",
      "unit": "1kg",
      "price": 4800,
      "priceMonthAgo": 5400,
      "priceYearAgo": 5100
    },
    {
      "itemCode": "224",
      "itemName": "호박",
      "kindName": "애호박(1개)",
      "rank": "상품",
      "unit": "1개",
      "price": 1450,
      "priceMonthAgo": 1980,
      "priceYearAgo": 1600
    },
    {
      "itemCode": "152",
      "itemName": "감자",
      "kindName": "수미(100g)",
      "rank": "상품",
      "unit": "100g",
      "price": 380,
      "priceMonthAgo": 420,
      "priceYearAgo": 350
    }
  ]
}
```

(옥수수는 의도적으로 뺀다 — "가격 결측이면 제철 정보만 표시"를 개발 중에 눈으로 확인하기 위해.)

- [ ] **Step 6: Commit**

```bash
git add scripts/fetch-prices.mjs tests/fetch-prices.test.js public/data/prices.json
git commit -m "feat: KAMIS 가격 스냅샷 파이프라인과 시드 데이터"
```

---

### Task 6: 선정 로직 (`picks.ts`)

**Files:**
- Create: `src/picks.ts`
- Test: `tests/picks.test.ts`

**Interfaces:**
- Consumes: Task 2의 `ProduceProfile`, `PriceEntry`, `PriceSnapshot`
- Produces:
  - `seasonalThisMonth(profiles, month) => ProduceProfile[]`
  - `matchEntry(profile, entries) => PriceEntry | null` — 이름(+선호 품종, 상품 등급 우선) 매칭
  - `priceView(entry) => PriceView` — `{ price, unit, changeVsMonthAgoPct }`
  - `selectPicks(profiles, snapshot, today, limit=5) => PickResult[]` — `{ profile, inPeak, price }`
  - `whyNowLine(profile, month) => string`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/picks.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { matchEntry, selectPicks, whyNowLine } from '../src/picks'
import type { PriceEntry, PriceSnapshot, ProduceProfile } from '../src/types'

function profile(over: Partial<ProduceProfile>): ProduceProfile {
  return {
    id: 'x',
    name: '품목',
    emoji: '🥬',
    category: 'vegetable',
    kamis: { categoryCode: '200', itemName: '품목' },
    seasonMonths: [7],
    peakMonths: [],
    whyNow: { default: '기본 문구' },
    howToPick: 'p',
    howToStore: 's',
    howToUse: 'u',
    ...over,
  }
}

function entry(over: Partial<PriceEntry>): PriceEntry {
  return {
    itemCode: '0',
    itemName: '품목',
    kindName: '기본',
    rank: '상품',
    unit: '1kg',
    price: 1000,
    priceMonthAgo: 1000,
    priceYearAgo: 1000,
    ...over,
  }
}

const snap = (entries: PriceEntry[]): PriceSnapshot => ({
  schemaVersion: 1,
  fetchedAt: '2026-07-10T00:00:00Z',
  entries,
})

const JULY = new Date('2026-07-10')

describe('matchEntry', () => {
  test('이름이 일치하고 가격이 있는 상품 등급을 고른다', () => {
    const entries = [
      entry({ itemName: '오이', rank: '중품', price: 700 }),
      entry({ itemName: '오이', rank: '상품', price: 900 }),
    ]
    const p = profile({ kamis: { categoryCode: '200', itemName: '오이' } })
    expect(matchEntry(p, entries)?.rank).toBe('상품')
  })

  test('선호 품종(kindName 부분 일치)을 우선한다', () => {
    const entries = [
      entry({ itemName: '포도', kindName: '캠벨(1kg)' }),
      entry({ itemName: '포도', kindName: '샤인머스캣(1kg)', price: 15000 }),
    ]
    const p = profile({ kamis: { categoryCode: '400', itemName: '포도', kindName: '샤인' } })
    expect(matchEntry(p, entries)?.kindName).toContain('샤인')
  })

  test('일치하는 이름이 없거나 가격이 전부 null이면 null', () => {
    const p = profile({ kamis: { categoryCode: '200', itemName: '멜론' } })
    expect(matchEntry(p, [entry({ itemName: '오이' })])).toBeNull()
    expect(matchEntry(p, [entry({ itemName: '멜론', price: null })])).toBeNull()
  })
})

describe('selectPicks', () => {
  test('이번 달 제철 품목만 나온다', () => {
    const profiles = [
      profile({ id: 'july', seasonMonths: [7] }),
      profile({ id: 'dec', seasonMonths: [12] }),
    ]
    const picks = selectPicks(profiles, snap([]), JULY)
    expect(picks.map((p) => p.profile.id)).toEqual(['july'])
  })

  test('절정 월 품목이 항상 먼저 온다', () => {
    const profiles = [
      profile({ id: 'season-cheap', kamis: { categoryCode: '200', itemName: 'A' } }),
      profile({
        id: 'peak-expensive',
        peakMonths: [7],
        kamis: { categoryCode: '200', itemName: 'B' },
      }),
    ]
    const entries = [
      entry({ itemName: 'A', price: 500, priceMonthAgo: 1000 }), // 50% 하락
      entry({ itemName: 'B', price: 1200, priceMonthAgo: 1000 }), // 20% 상승
    ]
    const picks = selectPicks(profiles, snap(entries), JULY)
    expect(picks.map((p) => p.profile.id)).toEqual(['peak-expensive', 'season-cheap'])
  })

  test('같은 그룹 안에서는 하락률 큰 순', () => {
    const profiles = [
      profile({ id: 'small-drop', kamis: { categoryCode: '200', itemName: 'A' } }),
      profile({ id: 'big-drop', kamis: { categoryCode: '200', itemName: 'B' } }),
    ]
    const entries = [
      entry({ itemName: 'A', price: 950, priceMonthAgo: 1000 }),
      entry({ itemName: 'B', price: 600, priceMonthAgo: 1000 }),
    ]
    const picks = selectPicks(profiles, snap(entries), JULY)
    expect(picks.map((p) => p.profile.id)).toEqual(['big-drop', 'small-drop'])
  })

  test('가격 결측 품목은 같은 그룹 맨 뒤로 (제철 정보는 유지)', () => {
    const profiles = [
      profile({ id: 'no-price', kamis: { categoryCode: '200', itemName: '없음' } }),
      profile({ id: 'priced', kamis: { categoryCode: '200', itemName: 'A' } }),
    ]
    const entries = [entry({ itemName: 'A', price: 900, priceMonthAgo: 1000 })]
    const picks = selectPicks(profiles, snap(entries), JULY)
    expect(picks.map((p) => p.profile.id)).toEqual(['priced', 'no-price'])
    expect(picks[1].price).toBeNull()
  })

  test('최대 limit개까지만', () => {
    const profiles = Array.from({ length: 8 }, (_, i) =>
      profile({ id: `p${i}`, kamis: { categoryCode: '200', itemName: `x${i}` } }),
    )
    expect(selectPicks(profiles, snap([]), JULY)).toHaveLength(5)
    expect(selectPicks(profiles, snap([]), JULY, 3)).toHaveLength(3)
  })

  test('스냅샷이 null이어도 제철 정보만으로 동작한다', () => {
    const picks = selectPicks([profile({ id: 'a' })], null, JULY)
    expect(picks).toHaveLength(1)
    expect(picks[0].price).toBeNull()
  })

  test('changeVsMonthAgoPct 계산: (당일-1개월전)/1개월전×100', () => {
    const profiles = [profile({ kamis: { categoryCode: '200', itemName: 'A' } })]
    const entries = [entry({ itemName: 'A', price: 880, priceMonthAgo: 1000 })]
    const picks = selectPicks(profiles, snap(entries), JULY)
    expect(picks[0].price?.changeVsMonthAgoPct).toBeCloseTo(-12)
  })
})

describe('whyNowLine', () => {
  test('해당 월 문구가 있으면 그걸, 없으면 default', () => {
    const p = profile({ whyNow: { default: '기본', '7': '칠월 문구' } })
    expect(whyNowLine(p, 7)).toBe('칠월 문구')
    expect(whyNowLine(p, 8)).toBe('기본')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- tests/picks.test.ts`
Expected: FAIL — `src/picks.ts` 없음

- [ ] **Step 3: 구현**

`src/picks.ts`:

```ts
import type { PriceEntry, PriceSnapshot, ProduceProfile } from './types'

export interface PriceView {
  price: number
  unit: string
  /** 1개월 전 대비 % (음수 = 하락). 1개월 전 가격이 없으면 null */
  changeVsMonthAgoPct: number | null
}

export interface PickResult {
  profile: ProduceProfile
  inPeak: boolean
  price: PriceView | null
}

export function seasonalThisMonth(profiles: ProduceProfile[], month: number): ProduceProfile[] {
  return profiles.filter((p) => p.seasonMonths.includes(month))
}

export function matchEntry(profile: ProduceProfile, entries: PriceEntry[]): PriceEntry | null {
  const byName = entries.filter(
    (e) => e.itemName === profile.kamis.itemName && e.price !== null,
  )
  if (byName.length === 0) return null
  const kind = profile.kamis.kindName
  const byKind = kind ? byName.filter((e) => e.kindName.includes(kind)) : byName
  const pool = byKind.length > 0 ? byKind : byName
  return pool.find((e) => e.rank === '상품') ?? pool[0]
}

export function priceView(entry: PriceEntry): PriceView {
  const { price, priceMonthAgo, unit } = entry
  const change =
    price !== null && priceMonthAgo !== null
      ? ((price - priceMonthAgo) / priceMonthAgo) * 100
      : null
  return { price: price as number, unit, changeVsMonthAgoPct: change }
}

export function whyNowLine(profile: ProduceProfile, month: number): string {
  return profile.whyNow[String(month)] ?? profile.whyNow['default'] ?? ''
}

/** 정렬: 절정 그룹 먼저 → 그룹 안에서 하락률 큰 순 → 가격 결측은 그룹 맨 뒤 */
export function selectPicks(
  profiles: ProduceProfile[],
  snapshot: PriceSnapshot | null,
  today: Date,
  limit = 5,
): PickResult[] {
  const month = today.getMonth() + 1
  const results: PickResult[] = seasonalThisMonth(profiles, month).map((profile) => {
    const entry = snapshot ? matchEntry(profile, snapshot.entries) : null
    return {
      profile,
      inPeak: profile.peakMonths.includes(month),
      price: entry ? priceView(entry) : null,
    }
  })
  const groupOf = (r: PickResult) => (r.price === null ? 2 : r.price.changeVsMonthAgoPct === null ? 1 : 0)
  results.sort((a, b) => {
    if (a.inPeak !== b.inPeak) return a.inPeak ? -1 : 1
    const ga = groupOf(a)
    const gb = groupOf(b)
    if (ga !== gb) return ga - gb
    if (ga === 0) return a.price!.changeVsMonthAgoPct! - b.price!.changeVsMonthAgoPct!
    return 0
  })
  return results.slice(0, limit)
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- tests/picks.test.ts`
Expected: PASS (테스트 12개)

- [ ] **Step 5: Commit**

```bash
git add src/picks.ts tests/picks.test.ts
git commit -m "feat: 제철 픽 선정 로직 (절정 우선, 하락률 정렬, 결측 처리)"
```

---

### Task 7: 데이터 접근 모듈 (`data.ts`) & 표시 헬퍼

**Files:**
- Create: `src/data.ts`
- Test: `tests/data.test.ts`

**Interfaces:**
- Consumes: Task 2의 타입
- Produces:
  - `loadProfiles() => Promise<ProduceProfile[]>` — `${BASE_URL}data/produce.json` fetch, 실패 시 throw (프로필 없이는 앱이 무의미)
  - `loadSnapshot() => Promise<PriceSnapshot | null>` — 실패 시 null (가격 없이도 동작)
  - `snapshotAgeDays(snapshot, now) => number` — 스냅샷 나이(일). UI가 3 이상이면 배지 표시

UI는 이 모듈만 통해 데이터를 얻는다 — 나중에 정적 JSON을 API로 바꿔도 이 파일만 수정 (스펙의 열린 설계).

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/data.test.ts` (fetch는 stub, `snapshotAgeDays`는 순수 함수):

```ts
import { afterEach, describe, expect, test, vi } from 'vitest'
import { loadSnapshot, snapshotAgeDays } from '../src/data'
import type { PriceSnapshot } from '../src/types'

const snap: PriceSnapshot = {
  schemaVersion: 1,
  fetchedAt: '2026-07-07T22:00:00Z',
  entries: [],
}

afterEach(() => vi.unstubAllGlobals())

describe('snapshotAgeDays', () => {
  test('만 3일 지난 스냅샷은 3', () => {
    expect(snapshotAgeDays(snap, new Date('2026-07-10T23:00:00Z'))).toBe(3)
  })
  test('당일이면 0', () => {
    expect(snapshotAgeDays(snap, new Date('2026-07-08T01:00:00Z'))).toBe(0)
  })
})

describe('loadSnapshot', () => {
  test('fetch 실패 시 null (가격 없이도 앱은 동작)', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: false, status: 404 }))
    expect(await loadSnapshot()).toBeNull()
  })
  test('네트워크 예외에도 null', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('offline')
    })
    expect(await loadSnapshot()).toBeNull()
  })
  test('성공 시 파싱된 스냅샷', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => snap }))
    expect(await loadSnapshot()).toEqual(snap)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- tests/data.test.ts`
Expected: FAIL — `src/data.ts` 없음

- [ ] **Step 3: 구현**

`src/data.ts`:

```ts
import type { PriceSnapshot, ProduceProfile } from './types'

// import.meta.env는 Vite 밖(vitest node 환경)에서도 안전하도록 폴백
const BASE: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'

export async function loadProfiles(): Promise<ProduceProfile[]> {
  const res = await fetch(`${BASE}data/produce.json`)
  if (!res.ok) throw new Error(`제철 프로필을 불러오지 못했어요 (${res.status})`)
  return res.json()
}

export async function loadSnapshot(): Promise<PriceSnapshot | null> {
  try {
    const res = await fetch(`${BASE}data/prices.json`)
    if (!res.ok) return null
    return (await res.json()) as PriceSnapshot
  } catch {
    return null
  }
}

export function snapshotAgeDays(snapshot: PriceSnapshot, now: Date): number {
  const ms = now.getTime() - new Date(snapshot.fetchedAt).getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- tests/data.test.ts`
Expected: PASS (테스트 5개)

- [ ] **Step 5: Commit**

```bash
git add src/data.ts tests/data.test.ts
git commit -m "feat: 데이터 접근 모듈 (정적 JSON, 실패 허용, 신선도 계산)"
```

---

### Task 8: 화면 렌더링 (`render.ts`, `main.ts`, `style.css`)

**Files:**
- Create: `src/render.ts`
- Modify: `src/main.ts`, `src/style.css` (Task 1의 임시 내용 교체)
- Test: `tests/render.test.ts`

**Interfaces:**
- Consumes: Task 6의 `PickResult`, `PriceView`, `whyNowLine`, `seasonalThisMonth`; Task 7의 로더들
- Produces:
  - `weekLabel(date) => "7월 둘째 주"`
  - `formatPrice(view) => "18,200원/10개 · 한 달 전보다 26% ↓"` (±1% 미만은 "한 달 전과 비슷해요")
  - `escapeHtml(s) => string`
  - `renderApp({ picks, seasonal, date, staleDays }) => string` — 전체 페이지 HTML
  - `src/main.ts` — 로드 → 계산 → `#app`에 주입

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/render.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { escapeHtml, formatPrice, renderApp, weekLabel } from '../src/render'
import type { PickResult } from '../src/picks'
import type { ProduceProfile } from '../src/types'

const profile: ProduceProfile = {
  id: 'peach',
  name: '복숭아',
  emoji: '🍑',
  category: 'fruit',
  kamis: { categoryCode: '400', itemName: '복숭아' },
  seasonMonths: [7, 8],
  peakMonths: [7],
  whyNow: { default: '여름이 절정이에요' },
  howToPick: '향이 진한 것',
  howToStore: '실온 후숙',
  howToUse: '그냥 먹기',
}

describe('weekLabel', () => {
  test('1일은 첫째 주', () => expect(weekLabel(new Date('2026-07-01'))).toBe('7월 첫째 주'))
  test('10일은 둘째 주', () => expect(weekLabel(new Date('2026-07-10'))).toBe('7월 둘째 주'))
  test('31일은 다섯째 주', () => expect(weekLabel(new Date('2026-07-31'))).toBe('7월 다섯째 주'))
})

describe('formatPrice', () => {
  test('하락', () =>
    expect(
      formatPrice({ price: 18200, unit: '10개', changeVsMonthAgoPct: -25.7 }),
    ).toBe('18,200원/10개 · 한 달 전보다 26% ↓'))
  test('상승', () =>
    expect(formatPrice({ price: 5000, unit: '1kg', changeVsMonthAgoPct: 12.2 })).toBe(
      '5,000원/1kg · 한 달 전보다 12% ↑',
    ))
  test('±1% 미만은 비슷해요', () =>
    expect(formatPrice({ price: 5000, unit: '1kg', changeVsMonthAgoPct: 0.4 })).toBe(
      '5,000원/1kg · 한 달 전과 비슷해요',
    ))
  test('비교 불가면 가격만', () =>
    expect(formatPrice({ price: 5000, unit: '1kg', changeVsMonthAgoPct: null })).toBe(
      '5,000원/1kg',
    ))
})

describe('escapeHtml', () => {
  test('특수문자를 이스케이프한다', () => {
    expect(escapeHtml('<b>&"\'</b>')).toBe('&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;')
  })
})

describe('renderApp', () => {
  const picks: PickResult[] = [
    {
      profile,
      inPeak: true,
      price: { price: 18200, unit: '10개', changeVsMonthAgoPct: -25.7 },
    },
  ]

  test('픽 카드에 이름·문구·가격이 들어간다', () => {
    const html = renderApp({ picks, seasonal: [profile], date: new Date('2026-07-10'), staleDays: 0 })
    expect(html).toContain('복숭아')
    expect(html).toContain('여름이 절정이에요')
    expect(html).toContain('18,200원')
    expect(html).toContain('제철 한창') // 절정 배지
    expect(html).toContain('7월 둘째 주')
  })

  test('가격이 없으면 가격 줄 없이 렌더링된다', () => {
    const html = renderApp({
      picks: [{ profile, inPeak: false, price: null }],
      seasonal: [profile],
      date: new Date('2026-07-10'),
      staleDays: 0,
    })
    expect(html).toContain('복숭아')
    expect(html).not.toContain('원/')
  })

  test('스냅샷이 3일 이상 오래되면 배지를 보여준다', () => {
    const html = renderApp({ picks, seasonal: [], date: new Date('2026-07-10'), staleDays: 4 })
    expect(html).toContain('가격은 4일 전 기준')
  })

  test('픽이 없으면 안내 문구', () => {
    const html = renderApp({ picks: [], seasonal: [], date: new Date('2026-07-10'), staleDays: 0 })
    expect(html).toContain('이번 달 제철 정보가 아직 없어요')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- tests/render.test.ts`
Expected: FAIL — `src/render.ts` 없음

- [ ] **Step 3: 렌더 함수 구현**

`src/render.ts`:

```ts
import type { PickResult, PriceView } from './picks'
import { whyNowLine } from './picks'
import type { ProduceProfile } from './types'

export function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function weekLabel(date: Date): string {
  const ordinals = ['첫째', '둘째', '셋째', '넷째', '다섯째']
  const idx = Math.min(Math.ceil(date.getDate() / 7), ordinals.length) - 1
  return `${date.getMonth() + 1}월 ${ordinals[idx]} 주`
}

export function formatPrice(view: PriceView): string {
  const won = `${view.price.toLocaleString('ko-KR')}원/${view.unit}`
  const pct = view.changeVsMonthAgoPct
  if (pct === null) return won
  const rounded = Math.round(Math.abs(pct))
  if (Math.abs(pct) < 1) return `${won} · 한 달 전과 비슷해요`
  return pct < 0 ? `${won} · 한 달 전보다 ${rounded}% ↓` : `${won} · 한 달 전보다 ${rounded}% ↑`
}

function renderCard(result: PickResult, month: number): string {
  const { profile, inPeak, price } = result
  const badge = inPeak ? '<span class="badge badge-peak">제철 한창</span>' : '<span class="badge">제철</span>'
  // summary 안에는 블록 요소(<p>)가 유효하지 않아 span + display:block 사용
  const priceLine = price ? `<span class="price">${escapeHtml(formatPrice(price))}</span>` : ''
  return `
<details class="card">
  <summary>
    <span class="card-title">${profile.emoji} ${escapeHtml(profile.name)} ${badge}</span>
    <span class="why">${escapeHtml(whyNowLine(profile, month))}</span>
    ${priceLine}
  </summary>
  <dl class="detail">
    <dt>고르는 법</dt><dd>${escapeHtml(profile.howToPick)}</dd>
    <dt>보관법</dt><dd>${escapeHtml(profile.howToStore)}</dd>
    <dt>이렇게 먹어요</dt><dd>${escapeHtml(profile.howToUse)}</dd>
  </dl>
</details>`
}

export interface AppView {
  picks: PickResult[]
  seasonal: ProduceProfile[]
  date: Date
  staleDays: number
}

export function renderApp({ picks, seasonal, date, staleDays }: AppView): string {
  const month = date.getMonth() + 1
  const stale =
    staleDays >= 3 ? `<p class="stale">가격은 ${staleDays}일 전 기준이에요</p>` : ''
  const cards =
    picks.length > 0
      ? picks.map((p) => renderCard(p, month)).join('\n')
      : '<p class="empty">이번 달 제철 정보가 아직 없어요</p>'
  const seasonalList = seasonal
    .map((p) => `<li>${p.emoji} ${escapeHtml(p.name)}</li>`)
    .join('')
  return `
<header>
  <p class="week">${escapeHtml(weekLabel(date))}</p>
  <h1>지금 장바구니에 담기 좋은 것들</h1>
  ${stale}
</header>
<main>
  <section class="picks">${cards}</section>
  <section class="seasonal">
    <h2>${month}월의 제철</h2>
    <ul>${seasonalList}</ul>
  </section>
</main>
<footer>
  <p>가격: KAMIS(한국농수산식품유통공사) 일별 소매가격 · 전국 평균</p>
</footer>`
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- tests/render.test.ts`
Expected: PASS (테스트 12개)

- [ ] **Step 5: main.ts와 style.css 교체**

`src/main.ts`:

```ts
import './style.css'
import { loadProfiles, loadSnapshot, snapshotAgeDays } from './data'
import { seasonalThisMonth, selectPicks } from './picks'
import { renderApp } from './render'

async function start() {
  const app = document.querySelector('#app')!
  try {
    const [profiles, snapshot] = await Promise.all([loadProfiles(), loadSnapshot()])
    const now = new Date()
    app.innerHTML = renderApp({
      picks: selectPicks(profiles, snapshot, now),
      seasonal: seasonalThisMonth(profiles, now.getMonth() + 1),
      date: now,
      staleDays: snapshot ? snapshotAgeDays(snapshot, now) : 0,
    })
  } catch {
    app.innerHTML = '<p class="empty">정보를 불러오지 못했어요. 잠시 후 다시 열어주세요.</p>'
  }
}

start()
```

`src/style.css` — 기능 확인용 임시 골격 (**Task 8b에서 `DESIGN.md` 토큰으로 전면 교체된다** — 이 단계에서는 색·폰트를 다듬지 말 것):

```css
:root {
  --bg: #faf7f2;
  --card: #ffffff;
  --ink: #2b2722;
  --muted: #8a8177;
  --accent: #4a7c59;
  --drop: #2e7d4f;
  --rise: #b45f3c;
  --line: #eee7dc;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

#app { max-width: 28rem; margin: 0 auto; padding: 1.25rem 1rem 3rem; }

header .week { color: var(--muted); font-size: 0.85rem; margin: 0.5rem 0 0; }
header h1 { font-size: 1.35rem; margin: 0.15rem 0 1rem; font-weight: 700; }
.stale {
  font-size: 0.8rem; color: var(--rise);
  background: #fdf3ec; border-radius: 0.5rem; padding: 0.4rem 0.7rem;
}

.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 0.9rem;
  padding: 0.9rem 1rem;
  margin-bottom: 0.7rem;
}
.card summary { cursor: pointer; list-style: none; }
.card summary::-webkit-details-marker { display: none; }
.card-title { font-size: 1.05rem; font-weight: 700; }
.badge {
  font-size: 0.7rem; font-weight: 600; color: var(--accent);
  border: 1px solid currentColor; border-radius: 999px;
  padding: 0.05rem 0.5rem; margin-left: 0.3rem; vertical-align: 0.1rem;
}
.badge-peak { color: #fff; background: var(--accent); border-color: var(--accent); }
.why { display: block; margin: 0.35rem 0 0; font-size: 0.9rem; }
.price { display: block; margin: 0.25rem 0 0; font-size: 0.85rem; color: var(--drop); font-weight: 600; }

.detail { margin: 0.8rem 0 0.2rem; border-top: 1px solid var(--line); padding-top: 0.8rem; }
.detail dt { font-size: 0.78rem; font-weight: 700; color: var(--muted); }
.detail dd { margin: 0.15rem 0 0.7rem; font-size: 0.9rem; }

.seasonal { margin-top: 2rem; }
.seasonal h2 { font-size: 1rem; color: var(--muted); }
.seasonal ul { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.5rem 0 0; }
.seasonal li {
  background: var(--card); border: 1px solid var(--line);
  border-radius: 999px; padding: 0.25rem 0.8rem; font-size: 0.85rem;
}

footer { margin-top: 2.5rem; }
footer p, .empty, .loading { color: var(--muted); font-size: 0.75rem; }
.empty, .loading { font-size: 0.95rem; text-align: center; margin-top: 3rem; }
```

- [ ] **Step 6: 전체 테스트 + 눈으로 확인**

Run: `npm test && npm run dev`
Expected: 전체 테스트 PASS. 브라우저(`http://localhost:5173/wat-to-buy/`)에서:
- "7월 ○째 주" 헤더와 카드들이 보인다 (복숭아·수박·참외 등 7월 제철 + 시드 가격)
- 옥수수 카드는 가격 줄 없이 제철 정보만 보인다
- 카드를 탭하면 고르는 법/보관법/활용법이 펼쳐진다
- 하단에 "7월의 제철" 리스트가 보인다

- [ ] **Step 7: Commit**

```bash
git add src/render.ts src/main.ts src/style.css tests/render.test.ts
git commit -m "feat: 제철 픽 화면 렌더링"
```

---

### Task 8b: 절기 시그니처와 계절 팔레트 (DESIGN.md 적용)

**Files:**
- Create: `src/season.ts`, `src/fonts/` (마루 부리 woff2 2종)
- Modify: `src/render.ts` (절기 아이브로), `src/main.ts` (계절 클래스), `src/style.css` (전면 교체)
- Test: `tests/season.test.ts`, `tests/render.test.ts` (테스트 추가)

**Interfaces:**
- Consumes: `DESIGN.md`의 토큰 전부, Task 8의 `renderApp`/`AppView`
- Produces:
  - `currentTerm(date: Date) => string` — 현재 절기 이름 (예: "소서")
  - `seasonOf(month: number) => 'spring'|'summer'|'autumn'|'winter'`
  - `AppView`에 `term?: string` 추가 — 있으면 아이브로가 `소서 · 7월 둘째 주`
  - `body[data-season=…]`로 계절 팔레트 전환
  - 머리말에 쪽빛 라인아트 스케치(`.sprig` SVG) + 계절 틴트 블롭 (DESIGN.md 시그니처)

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/season.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { currentTerm, seasonOf } from '../src/season'

describe('currentTerm', () => {
  test('절기 당일부터 그 절기다', () => {
    expect(currentTerm(new Date('2026-07-07T12:00:00'))).toBe('소서')
  })
  test('다음 절기 전날까지 유지된다', () => {
    expect(currentTerm(new Date('2026-07-21T12:00:00'))).toBe('소서')
  })
  test('다음 절기로 넘어간다', () => {
    expect(currentTerm(new Date('2026-07-22T12:00:00'))).toBe('대서')
  })
  test('연초 소한 전에는 전년 동지', () => {
    expect(currentTerm(new Date('2026-01-02T12:00:00'))).toBe('동지')
  })
})

describe('seasonOf', () => {
  test('3~5월은 봄', () => expect(seasonOf(4)).toBe('spring'))
  test('6~8월은 여름', () => expect(seasonOf(7)).toBe('summer'))
  test('9~11월은 가을', () => expect(seasonOf(10)).toBe('autumn'))
  test('12~2월은 겨울', () => {
    expect(seasonOf(12)).toBe('winter')
    expect(seasonOf(1)).toBe('winter')
  })
})
```

`tests/render.test.ts`의 `describe('renderApp', …)` 안에 추가:

```ts
  test('절기가 있으면 아이브로에 함께 표기된다', () => {
    const html = renderApp({
      picks: [],
      seasonal: [],
      date: new Date('2026-07-10'),
      staleDays: 0,
      term: '소서',
    })
    expect(html).toContain('소서 · 7월 둘째 주')
  })

  test('머리말에 라인아트 스케치가 들어간다', () => {
    const html = renderApp({ picks: [], seasonal: [], date: new Date('2026-07-10'), staleDays: 0 })
    expect(html).toContain('class="sprig"')
  })
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- tests/season.test.ts tests/render.test.ts`
Expected: FAIL — `src/season.ts` 없음, `term` 프로퍼티 없음

- [ ] **Step 3: season.ts 구현**

`src/season.ts`:

```ts
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

interface Term {
  name: string
  month: number
  day: number
}

/** 표기용 고정 날짜. 실제 절기는 해마다 ±1일 다르지만
 *  이 앱에서 절기는 시계가 아니라 계절 인사말이다 (DESIGN.md). */
const TERMS: Term[] = [
  { name: '소한', month: 1, day: 5 },
  { name: '대한', month: 1, day: 20 },
  { name: '입춘', month: 2, day: 4 },
  { name: '우수', month: 2, day: 19 },
  { name: '경칩', month: 3, day: 5 },
  { name: '춘분', month: 3, day: 20 },
  { name: '청명', month: 4, day: 5 },
  { name: '곡우', month: 4, day: 20 },
  { name: '입하', month: 5, day: 5 },
  { name: '소만', month: 5, day: 21 },
  { name: '망종', month: 6, day: 6 },
  { name: '하지', month: 6, day: 21 },
  { name: '소서', month: 7, day: 7 },
  { name: '대서', month: 7, day: 22 },
  { name: '입추', month: 8, day: 7 },
  { name: '처서', month: 8, day: 23 },
  { name: '백로', month: 9, day: 7 },
  { name: '추분', month: 9, day: 22 },
  { name: '한로', month: 10, day: 8 },
  { name: '상강', month: 10, day: 23 },
  { name: '입동', month: 11, day: 7 },
  { name: '소설', month: 11, day: 22 },
  { name: '대설', month: 12, day: 7 },
  { name: '동지', month: 12, day: 21 },
]

export function currentTerm(date: Date): string {
  const m = date.getMonth() + 1
  const d = date.getDate()
  const passed = TERMS.filter((t) => t.month < m || (t.month === m && t.day <= d))
  // 1월 초 소한 전이면 전년 마지막 절기(동지)
  return passed.length > 0 ? passed[passed.length - 1].name : TERMS[TERMS.length - 1].name
}

export function seasonOf(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}
```

- [ ] **Step 4: render.ts에 절기 아이브로와 스케치 추가**

`src/render.ts`의 `AppView`와 `renderApp` 헤더 부분 수정:

```ts
export interface AppView {
  picks: PickResult[]
  seasonal: ProduceProfile[]
  date: Date
  staleDays: number
  /** 현재 절기 이름 — 있으면 아이브로에 "소서 · 7월 둘째 주"로 표기 */
  term?: string
}
```

`renderApp` 안의 헤더 문자열에서 `<p class="week">…</p>` 줄을 다음으로 교체:

```ts
  const eyebrow = view.term ? `${view.term} · ${weekLabel(date)}` : weekLabel(date)
```

```html
<p class="week">${escapeHtml(eyebrow)}</p>
```

(구조 분해에 `term`을 포함하도록 함수 시그니처도 맞춘다:
`renderApp({ picks, seasonal, date, staleDays, term }: AppView)` — `view.term` 대신 `term` 사용.)

같은 파일 상단에 보태니컬 스케치 상수를 추가하고, `<header>` 여는 태그 바로 뒤에
`${SPRIG}`를 넣는다 (쪽빛 선만 있는 잎가지 — `currentColor`라 CSS가 색을 정한다):

```ts
const SPRIG = `<svg class="sprig" viewBox="0 0 120 120" fill="none" aria-hidden="true">
  <path d="M20 110 C 45 85, 70 55, 98 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M46 82 C 38 68, 40 58, 52 50 C 56 62, 54 72, 46 82 Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M64 60 C 74 46, 86 42, 98 46 C 92 58, 80 64, 64 60 Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M34 96 C 26 88, 24 78, 30 70 C 38 76, 40 88, 34 96 Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  <circle cx="98" cy="18" r="4" stroke="currentColor" stroke-width="1.5"/>
</svg>`
```

- [ ] **Step 5: 통과 확인**

Run: `npm test`
Expected: 전체 PASS (기존 renderApp 테스트는 `term` 없이도 통과 — 옵셔널이므로)

- [ ] **Step 6: 마루 부리 폰트 셀프호스트**

https://hangeul.naver.com 에서 "마루 부리" 폰트 패키지를 내려받아
`MaruBuri-Regular.woff2`, `MaruBuri-Bold.woff2` 두 파일을 `src/fonts/`에 복사한다.
(다운로드가 어려우면 이 단계를 건너뛴다 — CSS의 `serif` 폴백으로 동작한다.
그 경우 아래 CSS의 `@font-face` 블록 두 개만 빼고 진행.)

- [ ] **Step 7: style.css 전면 교체 (DESIGN.md 토큰)**

`src/style.css` 전체를 다음으로 교체:

```css
@font-face {
  font-family: 'MaruBuri';
  src: url('./fonts/MaruBuri-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: 'MaruBuri';
  src: url('./fonts/MaruBuri-Bold.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}

/* DESIGN.md "절기 스케치북" 토큰 — 텍스트는 오직 쪽빛(--ink)이 소유한다.
   계절 웜 컬러는 글자를 싣지 않고 배경(배지·블롭·칩)으로만 쓴다. */
:root {
  --paper: #fbf9f6;
  --card: #ffffff;
  --ink: #2b4586;
  --muted: #7b84a3;
  --line: #e7e2d6;
  --rise: #8c6a5d;
  /* 계절 기본값 (여름) — main.ts가 body[data-season]으로 덮어쓴다 */
  --accent: #ffc400;
  --tint: #fff4ce;
}
body[data-season='spring'] { --accent: #a2d3a6; --tint: #eaf4e9; }
body[data-season='summer'] { --accent: #ffc400; --tint: #fff4ce; }
body[data-season='autumn'] { --accent: #ed7328; --tint: #fbe7d6; }
body[data-season='winter'] { --accent: #bc6e79; --tint: #f6e7ea; }

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}

#app { max-width: 28rem; margin: 0 auto; padding: 1.5rem 1.1rem 3rem; }

/* 헤더 — 시그니처: 쪽빛 스케치 + 계절 틴트 블롭 */
header { position: relative; }
header::before {
  content: '';
  position: absolute;
  top: -0.6rem;
  right: -0.4rem;
  width: 9rem;
  height: 7rem;
  background: var(--tint);
  border-radius: 48% 52% 61% 39% / 55% 44% 56% 45%;
  z-index: -1;
}
.sprig {
  position: absolute;
  top: 0;
  right: 0.2rem;
  width: 6.5rem;
  height: auto;
  color: var(--ink);
  opacity: 0.35;
}
.week {
  font-family: 'MaruBuri', serif;
  color: var(--ink);
  font-size: 0.9rem;
  letter-spacing: 0.02em;
  margin: 0.4rem 0 0;
}
header h1 {
  font-family: 'MaruBuri', serif;
  font-weight: 700;
  font-size: 1.5rem;
  line-height: 1.45;
  margin: 0.2rem 0 1.3rem;
}
.stale {
  font-size: 0.8rem;
  color: var(--rise);
  border: 1px solid currentColor;
  border-radius: 0.5rem;
  padding: 0.35rem 0.7rem;
  display: inline-block;
}

/* 카드 — 달력 낱장 */
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 0.9rem;
  padding: 0.95rem 1.05rem;
  margin-bottom: 0.7rem;
}
.card summary { cursor: pointer; list-style: none; }
.card summary::-webkit-details-marker { display: none; }
.card-title { font-size: 1.05rem; font-weight: 700; }
.badge {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.05rem 0.5rem;
  margin-left: 0.3rem;
  vertical-align: 0.1rem;
}
/* 웜 컬러는 배경으로만 — 글자는 쪽빛 유지 (명도 대비 규율) */
.badge-peak { background: var(--tint); border-color: var(--accent); }
.why { display: block; margin: 0.35rem 0 0; font-size: 0.9rem; }
.price {
  display: block;
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: var(--ink);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.detail {
  margin: 0.85rem 0 0.2rem;
  border-top: 1px solid var(--line);
  padding-top: 0.85rem;
}
.detail dt {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--muted);
  letter-spacing: 0.08em; /* Pa'lais의 넓은 자간을 한글 소형 라벨로 번안 */
}
.detail dd { margin: 0.15rem 0 0.7rem; font-size: 0.9rem; }

/* 이번 달 제철 리스트 */
.seasonal { margin-top: 2.2rem; }
.seasonal h2 {
  font-size: 0.95rem;
  color: var(--muted);
  font-weight: 600;
  margin: 0 0 0.5rem;
}
.seasonal ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.seasonal li {
  background: var(--tint);
  border-radius: 999px;
  padding: 0.25rem 0.8rem;
  font-size: 0.85rem;
}

footer { margin-top: 2.5rem; }
footer p { color: var(--muted); font-size: 0.75rem; }
.empty, .loading {
  color: var(--muted);
  font-size: 0.95rem;
  text-align: center;
  margin-top: 3rem;
}

/* 접근성 */
:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) {
  .card { transition: border-color 0.15s ease; }
  .card[open] { border-color: var(--accent); }
}
```

- [ ] **Step 8: main.ts에 절기·계절 연결**

`src/main.ts` 전체 교체:

```ts
import './style.css'
import { loadProfiles, loadSnapshot, snapshotAgeDays } from './data'
import { seasonalThisMonth, selectPicks } from './picks'
import { renderApp } from './render'
import { currentTerm, seasonOf } from './season'

async function start() {
  const app = document.querySelector('#app')!
  const now = new Date()
  document.body.dataset.season = seasonOf(now.getMonth() + 1)
  try {
    const [profiles, snapshot] = await Promise.all([loadProfiles(), loadSnapshot()])
    app.innerHTML = renderApp({
      picks: selectPicks(profiles, snapshot, now),
      seasonal: seasonalThisMonth(profiles, now.getMonth() + 1),
      date: now,
      staleDays: snapshot ? snapshotAgeDays(snapshot, now) : 0,
      term: currentTerm(now),
    })
  } catch {
    app.innerHTML = '<p class="empty">정보를 불러오지 못했어요. 잠시 후 다시 열어주세요.</p>'
  }
}

start()
```

- [ ] **Step 9: 전체 테스트 + 눈으로 확인**

Run: `npm test && npm run dev`
Expected: 전체 PASS. 브라우저에서:
- 크림 종이 배경 위 모든 텍스트가 쪽빛, 머리말 오른쪽에 잎가지 스케치 + 꿀색 블롭
- 아이브로가 "소서 · 7월 ○째 주" (7월 기준), 절정 배지는 꿀색 틴트 배경
- h1과 아이브로만 부리체, 나머지는 시스템 고딕
- 개발자 도구에서 `document.body.dataset.season = 'winter'`로 바꾸면 블롭·배지가 팥죽색으로
- DESIGN.md의 색 규율(웜 컬러 위 글자 금지)과 "결정 기록"에 어긋난 곳이 없는지 확인

- [ ] **Step 10: Commit**

```bash
git add src tests
git commit -m "feat: 절기 아이브로와 계절 팔레트 (DESIGN.md 적용)"
```

---

### Task 9: 매칭 커버리지 리포트 (`report-coverage.mjs`)

**Files:**
- Create: `scripts/report-coverage.mjs`
- Test: 없음 (읽기 전용 진단 도구 — 출력만 확인)

**Interfaces:**
- Consumes: `public/data/produce.json`, `public/data/prices.json`, Task 6의 매칭 규칙과 동일한 로직
- Produces: CLI 리포트 — 프로필 중 가격 매칭 안 되는 품목 목록 (Task 11에서 이름 확정에 사용)

- [ ] **Step 1: 구현**

`scripts/report-coverage.mjs`:

```js
import { readFileSync } from 'node:fs'

const read = (p) => JSON.parse(readFileSync(new URL(`../public/data/${p}`, import.meta.url), 'utf-8'))
const profiles = read('produce.json')
const snapshot = read('prices.json')

const matched = []
const unmatched = []
for (const p of profiles) {
  const hit = snapshot.entries.find((e) => e.itemName === p.kamis.itemName && e.price !== null)
  ;(hit ? matched : unmatched).push(p)
}

console.log(`스냅샷: ${snapshot.fetchedAt} (${snapshot.entries.length}개 항목)`)
console.log(`매칭됨: ${matched.length}/${profiles.length}`)
if (unmatched.length > 0) {
  console.log('\n가격 매칭 안 됨 (kamis.itemName 확인 필요):')
  for (const p of unmatched) console.log(`  - ${p.name} (itemName="${p.kamis.itemName}")`)
}
```

- [ ] **Step 2: 실행 확인**

Run: `npm run report:coverage`
Expected: 시드 데이터 기준 "매칭됨: 7/40" 수준 + 미매칭 목록 출력 (시드 prices.json에는 7개 품목만 있으므로 정상)

- [ ] **Step 3: Commit**

```bash
git add scripts/report-coverage.mjs
git commit -m "chore: KAMIS 매칭 커버리지 리포트 스크립트"
```

---

### Task 10: GitHub Actions 워크플로 & README

**Files:**
- Create: `.github/workflows/update-prices.yml`, `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Consumes: Task 5의 CLI (`node scripts/fetch-prices.mjs`), `npm test`, `npm run build`
- Produces: 매일 07:00 KST 가격 갱신 커밋 + main 푸시 시 GitHub Pages 배포

- [ ] **Step 1: 가격 갱신 워크플로**

`.github/workflows/update-prices.yml`:

```yaml
name: update-prices

on:
  schedule:
    - cron: '0 22 * * *' # 07:00 KST
  workflow_dispatch:

permissions:
  contents: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Fetch KAMIS prices
        run: node scripts/fetch-prices.mjs
        env:
          KAMIS_CERT_KEY: ${{ secrets.KAMIS_CERT_KEY }}
          KAMIS_CERT_ID: ${{ secrets.KAMIS_CERT_ID }}
      - name: Commit if changed
        run: |
          if ! git diff --quiet public/data/prices.json; then
            git config user.name 'github-actions[bot]'
            git config user.email 'github-actions[bot]@users.noreply.github.com'
            git add public/data/prices.json
            git commit -m "chore: 가격 데이터 갱신 ($(TZ=Asia/Seoul date +%Y-%m-%d))"
            git push
          else
            echo "변경 없음"
          fi
```

- [ ] **Step 2: 배포 워크플로**

`.github/workflows/deploy.yml`:

```yaml
name: deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: README 작성**

`README.md`:

```markdown
# 지금 담기 좋은 것 (wat-to-buy)

이번 달 제철인 과일·채소 중 가격이 내려온 것들을 알려주는 작은 웹앱.
이커머스가 아니라, 장보기 갈 때 옆에 두는 계절 달력에 가깝습니다.

- 데이터: [KAMIS 오픈API](https://www.kamis.or.kr) 일별 소매가격 (전국 평균)
- 제철 프로필: `public/data/produce.json` (직접 큐레이션)
- 서버 없음 — GitHub Actions가 매일 07:00 KST에 가격 스냅샷을 커밋하고,
  GitHub Pages로 배포합니다.

## 개발

    npm install
    npm run dev        # http://localhost:5173/wat-to-buy/
    npm test

## 가격 데이터 갱신 (수동)

    KAMIS_CERT_KEY=... KAMIS_CERT_ID=... npm run fetch:prices
    npm run report:coverage   # 프로필-가격 매칭 확인

## 배포 설정 (1회)

1. GitHub 저장소 이름은 `wat-to-buy` (Vite base 경로와 일치해야 함.
   다르면 `vite.config.ts`의 `base` 수정)
2. Settings → Pages → Source를 "GitHub Actions"로
3. Settings → Secrets → Actions에 `KAMIS_CERT_KEY`, `KAMIS_CERT_ID` 등록
   (키 발급: kamis.or.kr → Open-API 인증키 신청)

## 설계 문서

- 스펙: `docs/superpowers/specs/2026-07-09-seasonal-picks-design.md`
- 구현 계획: `docs/superpowers/plans/2026-07-10-seasonal-picks.md`
```

- [ ] **Step 4: 전체 테스트 + 빌드 확인**

Run: `npm test && npm run build`
Expected: 전체 PASS, `dist/` 안에 `index.html`과 `data/produce.json`, `data/prices.json`이 존재 (`ls dist/data`로 확인)

- [ ] **Step 5: Commit**

```bash
git add .github README.md
git commit -m "chore: 가격 갱신·배포 워크플로와 README"
```

---

### Task 11: 실데이터 연결 검증 (KAMIS 키 도착 후 — 수동 체크리스트)

**Files:**
- Modify: `tests/fixtures/kamis-daily-200.json` (실응답으로 교체), `public/data/produce.json` (itemName 교정), `public/data/prices.json` (실데이터)

**Interfaces:**
- Consumes: 발급받은 `KAMIS_CERT_KEY` / `KAMIS_CERT_ID`, Task 5 CLI, Task 9 리포트
- Produces: 실데이터로 검증된 파서·매칭. 이 태스크 전까지 앱은 시드 데이터로 완전히 동작한다.

- [ ] **Step 1: 실제 응답 수집**

Run: `KAMIS_CERT_KEY=<키> KAMIS_CERT_ID=<아이디> npm run fetch:prices`
Expected: `prices.json 갱신: N개 항목` (N > 50)

실패하면: 응답 본문을 확인하고 Task 4의 파서 가정(필드명 `dpr1~4`, 오류 형식)을 실제 응답에 맞게 수정한 뒤 픽스처·테스트를 갱신한다.

- [ ] **Step 2: 픽스처를 실응답 기반으로 교체**

실제 응답에서 4~5행을 골라 `tests/fixtures/kamis-daily-200.json`을 갱신 (개인 키는 픽스처에 남기지 않는다 — `condition` 블록에서 키 제거).

Run: `npm test`
Expected: PASS (실패하면 파서와 테스트를 실제 형식에 맞춰 수정)

- [ ] **Step 3: 매칭 커버리지 확인 및 itemName 교정**

Run: `npm run report:coverage`
Expected: 매칭 30개 이상. 미매칭 품목은 실제 `item_name` 값에 맞춰 `produce.json`의 `kamis.itemName`을 교정한다 (KAMIS 소매 조사에 아예 없는 품목은 그대로 둔다 — 제철 정보만으로 동작).

- [ ] **Step 4: 눈으로 최종 확인**

Run: `npm run dev`
Expected: 실제 가격으로 카드가 렌더링되고, 하락 % 표시가 자연스럽다

- [ ] **Step 5: Commit**

```bash
git add public/data tests/fixtures
git commit -m "feat: KAMIS 실데이터 연결 및 품목명 교정"
```

---

## 이 계획이 다루지 않는 것 (스펙의 "열린 방향" — 전부 나중 일)

주간 다이제스트, 가격 트렌드 그래프, 수산물 확장, PWA, LLM 코멘트,
레시피 추천, 마트·시장 정보, 커뮤니티. 구조가 이들을 막지 않는지는
각 태스크의 Interfaces(순수 함수 격리, 데이터 접근 모듈, regday 인자)로 보장한다.
