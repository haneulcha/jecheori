# Tailwind CSS 도입 (하이브리드) — 설계

- 날짜: 2026-08-10 (리뷰 반영 2026-08-11)
- 상태: 초안 — 사용자 리뷰 대기
- 관련: `DESIGN.md`, `docs/superpowers/specs/2026-07-19-css-modules-colocation-design.md`(이 스펙이 부분 개정),
  `docs/superpowers/specs/2026-07-17-design-tokens-structural-design.md`, `docs/superpowers/specs/2026-07-17-type-scale-tokens-design.md`

## 배경 · 동기

2026-07-19 CSS Modules 코로케이션 스펙은 Tailwind를 **명시적으로 반려**했다. 근거는 셋이었다:
(1) 전역 스코프 문제의 원인은 클래스명이 아니라 스코프이므로 모듈로 충분하다, (2) 앱 정체성의
상당 부분인 맞춤 효과가 유틸리티와 싸운다, (3) CSS Modules는 Vite 내장이라 **새 의존성이 0**이다.

그 마이그레이션은 완료됐고, 반려 근거 (1)과 (3)은 여전히 사실이다. 그럼에도 Tailwind를 도입하는
이유는 스코프 문제 해결이 아니라 **다른 목적**이다:

- **작성 속도 (주된 이유)** — 클래스 이름 짓기·파일 왕복 없이 JSX에서 바로 스타일링. 이 하나가
  이 결정을 떠받친다.
- **에이전트 친화 (보조 가설)** — AI 보조 UI 작업의 산출물 품질이 낫다는 판단. 근거는 경험적
  인상이며 이 스펙이 증명하지 않는다.
- **생태계 접근성 (미래 대비)** — shadcn/ui 등을 **필요해질 때** 붙일 수 있는 상태. 이 스펙은
  shadcn을 도입하지 않으므로, 이 동기는 당장 아무것도 회수하지 않는다.

### 치르는 값 (명시)

- **의존성 0 원칙 포기.** `tailwindcss` + `@tailwindcss/vite`가 빌드 의존성으로 들어온다.
  런타임 의존성은 여전히 0이고 공개 페이지의 "무추적·런타임 외부요청 없음"은 유지된다.
- **스타일이 사는 곳이 둘에서 셋으로.** 전역 / `module.css` / JSX 유틸리티. CSS Modules
  마이그레이션의 동기였던 "컴포넌트당 한 군데만 보면 된다"가 약해진다. 이걸 상쇄하려고
  경계 규칙(아래)을 규범이 아니라 **표로** 못박는다.
- **관용구 두 벌 유지.** 같은 것을 두 방식으로 쓸 수 있게 되므로, "어느 쪽으로 쓸지"를
  사람이 매번 판단하지 않도록 규칙이 필요하다.

반려 근거 (2)는 그대로 살아 있다 — 그래서 전면 전환이 아니라 **하이브리드**다.

## 비목표 (YAGNI)

- **룩 변경 없음. 시각 결과물은 픽셀 동일**해야 한다(순수 리팩터).
- 토큰 값 재설계 안 함 — 간격·타입 스케일의 앱 고유 리듬(`0.4rem` 계열, `--text-lg: 1.5rem`)을
  Tailwind 기본값으로 반올림하지 **않는다**. DESIGN.md가 "리듬 보존"을 명시적 결정으로 기록했다.
- **shadcn/ui 및 그 의존성(Radix, `class-variance-authority`, `tailwind-merge`) 도입 안 함.**
- `module.css` 전멸을 목표로 하지 않는다.
- 테스트 구조 변경 없음 — 테스트는 이미 클래스 셀렉터 0이라 이 전환에 영향받지 않는다.
- **잔류 모듈의 "평범한 부분" 걷어내기는 이번 사이클에서 하지 않는다** (아래 "범위" 참조).

## 사전 확인된 사실

### 코드베이스

