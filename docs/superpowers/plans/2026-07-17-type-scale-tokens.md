# 타입 스케일 토큰 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `src/style.css`의 흩어진 `font-size` 리터럴(~18종)을 이름 있는 6단계 스케일 `--text-*`로 정리하고 적용한다.

**Architecture:** `:root`에 6개 타입 토큰을 추가(Task 1)한 뒤, 모든 `font-size: <N>rem`를 매핑표대로 `var(--text-*)`로 교체(Task 2). `.spark`의 `9px`(SVG)와 `line-height`·`letter-spacing`·`font-weight`는 손대지 않는다. 색·간격·폰트패밀리·라운드 토큰도 그대로.

**Tech Stack:** 순수 CSS(변수), Vite, Vitest(로직만 — CSS는 테스트 안 함). node ≥22.

스펙: `docs/superpowers/specs/2026-07-17-type-scale-tokens-design.md`

## Global Constraints

- 게이트 = `npm test` **와** `npx tsc --noEmit` 둘 다 통과.
- **`font-size`만** 토큰화. `line-height`·`letter-spacing`·`font-weight`·`width`·`height` 등은 불변.
- **`.spark .val, .spark .lab`의 `font-size: 9px`는 그대로 둔다** — SVG 데이터 라벨, 토큰 아님.
- 색·간격(`--space-*`)·폰트패밀리(`--font-*`)·라운드(`--radius-*`) 토큰은 변경하지 않는다.
- ‹ › 넘김 셰브론(`.nav`) `1.3rem`은 `--text-lg`(1.5)로 — **의도적 상향**(리듬 보존의 유일한 예외, +3.2px). (`.empty/.loading`은 0.95→`md`, 평범한 스냅.)
- 커밋 메시지 끝 줄: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- 브랜치: `feat/type-scale-tokens` (이미 존재, 스펙 커밋 e771391·7a28263이 올라가 있음).

## 매핑표 (값 → 토큰) — Task 2가 씀

| 현재 font-size(rem) | 토큰 |
|---|---|
| 0.68·0.72·0.74 | `--text-2xs` |
| 0.75·0.78·0.79·0.8·0.82 | `--text-xs` |
| 0.85·0.88·0.9 | `--text-sm` |
| 0.95·0.98·1·1.05 | `--text-md` |
| 1.3·1.5 | `--text-lg` |
| 1.7 | `--text-xl` |

현재 파일의 모든 `font-size` rem 값이 이 표에 있다(9px 제외). 표에 없는 값이 나오면 가장 가까운 단계로 스냅하되 이동 >2px면 리터럴 유지 + 한 줄 주석(Task 2에서 보고).

---

## File Structure

- **Modify** `src/style.css` — 유일한 변경 파일. Task 1: `:root`에 `--text-*` 정의 추가. Task 2: `font-size` 사용처 교체.

(테스트 파일 없음 — CSS는 Vitest 대상이 아니고 검증은 게이트 + 브라우저 실측. 스펙 결정.)

---

## Task 1: `:root`에 타입 스케일 토큰 정의

**Files:**
- Modify: `src/style.css` (`:root` 블록, `--radius-pill: 1rem;` 다음·닫는 `}` 직전에 추가)

**Interfaces:**
- Produces: `--text-2xs`(0.7)·`--text-xs`(0.8)·`--text-sm`(0.9)·`--text-md`(1rem)·`--text-lg`(1.5)·`--text-xl`(1.7). Task 2가 소비.

- [ ] **Step 1: `:root`에 토큰 블록 추가**

`src/style.css`의 `:root`에서 `--radius-pill: 1rem;` **다음, 닫는 `}` 직전**에 아래를 삽입한다. 역할 주석 포함(스케일은 역할의 그릇).

```css
  /* 타입 스케일 — 리듬 보존 6단계. 시그니처(아이브로 0.9·h1 1.5·디스플레이 1.7) 무이동. impeccable 감사. */
  --text-2xs: 0.7rem;  /* 마이크로 라벨·캡션 */
  --text-xs: 0.8rem;   /* 소형 라벨 */
  --text-sm: 0.9rem;   /* 보조 텍스트·절기 아이브로 */
  --text-md: 1rem;     /* 본문·카드/섹션 제목 */
  --text-lg: 1.5rem;   /* 디스플레이 헤딩 — h1 (+ ‹ › 넘김 셰브론 1.3→1.5 흡수) */
  --text-xl: 1.7rem;   /* 최대 디스플레이 — 카드 이모지·큰 가격 */
```

