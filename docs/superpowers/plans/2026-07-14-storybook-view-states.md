# Storybook 뷰 상태 탐색기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 원시 데이터 노브를 돌리면 진짜 파생 파이프라인(`picks` → `card` → `components`)이 작동해 카드·페이지가 변하는 Storybook을 붙여, "데이터 → UI" 인과를 손으로 확인할 수 있게 한다.

**Architecture:** 스토리는 `CardView`를 손으로 조립하지 않는다. 노브로 `ProduceProfile` + `PriceEntry`(원시 재료)를 짓고, 진짜 `priceView()` → `toCardView()`를 통과시켜 진짜 `<ProduceCard>`에 먹인다. 그래서 `card.ts`의 규칙(1% "비슷" 임계, 개당값 조건, 스파크 null 조건)이 스토리에서 그대로 작동하고, 도달 불가능한 조합은 애초에 만들 수 없다. 영양·레시피 픽스처는 지어내지 않고 실제 `nutrition.json`·`recipes.json`에서 가져온다.

**Tech Stack:** Storybook 10.5 (`@storybook/react-vite`) · Vite 8 · React 19 · TypeScript 6 · TanStack Router(메모리 히스토리 데코레이터)

## Global Constraints

- **스펙:** `docs/superpowers/specs/2026-07-14-storybook-view-states-design.md`
- **게이트 = `npm test` **와** `npx tsc --noEmit` 둘 다** (CLAUDE.md). Vitest는 타입체크를 하지 않는다.
- **UI 변경은 브라우저로 실측한다** (CLAUDE.md). 마지막 태스크에서 `npm run storybook`을 띄워 실제로 노브를 돌려본 뒤에야 완료로 부른다.
- 스토리 파일은 `src/components/*.stories.tsx` (컴포넌트 테스트가 `src/components/*.test.tsx`인 것과 같은 결).
- 공유 헬퍼는 `src/story-utils.tsx` (기존 `src/test-utils.tsx`의 짝).
- 사용자 문구는 한국어, 담백한 톤. 이커머스 화법 금지.
- 픽스처 데이터를 **지어내지 않는다.** 영양·레시피는 `public/data/*.json` 실물에서 가져온다.
- Vitest 기본 include는 `*.test.*`만 잡으므로 `*.stories.tsx`는 `npm test`에 안 섞인다 — 이 성질을 깨지 않는다.
- `tsconfig.json`의 `include`는 `["src", "tests"]`. 스토리는 `src/` 아래라 자동으로 `tsc` 대상이다 — **뷰 타입이 바뀌면 스토리가 타입에러로 먼저 깨진다.** 이게 의도다.
- CI에는 넣지 않는다. 이건 배포물이 아니라 이해를 위한 도구다.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `.storybook/main.ts` (신규) | Storybook 설정. `viteFinal`에서 `tanstack-*` 플러그인 제거 |
| `.storybook/preview.tsx` (신규) | `style.css` 로드, `body[data-season]` + `#app` 래퍼 데코레이터, 계절 툴바 |
| `src/story-utils.tsx` (신규) | 노브 → `PickResult` 빌더, 실물 영양·레시피 픽스처, 라우터 데코레이터 |
| `src/components/ProduceCard.stories.tsx` (신규) | 카드 케이스 (노브 → 진짜 파이프라인) |
| `src/components/App.stories.tsx` (신규) | 페이지 상태 + "그 달의 진짜 앱" |
| `src/components/Coming.stories.tsx` (신규) | 미래 월 계절색 · 빈 상태 |
| `package.json` (수정) | devDeps + `storybook` / `build-storybook` 스크립트 |
| `.gitignore` (수정) | `storybook-static/` 제외 |
| `CLAUDE.md` (수정) | 명령어 목록에 `npm run storybook` 한 줄 |

---

## Task 1: Storybook 설치 + Vite 설정 (tanstackStart 벗기기)

Storybook이 뜨는 것 자체가 이 태스크의 산출물이다. 여기서 실패하면 나머지가 전부 무의미하므로 먼저 세운다.

**Files:**
- Create: `.storybook/main.ts`
- Create: `.storybook/preview.tsx`
- Create: `src/components/Smoke.stories.tsx` (임시 — Task 2에서 삭제)
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: `npm run storybook`으로 뜨는 Storybook. 전역 데코레이터가 모든 스토리를 `<div id="app">`로 감싸고 `document.body.dataset.season`을 세팅한다. 툴바 글로벌 이름은 `season` (값: `'spring' | 'summer' | 'autumn' | 'winter'`).

**배경 — 왜 `tanstackStart`를 벗기나:**
`vite.config.ts`의 `tanstackStart()`는 플러그인 하나가 아니라 **26개짜리 프리셋**이다(SSR 엔트리·프리렌더·서버함수 변환·라우트 코드젠 등). 전부 클라이언트 전용인 Storybook 개발서버와 싸운다. 이름이 모두 `tanstack-` 접두어를 쓰므로 접두어로 거른다. 별도 vite config를 복제하지 않는 이유는, 복제본이 본 config가 바뀔 때 조용히 밀리기 때문이다.

- [ ] **Step 1: Storybook 설치**

```bash
npm i -D storybook@^10.5.0 @storybook/react-vite@^10.5.0
```

- [ ] **Step 2: `.storybook/main.ts` 작성**