- 손으로 쓰는 CSS **698줄** = `src/global.css` 154 + `src/components/*.module.css` 19개 544줄.
- `src/cx.ts`는 3줄. `--margin` 토큰의 소비자는 `Note.module.css:2` **한 곳뿐**.
- 컴포넌트 테스트는 `data-testid`/role/text 기반, 클래스 셀렉터 **0**.
- `.storybook/main.ts`의 `viteFinal`은 이름이 `tanstack*`인 플러그인만 걸러내므로
  `@tailwindcss/vite`는 살아남는다 → Storybook은 자동으로 따라온다.
- `src/routes/__root.tsx:3,13`이 `global.css`를 `?url`로 링크한다. Tailwind 공식 TanStack Start
  가이드가 쓰는 것과 같은 패턴이다.

### 소멸 8개 (~90줄) — `module.css` 삭제

`Coming`(3) `SeasonHint`(4) `Livestock`(7) `SortControl`(10) `SearchBar`(12)
`PriceBlock`(15) `RecipeChips`(16) `NutritionLine`(23).

전부 stock Tailwind로 표현된다. 단순 flex/gap만은 **아니며**, 아래는 각각 대응 변형이 있다:

| 파일:줄 | 현재 | 대응 |
|---|---|---|
| `PriceBlock.module.css:12-15` | `.price.fall .big`, `.price.rise .chip` | `dir`이 JSX에서 이미 알려진 값 → 조건부 **완전 리터럴** 클래스 |
| `SearchBar.module.css:11-12` | `::placeholder`, `:focus-visible` | `placeholder:`, `focus-visible:` |
| `RecipeChips.module.css:3` | `margin: 0 calc(-1 * var(--space-lg))` | 음수 유틸 `-mx-lg` |
| `RecipeChips.module.css:15` | `[aria-pressed="true"]` | `aria-pressed:` |

### 잔류 11개 (~454줄) — 모듈 유지

| 컴포넌트 | 잔류 사유 |
|---|---|
| `ProduceCard`(99) | 테이프 `::before`(`color-mix`), `nth-child(odd/even)` 회전, `::details-content` + `interpolate-size` 리빌 전환 |
| `App`(67) | `.dateTip::before` 삼각 화살표, 툴팁 3중 상태 |
| `RecipeMemo`(60) | `@keyframes` memo-in/out |
| `ButtonGroup`(54) | 썸 동심반경 `calc(var(--radius-pill) - 3px)`, `inset` 음영 |
| `NavIndex`(39) | 차양 `grid-template-rows: 0fr→1fr` 전환, `.navCord::after` 히트영역 확장 |
| `SeasonStrip`(32) | 축선 `::before` + `calc(100% / 24)` |
| `FilterBar`(32) | 넘침 페이드 `mask-image: linear-gradient(… calc(100% - 14px))` + 그 근거 주석 |
| `Sparkline`(29) | SVG 요소(`path`/`circle`/`text`) 셀렉터 |
| `Sprig`(28) | `@keyframes sprig-draw` + `nth-of-type` 순차 지연 |
| `Note`(5) | 여백선 `::before` — `0.3rem`/`0.1rem`이 스케일 밖이라 임의값 없이 표현 불가 |
| `PeakDot`(9) | `0.75rem` 도트·`0.1rem` 정렬·`0 0 0 3px` 링이 전부 스케일 밖 (상태 셀렉터 자체는 `group-*` 변형으로 표현 가능하나 기하가 걸린다) |

> `FilterBar.module.css:7,13`(`scrollbar-width: none`, `::-webkit-scrollbar`)은 **죽은 코드**다 —
> `global.css:86-87`이 이미 `*`에 적용한다. 잔류시키되 이 두 줄은 삭제한다.

### Tailwind v4 동작 (v4.3.3에서 실측 검증됨)

- `@theme`(비-inline)은 `@layer theme { :root { --color-accent: … } }`를 내보내고 유틸리티는
  `var(--color-accent)`를 참조한다 → `[data-season]` 오버라이드가 먹는다. **`@theme inline`은
  값을 유틸리티에 박아버려** 계절 스왑을 죽인다.
