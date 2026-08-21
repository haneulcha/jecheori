# Tailwind CSS 도입 (하이브리드) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 토큰을 Tailwind v4 `@theme static`으로 옮기고, 평범한 컴포넌트 8개의 `module.css`를 유틸리티로 녹여 삭제하되, 렌더 결과는 **픽셀 동일**로 유지한다.

**Architecture:** `src/global.css`가 Preflight 없이 `tailwindcss/theme.css` + `tailwindcss/utilities.css` 레이어만 가져오고, 기존 `:root` 토큰이 `@theme static` 블록이 된다(값 불변, 이름만 Tailwind 네임스페이스로). 컴포넌트는 두 부류로 갈린다 — **소멸 8개**는 `module.css`를 지우고 JSX 유틸리티로, **잔류 11개**는 시그니처 CSS를 그대로 둔다. 잔류 모듈의 슬림화는 이번 사이클 범위가 아니다.

**Tech Stack:** TanStack Start (React 19) + Vite 8 + Tailwind CSS v4 (`@tailwindcss/vite`) + Vitest 4 + Testing Library + Storybook 10. node ≥ 22.

## Global Constraints

- **완료 게이트 = `npm test` **와** `npx tsc --noEmit` 둘 다 통과** + UI 변경은 브라우저 실측.
- **시각 결과물 픽셀 동일** — 룩 변경 금지. 순수 리팩터.
- **런타임 의존성 추가 금지.** 새로 들어오는 건 빌드 의존성 `tailwindcss`, `@tailwindcss/vite` 둘뿐. shadcn/Radix/CVA/`tailwind-merge` 금지.
- **임의값 금지** — `p-[0.7rem]`·`text-[15px]` 같은 대괄호 임의값을 쓰지 않는다. 필요하면 `@theme`에 토큰을 추가하거나 그 선언을 모듈에 남긴다.
- **동적 클래스는 완전 리터럴만** — `text-${dir}`는 아무것도 생성하지 않는다. 반드시 `dir === 'rise' ? 'text-rise' : 'text-ink'` 형태.
- **한 요소의 같은 속성을 모듈과 유틸리티 양쪽에서 건드리지 않는다** — 레이어 밖 모듈 CSS가 `@layer utilities`를 항상 이긴다.
- **`@theme inline` 금지** — 계절 팔레트가 죽는다.
- 사용자 문구 한국어·담백한 톤 (이 작업은 카피 변경 없음).
- `src/routeTree.gen.ts`는 커밋 대상 아님(gitignore).
- 순수 로직 테스트는 `tests/`, 컴포넌트 테스트는 `src/components/*.test.tsx`.
- 작업 브랜치: `feat/tailwind-migration` (Task 1에서 생성).

**참조 스펙:** `docs/superpowers/specs/2026-08-10-tailwind-migration-design.md`

---

## 분류 (이 플랜의 권위 있는 표)

**소멸 8개** — `module.css` 삭제: `Coming`(3줄) `SeasonHint`(4) `Livestock`(7) `SortControl`(10) `SearchBar`(12) `PriceBlock`(15) `RecipeChips`(16) `NutritionLine`(23) = **90줄**

**잔류 11개** — 그대로 둠: `ProduceCard`(99) `App`(67) `RecipeMemo`(60) `ButtonGroup`(54) `NavIndex`(39) `SeasonStrip`(32) `FilterBar`(32) `Sparkline`(29) `Sprig`(28) `Note`(5) `PeakDot`(9) = **454줄**

> **스펙 정정:** 스펙 초안은 `PeakDot`을 "소멸"로 분류했으나, `PeakDot.module.css:2-3`의 `width/height: 0.75rem`·`vertical-align: 0.1rem`·`box-shadow: 0 0 0 3px`가 전부 스케일 밖 값이라 임의값 없이는 유틸리티로 옮길 수 없다(스펙 경계 기준 3). **잔류로 정정**한다. 소멸 9→8개, 99→90줄.

---

## Task 1: 기준선 확보 (Phase 0)

전환 전 화면을 찍어둔다. 이후 모든 태스크가 이 기준선과 대조된다.

**Files:**
- Create: `docs/superpowers/notes/tailwind-baseline.md` (측정값 기록)

- [ ] **Step 1: 브랜치 생성**

```bash
git checkout -b feat/tailwind-migration
```

- [ ] **Step 2: 현재 CSS 총량·번들 크기 측정**

```bash
wc -l src/global.css src/components/*.module.css | tail -1
npm run build
ls -l dist/client/assets/*.css
```

Expected: 698줄. `dist/client/assets/`에 CSS 4~5개. 각 크기를 기록해 둔다.

- [ ] **Step 3: 개발서버 띄우고 4계절 × 5화면 스크린샷**

```bash
npm run dev
```

브라우저로 `http://localhost:5173`. 계절은 `<body data-season>`이 현재 월로 정해지므로, 네 계절을 보려면 devtools에서 `document.body.dataset.season = 'spring'|'summer'|'autumn'|'winter'`로 바꿔가며 찍는다.

화면 5종: 홈(`/`), 카드 펼침(카드 하나 클릭), `/coming`, `/livestock`, 검색 힌트(검색창에 `딸기` 입력).

- [ ] **Step 4: 모션 3종 확인·기록**

카드 펼침 리빌(높이+투명도), 램프줄 차양 드로어(`0fr↔1fr`), 레시피 메모 in/out(칩 클릭 → 압정 클릭). 각각 정상 동작을 눈으로 확인하고, `RecipeMemo`의 `<ol>` **단계 번호가 보이는지** 특히 확인한다(Preflight 회귀 감시 대상).

- [ ] **Step 5: 측정값 기록·커밋**

`docs/superpowers/notes/tailwind-baseline.md`에 Step 2의 줄 수·번들 크기, Step 3~4에서 확인한 항목 체크리스트를 적는다.