`plugins` 배열은 중첩될 수 있으므로 먼저 평탄화한 뒤 필터한다. 하나도 못 걸러내면 조용히 이상해지는 대신 **throw한다** — 이 프로젝트의 어댑터 원칙(조용한 오염보다 시끄러운 실패)과 같다. 개수를 26으로 못 박지는 않는다. 버전마다 달라질 값이고, 그걸 규칙으로 굳히면 업그레이드마다 헛되이 깨진다.

```ts
import type { StorybookConfig } from '@storybook/react-vite'
import type { PluginOption } from 'vite'

/** vite의 plugins는 배열이 중첩될 수 있다 (프리셋이 배열을 돌려준다). */
function flatten(plugins: PluginOption[] | undefined): PluginOption[] {
  return (plugins ?? []).flatMap((p) => (Array.isArray(p) ? flatten(p) : p ? [p] : []))
}

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.tsx'],
  viteFinal: (config) => {
    // tanstackStart()는 SSR·프리렌더·라우트 코드젠 플러그인 26개짜리 프리셋이라
    // 클라이언트 전용 Storybook 개발서버와 싸운다. 이름 접두어로 걷어낸다.
    const flat = flatten(config.plugins)
    const kept = flat.filter((p) => !(p && 'name' in p && p.name.startsWith('tanstack')))
    if (kept.length === flat.length) {
      throw new Error(
        'tanstack-* 플러그인을 하나도 걷어내지 못했다. 플러그인 이름 규칙이 바뀌었을 수 있다 — ' +
          `현재 플러그인: ${flat.map((p) => (p && 'name' in p ? p.name : '?')).join(', ')}`,
      )
    }
    config.plugins = kept
    return config
  },
}

export default config
```

- [ ] **Step 3: `.storybook/preview.tsx` 작성**

`#app` 래퍼가 없으면 `style.css`의 `#app { max-width: 28rem }`이 안 걸려 스토리가 데스크톱 전폭으로 퍼진다. 계절은 실제 앱과 똑같이 `document.body`에 붙인다 (`__root.tsx`가 하는 일).

```tsx
import type { Decorator, Preview } from '@storybook/react-vite'
import '../src/style.css'

/** 실제 앱은 __root.tsx가 <body data-season>을 달고 #app으로 감싼다. 그대로 흉내낸다 —
 *  #app이 없으면 모바일 28rem 폭이 안 걸려 실물과 다르게 보인다. */
const withAppShell: Decorator = (Story, ctx) => {
  document.body.dataset.season = ctx.globals.season as string
  return (
    <div id="app">
      <Story />
    </div>
  )
}

const preview: Preview = {
  decorators: [withAppShell],
  parameters: { layout: 'fullscreen' },
  initialGlobals: { season: 'summer' },
  globalTypes: {
    season: {
      description: '계절 팔레트 — 실제 앱은 현재 월로 정한다 (season.ts)',
      toolbar: {
        title: '계절',
        icon: 'sun',
        dynamicTitle: true,
        items: [
          { value: 'spring', title: '봄 · 연두' },
          { value: 'summer', title: '여름 · 노랑' },
          { value: 'autumn', title: '가을 · 오렌지' },
          { value: 'winter', title: '겨울 · 자주' },
        ],
      },
    },
  },
}

export default preview
```

- [ ] **Step 4: 임시 스모크 스토리 작성**

Storybook이 뜨는지, CSS·폰트·계절 툴바가 먹는지 확인할 최소 스토리. Task 2에서 지운다.

```tsx
// src/components/Smoke.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Sprig } from './Sprig'

const meta: Meta<typeof Sprig> = { title: '스모크/Sprig', component: Sprig }
export default meta

export const Default: StoryObj<typeof Sprig> = {}
```

- [ ] **Step 5: `package.json` 스크립트 추가**

`scripts`에 두 줄을 더한다:

```json
"storybook": "storybook dev -p 6006",
"build-storybook": "storybook build"
```

- [ ] **Step 6: `.gitignore`에 산출물 추가**

`.gitignore` 끝에 한 줄:

```
storybook-static/
```

- [ ] **Step 7: 타입체크·테스트가 안 깨졌는지 확인**

```bash
npx tsc --noEmit && npm test
```
기대: 둘 다 통과. 스토리 파일이 `npm test`에 안 잡히는지도 함께 확인 — Vitest 출력의 테스트 파일 목록에 `Smoke.stories.tsx`가 없어야 한다.

- [ ] **Step 8: Storybook을 띄워 브라우저로 실측**

```bash
npm run storybook
```
기대:
- `http://localhost:6006`이 뜬다 (tanstack 플러그인 관련 에러 없음).
- "스모크/Sprig" 스토리에 잔가지 SVG가 보인다.
- 상단 툴바에 "계절" 스위치가 있고, 바꾸면 배경 톤(`--tint`)이 변한다.
- 본문 폭이 모바일 폭(28rem)으로 잡혀 있다.

실패하면 다음 태스크로 넘어가지 않는다.

- [ ] **Step 9: 커밋**

```bash
git add .storybook package.json package-lock.json .gitignore src/components/Smoke.stories.tsx
git commit -m "chore: Storybook 10 붙이기 — viteFinal에서 tanstack-* 플러그인 제거

tanstackStart()는 SSR·프리렌더 플러그인 26개짜리 프리셋이라 클라이언트 전용
Storybook과 싸운다. 이름 접두어로 걷어내되, 하나도 못 걷어내면 throw한다."
```