- [ ] **Step 2: 게이트 확인 (미사용 변수는 무해)**

Run: `npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add src/style.css
git commit -m "$(cat <<'EOF'
feat: 타입 스케일 토큰 정의 (--text-*, 6단계)

:root에 --text-2xs…xl 추가. 아직 미적용. 역할 주석 포함.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `font-size` 적용 (글자 크기 미세 이동 — 브라우저 사인오프는 컨트롤러)

**Files:**
- Modify: `src/style.css` (모든 `font-size: <N>rem` 선언 — 아래 목록)

**Interfaces:**
- Consumes: Task 1의 `--text-*`.

**변환 규칙:** 각 `font-size: <N>rem`를 상단 매핑표의 토큰으로 바꾼다. `font-size: 9px`(`.spark`)만 예외로 남긴다. `font-size` 외 속성은 절대 안 바꾼다.

아래는 현재 파일의 전량 목록이다(줄번호는 Task 1이 6줄 추가해 밀리므로 **셀렉터/값으로 찾는다**). 값이 목록과 다르면 STOP·보고.

| 셀렉터(추정) | 현재 값 | → 토큰 |
|---|---|---|
| `.week` (절기 아이브로) | 0.9 | `--text-sm` (무이동, 시그니처) |
| `header h1` | 1.5 | `--text-lg` (무이동, 시그니처) |
| `.card summary` 영역 | 0.8 | `--text-xs` |
| `.card .emoji` | 1.7 | `--text-xl` (시그니처) |
| `.card-title` | 1.05 | `--text-md` (−0.8px, **위계 주의**) |
| `.card .kind` | 0.78 | `--text-xs` |
| `.open` | 0.98 | `--text-md` |
| `.price .was` | 0.85 | `--text-sm` |
| `.price .big` | 1.7 | `--text-xl` (시그니처) |
| `.price .wonu` | 0.95 | `--text-md` |
| `.price .basis` | 0.74 | `--text-2xs` |
| `.price .near` | 0.78 | `--text-xs` |
| `.price .chip` | 0.8 | `--text-xs` |
| `.nrow` | 0.82 | `--text-xs` |
| (seasonal li 등) | 0.95 | `--text-md` |
| (0.85 셀렉터) | 0.85 | `--text-sm` |
| `.nodrop` | 0.88 | `--text-sm` |
| `footer p` | 0.75 | `--text-xs` |
| (0.95 셀렉터) | 0.95 | `--text-md` |
| `.peak-tip` | 0.72 | `--text-2xs` |
| `.filter label` | 0.85 | `--text-sm` |
| (0.68 셀렉터) | 0.68 | `--text-2xs` |
| (0.95 셀렉터) | 0.95 | `--text-md` |
| `.nutrition .val .u` | 0.72 | `--text-2xs` |
| `.nutrition .serv` | 0.68 | `--text-2xs` |
| `.recipe-label` | 0.68 | `--text-2xs` |
| `.chip-btn` | 0.82 | `--text-xs` |
| `.memo h3` | 1 | `--text-md` |
| `.memo .ing` | 0.79 | `--text-xs` |
| `.memo .steps` | 0.85 | `--text-sm` |
| `.memo .count` | 0.72 | `--text-2xs` |
| `.nav` (레시피 ‹ › 넘김) | 1.3 | `--text-lg` (**의도적 +3.2px 상향**) |
| `.empty, .loading` | 0.95 | `--text-md` (+0.8px, 평범) |
| `.coming-month h2` | 1 | `--text-md` |
| `.nav-panel-title` | 0.8 | `--text-xs` |
| (nav item, 1.05) | 1.05 | `--text-md` |
| `.spark .val, .lab` | **9px** | **그대로 (제외)** |

- [ ] **Step 1: 대상 목록화**

Run: `grep -nE "font-size:" src/style.css`
35개 rem 선언 + 1개 `9px`가 나온다. rem 선언 전부를 매핑표대로 바꾸고 `9px`는 남긴다.

- [ ] **Step 2: 매핑표대로 교체**

각 `font-size: <N>rem;` → `font-size: var(--text-*);`. 예:
- `.week { … font-size: 0.9rem; … }` → `font-size: var(--text-sm);`
- `header h1 { … font-size: 1.5rem; … }` → `font-size: var(--text-lg);`
- `.card-title { font-size: 1.05rem; … }` → `font-size: var(--text-md);`
- `.card .emoji { font-size: 1.7rem; line-height: 1; }` → `font-size: var(--text-xl); line-height: 1;` (line-height 불변)
- `.price .basis { … font-size: 0.74rem; … }` → `font-size: var(--text-2xs);`
- `.nav { … font-size: 1.3rem; line-height: 1; … }` (‹ › 넘김) → `font-size: var(--text-lg); line-height: 1;` (의도적 상향)
- `.spark .val, .spark .lab { fill: var(--muted); font-size: 9px; }` → **변경 없음**

- [ ] **Step 3: 완결성·경계 확인**

Run: `grep -nE "font-size:[^;]*[0-9]\.?[0-9]*rem" src/style.css`
Expected: 비어 있음(리터럴 rem 없음 — 전부 토큰). 남으면 교체한다.

Run: `grep -nE "font-size:[^;]*9px" src/style.css`
Expected: `.spark` 한 줄만(제외 대상 보존 확인).

Run: `grep -nE "(line-height|letter-spacing|font-weight|width|height):[^;]*var\(--text" src/style.css`
Expected: 비어 있음(타입 토큰이 크기 외 속성에 안 샜는지).

- [ ] **Step 4: 게이트 확인**

Run: `npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/style.css
git commit -m "$(cat <<'EOF'
feat: font-size를 --text-* 스케일로 스냅