- **이름 있는 `--spacing-*` 키가 유틸리티를 생성한다** — `--spacing-xs: 0.4rem` → `.p-xs` `.gap-xs`
  `.w-xs`, 음수 `-mx-lg`까지. (이전 초안의 미검증 가정 → **해소**. 폴백 `p-(--spacing-xs)`는 불필요.)
- `--color-*: initial`은 기본 팔레트를 지우되 `transparent`/`currentColor`/`inherit`는 **남긴다**.
- `--text-*: initial`은 기본값에 딸린 line-height 짝도 지운다 → `text-md`가 font-size만 내보내
  현재 동작(line-height는 `body`에서 상속)과 정확히 일치한다.
- 네임스페이스→유틸리티 매핑 확인: `--shadow-lift`→`shadow-lift`, `--radius-crisp`→`rounded-crisp`,
  `--font-hand`→`font-hand`, `--text-md`→`text-md`.
- `@tailwindcss/vite`의 peerDeps는 `vite: ^5.2 || ^6 || ^7 || ^8` — 이 저장소의 Vite 8과 호환.

## 아키텍처

### 경계 규칙 — 어디에 무엇을 쓰나

초안의 한 줄 규칙("의사요소·`@keyframes`·복합 상태 셀렉터·`calc` = 모듈")은 **폐기한다.** 리뷰에서
드러났듯 그 말은 실제 기준이 아니었다 — `::placeholder`도 `[aria-pressed]`도 Tailwind가 표현하고,
정작 잔류 이유인 `nth-child`·SVG 셀렉터·`mask-image`는 그 규칙에 들어 있지도 않았다.

**실제 기준은 셋이다. 하나라도 걸리면 모듈에 남긴다:**

1. **JSX가 모르는 상태에 걸린 스타일** — 형제 순서(`nth-child`/`nth-of-type`), 문서 구조,
   브라우저가 만드는 의사요소(`::details-content`, `::marker`). React가 값을 모르므로
   조건부 클래스로 옮길 수 없다.
2. **선언 자체보다 근거가 중요한 스타일** — "왜 `border-top`이 아니라 `::before`인가", "왜 이 카드만
   다른 이징 곡선인가" 같은 주석이 붙은 선언. 주석이 갈 곳이 없으면 선언도 옮기지 않는다.
3. **스케일 밖 기하** — `calc(100% / 24)`, `calc(var(--radius-pill) - 3px)`, `0.3rem` 같은 토큰에 없는 값.
   유틸리티로 옮기면 임의값이 되어 아래 "임의값 금지"와 충돌한다.

**이번 마이그레이션에서는 위 "소멸 8 / 잔류 11" 표가 규칙보다 우선한다** — 규칙은 새 코드를 쓸 때의
지침이고, 이미 분류가 끝난 기존 파일은 표를 따른다.

### 부수 규칙 4가지

- **임의값 금지.** `p-[0.7rem]`·`text-[15px]`처럼 대괄호 임의값을 쓰지 않는다. 필요하면 토큰을
  추가하거나 모듈에 남긴다. 네임스페이스 초기화는 *이름 있는* 유틸리티만 막지 임의값은 못 막으므로,
  이 규칙이 "스케일 밖 값 차단"의 실질적 집행 수단이다. Phase 5에서 grep 게이트로 검사한다.
- **동적 클래스는 완전 리터럴만.** Tailwind는 소스에서 문자열을 스캔하므로 `text-${dir}`는
  **아무것도 생성하지 않고 조용히 무스타일이 된다.** 반드시
  `dir === 'fall' ? 'text-ink' : 'text-rise'` 형태로 온전한 클래스명을 고른다. `cx`는 그대로 쓴다.
  이 함정은 트레이서(`PriceBlock`의 `fall`/`rise` 분기)에서 가장 먼저 만난다.
