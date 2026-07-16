# 구조적 디자인 토큰 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `src/style.css`의 흩어진 간격·폰트패밀리·라운드 리터럴을 이름 있는 `:root` 토큰으로 정리하고 전면 적용한다.

**Architecture:** 토큰을 기존 색 토큰이 사는 `:root`에 추가한 뒤(Task 1), 시각 변화가 없는 폰트·라운드부터 적용(Task 2), 마지막에 픽셀이 미세 이동하는 간격을 스케일로 스냅(Task 3). 색·계절·`--lift`는 손대지 않는다.

**Tech Stack:** 순수 CSS(변수), Vite, Vitest(로직만 — CSS는 테스트 안 함). node ≥22.

스펙: `docs/superpowers/specs/2026-07-17-design-tokens-structural-design.md`

## Global Constraints

- 게이트 = `npm test` **와** `npx tsc --noEmit` 둘 다 통과. (CSS 변경이라 로직 영향은 없지만 규칙.)
- **`@font-face`의 `font-family` 선언(정의)은 토큰화 금지** — `src/style.css:2, 8, 16`. 이건 패밀리 이름을 *정의*하는 자리다. 사용처(56·86·93·157행)만 토큰으로 바꾼다.
- **폰트 토큰 값은 현재 스택과 바이트 동일**하게 옮긴다(폴백 순서·따옴표·별칭 포함). 실제 별칭은 `'MaruBuri'`·`'Hakgyoansim'`이다(스펙의 예시 `'학교안심 받아쓰기 L'`는 참고용 — 실제 CSS 값을 쓴다).
- **간격 변환은 `margin`·`padding`·`gap`만.** `width`·`height`·`top/right/bottom/left`·`font-size`·`line-height`·`letter-spacing`·`stroke-width`·`transform`·`box-shadow`·모든 `%`·`px`·`999px`·blob(`48% 52% …`)은 건드리지 않는다.
- 색 토큰·계절 시스템(`[data-season]`)·`--lift`·`--memo`는 변경하지 않는다.
- 커밋 메시지 끝 줄: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- 브랜치: `feat/design-tokens` (이미 존재, 스펙 커밋 978f802이 올라가 있음).

---

## File Structure

- **Modify** `src/style.css` — 유일한 변경 파일. Task 1: `:root`에 토큰 정의 추가. Task 2: 폰트·라운드 사용처 교체. Task 3: 간격 사용처 스냅·교체.

(테스트 파일 없음 — CSS는 Vitest 대상이 아니고, 검증은 게이트 + 브라우저 실측이다. 스펙 결정.)

---

## Task 1: `:root`에 토큰 정의

**Files:**
- Modify: `src/style.css` (`:root` 블록, 현재 24–40행 — 닫는 `}` 직전에 추가)

**Interfaces:**
- Produces: CSS 커스텀 프로퍼티 — 간격 `--space-3xs|2xs|xs|sm|md|lg|xl|2xl|3xl`, 폰트 `--font-display|hand|body`, 라운드 `--radius-crisp|soft|pill`. Task 2·3이 소비.

- [ ] **Step 1: `:root`에 토큰 블록 추가**

`src/style.css`의 `:root { … }`에서 `--accent: #ffc400;` 줄 **다음, 닫는 `}` 직전**에 아래를 삽입한다. (기존 색·`--lift`·`--accent`는 그대로 둔다.)

```css
  /* 간격 스케일 — 리듬 보존(앱의 0.4rem 계열). 1.0(lg)이 최대 클러스터. impeccable 감사. */
  --space-3xs: 0.2rem;
  --space-2xs: 0.3rem;
  --space-xs: 0.4rem;
  --space-sm: 0.6rem;
  --space-md: 0.8rem;
  --space-lg: 1rem;
  --space-xl: 1.5rem;
  --space-2xl: 2.5rem;
  --space-3xl: 3rem;
  /* 폰트 패밀리 — @font-face가 정의한 별칭 그대로. DESIGN.md: 못 구하면 serif 폴백. */
  --font-display: 'MaruBuri', serif;
  --font-hand: 'Hakgyoansim', 'MaruBuri', serif;
  --font-body: 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif;
  /* 라운드 — 역할별. crisp=메모 낱장 카드, soft=칩·배지, pill=알약 */
  --radius-crisp: 0.2rem;
  --radius-soft: 0.4rem;
  --radius-pill: 1rem;
```