font-size rem 리터럴 전량을 6단계 토큰으로. 시그니처(아이브로·h1·디스플레이)
무이동, 본문 클러스터 ≤0.8px, ‹ › 넘김 셰브론만 의도적 상향(1.3→1.5). .spark 9px 제외.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: (컨트롤러) 브라우저 재실측 + 사인오프**

컨트롤러가 `npm run dev`로 주요 화면을 직접 연다: 메인(`/`) 헤더·필터·카드 리스트·카드 펼침(노트·스파크·레시피 칩·메모의 **‹ › 넘김 셰브론 1.3→1.5, 유일한 큰 이동**)·`/coming`·빈 화면. 특히:
- **카드 타이틀 위계(중요):** `.card-title`이 본문과 같은 1.0이 되어도 굵기(600)로 제목처럼 읽히는지. 안 읽히면 `.card-title`을 예외로 되돌릴지 재검토.
- 0.85→0.9, 0.95→1.0 클러스터 몰린 곳(필터 라벨·취소선 가격·원단위·계절 칩)에서 줄바꿈·오버플로 없는지.
토큰화 전/후 스크린샷 비교로 의도한 이동 외 변화가 없는지 확인하고 사인오프.

---

## Self-Review

**Spec coverage:**
- 6단계 토큰 정의(역할 주석) → Task 1. ✓
- font-size 전면 스냅(매핑표) → Task 2 규칙표 + Step 2. ✓
- `.spark` 9px 제외 → Global Constraints + Task 2 표·Step 2·3. ✓
- ‹ › 넘김 셰브론 1.3→lg(1.5) 의도적 상향 → Global Constraints + Task 2 표·Step 2. ✓
- 카드 타이틀 위계 브라우저 확인 → Task 2 Step 6. ✓
- line-height·letter-spacing·font-weight 불변 → Global Constraints + Task 2 Step 3 경계 grep. ✓
- 색·간격·폰트·라운드 불변 → Global Constraints. ✓
- 게이트 둘 다 + 브라우저 사인오프 → 각 Task 게이트, Task 2 Step 6. ✓
- leading 미루기 안전(단위 없는 line-height) → 스펙에 근거, 플랜은 line-height를 안 건드림으로 보장. ✓

**Placeholder scan:** TBD/TODO 없음. Task 2는 매핑표 + 전량 목록 + worked examples로 결정적.

**Type consistency:** 토큰 이름이 Task 1 정의(`--text-2xs…xl`, 6개) ↔ Task 2 사용에서 일치. 값도 스펙 표와 일치(`--text-lg: 1.5rem`, `--text-xl: 1.7rem`). 매핑표의 값→토큰이 스펙 매핑과 동일.