- **레이어 우선순위 주의.** 유틸리티는 `@layer utilities`에 있고 `module.css`·잔여 전역 규칙은
  레이어 밖이다. **레이어 밖 CSS가 특정도와 무관하게 모든 레이어를 이긴다** → 같은 요소에 모듈
  클래스와 유틸리티가 함께 붙으면 **모듈이 이긴다**. "유틸리티가 안 먹는다"의 정체가 이것이다.
  한 요소의 같은 속성을 두 곳에서 건드리지 않는다.
- **주석 이전 규칙.** 소멸하는 모듈의 결정 근거 주석(예: `NutritionLine.module.css:6-7`의 간격 실측
  근거, `RecipeChips.module.css:3`의 풀블리드 근거)은 해당 JSX 요소 **바로 위 주석으로 옮긴다.**
  옮길 자리가 마땅치 않으면 그 자체가 기준 2에 해당해 모듈 잔류 사유가 된다.

`tailwind-merge`는 넣지 않는다 — 충돌하는 조건부 클래스를 런타임에 푸는 대신 애초에 안 쓴다.

### 토큰 — `:root` → `@theme static`

`global.css`의 `:root` 블록이 `@theme`으로 옮겨간다. **값은 한 글자도 바꾸지 않는다.**

| 현재 | `@theme` | 생성 유틸리티 |
|---|---|---|
| `--paper` `--card` `--ink` `--muted` `--line` `--axis` `--rise` `--rise-lo` `--tint` `--memo` `--accent` | `--color-*` | `bg-paper` `text-ink` `border-line` |
| `--margin` (여백선 색) | `--color-margin-line` | `bg-margin-line` |
| `--space-3xs…3xl` | `--spacing-*` | `p-xs` `gap-lg` `-mx-lg` |
| `--text-2xs…xl` | `--text-*` (이름 동일) | `text-md` `text-xl` |
| `--radius-crisp/soft/pill` | `--radius-*` | `rounded-crisp` `rounded-pill` |
| `--font-body/hand/mono` | `--font-*` | `font-hand` `font-mono` |
| `--lift` (box-shadow) | `--shadow-lift` | `shadow-lift` |
| (신규) 자간 6종 — `-0.02` `0` `0.02` `0.04` `0.06` `0.08em` | `--tracking-tight/normal/label/wide/wider/widest` | `tracking-widest` |
| (신규) 굵기 4종 — 400·600·700·800 | `--font-weight-normal/semibold/bold/extrabold` | `font-bold` |
| (신규) `margin: 0` 표현용 | `--spacing-0: 0` | `m-0` |
| `--z-tooltip` (`App.module.css:18`, 폴백 60) | 토큰화 안 함 | 모듈 안에 그대로 |

> 신규 3종은 플랜 작성 중 드러났다. 앱이 실제로 쓰는 자간·굵기·`margin: 0`을 **임의값 없이**
> 표현하려면 필요하다(Tailwind 기본 자간 스케일은 우리 값과 다르고, 굵기는 `--font-*` 초기화에
> 함께 지워질 위험이 있어 명시 선언한다).

**`--margin` → `--color-margin-line` 개명**: `--color-margin`이면 margin 유틸리티와 헷갈린다.
소비자가 한 곳뿐이라 비용이 낮다.

### 결정: `@theme static`을 쓴다 (기본 `@theme` 아님)

기본 `@theme`은 **Tailwind가 컴파일한 CSS 안에서 실제로 쓰인 변수만** `:root`에 내보낸다.
그런데 `*.module.css` 19개는 Vite의 CSS Modules 파이프라인이 처리하므로, 거기서 `var(--tint)`를
아무리 참조해도 Tailwind는 "사용"으로 세지 않는다. `[data-season]`이 값을 **설정**하는 것도
사용이 아니다.

결과적으로 기본 `@theme`이면 **Phase 1(유틸리티 0개) 시점에 토큰 대부분이 `:root`에서 사라지고
모듈 스타일이 조용히 깨진다.** `@theme static`은 정의된 변수를 전부 내보낸다.