---

## Task 2: 노브 → PickResult 빌더 (`story-utils.tsx`)

스토리북의 심장부. 여기가 "결과를 손으로 조립"과 "인과를 통과시킴"을 가른다.

**Files:**
- Create: `src/story-utils.tsx`
- Delete: `src/components/Smoke.stories.tsx`

**Interfaces:**
- Consumes: Task 1의 Storybook 설정 (`Decorator` 타입은 `@storybook/react-vite`에서).
- Produces:
  - `interface CardKnobs` — 아래 정의된 필드 전부
  - `const CARD_KNOBS_DEFAULT: CardKnobs`
  - `const CARD_ARG_TYPES` — Storybook `argTypes` (select·range 컨트롤 지정)
  - `function buildCard(k: CardKnobs, month: number): CardView`
  - `const withRouter: Decorator` — `<Link>`를 쓰는 스토리용 메모리 라우터
  - `const REAL: { profiles; prices; nutrition; recipes }` — 실물 JSON을 타입 붙여 재수출

**설계 노트 — 단위 노브:** `Unit`은 `{ quantity, measure }`이고 `measure`는 무게냐 개수냐로 갈린다(`types.ts`). 노브는 사람이 읽는 표기(`g`·`kg`·`개`·`포기`)를 받고, 그 글자에서 `Measure`를 유도한다 — KAMIS 어댑터가 하는 일과 같은 매핑이다. **개당값이 성립하려면 `count`이면서 수량 > 1이어야 한다** — `100g`으로 두면 개당값 줄이 사라지고, `10개`로 두면 나타난다. 이걸 노브로 직접 확인하는 게 목적이다.

**설계 노트 — 픽스처를 지어내지 않는다:** 영양·레시피는 실제 `public/data/*.json`에서 가져온다. `nutritionJson.entries[0]`, `recipesJson.entries.slice(0, n)`. 지어낸 영양 수치는 그럴듯해 보여서 더 위험하다.

- [ ] **Step 1: `src/story-utils.tsx` 작성**