- [ ] **Step 2: 게이트 확인 (미사용 변수는 무해)**

Run: `npm test && npx tsc --noEmit`
Expected: PASS. (변수를 정의만 하고 아직 안 써도 렌더·타입 영향 0.)

- [ ] **Step 3: 커밋**

```bash
git add src/style.css
git commit -m "$(cat <<'EOF'
feat: 구조적 디자인 토큰 정의 (간격·폰트·라운드)

:root에 --space-*(9단계)·--font-*(3)·--radius-*(3) 추가. 아직 미적용.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 폰트·라운드 적용 (시각 변화 ≈0)

**Files:**
- Modify: `src/style.css` (폰트 사용처 4곳, 라운드 사용처 6곳)

**Interfaces:**
- Consumes: Task 1의 `--font-*`, `--radius-*`.

- [ ] **Step 1: 폰트 패밀리 사용처 4곳 교체**

각 줄의 `font-family` 값을 토큰으로. (2·8·16행 `@font-face`는 **건드리지 않는다.**)

- `src/style.css:56` `body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif; }` → `font-family: var(--font-body);`
- `src/style.css:86` `.week { font-family: 'MaruBuri', serif; … }` → `font-family: var(--font-display);`
- `src/style.css:93` `header h1 { font-family: 'MaruBuri', serif; … }` → `font-family: var(--font-display);`
- `src/style.css:157` `.card .why { font-family: 'Hakgyoansim', 'MaruBuri', serif; … }` → `font-family: var(--font-hand);`

- [ ] **Step 2: 라운드 사용처 교체 (rem 값만)**

역할에 맞는 토큰으로. **아래 목록 외의 `border-radius`(`999px`·`50%`·`1px`·blob `48% …`·`0 0 0.3rem 0.3rem`)는 그대로 둔다** — 스케일 밖 idiom이다.

- `src/style.css:114` `.card` `border-radius: 0.2rem;` → `var(--radius-crisp);` (기존 주석 유지)
- `src/style.css:306` `.memo` `border-radius: 0.15rem;` → `var(--radius-crisp);` (0.15→0.2, −0.8px; 근접 중복 통합)
- `src/style.css:228` `.peak-tip` `… border-radius: 0.4rem; …` → `var(--radius-soft);`
- `src/style.css:293` `.chip-btn` `… border-radius: 0.4rem;` → `var(--radius-soft);`
- `src/style.css:178` `.price .chip` `… border-radius: 1rem; }` → `var(--radius-pill);`
- `src/style.css:245` `.filter label` `… border-radius: 1rem; …` → `var(--radius-pill);`

- [ ] **Step 3: 게이트 확인**

Run: `npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: 잔여 확인**

Run: `grep -nE "font-family: *'|font-family: *\"" src/style.css`
Expected: `@font-face`의 2·8·16행 3개만 남는다(정의부). 사용처에 인라인 스택이 남아 있으면 놓친 것 — 교체한다.

- [ ] **Step 5: 커밋**

