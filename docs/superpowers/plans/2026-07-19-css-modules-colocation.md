# CSS Modules 코로케이션 마이그레이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전역 단일 `src/style.css`(584줄)를 컴포넌트별 `*.module.css` 코로케이션으로 옮기되, 렌더 결과는 픽셀·동작 동일(순수 리팩터)로 유지한다.

**Architecture:** 두 갈래. **전역**(토큰·`@font-face`·`[data-season]` 팔레트·리셋·`header`/`footer`·`@view-transition`·공유 유틸 `.list`/`.empty`/`.loading`/`.num`/`.week`)은 `src/global.css`에 `?url` 링크로 남긴다. **컴포넌트 클래스**는 `X.module.css`로 지역화하고 `import styles`+`cx()`로 참조한다. 테스트는 CSS를 손대기 **전에** 클래스 쿼리를 role/text/속성으로 디커플링(Phase 0)해, 이후 해싱이 테스트를 건드리지 않게 한다.

**Tech Stack:** TanStack Start (React 19) + Vite 8 (CSS Modules 내장) + Vitest 4 + Testing Library. node ≥ 22.

## Global Constraints

- **완료 게이트 = `npm test` **와** `npx tsc --noEmit` 둘 다 통과** + UI 변경은 브라우저 실측.
- **런타임 외부요청 없음·경량**: 새 npm 의존성 도입 금지(`cx`는 로컬 5줄, clsx 안 씀).
- **시각 결과물 픽셀 동일**: 룩 변경 금지. 이 작업은 순수 리팩터.
- **사용자 문구 한국어·담백한 톤** (이 작업은 카피 변경 없음).
- **`src/routeTree.gen.ts`는 커밋 대상 아님**(gitignore, 빌드시 자동 생성).
- **테스트 픽스처는 유효 타입값**: `KamisRef.categoryCode`는 `'100'|'200'|'400'`.
- 순수 로직 테스트는 `tests/`, 컴포넌트 테스트는 `src/components/*.test.tsx`(+ `// @vitest-environment jsdom`).
- `<Link>` 등 라우터 컨텍스트 필요 컴포넌트는 `src/test-utils.tsx`의 `renderWithRouter`로 렌더.
- 작업 브랜치: `feat/css-modules-colocation` (이미 생성됨, 스펙 커밋 있음).

**전역 공유 유틸리티(절대 모듈로 옮기지 않음, 순수 문자열로 참조):**
`.list`(App+Coming), `.empty`·`.loading`(App+Coming), `.num`(PriceBlock+Sparkline), `.week`(App+Coming).

**참조 스펙:** `docs/superpowers/specs/2026-07-19-css-modules-colocation-design.md`

---

## 디커플링 레시피 (Phase 0 전 태스크 공통)

클래스 셀렉터만 해싱에 깨진다. **태그·속성·role·text 셀렉터는 살아남는다.** 아래 매핑을 각 `querySelector('.x')`에 적용:

| 현재 (깨짐) | 교체 (안전) | 비고 |
|---|---|---|
| `container.querySelector('.chip-btn')` (버튼) | `getAllByRole('button')[i]` / `getByRole` | 컴포넌트에 버튼이 여러 종류면 `name`으로 좁힘 |
| `.compare`/`.basis`/`.near` 등 **텍스트 확인용** | `getByText(/…/)` / `queryByText` | 그 요소의 textContent를 이미 검사 중이면 text 쿼리로 대체 |
| `.nav-index[data-open]` | `[data-open]` | **속성만 남기면 됨**(클래스 뺌) |
| `.price.rise` 같은 **상태/방향** | 컴포넌트 루트에 `data-testid`+의미 속성 부여 후 `getByTestId(...).dataset.x` | 아래 각 태스크에서 부여할 훅 명시 |
| 존재하지 않음 확인(`.was`, `.nav-panel-title` → `toBeNull`) | `queryByTestId`/`queryByText`로 부재 확인 | 대상이 원래 없으면 텍스트 부재로 |
| SVG 등 role/text 없는 시각요소 | `[data-testid="…"]` 부여 후 그걸로 | `data-testid`는 스타일 아님, 유지 |

**원칙:** 검증 *의도*(무엇을 확인하는가)는 보존하고 *셀렉터 수단*만 바꾼다. `data-season`·`aria-*`·`href` 등 **의미 있는 속성 단언은 그대로 유지**.

---

## Phase 0 — 테스트 디커플링/삭제 (CSS 손대기 전, 그린 유지)

이 단계 내내 `src/style.css`는 그대로다. 각 태스크 끝에서 `npm test` 그린이면 시각·동작 불변이 보장된다.

### Task 0.1: "삭제" 티어 컴포넌트 테스트 제거

파생이 이미 `tests/*.ts`에서 검증되는 순수 표시 컴포넌트의 중복 테스트를 제거한다.

**Files:**
- Delete: `src/components/SeasonStrip.test.tsx`, `src/components/Sparkline.test.tsx`, `src/components/NutritionLine.test.tsx`, `src/components/Coming.test.tsx`

- [ ] **Step 1: 각 삭제 대상이 순수 파생을 검증함을 확인 (안전장치)**

Run: `git grep -l "season-strip\|cardlist\|nutrition\|card\b" tests/`
Expected: `tests/season-strip.test.ts`, `tests/card.test.ts`, `tests/cardlist.test.ts`, `tests/nutrition.test.ts` 등이 존재 — 파생 커버리지가 순수 층에 있음.

- [ ] **Step 2: 삭제**

```bash
git rm src/components/SeasonStrip.test.tsx src/components/Sparkline.test.tsx \
       src/components/NutritionLine.test.tsx src/components/Coming.test.tsx
```

- [ ] **Step 3: 테스트 그린 확인**