```bash
git add docs/superpowers/notes/tailwind-baseline.md
git commit -m "docs: Tailwind 마이그레이션 기준선 기록"
```

---

## Task 2: 설치 + `@theme static` + 토큰 참조 일괄 치환 (Phase 1)

**이 태스크의 종료 시점에 화면은 픽셀 동일해야 한다.** 유틸리티는 아직 한 개도 쓰지 않는다.

**Files:**
- Modify: `package.json` (의존성 2개)
- Modify: `vite.config.ts` (플러그인 추가)
- Modify: `src/global.css` (레이어 import + `@theme static`)
- Modify: `src/components/*.module.css` 19개 전부 (변수 이름 치환)

**Interfaces:**
- Produces: `@theme static` 토큰 이름 — `--color-*`(paper/card/ink/muted/line/axis/margin-line/rise/rise-lo/tint/memo/accent), `--spacing-*`(0/3xs/2xs/xs/sm/md/lg/xl/2xl/3xl), `--text-*`(2xs/xs/sm/md/lg/xl), `--radius-*`(crisp/soft/pill), `--font-*`(body/hand/mono), `--font-weight-*`(normal/semibold/bold/extrabold), `--tracking-*`(tight/normal/label/wide/wider/widest), `--shadow-lift`. Task 3 이후 모든 유틸리티가 이 이름에서 나온다.

- [ ] **Step 1: 의존성 설치**

```bash
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Vite 플러그인 등록**

`vite.config.ts`를 아래로 교체:

```ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // 루트 서빙은 '/', GitHub Pages 프로젝트 하위경로는 BASE_PATH=/jecheori/
  base: process.env.BASE_PATH ?? '/',
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    tanstackStart({ prerender: { enabled: true, crawlLinks: true } }),
    viteReact(),
  ],
})
```

> `.storybook/main.ts`는 이름이 `tanstack*`인 플러그인만 걷어내므로 tailwind 플러그인은 Storybook에도 그대로 전달된다. 수정 불필요.

- [ ] **Step 3: `global.css` 상단을 레이어 import + `@theme static`으로 교체**

`src/global.css`의 **1행부터 `[data-season='winter']` 줄까지**(현재 1–81행)를 아래로 교체한다. `@font-face` 5개는 값 그대로 유지하고 위치만 아래 순서를 따른다.

```css
/* Tailwind v4 — Preflight(리셋)은 가져오지 않는다. 이 앱은 자체 리셋을 쓰고,
   Preflight은 <ol> 마커·헤딩 굵기를 지워 "픽셀 동일"을 즉시 깬다.
   (스펙 "결정: Preflight을 쓰지 않는다") */
@layer theme, base, components, utilities;
@import 'tailwindcss/theme.css' layer(theme);
/* source(none) + @source: 자동 소스 탐지를 끄고 src/만 훑는다. 끄지 않으면 docs/의
   마크다운(이 플랜·스펙 문서 자체!)에 적힌 `p-xs`·`bg-tint` 같은 코드 인용까지 스캔해
   쓰지도 않는 유틸리티가 번들에 실리고, "유틸리티가 생성됐나" 게이트가 무의미해진다
   (문서가 대신 생성해주므로 .tsx 스캔이 깨져도 통과한다). */
@import 'tailwindcss/utilities.css' layer(utilities) source(none);
@source "./";