```tsx
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import type { Decorator } from '@storybook/react-vite'
import type { CardView } from './card'
import { toCardView } from './card'
import type { PickResult } from './picks'
import { priceView } from './picks'
import { matchNutrition, nutritionView } from './nutrition'
import { matchRecipes, recipeView } from './recipe'
import type {
  Category,
  Measure,
  NutritionSnapshot,
  PriceEntry,
  PriceSnapshot,
  ProduceProfile,
  RecipeSnapshot,
} from './types'

import produceJson from '../public/data/produce.json'
import pricesJson from '../public/data/prices.json'
import nutritionJson from '../public/data/nutrition.json'
import recipesJson from '../public/data/recipes.json'

/** 실물 데이터 — 스토리는 픽스처를 지어내지 않는다. 지어낸 영양 수치는 그럴듯해서 더 위험하다. */
export const REAL = {
  profiles: produceJson as unknown as ProduceProfile[],
  prices: pricesJson as unknown as PriceSnapshot,
  nutrition: nutritionJson as unknown as NutritionSnapshot,
  recipes: recipesJson as unknown as RecipeSnapshot,
}

/** 단위 표기 → Measure. 무게냐 개수냐가 도메인 구분이고 글자는 그 안의 라벨이다 (types.ts).
 *  개당값은 count이면서 수량 > 1일 때만 성립하므로, 이 노브가 개당값 줄을 켜고 끈다. */
const MEASURES = {
  g: { kind: 'weight', unit: 'g' },
  kg: { kind: 'weight', unit: 'kg' },
  개: { kind: 'count', unit: '개' },
  포기: { kind: 'count', unit: '포기' },
} as const satisfies Record<string, Measure>

export type MeasureKey = keyof typeof MEASURES

/** 카드 한 장의 원시 재료. CardView가 아니라 **재료**다 — 진짜 파이프라인이 이걸 카드로 만든다. */
export interface CardKnobs {
  name: string
  emoji: string
  kindName: string
  category: Category
  inPeak: boolean
  whyNow: string
  /** null이면 KAMIS 매칭 실패/결측 — 가격 블록 전체가 사라진다 */
  price: number | null
  /** null이면 취소선 예전가·등락 칩·스파크라인이 전부 사라진다 */
  monthAgo: number | null
  /** null이면 스파크라인만 사라진다 (등락 칩은 남는다) */
  yearAgo: number | null
  unitQuantity: number
  unitMeasure: MeasureKey
  /** 영양은 프로필에 foodDb 참조가 있어야 성립한다 — 40개 중 3개(복숭아·토마토·사과)뿐이다.
   *  이 토글을 켜도 name이 그 셋 중 하나가 아니면(예: 기본값 감자) 영양은 안 뜬다 — 그게 규칙이다. */
  hasNutrition: boolean
  /** 0이면 레시피 섹션 없음. 그 품목의 실제 레시피(matchRecipes)에서 앞에서부터 n개.
   *  품목이 실제로 가진 레시피 수보다 크게 올려도 더 나오지 않는다 — 그것도 사실이다. */
  recipeCount: number
}

export const CARD_KNOBS_DEFAULT: CardKnobs = {
  name: '감자',
  emoji: '🥔',
  kindName: '수미',
  category: 'vegetable',
  inPeak: true,
  whyNow: '햇감자가 나오는 철이에요',
  price: 315,
  monthAgo: 371,
  yearAgo: 340,
  unitQuantity: 100,
  unitMeasure: 'g',
  hasNutrition: false,
  recipeCount: 3,
}

export const CARD_ARG_TYPES = {
  category: { control: 'inline-radio', options: ['fruit', 'vegetable'] },
  unitMeasure: { control: 'inline-radio', options: Object.keys(MEASURES) },
  unitQuantity: { control: { type: 'number', min: 1 } },
  price: { control: 'number' },
  monthAgo: { control: 'number' },
  yearAgo: { control: 'number' },
  recipeCount: { control: { type: 'range', min: 0, max: 5, step: 1 } },
} as const

/** 노브 이름으로 실물 프로필을 찾아 recipeRef·foodDb를 얹는다. 그래야 레시피·영양이
 *  "그 품목의 진짜 데이터"로 매칭된다 — 임의로 고른 엔트리가 아무 이름에나 붙지 않는다.
 *  임의 이름(실물에 없는 이름)이면 참조 없이 둔다 — 그것도 정직한 상태다(레시피·영양 없는 카드). */
function toProfile(k: CardKnobs, month: number): ProduceProfile {
  const real = REAL.profiles.find((p) => p.name === k.name)
  return {
    id: 'story',
    name: k.name,
    emoji: k.emoji,
    category: k.category,
    // 카드의 품종 줄은 profile.kamis.kindName에서 온다 (card.ts) — 참조를 여기서 채운다.
    kamis: { categoryCode: '200', itemName: k.name, kindName: k.kindName },
    foodDb: real?.foodDb,
    recipeRef: real?.recipeRef,
    seasonMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    // inPeak 노브에서 파생 — picks.ts의 selectPicks와 같은 방향(peakMonths.includes(month)).
    // 노브로 직접 세팅한 inPeak와 모순되지 않도록 재료 안에서 일관되게 만든다.
    peakMonths: k.inPeak ? [month] : [],
    whyNow: { default: k.whyNow },
    howToPick: '단단하고 흠집 없는 것으로 고르세요',
    howToStore: '서늘하고 어두운 곳에 두세요',
    howToUse: '찌거나 굽거나, 국에 넣어도 좋아요',
  }
}

function toEntry(k: CardKnobs): PriceEntry | null {
  if (k.price === null) return null
  return {
    itemName: k.name,
    kindName: k.kindName,
    rank: '상품',
    unit: { quantity: k.unitQuantity, measure: MEASURES[k.unitMeasure] },
    price: k.price,
    baseline: { monthAgo: k.monthAgo, yearAgo: k.yearAgo },
  }
}

/** 노브 → 재료 → **진짜 파이프라인** → CardView.
 *  1% "비슷" 임계도, 개당값 조건도, 스파크 null 조건도 여기서 정하지 않는다 — card.ts가 정한다.
 *  그래서 도달 불가능한 조합(무게 단위인데 개당값이 붙은 카드)은 애초에 만들 수 없다.
 *  영양·레시피도 진짜 매처(matchNutrition/matchRecipes)를 통과하므로, 품목과 무관한
 *  레시피·영양이 붙는 조합 자체를 만들 수 없다 — recipeCount는 매칭된 목록을 자르기만 한다. */
export function buildCard(k: CardKnobs, month: number): CardView {
  const entry = toEntry(k)
  const profile = toProfile(k, month)
  const pick: PickResult = {
    profile,
    inPeak: k.inPeak,
    price: entry ? priceView(entry) : null,
  }
  const recipes = matchRecipes(profile, REAL.recipes).slice(0, k.recipeCount)
  return toCardView(
    pick,
    month,
    k.hasNutrition ? nutritionView(matchNutrition(profile, REAL.nutrition)) : null,
    recipeView(recipes),
  )
}

/** NavIndex가 TanStack <Link>를 쓰므로 App·Coming 스토리는 라우터 없이는 크래시한다.
 *  test-utils.tsx의 메모리 라우터 패턴과 같다. 카드 스토리엔 필요 없어 전역이 아니라 스토리별로 붙인다. */
export const withRouter: Decorator = (Story) => {
  const rootRoute = createRootRoute()
  const children = ['/', '/coming'].map((path) =>
    createRoute({ getParentRoute: () => rootRoute, path, component: () => <Story /> }),
  )
  const router = createRouter({
    routeTree: rootRoute.addChildren(children),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  return <RouterProvider router={router} />
}
```

- [ ] **Step 2: 임시 스모크 스토리 삭제**

```bash
git rm src/components/Smoke.stories.tsx
```

- [ ] **Step 3: 타입체크**

```bash
npx tsc --noEmit
```
기대: 통과. (`satisfies Record<string, Measure>`가 단위 매핑을 도메인 타입에 묶으므로, `Measure` 유니온이 바뀌면 여기서 먼저 깨진다 — 의도된 성질이다.)

`import produceJson from '../public/data/produce.json'`이 `tsconfig`의 `resolveJsonModule`로 통과하는지 확인한다. 실패하면 `routes/index.tsx`가 이미 같은 방식으로 임포트하고 있으니 그 경로 표기를 그대로 따른다.

- [ ] **Step 4: 커밋**

```bash
git add src/story-utils.tsx
git commit -m "feat: 스토리 유틸 — 노브를 진짜 파생 파이프라인에 통과시킨다

CardView를 손으로 조립하지 않는다. 노브로 재료(ProduceProfile+PriceEntry)를 짓고
priceView→toCardView를 통과시킨다. 그래서 1% 임계·개당값 조건·스파크 null 조건이
스토리에서 진짜로 작동하고, 도달 불가능한 조합은 만들 수 없다."
```