Run: `npm test`
Expected: PASS (삭제된 파일 없이 나머지 통과).

- [ ] **Step 4: 커밋**

```bash
git commit -m "test: 순수 표시 컴포넌트 중복 테스트 제거 (파생은 tests/*.ts가 커버)"
```

### Task 0.2: PriceBlock 테스트 디커플링 (트레이서 대상)

**Files:**
- Modify: `src/components/PriceBlock.tsx` (테스트 훅 `data-testid`/`data-dir` 부여 — 스타일 아님)
- Modify: `src/components/PriceBlock.test.tsx` (클래스 쿼리 → text/testid)

**Interfaces:**
- Produces: `PriceBlock` 루트에 `data-testid="price"`, `data-dir={dir}`(`'rise'|'fall'`), 비교줄 `<span data-testid="compare">`, 칩 `<span data-testid="chip">`, 기준선 `<span data-testid="basis">`. 이 훅들은 Task 2(CSS 모듈화)에서도 그대로 유지된다.

- [ ] **Step 1: PriceBlock.tsx에 테스트 훅 추가 (클래스는 아직 그대로)**

`src/components/PriceBlock.tsx`의 반환 JSX를 아래처럼 `data-*` 훅만 추가(클래스명 유지):

```tsx
  return (
    <div className={`price ${dir}`} data-testid="price" data-dir={dir}>
      {chip && p.change && (p.change.kind === 'fall' || p.change.kind === 'rise') && (
        <span className="compare" data-testid="compare">
          <span className="cmp-label">{p.change.basisLabel} 대비</span>
          {chip}
        </span>
      )}
      {p.change?.kind === 'similar' && p.change && <span className="near">{p.change.basisLabel}과 비슷</span>}
      {p.change?.kind === 'basis' && <span className="near">{p.change.basisLabel} 기준</span>}
      <span className="big num">
        {p.now.toLocaleString('ko-KR')}
        <span className="wonu">원</span>
      </span>
      <span className="basis num" data-testid="basis">{basisLine(p.unit, p.perUnit)}</span>
    </div>
  )
```

그리고 `chip` 정의의 `<span className="chip">`에 `data-testid="chip"` 추가:

```tsx
      <span className="chip" data-testid="chip">
```

- [ ] **Step 2: PriceBlock.test.tsx의 클래스 쿼리를 훅/텍스트로 교체**

`src/components/PriceBlock.test.tsx`에서 각 단언을 아래로 치환(디커플링 레시피 적용). `render`에 `queryByTestId`/`getByText`를 구조분해로 추가:

```tsx
// 예: '평년 기준' 테스트
const { getByTestId } = render(<PriceBlock price={{ /* 동일 */ }} />)
expect(getByTestId('compare').textContent).toContain('평년 대비')
expect(getByTestId('price').textContent).toContain('21%')

// '상승: rise 방향'
const { getByTestId } = render(<PriceBlock price={{ /* rise 픽스처 */ }} />)
expect(getByTestId('price').dataset.dir).toBe('rise')

// 'change null이면 가격만'
const { queryByTestId, getByTestId } = render(<PriceBlock price={{ /* change:null */ }} />)
expect(queryByTestId('compare')).toBeNull()
expect(queryByTestId('chip')).toBeNull()
expect(getByTestId('price').innerHTML).toContain('5,000')

// 기준선 줄: '.basis' → getByTestId('basis')
expect(getByTestId('basis').textContent).toBe('100g 기준')          // 무게
expect(getByTestId('basis').textContent).toBe('10개 기준 · 개당 704원') // 개수
expect(getByTestId('basis').textContent).toBe('1포기 기준')          // 포기

// 'change.kind가 basis': 칩·화살표 부재
const { getByTestId, queryByTestId, container } = render(<PriceBlock price={price} />)
expect(getByTestId('price').textContent).toContain('작년 기준')
expect(queryByTestId('chip')).toBeNull()
expect(container.querySelector('svg')).toBeNull()  // arrow SVG 부재 (태그 셀렉터, 안전)
```

`.was` 단언(`expect(container.querySelector('.was')).toBeNull()`)은 원래 존재한 적 없는 클래스이므로 **삭제**한다.

- [ ] **Step 3: 테스트 그린 확인**

Run: `npm test -- PriceBlock`
Expected: PASS (모든 PriceBlock 케이스).

- [ ] **Step 4: 타입 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add src/components/PriceBlock.tsx src/components/PriceBlock.test.tsx
git commit -m "test(PriceBlock): 클래스 쿼리 → data-testid/text 디커플링"
```

### Task 0.3: RecipeChips 테스트 디커플링

**Files:**
- Modify: `src/components/RecipeChips.test.tsx`

- [ ] **Step 1: `.chip-btn` 쿼리를 role로 교체**

`src/components/RecipeChips.test.tsx`의 모든 `container.querySelector('.chip-btn')`/`querySelectorAll('.chip-btn')`를 role 쿼리로. `render` 결과에서 `getAllByRole` 구조분해:

```tsx
const { getAllByRole, getByText } = render(<RecipeChips … />)
expect(getAllByRole('button')).toHaveLength(3)
// chips[i] 쓰던 곳:
const chips = getAllByRole('button')
expect(chips[0].getAttribute('aria-pressed')).toBe('false')
expect(chips[1].getAttribute('aria-pressed')).toBe('true')
// 단일 querySelector('.chip-btn') → getAllByRole('button')[0]
expect(getAllByRole('button')[0].getAttribute('aria-controls')).toBeNull()
```

`aria-pressed`·`aria-controls`·`onSelect` 단언은 그대로 유지(스타일 아님).

- [ ] **Step 2: 그린 확인**

Run: `npm test -- RecipeChips`
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add src/components/RecipeChips.test.tsx
git commit -m "test(RecipeChips): .chip-btn → getAllByRole('button')"
```