@font-face {
  font-family: 'Wanted Sans';
  src: url('./fonts/WantedSans-400.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: 'Wanted Sans';
  src: url('./fonts/WantedSans-600.woff2') format('woff2');
  font-weight: 600;
  font-display: swap;
}
@font-face {
  font-family: 'Wanted Sans';
  src: url('./fonts/WantedSans-700.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}
@font-face {
  font-family: 'Wanted Sans';
  src: url('./fonts/WantedSans-800.woff2') format('woff2');
  font-weight: 800;
  font-display: swap;
}
/* 손글씨 — 카드 하단 "제철이의 한마디"에만. produce.json 사용 글자로 서브셋
   (npm run subset:fonts). 학교안심 받아쓰기 L, OFL. */
@font-face {
  font-family: 'Hakgyoansim';
  src: url('./fonts/HakgyoansimBadasseugi-L.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}

/* DESIGN.md "절기 스케치북" 토큰 — 텍스트는 오직 쪽빛(--color-ink)이 소유한다.
   계절 웜 컬러는 글자를 싣지 않고 배경(배지·블롭·칩)으로만 쓴다.

   `static` 필수: 기본 @theme은 Tailwind가 컴파일한 CSS에서 실제로 쓰인 변수만
   :root에 내보낸다. 우리 *.module.css는 Vite의 CSS Modules가 처리하므로 거기서
   var(--color-tint)를 참조해도 "사용"으로 세지 않는다 → 토큰이 사라져 모듈이 깨진다. */
@theme static {
  /* Tailwind 기본 스케일 제거 — 우리 스케일 밖 유틸리티가 섞이지 않게.
     --font-*는 지우지 않는다: --font-weight-* 까지 함께 지워질 위험이 있어
     font-bold 등이 사라질 수 있다. 대신 아래에서 필요한 값을 명시 선언한다. */
  --color-*: initial;
  --spacing-*: initial;
  --text-*: initial;
  --radius-*: initial;
  --shadow-*: initial;
  --tracking-*: initial;

  --color-paper: #fbf9f6;
  --color-card: #ffffff;
  --color-ink: #2b4586;
  --color-muted: #7b84a3;
  --color-line: #e7e2d6;
  --color-axis: #cbc2b0;
  --color-margin-line: #e3c4b8;
  --color-rise: #c0392b;      /* 상승 마커 */
  --color-rise-lo: #efeae3;   /* 상승 칩 저채도 배경 */
  --color-tint: #fff4ce;
  --color-memo: #fffcf3;      /* 메모 낱장 — 순백 카드와 구분되는 살짝 따뜻한 종이 */
  /* 계절 기본값 (여름) — [data-season]이 덮어쓴다 */
  --color-accent: #ffc400;

  /* 메모 고정 한정 옅은 부양(그림자 1단계). DESIGN.md 규율 예외 — 카드에만 쓴다. */
  --shadow-lift: 0 2px 6px rgba(43, 69, 134, 0.06);

  /* 간격 스케일 — 리듬 보존(앱의 0.4rem 계열). 1.0(lg)이 최대 클러스터. */
  --spacing-0: 0;
  --spacing-3xs: 0.2rem;
  --spacing-2xs: 0.3rem;
  --spacing-xs: 0.4rem;
  --spacing-sm: 0.6rem;
  --spacing-md: 0.8rem;
  --spacing-lg: 1rem;
  --spacing-xl: 1.5rem;
  --spacing-2xl: 2.5rem;
  --spacing-3xl: 3rem;

  /* 폰트 패밀리 — @font-face 별칭 그대로. 못 구하면 시스템 고딕 폴백. */
  --font-body: 'Wanted Sans', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif;
  --font-hand: 'Hakgyoansim', 'Wanted Sans', 'Apple SD Gothic Neo', sans-serif;
  --font-mono: 'SF Mono', 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace;

  /* 굵기 — 기본값과 같은 값이지만 명시 선언해 --font-* 초기화 여부와 무관하게 보장 */
  --font-weight-normal: 400;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;

  /* 자간 — 앱이 실제로 쓰는 6종. Tailwind 기본(-0.05/-0.025/0/0.025/0.05/0.1em)과
     값이 달라 초기화 후 우리 것만 남긴다. */
  --tracking-tight: -0.02em;   /* 큰 가격 숫자 */
  --tracking-normal: 0;        /* 상속 자간 취소 */
  --tracking-label: 0.02em;    /* 절기 아이브로·조사일 메타줄 */
  --tracking-wide: 0.04em;     /* 섹션 제목 */
  --tracking-wider: 0.06em;    /* 마이크로 라벨 */
  --tracking-widest: 0.08em;   /* 라벨 역할(넓은 자간·600) */

  /* 본문 행간 — body의 1.65. UA 기본 폰트 메트릭을 쓰는 폼 요소(<button> 등)에
     본문과 같은 행간을 되돌릴 때 필요하다(Preflight 미사용이라 UA 기본이 살아 있다). */
  --leading-body: 1.65;

  /* 라운드 — 역할별. crisp=메모 낱장 카드, soft=칩·배지, pill=알약 */
  --radius-crisp: 0.2rem;
  --radius-soft: 0.4rem;
  --radius-pill: 1rem;

  /* 타입 스케일 — 리듬 보존 6단계. 시그니처(아이브로 0.9·h1 1.5·디스플레이 1.7) 무이동. */
  --text-2xs: 0.7rem;  /* 마이크로 라벨·캡션 */
  --text-xs: 0.8rem;   /* 소형 라벨 */
  --text-sm: 0.9rem;   /* 보조 텍스트·절기 아이브로 */
  --text-md: 1rem;     /* 본문·카드/섹션 제목 */
  --text-lg: 1.5rem;   /* 디스플레이 헤딩 — h1 */
  --text-xl: 1.7rem;   /* 최대 디스플레이 — 카드 이모지·큰 가격 */
}

[data-season='spring'] { --color-accent: #a2d3a6; --color-tint: #eaf4e9; }
[data-season='summer'] { --color-accent: #ffc400; --color-tint: #fff4ce; }
[data-season='autumn'] { --color-accent: #ed7328; --color-tint: #fbe7d6; }
[data-season='winter'] { --color-accent: #bc6e79; --color-tint: #f6e7ea; }
```

`global.css`의 나머지(83행 이후 — 리셋·`body`·`#app`·`header`·`.week`·`.list`·`.num`·`footer`·`.empty`·`:focus-visible`·`@view-transition`)는 **그대로 둔다.** Step 4의 치환만 적용된다.

- [ ] **Step 4: 변수 참조 일괄 치환**

`global.css`와 `*.module.css` 19개 전부에서 변수 이름을 바꾼다. 값은 안 바뀐다.

```bash
FILES=$(ls src/global.css src/components/*.module.css)
sed -i '' \
  -e 's/var(--space-/var(--spacing-/g' \
  -e 's/var(--lift)/var(--shadow-lift)/g' \
  -e 's/var(--margin)/var(--color-margin-line)/g' \
  -e 's/var(--paper)/var(--color-paper)/g' \
  -e 's/var(--card)/var(--color-card)/g' \
  -e 's/var(--ink)/var(--color-ink)/g' \
  -e 's/var(--muted)/var(--color-muted)/g' \
  -e 's/var(--line)/var(--color-line)/g' \
  -e 's/var(--axis)/var(--color-axis)/g' \
  -e 's/var(--rise-lo)/var(--color-rise-lo)/g' \
  -e 's/var(--rise)/var(--color-rise)/g' \
  -e 's/var(--tint)/var(--color-tint)/g' \
  -e 's/var(--memo)/var(--color-memo)/g' \
  -e 's/var(--accent)/var(--color-accent)/g' \
  $FILES
```

> `var(--text-*)`·`var(--radius-*)`·`var(--font-*)`는 이름이 이미 맞아 치환 대상이 아니다.
> `var(--z-tooltip, 60)`(`App.module.css:18`)도 토큰이 아니므로 그대로 둔다.

- [ ] **Step 5: 치환 누락 확인**

```bash
grep -rnE "var\(--(space-|lift|margin|paper|card|ink|muted|line|axis|rise|rise-lo|tint|memo|accent)\)" src/ || echo "OK: 옛 변수 참조 없음"
```

Expected: `OK: 옛 변수 참조 없음`.

- [ ] **Step 6: 테스트·타입 게이트**

Run: `npm test && npx tsc --noEmit`
Expected: 둘 다 통과 (422 테스트).

- [ ] **Step 7: ⚠️ 관문 A — 빌드에 Preflight이 없는가**

```bash
npm run build
grep -l "text-size-adjust\|abbr:where" dist/client/assets/*.css || echo "OK: Preflight 없음"
```

Expected: `OK: Preflight 없음`. Preflight 마커가 잡히면 Step 3의 레이어 import가 잘못된 것이다 — `@import 'tailwindcss'`(전체)를 쓰고 있지 않은지 확인하고 고친다.

- [ ] **Step 8: ⚠️ 관문 B — 토큰이 전부 `:root`에 나왔는가**

```bash
for t in color-tint color-accent color-ink spacing-lg text-md radius-pill shadow-lift tracking-widest font-hand; do
  grep -q -- "--$t:" dist/client/assets/*.css && echo "OK $t" || echo "MISSING $t"
done
```

Expected: 전부 `OK`. 하나라도 `MISSING`이면 `@theme`에 `static`이 빠졌다.

- [ ] **Step 9: ⚠️ 관문 C — 유틸리티가 우리 스케일로만 생성되는가**

`src/components/PriceBlock.tsx`에 임시로 `className="p-xs gap-lg text-md font-bold tracking-widest rounded-pill bg-tint m-0"`를 가진 `<span>`을 하나 넣고 빌드한 뒤, 생성 CSS에 각 유틸리티가 있는지 확인한다.

```bash
npm run build
for u in "\.p-xs" "\.gap-lg" "\.text-md" "\.font-bold" "\.tracking-widest" "\.rounded-pill" "\.bg-tint" "\.m-0"; do
  grep -q -- "$u" dist/client/assets/*.css && echo "OK $u" || echo "MISSING $u"
done
grep -q -- "--text-base:\|--spacing: \|--tracking-tighter:" dist/client/assets/*.css && echo "WARN: 기본 스케일 잔존" || echo "OK: 기본 스케일 없음"
```

> 기본 스케일 검사는 **클래스가 아니라 변수**를 본다. `.text-base`·`.p-4`는 누가 쓰지 않으면
> 애초에 생성되지 않아, 클래스 grep은 `initial`을 깜빡해도 통과하는 무의미한 게이트다.
> 반면 `--text-base:`·`--spacing:` 변수는 `initial`이 빠지면 `@theme static` 때문에 반드시 나온다.

Expected: 유틸리티 전부 `OK`, 기본 스케일 `OK: 기본 스케일 없음`. `MISSING`이 나오면 해당 네임스페이스 선언을 고친다(특히 `font-bold` 실패 시 `--font-weight-*` 선언 확인, `m-0` 실패 시 `--spacing-0` 확인).

확인 후 **임시 `<span>`을 반드시 되돌린다.**

```bash
git checkout src/components/PriceBlock.tsx
```

- [ ] **Step 10: 하위경로 빌드 + Storybook 빌드**

```bash
BASE_PATH=/jecheori/ npm run build && npm run build-storybook
```

Expected: 둘 다 성공.

- [ ] **Step 11: 브라우저 실측 — 픽셀 동일 확인**

`npm run dev`. Task 1 기준선과 대조: 4계절 팔레트 스왑, 마스킹테이프, 카드 홀짝 기울기, 손글씨 한마디, 스파크라인, 제철 띠, 세그먼트, 차양 드로어, 레시피 메모 in/out + **`<ol>` 단계 번호**, 헤딩 굵기(`/coming`의 `9월`, 메모 제목).

**게이트: 하나라도 다르면 여기서 중단한다.** 이 시점 차이는 전부 토큰 이식 문제이지 유틸리티 문제가 아니다.

- [ ] **Step 12: 커밋**

```bash
git add package.json package-lock.json vite.config.ts src/global.css src/components/*.module.css
git commit -m "feat(css): Tailwind v4 도입 — @theme static 토큰 이식, Preflight 미사용 (화면 불변)"
```

---

## Task 3: 트레이서 — `PriceBlock` 유틸리티 전환 (Phase 2)

가장 작고(15줄) 조건부 분기가 있는 컴포넌트로 패턴을 확정한다.

**Files:**
- Modify: `src/components/PriceBlock.tsx`
- Delete: `src/components/PriceBlock.module.css`

**Interfaces:**
- Consumes: Task 2의 토큰 이름.
- Produces: **조건부 유틸리티 = 완전 리터럴** 패턴. Task 4.x 전부가 이 패턴을 따른다. `data-testid="price|compare|chip|basis"`·`data-dir`는 그대로 유지(테스트가 쓴다).

- [ ] **Step 1: 클래스 → 유틸리티 매핑 확인**

`src/components/PriceBlock.module.css`의 각 규칙이 아래로 대응된다:

| 모듈 클래스 | 유틸리티 |
|---|---|
| `.price` | `flex flex-col items-end` |
| `.compare` | `inline-flex items-center gap-2xs mb-3xs` |
| `.cmpLabel` | `text-muted text-2xs` |
| `.big` | `text-xl font-extrabold tracking-tight leading-none tabular-nums` + 방향색 |
| `.wonu` | `text-md font-semibold` |
| `.basis` | `text-muted text-2xs mt-2xs whitespace-nowrap tabular-nums` |
| `.near` | `text-muted text-2xs mb-3xs` |
| `.chip` | `inline-flex items-center gap-3xs text-xs font-bold py-3xs px-xs rounded-pill` + 방향색 |
| `.arrow` | `block` |
| `.price.fall .big` / `.price.rise .big` | `text-ink` / `text-rise` (조건부) |
| `.price.fall .chip` / `.price.rise .chip` | `bg-tint text-ink` / `bg-rise-lo text-rise` (조건부) |

> 공유 유틸 `'num'`(= `font-variant-numeric: tabular-nums`)은 Tailwind 내장 `tabular-nums`로 대체한다.

- [ ] **Step 2: `PriceBlock.tsx` 전환**

`src/components/PriceBlock.tsx`의 3–4행 import를 아래로 교체:

```tsx
import { cx } from '../cx'
```

(`import styles from './PriceBlock.module.css'` 줄 삭제.)

`ArrowDown`/`ArrowUp`의 `className={styles.arrow}` → `className="block"`.

컴포넌트 본문을 아래로 교체:

```tsx
export function PriceBlock({ price: p }: { price: PriceCardView }) {
  const dir = p.change?.kind === 'rise' ? 'rise' : 'fall'
  // 방향 분기는 반드시 완전한 클래스 문자열로 고른다 — Tailwind는 소스를 문자열로
  // 스캔하므로 `text-${dir}` 같은 보간은 아무 CSS도 생성하지 않는다.
  const bigColor = dir === 'rise' ? 'text-rise' : 'text-ink'
  const chipColor = dir === 'rise' ? 'bg-rise-lo text-rise' : 'bg-tint text-ink'
  const chip =
    p.change?.kind === 'fall' || p.change?.kind === 'rise' ? (
      <span
        className={cx('inline-flex items-center gap-3xs text-xs font-bold py-3xs px-xs rounded-pill', chipColor)}
        data-testid="chip"
      >
        {p.change.kind === 'fall' ? <ArrowDown /> : <ArrowUp />}
        {p.change.pct}%
      </span>
    ) : null
  return (
    <div className="flex flex-col items-end" data-testid="price" data-dir={dir}>
      {chip && p.change && (p.change.kind === 'fall' || p.change.kind === 'rise') && (
        <span className="inline-flex items-center gap-2xs mb-3xs" data-testid="compare">
          <span className="text-muted text-2xs">{p.change.basisLabel} 대비</span>
          {chip}
        </span>
      )}
      {p.change?.kind === 'similar' && p.change && (
        <span className="text-muted text-2xs mb-3xs">{gwaWa(p.change.basisLabel)} 비슷</span>
      )}
      {p.change?.kind === 'basis' && (
        <span className="text-muted text-2xs mb-3xs">{p.change.basisLabel} 기준</span>
      )}
      <span className={cx('text-xl font-extrabold tracking-tight leading-none tabular-nums', bigColor)}>
        {p.now.toLocaleString('ko-KR')}
        <span className="text-md font-semibold">원</span>
      </span>
      <span className="text-muted text-2xs mt-2xs whitespace-nowrap tabular-nums" data-testid="basis">
        {basisLine(p.unit, p.perUnit)}
      </span>
    </div>
  )
}
```

- [ ] **Step 3: 모듈 파일 삭제**

```bash
git rm src/components/PriceBlock.module.css
```

- [ ] **Step 4: 테스트·타입 게이트**

Run: `npm test -- PriceBlock && npx tsc --noEmit`
Expected: PASS. 테스트는 `data-testid`/텍스트 기반이라 클래스 변화에 무관하다.

- [ ] **Step 5: ⚠️ 관문 — 프리렌더·Storybook에 유틸리티가 잡히는가**

```bash
npm run build
grep -q -- "\.tracking-tight" dist/client/assets/*.css && echo "OK 프리렌더" || echo "FAIL 프리렌더"
npm run build-storybook
grep -rq -- "\.tracking-tight" storybook-static/assets/*.css && echo "OK 스토리북" || echo "FAIL 스토리북"
```

Expected: 둘 다 `OK`. 실패하면 Tailwind의 소스 스캔이 `.tsx`를 훑지 못하는 것이므로 진행을 멈추고 원인을 찾는다.

- [ ] **Step 6: 브라우저 실측**

`npm run dev`로 홈 로드. 하락 카드(쪽빛 큰 숫자·틴트 칩·아래 화살표)와 상승 카드(러스트 숫자·저채도 칩·위 화살표)의 색·정렬·자간·`tabular-nums`가 Task 1 기준선과 동일한지 확인. 기준선 스크린샷 대조.

- [ ] **Step 7: 커밋**

```bash
git add src/components/PriceBlock.tsx
git commit -m "refactor(PriceBlock): CSS Module → Tailwind 유틸리티 (트레이서)"
```

---

## Task 4: 팬아웃 7개 (Phase 3)

Task 3에서 패턴이 증명됐다. 아래 7개를 **하나씩** 같은 절차로 옮긴다.

### 공통 절차 (각 4.x에 그대로 적용)

1. `X.tsx`에서 `import styles from './X.module.css'` 삭제 (다른 import는 유지).
2. 아래 표대로 `className={styles.foo}` → `className="유틸리티"`.
3. `git rm src/components/X.module.css`
4. Run: `npm test && npx tsc --noEmit` → PASS
5. `npm run dev`로 해당 화면 브라우저 실측, 기준선 대조.
6. 커밋: `refactor(X): CSS Module → Tailwind 유틸리티`

### Task 4.1: `Coming`

**Files:** Modify `src/components/Coming.tsx` / Delete `src/components/Coming.module.css`

- [ ] **Step 1: 전환**

`styles.comingMonth` → `"mt-xl"`. `<h2>{m.month}월</h2>` → `<h2 className="text-md tracking-wide mb-md">{m.month}월</h2>`.

```tsx
<section className="mt-xl" key={m.month} data-season={m.season}>
  <h2 className="text-md tracking-wide mb-md">{m.month}월</h2>
```

> `<h2>`의 굵기는 UA 기본값이다(Preflight 미사용이라 유지된다) — `font-bold`를 추가하지 **않는다**.

- [ ] **Step 2~5: 공통 절차 3~6.** 실측 화면: `/coming`.

### Task 4.2: `SeasonHint`

**Files:** Modify `src/components/SeasonHint.tsx` / Delete `src/components/SeasonHint.module.css`

- [ ] **Step 1: 전환**

```tsx
    <li className="flex items-center gap-sm py-sm text-muted">
      <span>{hint.emoji}</span>
      <span className="text-ink font-semibold">{hint.name}</span>
      <span className="text-sm">{hint.seasonLabel} 제철</span>
      {hint.comingSoon && (
        <Link to="/coming" className="ml-auto text-sm text-ink no-underline">다가오는 제철에서 보기</Link>
      )}
    </li>
```

- [ ] **Step 2~5: 공통 절차 3~6.** 실측 화면: 홈에서 `딸기` 검색.

### Task 4.3: `Livestock`

**Files:** Modify `src/components/Livestock.tsx` / Delete `src/components/Livestock.module.css`

- [ ] **Step 1: 전환**

```tsx
          <p className="text-muted text-xs tracking-label m-0">
```

- [ ] **Step 2~5: 공통 절차 3~6.** 실측 화면: `/livestock`.

### Task 4.4: `SortControl`

**Files:** Modify `src/components/SortControl.tsx` / Delete `src/components/SortControl.module.css`

- [ ] **Step 1: 전환**

`SortIcon`의 `className={styles.sortIcon}` → `className="block text-ink"` (`data-testid="sort-icon"` 유지).

```tsx
    <label className="flex-none inline-flex items-center gap-2xs text-muted text-sm">
      <SortIcon />
      <select
        className="bg-card border border-line text-ink rounded-crisp py-2xs px-sm text-sm"
        aria-label="정렬"
        value={sort}
        onChange={(e) => onChange(e.target.value as SortMode)}
      >
```

- [ ] **Step 2~5: 공통 절차 3~6.** 실측 화면: 홈 컨트롤 행.

### Task 4.5: `SearchBar`

**Files:** Modify `src/components/SearchBar.tsx` / Delete `src/components/SearchBar.module.css`

- [ ] **Step 1: 전환**

```tsx
    <input
      type="search"
      className="w-full bg-card border border-line text-ink rounded-crisp py-sm px-md text-md placeholder:text-muted placeholder:text-sm focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-0! focus-visible:border-transparent"
      placeholder="품목 검색 — 오이, 참외…"
      value={query}
      onChange={(e) => onChange(e.target.value)}
    />
```

> 원래 주석("플레이스홀더는 입력값보다 한 단계 작게 — 채워지면 큰 글씨로 또렷해진다")을 이 `<input>` 바로 위 JSX 주석으로 옮긴다.
>
> **`outline-offset-0!`의 `!`는 오타가 아니다.** `global.css:142`의 `:focus-visible { … outline-offset: 2px }`은
> 레이어 밖이라 `@layer utilities`의 유틸리티를 이긴다. 지금은 `.search:focus-visible`(역시 레이어 밖)이
> 이겨서 offset 0이 먹지만, 유틸리티로 옮기면 진다 → 포커스 링이 입력창에서 2px 떠서 그려진다.
> 레이어드-important는 레이어 밖 normal을 이기므로 `!`로 되돌린다. **실측에서 포커스 링이 테두리에
> 딱 붙는지 반드시 확인한다.**

- [ ] **Step 2~5: 공통 절차 3~6.** 실측 화면: 홈 검색창(빈 상태·입력 상태·포커스 링).

### Task 4.6: `RecipeChips`

**Files:** Modify `src/components/RecipeChips.tsx` / Delete `src/components/RecipeChips.module.css`

- [ ] **Step 1: 전환**

```tsx
    {/* 양옆 -mx-lg로 카드 안쪽 패딩을 상쇄해 횡스크롤 풀블리드, px-lg로 첫/끝 칩은 콘텐츠에 정렬 */}
    <div className="flex gap-xs overflow-x-auto -mx-lg px-lg pb-2xs">
      {recipes.map((r, i) => (
        <button
          key={r.name}
          type="button"
          className="flex-none font-body font-normal text-xs leading-body bg-transparent border border-dashed border-line rounded-soft py-2xs px-md text-ink cursor-pointer whitespace-nowrap transition-colors duration-150 hover:border-ink aria-pressed:border-solid aria-pressed:border-ink aria-pressed:bg-tint focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
          aria-pressed={current === i}
          aria-controls={current === i ? memoId : undefined}
          onClick={() => onSelect(i)}
        >
          {r.name}
        </button>
      ))}
    </div>
```

> **`font: inherit` 대체가 이 태스크의 핵심이다.** 원래 `.chipBtn`의 `font: inherit`는 `<button>`이
> UA 기본 폰트·행간을 쓰는 걸 막던 선언이고, Preflight을 안 쓰므로 그 UA 기본이 그대로 살아 있다.
> `font` 단축은 family·size·style·variant·weight·**line-height**를 함께 상속시키므로,
> `font-body font-normal text-xs leading-body` 넷이 모두 있어야 등가다. `leading-body`(=1.65)가
> 빠지면 UA `normal`(~1.2)이 걸려 **칩 높이가 약 6px 줄어든다.**
>
> `background: none` → **`bg-transparent`**(`bg-none`이 아니다). `bg-none`은 `background-image`만
> 건드려서, Preflight 없이는 `<button>`의 UA `background-color: ButtonFace`(회색)가 남는다.
>
> 원래 `.chips`의 `-webkit-overflow-scrolling: touch`는 **의도적으로 버린다** — iOS 13+에서 무시되는
> 레거시 속성이라 동작 차이가 없다. 원래 `.chipBtn`의 주석("누름 피드백은 활성(tint+실선)으로 충분 —
> scale 변형은 텍스트가 들썩여 쓰지 않는다")을 `<button>` 바로 위 JSX 주석으로 옮긴다.

- [ ] **Step 2: ⚠️ 폰트·높이 등가 확인**

`npm run dev`로 카드를 펼쳐 레시피 칩을 Task 1 기준선과 대조한다. 확인 항목:

- 글꼴이 본문(Wanted Sans)과 같은가 — 다르면 `font-body`가 안 먹은 것.
- **칩 높이**가 기준선과 같은가 — 낮아졌으면 `leading-body`가 안 먹은 것(`--leading-body` 선언 확인).
- 배경이 카드와 같은 흰색인가 — 회색이면 `bg-transparent`가 아니라 `bg-none`을 쓴 것.

셋 중 하나라도 어긋나면 고친 뒤 다시 확인한다. 그래도 안 맞으면 `RecipeChips.module.css`를 되살려
`.chipBtn { font: inherit; font-size: var(--text-xs); }` **두 줄**을 남기고(한 줄만 남기면 단축이
크기를 되돌려 0.8rem이 1rem이 된다) className에서 `font-body font-normal text-xs leading-body`를 빼며,
`styles` import와 `cx`를 **다시 연결한다**. 이 경우 `RecipeChips`는 잔류 12번째가 되고 상단 분류표를 갱신한다.

- [ ] **Step 3~6: 공통 절차 3~6.** 실측 화면: 카드 펼침 → 레시피 칩(기본·호버·활성·포커스).

### Task 4.7: `NutritionLine`

**Files:** Modify `src/components/NutritionLine.tsx` / Delete `src/components/NutritionLine.module.css`

- [ ] **Step 1: 전환**

```tsx
    <div className="text-ink self-center">
      {/* 스탯 6개가 모바일 카드 폭(~325px)에 한 줄로 들어오게 간격을 lg로.
          xl(1.5rem)이면 6셀+간격이 폭을 ~10px 넘겨 지방 하나가 둘째 줄로 밀렸다. */}
      <div className="flex flex-wrap gap-lg justify-center">
        {cells.map((c) => (
          <span className="flex flex-col items-center" key={c.label}>
            <span className="text-2xs tracking-wider text-muted">{c.label}</span>
            <span className="text-md font-bold text-ink tabular-nums mt-3xs">
              {c.num}
              <span className="text-2xs font-semibold ml-3xs">{c.unit}</span>
            </span>
          </span>
        ))}
      </div>
      <p className="text-2xs text-muted text-right mt-2xs">{nutrition.serving} 기준</p>
    </div>
```

> **`m-0`을 넣지 않는다.** 원래 `.serv`(`NutritionLine.module.css:23`)는 `margin-top`만 지정하고
> `<p>`의 UA `margin-bottom`은 **그대로 둔다** — `.nutrition`이 flex 아이템이라 그 마진이 상쇄되지 않고
> 실제 높이(약 11px)로 남아 있다. `m-0`을 넣으면 펼친 카드가 그만큼 짧아진다.
> (참고: className 문자열의 순서는 CSS 우선순위에 영향이 없다. 단축 `.m-0`은 생성 CSS에서 항상
> 롱핸드 `.mt-2xs`보다 앞에 놓이므로, 순서를 바꿔 해결하려는 시도는 통하지 않는다.)

- [ ] **Step 2~5: 공통 절차 3~6.** 실측 화면: 카드 펼침 → 영양 스탯(6셀 한 줄 유지 확인).

---

## Task 5: 정리 + 문서 갱신 (Phase 5)

**Files:**
- Modify: `src/components/FilterBar.module.css` (죽은 코드 2줄 삭제)
- Modify: `CLAUDE.md`, `DESIGN.md`, `docs/superpowers/specs/2026-07-19-css-modules-colocation-design.md`
- Modify: `/Users/haneul/.claude/projects/-Users-haneul-Projects-wat-to-buy/memory/design-token-system.md`
- Modify: `docs/superpowers/notes/tailwind-baseline.md` (최종 실측 기록)

- [ ] **Step 1: `FilterBar`의 죽은 스크롤바 규칙 삭제**

`src/components/FilterBar.module.css`에서 아래 두 곳을 삭제한다 — `global.css`가 이미 `*`에 적용한다.

- `.filter`의 `scrollbar-width: none;` 줄
- `.filter::-webkit-scrollbar { display: none; }` 줄 전체

- [ ] **Step 2: 임의값·보간 클래스 grep 게이트**

```bash
grep -rnE 'className="[^"]*\[[^]]*\]' src/components/*.tsx || echo "OK: 임의값 없음"
grep -rnE 'className=\{`[^`]*\$\{' src/components/*.tsx || echo "OK: 보간 클래스 없음"
```

Expected: 둘 다 `OK`.

- [ ] **Step 3: 최종 실측 기록**

```bash
wc -l src/global.css src/components/*.module.css | tail -1
ls -l dist/client/assets/*.css
```

`docs/superpowers/notes/tailwind-baseline.md`에 전/후를 나란히 적는다 (손으로 쓰는 CSS 줄 수, CSS 번들 크기).

- [ ] **Step 4: `CLAUDE.md` 갱신**

"아키텍처 경계" 절에 한 줄, 그리고 새 소절을 추가한다:

```markdown
- **`src/global.css`** — Tailwind 레이어 import(Preflight 미사용) + `@theme static` 토큰 + 자체 리셋·`[data-season]`·`@view-transition`

## 스타일 경계 (하이브리드)

스타일은 세 곳에 산다: `global.css`(토큰·리셋·전역) / `*.module.css`(시그니처) / JSX 유틸리티(나머지).
**모듈에 남기는 기준 셋** — 하나라도 걸리면 모듈:

1. JSX가 모르는 상태 (`nth-child`, `::details-content`, `::marker`)
2. 선언보다 근거가 중요해 주석이 붙은 것
3. 스케일 밖 기하 (`calc(100% / 24)`, `0.3rem`)

부수 규칙: **임의값(`p-[…]`) 금지**(토큰 추가하거나 모듈에 남긴다) · **동적 클래스는 완전 리터럴만**
(`text-${dir}`는 아무 CSS도 생성 안 함) · **한 요소의 같은 속성을 모듈과 유틸리티 양쪽에서 안 건드림**
(레이어 밖 모듈이 `@layer utilities`를 항상 이긴다) · **`@theme inline` 금지**(계절 팔레트가 죽는다).
```

- [ ] **Step 5: `DESIGN.md` 갱신**

"순수 CSS 변수" 결정을 "Tailwind `@theme static` 토큰 + 하이브리드"로 개정하고, 결정 기록에 날짜와 근거(작성 속도가 주된 이유, Preflight 미사용, 시그니처는 CSS 유지)를 한 문단 추가한다.

- [ ] **Step 6: 옛 스펙에 개정 표시**

`docs/superpowers/specs/2026-07-19-css-modules-colocation-design.md` 상단(제목 바로 아래)에 한 줄 추가:

```markdown
> **2026-08-11 부분 개정:** 토큰·평범한 컴포넌트는 Tailwind로 이관됐다
> (`2026-08-10-tailwind-migration-design.md`). 이 문서의 전역↔모듈 경계 판단과
> Tailwind 반려 근거(맞춤 효과와의 충돌)는 시그니처 모듈에 대해 여전히 유효하다.
```

- [ ] **Step 7: 메모 갱신**

`design-token-system.md` 메모를 Tailwind `@theme static` 기반으로 고쳐 쓴다 (순수 CSS 변수 → `@theme static`, 계절 스왑이 `@theme inline` 금지에 의존한다는 사실 포함).

- [ ] **Step 8: 전체 게이트**

```bash
npm test && npx tsc --noEmit && npm run build && BASE_PATH=/jecheori/ npm run build && npm run build-storybook
```

Expected: 전부 성공.

- [ ] **Step 9: 최종 브라우저 회귀 실측**

Task 1 기준선 전 항목 대조: 4계절 팔레트, 마스킹테이프·홀짝 기울기, 손글씨, 스파크라인·평년 점선, 제철 띠, 영양 6셀 한 줄, 레시피 칩·메모 in/out·`<ol>` 번호·포커스 복귀, 차양 `0fr↔1fr`, 세그먼트 썸 슬라이드, 필터 칩 넘침 페이드, 정렬 select, 검색·빈 상태, `prefers-reduced-motion`, `@view-transition`.

스크린샷으로 사인오프.

- [ ] **Step 10: 커밋**

```bash
git add -A
git commit -m "docs: Tailwind 하이브리드 경계 규칙 반영 + 죽은 CSS 정리"
```

이후 `superpowers:finishing-a-development-branch`로 병합/PR 결정.

---

## Self-Review 메모 (작성자 확인)

- **스펙 커버리지**: Preflight 미사용(Task 2 Step 3·7)·`@theme static`(Step 3·8)·`@theme inline` 금지(Global Constraints)·기본 스케일 초기화(Step 3·9)·토큰 개명(Step 3~5)·경계 기준(Task 5 Step 4)·임의값 금지(Task 5 Step 2)·완전 리터럴(Task 3 Step 2)·레이어 우선순위(Global Constraints)·주석 이전(Task 4.5/4.6/4.7)·기준선(Task 1)·번들 크기(Task 1 Step 2, Task 5 Step 3) 모두 태스크 있음.
- **스펙과의 차이 3건**: (1) `PeakDot`을 잔류로 정정(스케일 밖 기하). (2) 스펙 토큰 표에 없던 `--tracking-*` 6종·`--font-weight-*` 4종·`--spacing-0`·`--leading-body`를 추가 — 앱이 실제로 쓰는 자간·굵기·`margin: 0`·폼 요소 행간을 임의값 없이 표현하려면 필요하다. (3) **공유 유틸 `.list`/`.empty`/`.num`/`.week`은 이번 사이클에서 해체하지 않는다** — 스펙 Phase 5는 해체한다고 썼지만, `.num`은 `Sparkline.tsx:27`(잔류)이, `.list`/`.week`/`.empty`는 이 플랜이 손대지 않는 `App.tsx`가 여전히 쓴다. 잔류 모듈 슬림화 사이클에서 함께 처리한다.

- **명시적으로 받아들이는 편차 2건** (픽셀은 동일, 동작 곡선만 다름 — Task 5 Step 3에서 기준선 노트에 기록):
  1. 레시피 칩 트랜지션 이징이 CSS 기본 `ease`(0.25,0.1,0.25,1) → Tailwind 기본 `cubic-bezier(0.4,0,0.2,1)`로 바뀐다. 150ms 색 전환이라 체감 차이는 미미하다.
  2. `hover:` 유틸리티는 v4에서 `@media (hover: hover)`로 감싸져, 터치에서 탭 후 hover가 눌어붙던 동작이 사라진다. 모바일 앱이라 오히려 개선이지만 편차임을 기록한다.

- **미해소 판단 지점**: `RecipeChips`의 폰트·높이 등가(Task 4.6 Step 2). `font: inherit` 대체가 넷(`font-body font-normal text-xs leading-body`)으로 나뉘므로 실측이 필수다. `<select>`(Task 4.4)는 원래 CSS도 `font-family`를 지정하지 않아 UA 폰트가 기준선이므로 **변경 없음이 정답**이다.
- **타입 일관성**: 컴포넌트 시그니처·`data-testid`·`aria-*`는 전부 불변. 테스트 파일은 한 곳도 수정하지 않는다.