### 결정: Preflight을 쓰지 않는다

`@import "tailwindcss"`는 Preflight(리셋)을 `@layer base`에 함께 넣는다. 이 앱에는 이미 자체
리셋이 있고, Preflight은 **픽셀 동일을 즉시 깬다**:

- `ol, ul { list-style: none }` → `RecipeMemo.tsx`의 `<ol>` 단계 번호가 `li::marker`로 그려지는데
  **번호가 사라진다**.
- `h1–h6 { font-size: inherit; font-weight: inherit }` → `Coming.tsx`의 `<h2>`, `RecipeMemo.tsx`의
  `<h3>`가 **굵기를 잃는다**(모듈은 크기만 지정).
- `* { margin: 0; padding: 0 }`, `img, svg { display: block }` 등이 앱이 아직 기대는 UA 기본값을 지운다.

따라서 Preflight 없이 필요한 레이어만 가져온다:

```css
@layer theme, base, components, utilities;
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/utilities.css' layer(utilities);
```

기존 리셋은 `global.css`에 그대로 둔다. (Preflight 채택은 룩 변경을 수반하므로 별도 사이클 주제다.)

### 결정: `@theme inline`을 쓰지 않는다

계절 팔레트가 죽기 때문이다(위 "Tailwind v4 동작"). 계절 블록은 개명해 `global.css`에 남는다:

```css
[data-season='autumn'] { --color-accent: #ed7328; --color-tint: #fbe7d6; }
```

### 결정: Tailwind 기본 스케일을 초기화한다

```css
@theme static {
  --color-*: initial;
  --spacing-*: initial;
  --text-*: initial;
  --radius-*: initial;
  --font-*: initial;
  --shadow-*: initial;
  /* 이하 우리 토큰 */
}
```

안 지우면 우리 `--text-lg`(1.5rem)와 기본 `--text-lg`(1.125rem)가 충돌하고, `text-base`·`text-2xl`
같은 **우리 스케일에 없는 유틸리티가 조용히 섞인다.**

### 전역에 남는 것 (`src/global.css`)

레이어 import + `@theme static` + 아래:

- `@font-face` × 5 (Wanted Sans 4벌 + 손글씨)
- `[data-season]` 4계절 팔레트
- 자체 리셋(`*` box-sizing, 스크롤바 전역 숨김), `body`, `#app` 셸
- 헤더 블롭 `header::before` — 시그니처
- `:focus-visible`, `@view-transition` + reduced-motion 억제

공유 유틸 `.list`/`.empty`/`.num`/`.week`은 **이번 사이클에서는 그대로 둔다.** 전부 유틸리티로
표현 가능하지만(`.num` → 내장 `tabular-nums`), 소비자가 잔류 컴포넌트다 — `.num`은 `Sparkline`,
나머지는 `App`. 잔류 모듈 슬림화 사이클에서 함께 해체한다.

## 범위 · 전환 순서

**이번 사이클: Phase 0–3, 5.** 잔류 11개 모듈의 "평범한 부분 걷어내기"(초안의 Phase 4)는
**별도 사이클로 뺀다** — 경계 판단이 가장 많이 몰리는데 사용자에게 보이는 값은 가장 적고,
Phase 3 팬아웃 경험이 쌓인 뒤에 하는 게 판단이 정확하다.

1. **Phase 0 — 기준선 확보.** 4계절 × (홈·카드펼침·`/coming`·`/livestock`·검색힌트) 스크린샷 +
   모션 3종(카드 리빌·차양 드로어·메모 in/out). CSS 번들 크기 기록.
2. **Phase 1 — 설치·토큰 이식.** `tailwindcss` + `@tailwindcss/vite`, 레이어 import(Preflight 없이),
   `@theme static`, 기본 스케일 초기화, `--space-*`→`--spacing-*`·`--margin`→`--color-margin-line`
   참조 일괄 치환. **유틸리티는 아직 안 쓴다 → 화면 픽셀 동일이어야 한다.**
   종료 조건: 생성 CSS에 Preflight 없음, 토큰 전부 `:root`에 존재, 4계절 스왑 정상, 프리렌더·
   Storybook 빌드 성공.