### Task 0.4: NavIndex 테스트 디커플링

**Files:**
- Modify: `src/components/NavIndex.test.tsx`

- [ ] **Step 1: `.nav-index[data-open]` → `[data-open]`, `.nav-panel-title` → 텍스트 부재**

`src/components/NavIndex.test.tsx`에서:

```tsx
// .nav-index[data-open] → 속성만 (클래스 제거, 속성 셀렉터는 해싱에 안전)
expect(container.querySelector('[data-open]')).toBeNull()      // 닫힘
expect(container.querySelector('[data-open]')).not.toBeNull()  // 열림
// .nav-panel-title 부재 확인 → 텍스트 부재로 (그 요소는 원래 렌더 안 됨)
expect(container.textContent).not.toContain('목차')
```

`.nav-panel-title` 단언 줄(`querySelector('.nav-panel-title')`)은 삭제하고 위 텍스트 부재 단언으로 대체(같은 의도: 제목 없음). `getByRole('button', { name: '목차' })`·`href`·`aria-current` 단언은 그대로 유지.

- [ ] **Step 2: 그린 확인**

Run: `npm test -- NavIndex`
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add src/components/NavIndex.test.tsx
git commit -m "test(NavIndex): .nav-index[data-open] → [data-open], 제목 부재는 텍스트로"
```

### Task 0.5: ProduceCard 테스트 디커플링

**Files:**
- Modify: `src/components/ProduceCard.tsx` (필요한 곳에 `data-testid`)
- Modify: `src/components/ProduceCard.test.tsx`

**Interfaces:**
- Produces: ProduceCard가 렌더하는 하위 상호작용 요소는 대부분 자식 컴포넌트(RecipeChips=버튼, RecipeMemo)로 role/text 접근 가능. 시각 전용 요소(제철 띠 등) 확인이 필요하면 `data-testid="season-strip"`를 SeasonStrip 래퍼에 부여.

- [ ] **Step 1: 현재 클래스 쿼리 목록 확인**

Run: `grep -nE "querySelector\(|closest\(|\.className" src/components/ProduceCard.test.tsx`
Expected: 레시피 상호작용(칩/메모/압정)·제철 띠 관련 클래스 쿼리 ~19곳.

- [ ] **Step 2: 디커플링 레시피 적용**

각 쿼리를 교체:
- 레시피 칩: `.chip-btn` → `getAllByRole('button', { name: … })` 또는 `getByText(레시피명)`.
- 메모 존재/부재: `.memo` → `getByRole('dialog')` 없으면 `getByText(레시피명 헤더)`/`data-testid="memo"`(RecipeMemo 루트, Task 0.6에서 부여) → 여기선 `queryByTestId('memo')`.
- 압정(닫기): `.pin` → `getByRole('button', { name: '닫기' })`(RecipeMemo가 제공, Task 0.6에서 `aria-label="닫기"` 확인/부여).
- 넘김 `‹ ›`: `.nav-prev`/`.nav-next` → `getByRole('button', { name: '이전' })`/`{ name: '다음' }`(Task 0.6에서 aria-label 부여).
- 제철 띠 존재: `.season-strip` → SeasonStrip 래퍼에 `data-testid="season-strip"` 부여 후 `getByTestId`.

포커스 단언(`document.activeElement`)은 대상 요소를 role/testid로 재취득해 그대로 유지.

- [ ] **Step 3: 그린 확인**

Run: `npm test -- ProduceCard`
Expected: PASS.

- [ ] **Step 4: 타입·커밋**

```bash
npx tsc --noEmit && git add src/components/ProduceCard.tsx src/components/ProduceCard.test.tsx
git commit -m "test(ProduceCard): 레시피 상호작용·제철 띠 쿼리를 role/testid로 디커플링"
```

### Task 0.6: RecipeMemo 테스트 디커플링

**Files:**
- Modify: `src/components/RecipeMemo.tsx` (`data-testid`/`aria-label` 훅)
- Modify: `src/components/RecipeMemo.test.tsx`

**Interfaces:**
- Produces: RecipeMemo 루트 `data-testid="memo"`, `data-closing`(닫힘 애니 상태, `.memo-closing` 대체), 단계 목록 `data-testid="steps"`, 카운트 `data-testid="count"`, 압정 `aria-label="닫기"`, 넘김 `aria-label="이전"`/`"다음"`. Task 0.5·Task 3에서 참조.

- [ ] **Step 1: 현재 클래스 쿼리 확인**

Run: `grep -nE "querySelector\(|\.className" src/components/RecipeMemo.test.tsx`
Expected: `.memo`·`.count`·`.steps`·`.nav-prev/next`·`.pin`·`.memo-closing` 등 ~16곳.

- [ ] **Step 2: RecipeMemo.tsx에 훅 부여 (클래스 유지)**

`src/components/RecipeMemo.tsx`에서:
- 루트 요소: `data-testid="memo"`, 그리고 닫힘 상태를 `data-closing={closing ? '' : undefined}`로 노출(클래스 `className={closing ? 'memo memo-closing' : 'memo'}`는 아직 유지).
- 카운트 요소: `data-testid="count"`.
- 단계 `<ol>/<ul>`: `data-testid="steps"`.
- 압정 버튼: `aria-label="닫기"`(없으면 부여).
- `‹`/`›` 버튼: 각각 `aria-label="이전"`/`aria-label="다음"`(없으면 부여).

- [ ] **Step 3: 테스트 쿼리 교체**

```tsx
// .count → getByTestId('count'); .steps → queryByTestId('steps')
expect(getByTestId('count').textContent).toBe('1 / 3')
expect(queryByTestId('steps')).toBeNull()
// .nav-prev/.nav-next → role+name
fireEvent.click(getByRole('button', { name: '이전' }))
fireEvent.click(getByRole('button', { name: '다음' }))
// .memo (포커스 타겟) → getByTestId('memo')
expect(document.activeElement).toBe(getByTestId('memo'))
// .pin → role+name
fireEvent.click(getByRole('button', { name: '닫기' }))
// .memo-closing 클래스 확인 → data-closing 속성
expect(getByTestId('memo').hasAttribute('data-closing')).toBe(true)
```

- [ ] **Step 4: 그린 확인**

Run: `npm test -- RecipeMemo`
Expected: PASS.

- [ ] **Step 5: 타입·커밋**

```bash
npx tsc --noEmit && git add src/components/RecipeMemo.tsx src/components/RecipeMemo.test.tsx
git commit -m "test(RecipeMemo): 드로어·페이징·포커스 쿼리를 role/testid로, 닫힘상태 data-closing"
```

### Task 0.7: App 테스트 + 스토리 play 디커플링

**Files:**
- Modify: `src/components/App.test.tsx`
- Modify: `src/components/App.stories.tsx` (play 함수의 `.norm-line` 등)

- [ ] **Step 1: 현재 클래스 쿼리 확인**

Run: `grep -nE "querySelector\(" src/components/App.test.tsx src/components/App.stories.tsx`
Expected: `.fchip`·`.peak-dot`·`.sprig`·`.nav-index`·`.coming`·`.rel-date`·`.date-tip`·`.surveyed`·`.sort-icon`·`.sort select`·`.norm-line` 등 ~14곳.

- [ ] **Step 2: 디커플링 레시피 적용**

- 필터 칩 존재/부재: `.fchip` → `getAllByRole('button')` 중 필터 칩(라벨로 좁힘) 또는 `queryByRole`.
- 절정 dot: `.peak-dot` → PeakDot에 `data-testid="peak-dot"` 부여 후 `queryByTestId`(또는 tooltip 텍스트/`aria-label`).
- 잔가지: `.sprig` → Sprig `<svg>`에 `data-testid="sprig"` 부여 후 `queryByTestId`.
- 목차: `.nav-index` → `getByRole('button', { name: '목차' })`(이미 role 존재).
- 조사일 줄: `.surveyed`/`.rel-date`/`.date-tip` → 각 텍스트로 `getByText(/전국 평균/)`, `getByText(/오늘|일 전/)`, 툴팁 텍스트. 필요 시 `data-testid` 부여.
- 정렬: `.sort-icon` → `data-testid="sort-icon"`; `.sort select` → `getByRole('combobox')`.
- 빈 상태/없음: `.empty` 텍스트 → `getByText(빈 상태 문구)`.
- `App.stories.tsx`의 `canvasElement.querySelector('.norm-line')` → Sparkline 평년선에 `data-testid="norm-line"` 부여 후 `querySelector('[data-testid="norm-line"]')`.

- [ ] **Step 3: 그린 확인 (스토리 포함)**

Run: `npm test`
Expected: PASS (전체).

- [ ] **Step 4: 타입·커밋**

```bash
npx tsc --noEmit && git add src/components/App.test.tsx src/components/App.stories.tsx src/components/*.tsx
git commit -m "test(App): 통합 단언을 role/text/testid로 디커플링 + 스토리 play"
```

- [ ] **Step 5: Phase 0 종료 게이트 — 클래스 쿼리 잔존 0 확인**

Run: `grep -rnE "querySelector\(['\"]\.|closest\(['\"]\." src/components/*.test.tsx src/components/*.stories.tsx`
Expected: **매치 없음**(모든 클래스 셀렉터 제거됨). 남으면 해당 파일 마저 처리.

Run: `npm test && npx tsc --noEmit`
Expected: 둘 다 통과. 이 시점 CSS는 여전히 전역 `style.css` — 시각·동작 불변.

---

## Phase 1 — 스캐폴딩

### Task 1: `cx` 헬퍼 + `global.css` 개명 + 모듈 타입 확인

**Files:**
- Create: `src/cx.ts`
- Create: `tests/cx.test.ts`
- Rename: `src/style.css` → `src/global.css` (git mv)
- Modify: `src/routes/__root.tsx:3` (import 경로)

**Interfaces:**
- Produces: `export const cx = (...parts: Array<string | false | null | undefined>): string` — falsy 무시, truthy 공백 결합. 모든 컴포넌트가 동적 클래스에 사용.

- [ ] **Step 1: cx 실패 테스트 작성**

Create `tests/cx.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { cx } from '../src/cx'

describe('cx', () => {
  test('truthy만 공백으로 결합', () => {
    expect(cx('a', 'b')).toBe('a b')
  })
  test('falsy(false/null/undefined/빈문자)는 무시', () => {
    expect(cx('a', false, null, undefined, '', 'b')).toBe('a b')
  })
  test('조건부 클래스', () => {
    const on = true
    expect(cx('chip', on && 'on')).toBe('chip on')
    expect(cx('chip', false && 'on')).toBe('chip')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- cx`
Expected: FAIL ("Cannot find module '../src/cx'").

- [ ] **Step 3: cx 구현**

Create `src/cx.ts`:

```ts
// falsy 인자 무시, truthy만 공백 결합. clsx의 5% 기능 = 우리가 쓰는 전부.
export const cx = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(' ')
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- cx`
Expected: PASS.

- [ ] **Step 5: style.css → global.css 개명 + import 수정**

```bash
git mv src/style.css src/global.css
```

`src/routes/__root.tsx:3`을 수정:

```tsx
import appCss from '../global.css?url'
```

(`links: [{ rel: 'stylesheet', href: appCss }]` 줄은 그대로.)

- [ ] **Step 6: 모듈 CSS 타입 지원 확인**

Run: `grep -n '"types"' tsconfig.json`
Expected: `"types": ["vite/client", "node"]` — `vite/client`가 `*.module.css` 선언을 제공하므로 별도 `.d.ts` 불필요. 만약 이후 태스크에서 `import styles from './X.module.css'`가 tsc 에러를 내면 `src/vite-env.d.ts`에 `/// <reference types="vite/client" />` 추가.

- [ ] **Step 7: 전체 게이트 + 브라우저 실측(기준선)**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: 모두 성공. 개명만 했으므로 산출물 동일.

브라우저: `npm run dev` 띄우고 홈·`/coming` 로드 — 개명 전과 픽셀 동일(마스킹테이프·간트·계절색·폰트). **이 화면이 이후 회귀 비교 기준.**

- [ ] **Step 8: 커밋**

```bash
git add src/cx.ts tests/cx.test.ts src/global.css src/routes/__root.tsx
git commit -m "chore: cx 헬퍼 추가, style.css→global.css 개명 (동작 불변)"
```

---

## Phase 2 — 트레이서 불릿: PriceBlock (최대 리스크 검증)

### Task 2: PriceBlock을 CSS Module로 전환하고 프리렌더 CSS 추출을 검증

**Files:**
- Create: `src/components/PriceBlock.module.css`
- Modify: `src/components/PriceBlock.tsx`
- Modify: `src/global.css` (이전한 `.price*` 규칙 삭제, `.num`은 남김)

**Interfaces:**
- Consumes: `cx` (Task 1), PriceBlock 테스트 훅 `data-testid`/`data-dir` (Task 0.2).
- Produces: `PriceBlock.module.css` 패턴(모듈+`cx`+공유 유틸 문자열 참조)을 이후 모든 컴포넌트가 따른다.

- [ ] **Step 1: PriceBlock.module.css 생성**

`.price` 관련 규칙을 `global.css`에서 그대로 옮긴다. **`.num`은 공유 유틸이라 옮기지 않는다.** `.price` → `.price`, `.price.fall` → `.price.fall`(모듈 내 컴파운드 유지):

Create `src/components/PriceBlock.module.css`:

```css
.price { display: flex; flex-direction: column; align-items: flex-end; }
/* 큰 숫자 위 한 줄: "지난달 대비" 라벨 + 등락 칩 */
.compare { display: inline-flex; align-items: center; gap: var(--space-2xs); margin-bottom: var(--space-3xs); }
.cmpLabel { color: var(--muted); font-size: var(--text-2xs); }
.big { font-size: var(--text-xl); font-weight: 800; letter-spacing: -0.02em; line-height: 1; }
.wonu { font-size: var(--text-md); font-weight: 600; }
/* 기준선 — "이 숫자를 무엇으로 재었나". */
.basis { color: var(--muted); font-size: var(--text-2xs); margin-top: var(--space-2xs); white-space: nowrap; }
.near { color: var(--muted); font-size: var(--text-2xs); margin-bottom: var(--space-3xs); }
.chip { display: inline-flex; align-items: center; gap: var(--space-3xs); font-size: var(--text-xs); font-weight: 700; padding: var(--space-3xs) var(--space-xs); border-radius: var(--radius-pill); }
.arrow { display: block; }
.price.fall .big { color: var(--ink); }
.price.fall .chip { background: var(--tint); color: var(--ink); }
.price.rise .big { color: var(--rise); }
.price.rise .chip { background: var(--rise-lo); color: var(--rise); }
```

> `.cmp-label` → `.cmpLabel`로 카멜 표기(컴포넌트에서 `styles.cmpLabel`로 참조). 나머지는 단일 단어라 동일.

- [ ] **Step 2: global.css에서 이전한 규칙 삭제 (`.num`은 유지)**

`src/global.css`에서 아래 줄들을 삭제한다(주석 포함). **`.num { font-variant-numeric: tabular-nums; }` 줄은 남긴다:**

삭제: `.price { … }`, `.price .compare`, `.price .cmp-label`, `.price .big`, `.price .wonu`, `.price .basis`, `.price .near`, `.price .chip`, `.price .arrow`, `.price.fall .big`, `.price.fall .chip`, `.price.rise .big`, `.price.rise .chip` 및 관련 주석.

- [ ] **Step 3: PriceBlock.tsx를 styles + cx로 전환**

`src/components/PriceBlock.tsx` 상단에 import 추가:

```tsx
import styles from './PriceBlock.module.css'
import { cx } from '../cx'
```

`ArrowDown`/`ArrowUp`의 `className="arrow"` → `className={styles.arrow}`. 반환 JSX 전체 교체(공유 `.num`은 문자열):

```tsx
  return (
    <div className={cx(styles.price, styles[dir])} data-testid="price" data-dir={dir}>
      {chip && p.change && (p.change.kind === 'fall' || p.change.kind === 'rise') && (
        <span className={styles.compare} data-testid="compare">
          <span className={styles.cmpLabel}>{p.change.basisLabel} 대비</span>
          {chip}
        </span>
      )}
      {p.change?.kind === 'similar' && p.change && <span className={styles.near}>{p.change.basisLabel}과 비슷</span>}
      {p.change?.kind === 'basis' && <span className={styles.near}>{p.change.basisLabel} 기준</span>}
      <span className={cx(styles.big, 'num')}>
        {p.now.toLocaleString('ko-KR')}
        <span className={styles.wonu}>원</span>
      </span>
      <span className={cx(styles.basis, 'num')} data-testid="basis">{basisLine(p.unit, p.perUnit)}</span>
    </div>
  )