```bash
git add src/style.css
git commit -m "$(cat <<'EOF'
feat: 폰트·라운드 토큰 적용

font-family 사용처 4곳 → --font-*, border-radius rem값 6곳 → --radius-*.
0.15rem→crisp(0.2) 근접 중복 통합. 시각 변화 ≈0.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 간격 스냅·적용 (픽셀 미세 이동 — 브라우저 사인오프는 컨트롤러)

**Files:**
- Modify: `src/style.css` (모든 `margin`·`padding`·`gap` 선언)

**Interfaces:**
- Consumes: Task 1의 `--space-*`.

**변환 규칙:** `margin`·`padding`·`gap` 선언의 **각 rem 값**을 아래 표에서 그 값을 흡수하는 토큰으로 바꾼다. 복합값은 각 항을 개별 토큰으로(`0`은 그대로 `0`). **표에 없는 값은** 가장 가까운 단계로 스냅하되 이동이 2px를 넘으면 리터럴로 두고 한 줄 주석으로 이유를 남긴다.

| 현재 값(rem) | 토큰 |
|---|---|
| 0.06·0.1·0.18·0.2 | `--space-3xs` |
| 0.25·0.3·0.32·0.34·0.35 | `--space-2xs` |
| 0.4·0.42·0.45·0.48 | `--space-xs` |
| 0.5·0.55·0.6 | `--space-sm` |
| 0.75·0.8·0.85 | `--space-md` |
| 0.9·0.95·1·1.05·1.1·1.2 | `--space-lg` |
| 1.25·1.35·1.4·1.5·1.6 | `--space-xl` |
| 2.2·2.5 | `--space-2xl` |
| 3 | `--space-3xl` |

**절대 안 바꾸는 것:** `width`·`height`·`top/right/bottom/left`·`inset`·`font-size`·`line-height`·`letter-spacing`·`stroke-width`·`transform`·`box-shadow`·`grid-template-columns`(예: `4rem 1fr`)·모든 `%`·`px`. 오직 `margin`·`padding`·`gap`만.

- [ ] **Step 1: 변환 대상 목록화**

Run: `grep -nE "(^|[; {])(margin|padding|gap)[a-z-]*:" src/style.css`
이 목록의 각 선언을 규칙표대로 바꾼다. (font-size 등은 이 grep에 안 걸리므로 자연히 제외된다.)

- [ ] **Step 2: 규칙표대로 교체 (worked examples)**

예시(형태를 보여주는 것 — 실제 파일의 모든 대상에 같은 규칙을 적용):

- `header { … margin-bottom: 1.4rem; }` → `margin-bottom: var(--space-xl);` (1.4→1.5, +1.6px)
- `header h1 { margin: 0.2rem 0 0.45rem; }` → `margin: var(--space-3xs) 0 var(--space-xs);`
- `.surveyed { … margin: 0; }` → `margin: 0;` (그대로)
- `.list { … gap: 1.4rem; }` → `gap: var(--space-xl);`
- `.card .summary-row { … gap: 0.9rem; }` → `gap: var(--space-lg);`
- `.card .id { … gap: 0.6rem; }` → `gap: var(--space-sm);`
- `.card-title { … gap: 0.45rem; }` → `gap: var(--space-xs);`
- `.price .was { … margin-bottom: 0.18rem; }` → `margin-bottom: var(--space-3xs);`
- `.price .nowline { … gap: 0.4rem; }` → `gap: var(--space-xs);`
- `.price .basis { … margin-top: 0.32rem; … }` → `margin-top: var(--space-2xs);`
- `.price .near { … margin-top: 0.2rem; }` → `margin-top: var(--space-3xs);`
- `.price .chip { … gap: 0.2rem; … padding: 0.18rem 0.48rem; … }` → `gap: var(--space-3xs); … padding: var(--space-3xs) var(--space-xs);`
- `.note { … padding-left: 1.1rem; }` → `padding-left: var(--space-lg);`
- `.nrow { … gap: 0.55rem; … padding: 0.42rem 0; … }` → `gap: var(--space-sm); … padding: var(--space-xs) 0;`
- `.seasonal { margin-top: 2.2rem; }` → `margin-top: var(--space-2xl);`
- `.nodrop { … margin: 0 0 1rem; }` → `margin: 0 0 var(--space-lg);`
- `footer { margin-top: 2.5rem; }` → `margin-top: var(--space-2xl);`
- `.peak-tip { … padding: 0.3rem 0.55rem; … }` → `padding: var(--space-2xs) var(--space-sm);`
- `.spark { margin: 0 0 1.6rem; }` → `margin: 0 0 var(--space-xl);`
- `.filter { … gap: 0.4rem; margin-bottom: 1rem; }` → `gap: var(--space-xs); margin-bottom: var(--space-lg);`
- `.filter label { … padding: 0.32rem 0.8rem; … }` → `padding: var(--space-2xs) var(--space-md);`
- `.nutrition .stats { … gap: 1.4rem; … }` → `gap: var(--space-xl);`
- `.nutrition .serv { … margin-top: 0.3rem; }` → `margin-top: var(--space-2xs);`
- `.nutrition .val .u { … margin-left: 0.06rem; }` → `margin-left: var(--space-3xs);` (0.06→0.2, +2.2px; 1px→3.2px 미세)
- `.recipe-label { … margin: 0 0 0.35rem; }` → `margin: 0 0 var(--space-2xs);`
- `.card .kind { … margin-top: 0.1rem; }` → `margin-top: var(--space-3xs);`

파일 전체의 남은 `margin`/`padding`/`gap`(위 예시에 없는 것 포함 — `.seasonal ul`, coming/shade/memo 영역 등)도 **동일 규칙표**로 빠짐없이 바꾼다.

- [ ] **Step 3: 누락·오변환 확인**

Run: `grep -nE "(margin|padding|gap)[a-z-]*:[^;]*[0-9]\.?[0-9]*rem" src/style.css`
Expected: 리터럴 rem이 남은 `margin`/`padding`/`gap`가 없어야 한다(주석으로 명시한 의도적 예외 제외). 남으면 교체하거나, 스케일 밖 예외면 한 줄 주석을 단다.

- [ ] **Step 4: 게이트 확인**

Run: `npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/style.css
git commit -m "$(cat <<'EOF'
feat: 간격을 --space-* 스케일로 스냅