---

## Task 3: ProduceCard 스토리 — 카드가 표현할 수 있는 모든 케이스

**Files:**
- Create: `src/components/ProduceCard.stories.tsx`

**Interfaces:**
- Consumes: `CardKnobs`, `CARD_KNOBS_DEFAULT`, `CARD_ARG_TYPES`, `buildCard` (Task 2)
- Produces: 없음 (말단)

**각 스토리가 증명하는 것** — 오른쪽이 당신이 오늘 화면에서 못 보고 있는 것:

| 스토리 | 노브 | 나타나는 것 |
|---|---|---|
| 하락 | `price: 315, monthAgo: 371` (−15%) | ↓칩 · 큰 숫자 쪽빛 |
| 상승 | `price: 371, monthAgo: 315` (+18%) | **↑칩 · 큰 숫자 러스트** |
| 비슷 | `price: 315, monthAgo: 317` (−0.6%) | **칩 사라지고 "한 달 전과 비슷해요"** |
| 개당값 | `unitQuantity: 10, unitMeasure: '개'` | **"10개 기준 · 개당 704원"** |
| 스파크없음 | `yearAgo: null` | **스파크라인 사라짐 (칩은 남음)** |
| 가격없음 | `price: null` | **가격 블록 전체 사라짐** (KAMIS 참조 없는 옥수수·부추 등) |
| 영양있음 | `name: '복숭아', hasNutrition: true` | **영양 스탯 6칸** (프로필 40개 중 3개만 해당 — 감자는 foodDb가 없어 안 뜬다) |
| 레시피없음 | `recipeCount: 0` | 레시피 칩 섹션 사라짐 |
| 절정아님 | `inPeak: false` | 이름 옆 절정 점 사라짐 |

- [ ] **Step 1: 스토리 작성**

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProduceCard } from './ProduceCard'
import { CARD_ARG_TYPES, CARD_KNOBS_DEFAULT, buildCard } from '../story-utils'
import type { CardKnobs } from '../story-utils'

/** 노브는 CardView가 아니라 **원시 재료**다. buildCard가 진짜 picks→card 파이프라인에
 *  통과시키므로, 노브를 돌리면 실제 규칙이 작동한다:
 *  한 달 전 대비를 −0.6%로 만들면 card.ts의 `Math.abs(pct) < 1`이 칩을 지우고 "비슷해요"를 띄운다. */
const meta = {
  title: '카드/ProduceCard',
  component: ProduceCard,
  argTypes: CARD_ARG_TYPES,
  args: CARD_KNOBS_DEFAULT,
  render: (args: CardKnobs) => <ProduceCard card={buildCard(args, 7)} />,
} satisfies Meta<CardKnobs>

export default meta
type Story = StoryObj<CardKnobs>

/** 기본 — 한 달 전보다 15% 내렸다. ↓칩 + 큰 숫자 쪽빛. */
export const 하락: Story = {}

/** 큰 숫자가 러스트로 바뀌고 칩이 ↑가 된다. 오늘 실제 데이터엔 한 건도 없는 상태. */
export const 상승: Story = {
  args: { price: 371, monthAgo: 315 },
}

/** |변화율| < 1%면 card.ts가 칩을 지우고 "한 달 전과 비슷해요"로 바꾼다.
 *  임계를 스토리가 정하지 않는다 — monthAgo를 317↔330으로 옮겨가며 경계를 직접 넘어보라. */
export const 비슷: Story = {
  args: { price: 315, monthAgo: 317 },
}

/** 개당값은 **셀 수 있는 단위이고 수량 > 1**일 때만 성립한다 (card.ts의 perUnitPrice).
 *  unitMeasure를 'g'로 되돌리면 "개당" 각주가 사라지는 걸 확인할 수 있다. */
export const 개당값: Story = {
  args: {
    name: '참외',
    emoji: '🍈',
    kindName: '',
    category: 'fruit',
    price: 7040,
    monthAgo: 8200,
    yearAgo: 6900,
    unitQuantity: 10,
    unitMeasure: '개',
    whyNow: '단맛이 가장 오를 때예요',
  },
}

/** 작년 값이 없으면 스파크라인이 통째로 사라진다 — 세 점 중 하나가 비면 선을 못 그린다.
 *  등락 칩은 한 달 전 값만 있으면 되므로 그대로 남는다. */
export const 스파크없음: Story = {
  args: { yearAgo: null },
}

/** KAMIS 참조가 아예 없는 품목(옥수수·부추·단호박·가지)은 가격 없이 제철 정보만 보여준다.
 *  "아직 못 맞춘 것"과 "원래 가격이 없는 것"은 다르다 (types.ts). */
export const 가격없음: Story = {
  args: {
    name: '옥수수',
    emoji: '🌽',
    kindName: '',
    price: null,
    monthAgo: null,
    yearAgo: null,
    whyNow: '알이 꽉 차고 단맛이 오를 때예요',
  },
}

