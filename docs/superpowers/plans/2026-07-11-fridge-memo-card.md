# 냉장고 메모 카드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 제철 카드를 냉장고에 마스킹테이프로 붙인 장보기 메모 한 장처럼 보이게 한다(테이프 + 옅은 부양 + 미세 기울기 + crisp한 종이 모서리).

**Architecture:** 순수 CSS 변경. 마크업·로직·데이터 모델은 손대지 않는다. 시각 요소는 전부 `src/style.css`의 `.card`·`.list`·`:root`에서 나오고, 테이프는 `.card::before` pseudo-element다. DESIGN.md의 그림자 규율을 "메모 고정 한정 예외"로 개정한다.

**Tech Stack:** TanStack Start(React 19) + Vite + Vitest. CSS는 `src/style.css` 단일 파일. 검증은 `npm test`(회귀) + `npm run dev` 브라우저 실측.

## Global Constraints

- node ≥ 22.
- 런타임 외부요청 0, 새 에셋 0, JS 인터랙션 0 (전부 CSS).
- 마크업(`src/components/*.tsx`)·순수 로직(`picks`/`card`/`app`)·테스트 변경 금지 — 시각 전용.
- 그라데이션 금지는 유지. 그림자는 "메모 고정 표현에 한해 옅은 1단계(`--lift`)"만 예외, 카드에만.
- 웜 컬러(계절색)는 배경 도형으로만 — 테이프는 배경이라 허용. 글자·강조는 쪽빛 유지.
- 기존 Vitest 120개는 계속 통과해야 한다(마크업 불변이므로 회귀 없어야 정상).
- 각 태스크 끝에서 브라우저 실측(`npm run dev`, http://localhost:5173/)으로 관찰 기준을 확인한다.
- 참조 스펙: `docs/superpowers/specs/2026-07-11-fridge-memo-card-design.md`.

---

## File Structure

- `src/style.css` — 유일한 코드 변경 지점.
  - `:root` — `--lift` 토큰 신규.
  - `.list` — 세로 flex + gap(테이프 자리).
  - `.card` — position·box-shadow·border-radius·margin 조정.
  - `.card:nth-child(odd|even)` — 미세 기울기 교대(신규).
  - `.card::before` — 마스킹테이프(신규).
- `DESIGN.md` — 그림자 규율 개정 + 결정 기록(문서).

각 태스크는 독립적으로 브라우저에서 관찰 가능한 산출물로 끝난다.

---

### Task 1: 종이 바탕 — 옅은 부양·crisp 모서리·간격

메모 종이의 바탕을 만든다: 카드를 살짝 띄우고(`--lift`), 모서리를 종이처럼 crisp하게, 카드 사이를 벌려 테이프 자리를 확보한다. (테이프·기울기는 Task 2.)

**Files:**
- Modify: `src/style.css` (`:root` 토큰, `.card` 블록, `.list` 규칙 신규)

**Interfaces:**
- Consumes: 기존 토큰 `--card`·`--line`, 기존 `.card`/`.list` 구조.
- Produces: `--lift` 토큰(값 `0 2px 6px rgba(43, 69, 134, 0.06)`), `.list` flex-gap 레이아웃 — Task 2가 `.card` 위에 pseudo-element와 nth-child 기울기를 얹는다.

- [ ] **Step 1: `--lift` 토큰 추가**

`src/style.css`의 `:root`에서 `--tint` 아래(계절 기본값 주석 위)에 추가:

```css
  --tint: #fff4ce;
  /* 메모 고정 한정 옅은 부양(그림자 1단계). DESIGN.md 규율 예외 — 카드에만 쓴다. */
  --lift: 0 2px 6px rgba(43, 69, 134, 0.06);
```

- [ ] **Step 2: `.card` 블록 수정 (부양·crisp 모서리·margin 제거)**

기존:

```css
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 0.9rem;
  padding: 0.95rem 1.05rem;
  margin-bottom: 0.7rem;
}
```

로 교체:

```css
.card {
  position: relative;                /* Task 2 테이프(::before)의 기준 */
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 0.2rem;             /* 종이처럼 crisp (기존 0.9rem) */
  padding: 0.95rem 1.05rem;
  box-shadow: var(--lift);           /* 아주 옅은 부양 */
}
```

- [ ] **Step 3: `.list` 세로 flex + gap 추가**

`.card { … }` 규칙 바로 위에 `.list` 규칙을 추가한다(카드 사이 간격을 margin 대신 gap으로; 숨겨진 카드는 gap을 만들지 않음):

```css
.list { display: flex; flex-direction: column; gap: 1.4rem; }
```

- [ ] **Step 4: 회귀 테스트**

Run: `npm test`
Expected: `Tests  120 passed (120)` — 마크업 불변이라 전부 통과.

- [ ] **Step 5: 브라우저 실측**

Run: `npm run dev` → http://localhost:5173/ 열기.
확인:
- 카드 모서리가 종이처럼 각져 보인다(둥근 타일 아님).
- 카드가 배경에서 아주 옅게 떠 보인다(그림자 과하지 않음).
- 카드 사이 간격이 이전보다 넓다(약 1.4rem).
- 가로 스크롤바 없음.

- [ ] **Step 6: 커밋**

```bash
git add src/style.css
git commit -m "feat: 메모 카드 바탕 — 옅은 부양·crisp 모서리·간격"
```

---

### Task 2: 마스킹테이프 + 미세 기울기

카드를 냉장고에 "붙인" 시그니처를 얹는다: 상단 중앙 반투명 계절색 테이프 한 조각, 그리고 카드마다 ±0.4° 교대 기울기.

**Files:**
- Modify: `src/style.css` (`.card::before` 신규, `.card:nth-child(odd|even)` 신규)

**Interfaces:**
- Consumes: Task 1의 `.card { position: relative }`와 `.list` gap(테이프 자리), 기존 토큰 `--accent`.
- Produces: 없음(최종 시각 산출).

- [ ] **Step 1: 마스킹테이프 `.card::before` 추가**

Task 1에서 수정한 `.card { … }` 규칙 바로 아래에 추가:

```css
/* 마스킹테이프 한 조각 — 냉장고에 붙인 시그니처. 반투명 계절색(배경 도형이라 규율 OK).
   그라데이션 아님(단일 반투명 평면). pseudo-element라 접근성 트리에서 자동 제외. */
.card::before {
  content: '';
  position: absolute;
  top: -0.62rem;
  left: 50%;
  width: 4.6rem;
  height: 1.3rem;
  transform: translateX(-50%) rotate(-2deg);
  background: color-mix(in srgb, var(--accent) 40%, transparent);
  border-radius: 1px;
}
```

- [ ] **Step 2: 미세 기울기 교대 추가**

`.card::before` 아래에 추가:

```css
/* 손으로 붙인 듯 아주 살짝, 홀짝 교대로. 정적 transform이라 모션 아님(reduced-motion 무관). */
.card:nth-child(odd) { transform: rotate(0.4deg); }
.card:nth-child(even) { transform: rotate(-0.4deg); }
```

- [ ] **Step 3: 회귀 테스트**

Run: `npm test`
Expected: `Tests  120 passed (120)`.

- [ ] **Step 4: 브라우저 실측 (여름 기본)**

Run: `npm run dev` → http://localhost:5173/.
확인:
- 각 카드 상단 중앙에 반투명 노란(여름 --accent) 테이프가 카드 위 경계에 걸쳐 있다.
- 테이프 너머로 카드 모서리/배경이 비쳐 "테이프"로 읽힌다(불투명 칩 아님).
- 카드가 한 장씩 아주 살짝 좌우 교대로 기울어 있다.
- 테이프가 위 카드에 닿지 않는다. 가로 스크롤바 없음. 테이프 잘림 없음.

- [ ] **Step 5: 브라우저 실측 (계절색 확인)**

브라우저 콘솔에서 임시로 계절을 바꿔 테이프·틴트가 물드는지 확인:

Run(브라우저 콘솔): `document.body.setAttribute('data-season','autumn')`
Expected: 테이프가 감색(주황)으로 바뀐다. `spring`(세이지)·`winter`(팥)도 확인 후 `summer`로 되돌린다.

- [ ] **Step 6: 커밋**

```bash
git add src/style.css
git commit -m "feat: 메모 카드에 마스킹테이프·미세 기울기 추가"
```

---

### Task 3: DESIGN.md 규율 개정·결정 기록

시각 규율 변경을 문서에 남긴다(그림자 예외·crisp 모서리·결정 기록).

**Files:**
- Modify: `DESIGN.md` (레이아웃 섹션 2줄, 결정 기록 1줄)

**Interfaces:**
- Consumes: 없음. Produces: 없음(문서).

- [ ] **Step 1: 레이아웃 규율 2줄 개정**

`DESIGN.md`의 레이아웃 항목에서 기존:

```markdown
- 단일 컬럼, 최대폭 28rem. 크림 캔버스 위 순백 카드 (`border-radius: 0.9rem`)
- 구분은 여백과 1px 선. 그라데이션·그림자 금지 (블롭과 스케치가 유일한 장식)
```

를 다음으로 교체:

```markdown
- 단일 컬럼, 최대폭 28rem. 크림 캔버스 위 순백 카드. 카드 모서리는 종이처럼
  crisp하게 (`border-radius: 0.2rem`) — 둥근 타일이 아니라 메모 낱장.
- 구분은 여백과 1px 선. **그라데이션 금지.** 그림자는 "메모가 냉장고에 붙어 들뜬
  표현에 한해 아주 옅은 1단계(`--lift`, 카드에만)"만 예외. 그 외 그림자는 금지.
```

- [ ] **Step 2: 결정 기록 1줄 추가**

`DESIGN.md`의 "## 결정 기록" 목록 맨 끝에 추가:

```markdown
- 카드를 냉장고 장보기 메모처럼 개편했다 (2026-07-11). 상단 마스킹테이프(반투명 계절색)+
  옅은 부양(`--lift`)+±0.4° 미세 기울기+crisp 모서리. 앱의 "장보기 메모" 은유를 눈에
  보이게. 그림자 금지 규율을 메모 고정 한정으로 완화(그라데이션 금지는 유지).
  스펙: `docs/superpowers/specs/2026-07-11-fridge-memo-card-design.md`
```

- [ ] **Step 3: 커밋**

```bash
git add DESIGN.md
git commit -m "docs: DESIGN.md 그림자 규율 개정·메모 카드 결정 기록"
```

---

## Self-Review

**Spec coverage:**
- 마스킹테이프(스펙 §1) → Task 2 Step 1. ✓
- 들뜬 그림자 `--lift`(§2) → Task 1 Step 1–2. ✓
- 미세 기울기 교대(§3) → Task 2 Step 2. ✓
- 카드 간격(§4) → Task 1 Step 3. ✓
- crisp 모서리(§5) → Task 1 Step 2. ✓
- 유지 요소(§6) → 손대지 않음(마크업·토큰 불변). ✓
- 규율 개정 → Task 3. ✓
- 견고성(테이프 SR 제외·계절색·color-mix 폴백·정적) → Task 2 주석 + Step 5 확인. ✓

**Placeholder scan:** 모든 CSS/문서 블록에 실제 코드·문구 포함. 플레이스홀더 없음. ✓

**Type/값 일관성:** `--lift` 값이 Task 1과 DESIGN.md에서 동일(`0 2px 6px rgba(43,69,134,0.06)`), 테이프 농도 40%·모서리 0.2rem이 스펙(갱신본)과 일치. ✓