```

그리고 `chip` 정의: `<span className="chip" data-testid="chip">` → `<span className={styles.chip} data-testid="chip">`.

- [ ] **Step 4: 테스트·타입 그린 (디커플링 덕에 무변경 통과)**

Run: `npm test -- PriceBlock && npx tsc --noEmit`
Expected: PASS — 테스트는 `data-testid`/text 기반이라 해싱 무관.

- [ ] **Step 5: ⚠️ 최대 리스크 검증 — 프리렌더에 모듈 CSS가 추출되는가**

Run: `npm run build`
Then: `grep -rl "font-variant-numeric\|flex-direction: column" dist/client/assets/*.css`
Expected: 빌드 성공 + `dist/client/`의 번들 CSS에 `.price` 규칙(해시 클래스)이 존재. 프리렌더 HTML(`dist/client/index.html`)의 `<link>`가 그 CSS를 가리키는지도 확인:
Run: `grep -o 'assets/[^"]*\.css' dist/client/index.html`
Expected: CSS 자산 링크 존재.

**게이트: 모듈 CSS가 번들에 안 잡히면 여기서 중단하고 접근 재고**(스펙 "리스크" 절 — global 유지 + 부분 적용 등). 잡히면 계속.

- [ ] **Step 6: 브라우저 실측 — 하락/상승 픽셀 동일**

`npm run dev`(또는 빌드 산출물 서빙)로 홈 로드. 하락 카드(파랑 큰 숫자·틴트 칩·아래 화살표)와 상승 카드(러스트 숫자·칩) 색·정렬·`tabular-nums`가 Task 1 기준선과 동일한지 확인. 스크린샷으로 사인오프.

- [ ] **Step 7: 커밋**

```bash
git add src/components/PriceBlock.tsx src/components/PriceBlock.module.css src/global.css
git commit -m "refactor(PriceBlock): CSS Module 코로케이션 (프리렌더 추출 검증됨)"
```

---

## Phase 3 — RecipeMemo (@keyframes 모듈 스코프 검증)

### Task 3: RecipeMemo를 CSS Module로 전환, 키프레임 동작 확인

**Files:**
- Create: `src/components/RecipeMemo.module.css`
- Modify: `src/components/RecipeMemo.tsx`
- Modify: `src/global.css` (`.memo*`·`@keyframes memo-in/out`·`.nav*`(메모 넘김)·`.pin` 삭제)

**Interfaces:**
- Consumes: `cx`, RecipeMemo 테스트 훅(Task 0.6: `data-testid="memo"`, `data-closing`, 등).
- Produces: 키프레임을 모듈 내부에 두는 패턴 검증.

- [ ] **Step 1: global.css의 memo 관련 규칙 확인**

Run: `grep -nE "\.memo|\.pin|\.nav[ .:{]|@keyframes memo|memo-out|memo-in" src/global.css`
Expected: `.memo`, `.memo-closing`, `.memo h3/.ing/.steps/.count`, `@keyframes memo-in`, `@keyframes memo-out`, `.pin`, `.nav`(‹›), `.nav-prev/next` 규칙 범위 파악.

- [ ] **Step 2: RecipeMemo.module.css 생성 (키프레임 포함)**

`global.css`의 해당 규칙을 옮긴다. `@keyframes memo-in`/`memo-out`과 그것을 참조하는 `animation:`은 **반드시 이 파일 안에** 둔다(이름 해시 일관). 케밥 클래스는 카멜로:
- `.memo-closing` → `.memoClosing`, `.steps-fade` → `.stepsFade`, `.nav-prev` → `.navPrev`, `.nav-next` → `.navNext`.
- 자식 요소 셀렉터 `.memo h3`, `.memo .ing`, `.memo .steps li` 등은 `.memo h3`, `.ing`, `.steps li`로(스코프는 모듈이 처리).

(정확한 선언 값은 Step 1로 확인한 `global.css` 원문을 그대로 복사·이동. 값 변경 금지 — 픽셀 동일.)

- [ ] **Step 3: global.css에서 이전 규칙 삭제**

Step 1에서 찾은 `.memo*`·`@keyframes memo-in/out`·`.pin`·메모 넘김 `.nav*` 규칙을 삭제. (NavIndex의 `.nav-index`/`.nav-panel` 등 램프줄 드로어 규칙과 혼동 금지 — 그건 Task 4의 NavIndex 몫.)

- [ ] **Step 4: RecipeMemo.tsx 전환**

`import styles from './RecipeMemo.module.css'` + `import { cx } from '../cx'`. 클래스 참조를 `styles.*`로. 동적 클래스:

```tsx
// 전: className={closing ? 'memo memo-closing' : 'memo'}
className={cx(styles.memo, closing && styles.memoClosing)}
// 전: className={stepsFade ? 'steps steps-fade' : 'steps'}
className={cx(styles.steps, stepsFade && styles.stepsFade)}
```

`data-testid`/`data-closing`/`aria-label` 훅(Task 0.6)은 유지.

- [ ] **Step 5: 테스트·타입 그린**

Run: `npm test -- RecipeMemo && npm test -- ProduceCard && npx tsc --noEmit`
Expected: PASS (ProduceCard도 메모를 렌더하므로 함께 확인).

- [ ] **Step 6: ⚠️ 키프레임 검증 — 빌드에 memo-in/out이 살아있나**

Run: `npm run build && grep -rl "keyframes" dist/client/assets/*.css`
Expected: 번들 CSS에 해시된 `@keyframes memo-in`(예: `memo-in_xxxx`)과 그를 참조하는 `animation`이 **짝으로** 존재.

- [ ] **Step 7: 브라우저 실측 — 드로어 모션**

`npm run dev`: 카드 펼침 → 레시피 칩 클릭 → 메모가 `memo-in`으로 뜨고, 압정/재클릭 시 `memo-out`으로 닫히는지(모션 존재), `prefers-reduced-motion` 켜면 애니 없음. 포커스가 압정 닫을 때 칩으로 복귀.

- [ ] **Step 8: 커밋**

```bash
git add src/components/RecipeMemo.tsx src/components/RecipeMemo.module.css src/global.css
git commit -m "refactor(RecipeMemo): CSS Module + @keyframes 모듈 스코프 (모션 검증됨)"
```

---

## Phase 4 — 나머지 컴포넌트 팬아웃

트레이서로 패턴이 증명됐다. 남은 컴포넌트를 **하나씩** 아래 레시피로 이전한다. 각 컴포넌트 = 1 커밋.

### 컴포넌트 이전 레시피 (Task 4.x 공통 절차)

1. `src/components/X.module.css` 생성 — `global.css`의 해당 클래스 규칙을 **값 변경 없이** 복사·이동. 케밥 클래스명은 카멜로(`is-current`→`isCurrent`, `off-divider`→`offDivider` 등), 컴파운드/자식 셀렉터는 모듈이 스코프 처리. 부모-자식 셀렉터(`.card .why`)는 `.card .why` 또는 `.card .why` 형태 유지.
2. `global.css`에서 이전한 규칙 삭제. **공유 유틸(`.list`/`.empty`/`.loading`/`.num`/`.week`)은 절대 삭제하지 않는다.**
3. `X.tsx`에 `import styles from './X.module.css'` (+ 동적 클래스 있으면 `import { cx } from '../cx'`). `className="foo"` → `className={styles.foo}`. 공유 유틸은 문자열: `cx(styles.foo, 'list')`.
4. `npm test -- X && npx tsc --noEmit` 그린.
5. `npm run build`로 회귀 없음, `npm run dev`로 해당 컴포넌트 브라우저 실측.
6. 커밋: `refactor(X): CSS Module 코로케이션`.

### 컴포넌트별 데이터

각 Task 4.x는 위 레시피에 아래 값을 대입한다:

| Task | 컴포넌트 | 소유 클래스(모듈로) | 동적 클래스 (cx) | 공유 유틸(문자열 유지) |
|---|---|---|---|---|
| 4.1 | Sparkline | `spark`,`trend`,`pt`,`val`,`lab`,`norm-line`→`normLine`,`norm-lab`→`normLab`,`now`,`spark-foot`→`sparkFoot` | `cx(styles.val, i===last && styles.now)` 등 `pt/val/lab`의 `now` | `spark-foot`의 `num` → `cx(styles.sparkFoot,'num')`; `data-testid="norm-line"` 유지 |
| 4.2 | NutritionLine | `nutrition`,`stats`,`cell`,`lab`,`val`,`serv`,`u` | 없음 | 없음 |
| 4.3 | SeasonStrip | `season-strip`→`seasonStrip`,`season-bar`→`seasonBar`,`season-cell`→`seasonCell`,`is-season`→`isSeason`,`is-peak`→`isPeak`,`season-labels`→`seasonLabels`,`season-label`→`seasonLabel`,`is-current`→`isCurrent` | `cx(styles.seasonCell, s && styles.isSeason, peak && styles.isPeak)`, `cx(styles.seasonLabel, cur && styles.isCurrent)` | 없음 |
| 4.4 | SeasonHint | `off-season`→`offSeason`,`off-divider`→`offDivider`,`hint-list`→`hintList`,`season-hint`→`seasonHint`,`hint-name`→`hintName`,`hint-when`→`hintWhen`,`hint-coming`→`hintComing`,`nodrop`,`emoji` | 없음 | `.emoji`는 SeasonHint 로컬로 두되 규칙 없음(불활성) — 스타일 없음 확인 |
| 4.5 | FilterBar | `filter`,`fchip`,`ctrlrow` | `cx(styles.fchip, on && styles.on)` — `.on` 모듈에 포함 | 없음 |
| 4.6 | SearchBar | `search`,`controls` | 없음 | 없음 |
| 4.7 | SortControl | `sort`,`sort-icon`→`sortIcon` | 없음 | `data-testid="sort-icon"` 유지, `sort select`는 `styles.sort` 하위 `select` |
| 4.8 | RecipeChips | `chips`,`chip-btn`→`chipBtn`,`recipe-section`→`recipeSection`,`recipe-label`→`recipeLabel`,`memo-layer`→`memoLayer` | `aria-pressed` 상태는 CSS `[aria-pressed="true"]` 셀렉터라 클래스 아님(그대로) | 없음 |
| 4.9 | NavIndex | `nav-index`→`navIndex`,`nav-cord`→`navCord`,`nav-backdrop`→`navBackdrop`,`nav-panel`→`navPanel`,`nav-panel-clip`→`navPanelClip`,`nav-panel-inner`→`navPanelInner` | `[data-open]` 상태 셀렉터(`.nav-index[data-open] .nav-panel`)는 속성 기반, 모듈 내 `.navIndex[data-open] .navPanel`로 유지 | 없음 |
| 4.10 | PeakDot | `peak-dot`→`peakDot`,`peak-tip`→`peakTip`,`peak-badge`→`peakBadge` | `.show` 토글(`.peak-dot.show`) → `cx(styles.peakDot, show && styles.show)` | `data-testid="peak-dot"` 유지 |
| 4.11 | Note | `note`,`nrow`,`lbl` | 없음 | 없음 |
| 4.12 | Sprig | `sprig` | 없음 | **`.week`은 옮기지 않음**(App+Coming 공유 유틸) — Sprig은 `sprig`만 |
| 4.13 | ProduceCard | `card`,`summary-row`→`summaryRow`,`id`,`id-wrap`→`idWrap`,`emoji`,`card-title`→`cardTitle`,`kind`,`why`,`open`,`pin`? | `.card[open]`·`nth-child(odd/even)`은 모듈 내 유지; details 마커 숨김 유지 | `season-strip` 래퍼 `data-testid` 유지 |
| 4.14 | Coming | `coming-month`→`comingMonth` | 없음 | **`.list`·`.empty`·`.week`은 문자열 참조**(공유): `cx(styles.comingMonth)` + 목록은 `className="list"` |
| 4.15 | App | `picks`,`surveyed`,`rel-date`→`relDate`,`date-tip`→`dateTip` | `.rel-date.show`(툴팁) → `cx(styles.relDate, show && styles.show)` | **`.list`·`.empty`·`.loading`·`.week`은 문자열 참조**(공유) |

> 주의(4.13 ProduceCard): `.card summary`, `.card .id`, `.card .emoji`, `.card-title`, `.card .kind`, `.card .why`, `.open`, `.card::before`(마스킹테이프), `.card:nth-child(odd/even)`(기울기), `.card[open]`(테두리) 모두 이 모듈로. `.pin`은 Task 3에서 이미 RecipeMemo로 갔는지 확인 — 압정이 ProduceCard가 아니라 RecipeMemo 소유면 여기서 제외.

> 주의(4.1 Sparkline): SVG 요소 클래스(`.trend`/`.pt`/`.val`/`.lab`/`.norm-line`)는 각 `<text>`/`<circle>`/`<path>`의 `className`을 `styles.*`로. `data-testid="norm-line"`(Task 0.7)은 유지.

### Task 4.16: global.css 잔여 확인 (팬아웃 종료 게이트)

- [ ] **Step 1: 컴포넌트 클래스가 global.css에 남았는지 확인**

Run: `grep -nE "^\.(card|price|spark|memo|nav-|filter|fchip|search|sort|nutrition|season-|note|nrow|peak-|sprig|coming|picks|surveyed|rel-date|chip|off-|hint-)" src/global.css`
Expected: **매치 없음**(공유 유틸 `.list`/`.empty`/`.loading`/`.num`/`.week`과 요소/토큰/폰트/시즌만 남음). 남으면 해당 컴포넌트 Task 재확인.

- [ ] **Step 2: 공유 유틸이 살아있는지 확인**

Run: `grep -nE "^\.list |^\.empty|^\.num |^\.week" src/global.css`
Expected: 4개 규칙 모두 존재.

---

## Phase 5 — 마무리 + 완료 게이트

### Task 5: 전체 검증 및 마무리

**Files:**
- Modify: `src/global.css` (최종 정리)

- [ ] **Step 1: 전체 테스트·타입 게이트**

Run: `npm test && npx tsc --noEmit`
Expected: 둘 다 통과.

- [ ] **Step 2: 프리렌더 빌드 + 하위경로 빌드**

Run: `npm run build`
Expected: `dist/client/` 생성, 콘솔 크래시 없음.
Run: `BASE_PATH=/jecheori/ npm run build`
Expected: 성공. `grep -o 'assets/[^"]*\.css' dist/client/index.html`로 자산 경로가 `/jecheori/` 접두 반영 확인.

- [ ] **Step 3: 브라우저 회귀 실측 (기준선 대비 픽셀·동작 동일)**

`npm run dev` + 프리렌더 산출물 서빙. Task 1 기준 스크린샷과 대조:
- 4계절 팔레트 스왑(`[data-season]`) — 마스킹테이프·간트 색 (`data-season=summer/autumn/…`)
- 카드 홀짝 기울기, 마스킹테이프 `::before`, 잔가지 SVG
- 레시피 메모 드로어 in/out 모션, 압정 닫기 + 포커스 복귀
- 램프줄 인덱스 드로어 `grid-template-rows` 접힘(0fr↔1fr)
- 필터 칩 토글(활성 틴트), 검색, 정렬 select
- 스파크라인(궤적·평년 점선·now 강조), 영양 스탯 정렬, 제철 띠
- `prefers-reduced-motion` 억제, `@view-transition` MPA 전환(지원 브라우저)

스크린샷으로 사인오프.

- [ ] **Step 4: 죽은 CSS·잔재 최종 스캔**

Run: `grep -c "" src/global.css`
Expected: 대략 토큰+폰트+시즌+리셋+header/footer+공유유틸 규모(원 584줄에서 대폭 축소).
Run: `git grep -n "style.css" src`
Expected: 매치 없음(개명 완료, 참조 잔재 없음).

- [ ] **Step 5: 최종 커밋 + 브랜치 마무리**

```bash
git add -A && git commit -m "refactor(css): CSS Modules 코로케이션 마이그레이션 완료"
```

이후 `superpowers:finishing-a-development-branch`로 병합/PR 결정.

---

## Self-Review 메모 (작성자 확인)

- **스펙 커버리지**: 전역↔모듈 경계(Task 1,2,4)·공유 유틸(Global Constraints·4.12/4.14/4.15)·cx(Task1)·테스트 3분류(Phase 0)·트레이서 순서(Phase 2→3→4)·프리렌더 리스크(Task 2 Step5)·키프레임 해시(Task 3 Step6)·로드순서(브라우저 실측)·`[data-season]` 안전(Task 5 Step3)·vite/client 타입(Task 1 Step6) 모두 태스크 있음.
- **타입 일관성**: `cx` 시그니처 Task 1에서 정의, 이후 동일 사용. 테스트 훅(`data-testid="price/compare/chip/basis/memo/count/steps/norm-line/peak-dot/sprig/season-strip/sort-icon"`, `data-dir`, `data-closing`, `aria-label` `닫기/이전/다음`) Phase 0에서 부여, Phase 2~4에서 유지.
- **알려진 판단 지점**: 각 컴포넌트의 정확한 클래스 소유 경계·케밥→카멜 매핑은 구현 시 `global.css` 원문 대조로 확정(레시피가 절차를 완전히 규정).