/** 영양은 프로필 40개 중 3개(복숭아·토마토·사과)에만 있다 — 그래서 대부분의 날엔 이 줄이 없다.
 *  기본값(감자)은 foodDb 참조가 아예 없는 품목이라, hasNutrition을 켜도 영양이 안 뜬다
 *  (매처가 아예 못 찾는다). 그래서 실제로 영양이 붙는 복숭아로 품목을 바꿔야 이 상태를 볼 수 있다.
 *  가격 노브는 그럴듯한 값 — 이 스토리가 증명하려는 축이 아니다. */
export const 영양있음: Story = {
  args: {
    name: '복숭아',
    emoji: '🍑',
    kindName: '',
    category: 'fruit',
    price: 12000,
    monthAgo: 13500,
    yearAgo: 11000,
    unitQuantity: 1,
    unitMeasure: 'kg',
    whyNow: '7~8월이 노지 복숭아의 절정이에요',
    hasNutrition: true,
  },
}

/** 레시피 참조가 없으면 카드 펼침에 레시피 진입점이 없다. */
export const 레시피없음: Story = {
  args: { recipeCount: 0 },
}

/** 절정이 아니면 이름 옆 점이 사라진다. 정렬에서도 뒤로 밀린다 (picks.ts). */
export const 절정아님: Story = {
  args: { inPeak: false },
}
```

- [ ] **Step 2: 타입체크**

```bash
npx tsc --noEmit
```
기대: 통과.

- [ ] **Step 3: 브라우저로 실측**

```bash
npm run storybook
```
카드 스토리를 하나씩 열어 **위 표의 "나타나는 것"이 실제로 나타나는지** 눈으로 확인한다. 특히:
- `비슷` 스토리에서 `monthAgo` 노브를 317 → 330으로 밀어올리면 "비슷해요"가 사라지고 ↓칩이 나타난다 (1% 경계를 손으로 넘는다).
- `개당값` 스토리에서 `unitMeasure`를 `개` → `g`로 바꾸면 "· 개당 704원"이 사라진다.
- 카드를 펼쳐(`<summary>` 클릭) 스파크라인·영양·노트·레시피 칩이 보이는지, 레시피 칩을 눌러 메모가 뜨는지 확인한다.

- [ ] **Step 4: 커밋**

```bash
git add src/components/ProduceCard.stories.tsx
git commit -m "feat: ProduceCard 스토리 — 카드가 표현할 수 있는 케이스 전부