3. **Phase 2 — 트레이서: `PriceBlock`.** 유틸리티 전환 + 모듈 삭제. `fall`/`rise` 분기로 **완전
   리터럴 클래스** 패턴을 확정하고, 프리렌더·Storybook 양쪽에 유틸리티 CSS가 잡히는지 확인.
4. **Phase 3 — 팬아웃 7개.** Coming·SeasonHint·Livestock·SortControl·SearchBar·
   RecipeChips·NutritionLine. **1컴포넌트 = 1커밋.** 각 커밋마다 해당 화면 스크린샷 대조.
5. **Phase 5 — 정리 + 문서화.** `FilterBar`의 죽은 스크롤바 두 줄 삭제,
   임의값 grep 게이트, 최종 CSS 줄 수·번들 크기 실측 기록, 문서 갱신.

각 Phase는 그 자체로 정상 상태다 — 중간에 멈춰도 앱은 온전하다.

## 검증 · 완료 게이트

- **`npm test` 와 `npx tsc --noEmit` 둘 다** (Vitest는 타입체크를 안 한다).
- **`npm run build`** + **`BASE_PATH=/jecheori/ npm run build`** 성공.
- **`npm run build-storybook`** 성공.
- **브라우저 실측** — 각 Phase에서 Phase 0 기준선과 대조. 4계절 팔레트 스왑, 카드 홀짝 기울기,
  마스킹테이프, 레시피 메모 in/out + 포커스 복귀 + **`<ol>` 단계 번호**, 차양 `0fr↔1fr` 접힘,
  세그먼트 썸 슬라이드, 스파크라인·제철 띠, `prefers-reduced-motion` 억제.
- **Phase 1 전용 확인**: 생성 CSS에 Preflight 부재, `:root`에 토큰 전량 존재.
- **Phase 5 grep 게이트**: 대괄호 임의값(`-\[`) 0건, 보간 클래스명 0건.
- **CSS 번들 크기 전후 기록.**

## 리스크

| 리스크 | 완화 |
|---|---|
| Preflight이 픽셀 동일을 깸 | 레이어 선택 import로 Preflight 배제 (결정 명문화) |
| `@theme` 트리셰이킹으로 토큰이 `:root`에서 사라짐 | `@theme static` (결정 명문화) + Phase 1 종료 조건 |
| 보간 클래스명이 조용히 무스타일 | 완전 리터럴 규칙 + Phase 5 grep 게이트 |
| 레이어 밖 모듈이 유틸리티를 이김 | 한 요소의 같은 속성을 두 곳에서 안 건드림 (규칙) |
| `@theme inline` 실수 → 계절 팔레트 사망 | 금지 명문화 + Phase 1 실측에 4계절 스왑 포함 |
| 유틸리티 전환 중 픽셀 드리프트 누적 | 1컴포넌트 = 1커밋, 커밋마다 스크린샷 대조 |
| 경계가 흐려져 아무 데나 스타일이 생김 | 실제 기준 3가지 + 분류 표를 CLAUDE.md에 반영(Phase 5) |
| 임의값으로 스케일이 무력화됨 | 임의값 금지 + grep 게이트 |

## 문서 갱신 (Phase 5)

- `CLAUDE.md` — 스택·아키텍처 경계에 하이브리드 경계 기준 3가지 + 부수 규칙 4가지.
- `DESIGN.md` — "순수 CSS 변수" 결정을 "`@theme static` 토큰 + 하이브리드"로 개정, 결정 기록 추가.
- `2026-07-19-css-modules-colocation-design.md` — 이 스펙이 부분 개정함을 상단에 한 줄
  (삭제하지 않는다 — 그때의 판단 근거는 여전히 유효한 기록이다).
- 메모 `design-token-system.md` — Tailwind `@theme static` 기반으로 갱신.