margin·padding·gap 리터럴 전량을 9단계 토큰으로. 리듬 보존(대부분 이동 ≤1.6px).
width·좌표·font-size 등 간격 아닌 수치는 불변.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: (컨트롤러) 브라우저 재실측 + 사인오프**

컨트롤러가 `npm run dev`로 주요 화면을 직접 연다: 메인(`/`) 헤더·필터·카드 리스트·카드 펼침(레시피 핀메모)·`/coming`·빈 상태. 토큰화 전 스크린샷과 비교해 **의도한 미세 이동 외의 변화(레이아웃 깨짐·`margin-collapse` 거동 변화)가 없는지** 확인하고 스크린샷 사인오프. `node .claude/skills/impeccable/scripts/detect.mjs --json --scope layout src/style.css`로 임의값 잔존도 재확인.

---

## Self-Review

**Spec coverage:**
- 간격 9단계 토큰 정의 → Task 1. ✓
- 폰트 3토큰·라운드 3토큰 정의 → Task 1. ✓
- 폰트 사용처 교체(시각 변화 0) → Task 2 Step 1. ✓
- 라운드 교체(0.15→crisp 통합) → Task 2 Step 2. ✓
- 간격 전면 스냅(리듬 보존 매핑표) → Task 3 규칙표 + Step 2. ✓
- `@font-face` 정의부 보존 → Global Constraints + Task 2 Step 1 명시. ✓
- 간격 아닌 수치 불변 → Global Constraints + Task 3 "절대 안 바꾸는 것". ✓
- 색·계절·`--lift` 불변 → Global Constraints. ✓
- 게이트 둘 다 + 브라우저 사인오프 + detect 재실행 → 각 Task 게이트, Task 3 Step 6. ✓
- 타입 스케일 범위 밖 → 플랜에 font-size 변환 없음(Task 3 "절대 안 바꾸는 것"에 명시). ✓

**Placeholder scan:** TBD/TODO 없음. Task 3는 규칙표 + worked examples로 결정적(모든 값→토큰 매핑 명시). 열거 못 한 소수 선언도 같은 표로 결정된다.

**Type consistency:** 토큰 이름이 Task 1 정의 ↔ Task 2·3 사용에서 일치(`--font-display/hand/body`, `--radius-crisp/soft/pill`, `--space-3xs…3xl`). 폰트 값은 실제 CSS 스택(별칭 `'MaruBuri'`·`'Hakgyoansim'`)으로 통일 — 스펙의 예시 이름과 다르다는 점을 Global Constraints에 명시.