오늘 데이터에선 안 보이는 것들: 상승(러스트)·비슷해요·개당값·스파크없음·
가격없음·영양 스탯. 노브로 1% 임계를 직접 넘어볼 수 있다."
```

---

## Task 4: App 스토리 — 페이지 상태 + "그 달의 진짜 앱"

카드만 봐서는 못 보는 페이지 레벨 사실이 있다. 대표적으로 **푸터의 영양 출처 줄**: `app.ts`의 `hasNutrition`은 **렌더된 카드 기준**이라, 영양 있는 품목이 top-5에 못 들면 푸터 줄까지 통째로 사라진다.

**Files:**
- Create: `src/components/App.stories.tsx`

**Interfaces:**
- Consumes: `REAL`, `withRouter`, `buildCard`, `CardKnobs`, `CARD_KNOBS_DEFAULT` (Task 2)
- Produces: 없음 (말단)

**"그 달의 진짜 앱"의 정직한 한계:** `prices.json`은 한 장의 스냅샷(2026-07-13 조사분)뿐이다. 12월로 돌려도 가격 숫자는 7월 값이고, 그대로 두면 `staleDays`가 150일이라 모든 월에 stale 경고가 붙는다. 그래서 이 스토리는 **`surveyedOn`만 시뮬레이션 날짜로 덮어쓴다.** 선정·정렬·카드 구성·계절 팔레트는 전부 진짜고, **가격 숫자만 "7월 실측 참고용"**이다. 가격 신선도는 별도 `오래된가격` 스토리에서 정면으로 본다.

- [ ] **Step 1: 스토리 작성**

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { App } from './App'
import { buildAppView } from '../app'
import { currentTerm, seasonOf } from '../season'
import type { AppView } from '../view-types'
import type { PriceSnapshot } from '../types'
import { CARD_KNOBS_DEFAULT, REAL, buildCard, withRouter } from '../story-utils'

// component를 바인딩하지 않는다 — 스토리마다 커스텀 render와 자체 args(month)를 쓰므로
// Meta<typeof App>로 묶으면 args 타입이 App의 props(view)에 갇힌다.
const meta: Meta = {
  title: '페이지/App',
  decorators: [withRouter], // NavIndex가 <Link>를 쓴다 — 라우터 없으면 크래시
}

export default meta

/** 합성 페이지 뷰 — 페이지 레벨 슬롯(stale·noDrop·빈상태·푸터)만 골라 보기 위한 것. */
function pageView(over: Partial<AppView>): AppView {
  const date = new Date('2026-07-14T09:00:00+09:00')
  return {
    cards: [buildCard(CARD_KNOBS_DEFAULT, 7)],
    noDrop: false,
    hasNutrition: false,
    hasRecipes: true,
    seasonal: REAL.profiles
      .filter((p) => p.seasonMonths.includes(7))
      .map((p) => ({ emoji: p.emoji, name: p.name })),
    date,
    freshness: { kind: 'fresh' },
    // term은 지어내지 않는다 — 초복은 24절기가 아니라 season.ts의 currentTerm()이
    // 절대 반환할 수 없는 값이었다. 날짜에서 실제로 파생시킨다.
    term: currentTerm(date),
    ...over,
  }
}

/** 오늘의 모양. 카드 1장으로 줄인 합성 뷰 — 진짜 데이터는 아래 "그달의진짜앱"에서 본다. */
export const 기본: StoryObj = {
  render: () => <App view={pageView({})} />,
}

/** 조사일이 3일 이상 지나면 헤더에 경고 한 줄이 붙는다. 임계는 app.ts의 STALE_AFTER_DAYS. */
export const 오래된가격: StoryObj = {
  render: () => <App view={pageView({ freshness: { kind: 'stale', days: 5 } })} />,
}

/** 픽은 있는데 하락이 하나도 없는 날. 담백한 안내가 붙는다 — 이커머스 화법 금지.
 *  카드도 하락이 없어야 앞뒤가 맞는다: 한 달 전과 같은 값이면 card.ts가 "비슷해요"를 낸다.
 *  (실제 앱의 noDrop은 app.ts가 `picks.length > 0 && !hasDrops(picks)`로 파생한다.) */
export const 하락없음: StoryObj = {
  render: () => (
    <App
      view={pageView({
        cards: [buildCard({ ...CARD_KNOBS_DEFAULT, monthAgo: CARD_KNOBS_DEFAULT.price }, 7)],
        noDrop: true,
      })}
    />
  ),
}

/** 이번 달 제철 프로필이 아예 없는 달. 카드도 필터도 없이 문구 한 줄. */
export const 빈상태: StoryObj = {
  render: () => <App view={pageView({ cards: [], seasonal: [], hasRecipes: false })} />,
}

/** **가장 은밀한 슬롯.** 영양이 있는 카드가 하나라도 렌더되면 푸터에 출처 줄이 생긴다.
 *  영양은 프로필 40개 중 3개(복숭아·토마토·사과)뿐이고, 그 셋이 top-5에 못 들면
 *  카드의 영양 스탯뿐 아니라 이 푸터 줄까지 통째로 사라진다 (app.ts의 hasNutrition). */
export const 영양푸터: StoryObj = {
  render: () => (
    <App
      view={pageView({
        cards: [buildCard({ ...CARD_KNOBS_DEFAULT, hasNutrition: true }, 7)],
        hasNutrition: true,
      })}
    />
  ),
}

/** **진짜 데이터로 그 달의 앱을 본다.** 월 노브를 1~12로 돌려보라 —
 *  1월엔 딸기·감귤·시금치가, 10월엔 사과·단감이 뜬다. "칩은 19개인데 카드는 5개"도 여기서 보인다.
 *
 *  한계 둘:
 *  1. prices.json은 2026-07-13 조사분 한 장뿐이다. surveyedOn만 시뮬레이션 날짜로 덮어
 *     stale 경고를 끈다 — 선정·정렬·카드 구성은 전부 진짜지만,
 *     **가격 숫자는 7월 실측이라 다른 달에선 참고용이다.** 신선도는 "오래된가격"에서 본다.
 *  2. 이 스토리는 계절을 **월 노브에서** 정하므로 상단 계절 툴바가 먹지 않는다.
 *     버그가 아니라 의도다 — 실제 앱도 계절을 고르지 않고 현재 월에서 유도한다. */
export const 그달의진짜앱: StoryObj<{ month: number }> = {
  args: { month: 7 },
  argTypes: { month: { control: { type: 'range', min: 1, max: 12, step: 1 } } },
  render: ({ month }) => {
    const now = new Date(2026, month - 1, 15, 9)
    const iso = `${now.getFullYear()}-${String(month).padStart(2, '0')}-15`
    const snapshot: PriceSnapshot = { ...REAL.prices, surveyedOn: iso }
    const view = buildAppView(REAL.profiles, snapshot, REAL.nutrition, REAL.recipes, now)
    document.body.dataset.season = seasonOf(month) // 그 달의 계절로 팔레트를 맞춘다
    return <App view={view} />
  },
}
```

- [ ] **Step 2: 타입체크**

```bash
npx tsc --noEmit
```
기대: 통과.

- [ ] **Step 3: 브라우저로 실측**

```bash
npm run storybook
```
확인할 것:
- `오래된가격` — 헤더에 "가격은 5일 전 기준이에요"가 뜬다.
- `하락없음` — "이번 주는 크게 내려온 게 없어요" 안내가 뜬다.
- `빈상태` — "이번 달 제철 정보가 아직 없어요"만 남고 필터·카드가 없다.
- `영양푸터` — 카드에 영양 스탯 6칸이 뜨고, **푸터에 "영양: 식약처…" 줄이 하나 늘어난다.** `기본` 스토리와 푸터 줄 수를 비교한다.
- `그달의진짜앱` — 월 노브를 1·4·7·10으로 돌려 카드 구성과 계절색이 함께 바뀌는지 확인한다. **7월에서 "7월의 제철" 칩이 19개인데 카드는 5개인 것**을 눈으로 확인한다.
- 우상단 램프줄을 당겨 목차(NavIndex)가 열리는지 — 라우터 데코레이터가 붙었다는 증거다.

- [ ] **Step 4: 커밋**

```bash
git add src/components/App.stories.tsx
git commit -m "feat: App 스토리 — 페이지 상태 + 월 노브로 그 달의 진짜 앱

카드만 봐선 못 보는 것: stale 경고·noDrop 안내·빈 상태, 그리고 영양 있는 카드가
top-5에 못 들면 푸터 출처 줄까지 사라진다는 사실. 월 노브로 12개월을 돌려본다."
```

---

## Task 5: Coming 스토리 + 문서 마무리

**Files:**
- Create: `src/components/Coming.stories.tsx`
- Modify: `CLAUDE.md` (명령어 목록)

**Interfaces:**
- Consumes: `REAL`, `withRouter` (Task 2)
- Produces: 없음 (말단)

**증명할 것:** `ComingCard`는 `data-season`을 **그 품목의 미래 달** 기준으로 단다 (`CONTEXT.md`). 8월 품목은 여름 노랑 테이프, 9월 품목은 가을 오렌지 테이프 — 한 페이지 안에서 카드마다 테이프 색이 다르다. 전역 계절 툴바와 무관하게 카드 자신이 색을 정한다는 뜻이고, 이건 스토리 없이는 알아채기 어렵다.

- [ ] **Step 1: 스토리 작성**

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Coming } from './Coming'
import { buildComingView } from '../app'
import { currentTerm } from '../season'
import { REAL, withRouter } from '../story-utils'

// App 스토리와 같은 이유로 component를 바인딩하지 않는다 (자체 args: month).
const meta: Meta = {
  title: '페이지/Coming',
  decorators: [withRouter], // NavIndex가 <Link>를 쓴다
}

export default meta

/** **월 노브를 돌려보라.** ComingCard는 data-season을 그 품목의 **미래 달** 기준으로 단다 —
 *  8월 품목은 여름 노랑 테이프, 9월 품목은 가을 오렌지 테이프가 한 페이지에 같이 뜬다.
 *  전역 계절 툴바와 무관하게 카드가 자기 색을 정한다 (CONTEXT.md의 ComingCard 항목). */
export const 그달의다가오는제철: StoryObj<{ month: number }> = {
  args: { month: 7 },
  argTypes: { month: { control: { type: 'range', min: 1, max: 12, step: 1 } } },
  render: ({ month }) => (
    <Coming view={buildComingView(REAL.profiles, new Date(2026, month - 1, 15, 9))} />
  ),
}

/** 앞으로 두 달에 새로 드는 품목이 하나도 없으면 문구 한 줄만 남는다.
 *  months: []는 아무 달에서나 나오지 않는다 — 실물 데이터로 확인한 결과 12월이 해당한다.
 *  날짜를 12월로 두고 term도 그 날짜에서 실제로 파생시킨다. */
export const 빈상태: StoryObj = {
  render: () => {
    const date = new Date(2026, 11, 15)
    return <Coming view={{ months: [], date, term: currentTerm(date) }} />
  },
}
```

- [ ] **Step 2: `CLAUDE.md`의 명령어 목록에 한 줄 추가**

`## 명령어` 절의 `- \`npm test\` — Vitest 전체 …` 줄 **바로 아래**에 다음 한 줄을 넣는다:

```markdown
- `npm run storybook` — 뷰 상태 탐색기 (데이터→UI 인과를 노브로 확인, 스펙: `docs/superpowers/specs/2026-07-14-storybook-view-states-design.md`)
```

- [ ] **Step 3: 전체 게이트**

```bash
npx tsc --noEmit && npm test
```
기대: 둘 다 통과. `npm test`의 테스트 파일 목록에 `*.stories.tsx`가 **없어야** 한다.

- [ ] **Step 4: 브라우저로 최종 실측**

```bash
npm run storybook
```
확인할 것:
- `그달의다가오는제철`에서 월 노브를 7로 두면 8월·9월 섹션이 나오고, **8월 카드와 9월 카드의 마스킹테이프 색이 서로 다르다**.
- 월 노브를 11로 돌리면 **12월 섹션만** 나온다(딸기) — 랩어라운드된 1월 그룹은 품목이
  0개라 렌더되지 않는다(`comingMonths`는 `items.length > 0`일 때만 그룹을 낸다). 1월 제철
  품목(시금치·감귤·딸기 등)은 전부 12월도 제철이라 12월 그룹이 먼저 가져가 버린다
  (`assigned` 집합, `picks.ts`). 랩어라운드 로직 자체는 `tests/picks.test.ts`가
  합성 데이터로 검증한다 — 실물 데이터에는 그 조합이 우연히 없을 뿐이다.
- `빈상태` — "다가오는 제철 정보가 아직 없어요"만 뜬다.
- **마지막으로 계절 툴바를 네 계절로 돌려가며** 카드 스토리·페이지 스토리의 팔레트가 바뀌는지 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add src/components/Coming.stories.tsx CLAUDE.md
git commit -m "feat: Coming 스토리 + CLAUDE.md 명령어

ComingCard는 그 품목의 미래 달 기준으로 테이프 색을 정한다 — 8월 노랑, 9월 오렌지가
한 페이지에 같이 뜬다. 스토리 없이는 알아채기 어려운 사실이다."
```

---

## 완료 기준

- `npm run storybook`이 뜨고, 위 모든 스토리가 렌더된다 (**브라우저 실측 완료**).
- `npx tsc --noEmit` 통과. `npm test` 통과하고 스토리가 테스트에 안 섞인다.
- 스펙이 열거한 "오늘 꺼져 있는 슬롯"을 **전부 눈으로 봤다**: 상승(러스트) · 비슷해요 · 개당값 · 스파크없음 · 가격없음 · 영양 스탯 · 영양 푸터줄 · stale 경고 · noDrop 안내 · 빈 상태.
