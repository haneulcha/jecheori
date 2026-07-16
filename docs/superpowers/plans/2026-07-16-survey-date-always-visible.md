# 조사일 상시 표시 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 가격 조사일(`surveyedOn`)을 신선도와 무관하게 항상 헤더에 `오늘 · 7월 16일 기준` 한 줄로 노출한다.

**Architecture:** `Freshness` 타입을 `none | dated{surveyedOn, days}` 2-케이스로 재설계한다. `app.ts`의 `freshnessOf`가 스냅샷→분류를 하고(3일 임계 제거), 표시층(`week.ts`의 `surveyedLabel` + `App.tsx`)이 상대+절대 문구로 옮긴다. 스냅샷이 없으면 줄을 안 그린다.

**Tech Stack:** TypeScript, React 19, Vitest 4 (순수 + RTL/jsdom), Storybook, 정적 프리렌더.

스펙: `docs/superpowers/specs/2026-07-16-survey-date-always-visible-design.md`

## Global Constraints

- 게이트 = `npm test` **와** `npx tsc --noEmit` 둘 다 통과. (Vitest는 타입체크를 안 한다.)
- 순수 로직 테스트는 `tests/`에 두고 `'../src/…'`로 임포트. 컴포넌트 테스트는 `src/components/*.test.tsx` + 상단 `// @vitest-environment jsdom`.
- 사용자 문구는 한국어, 담백한 톤. 이커머스 화법 금지. 문구는 "조사"가 아니라 **"기준"**.
- 표시(포맷)는 표시층에, 규칙(나이 계산)은 `app.ts`/`data.ts`에. 컴포넌트는 사용자 텍스트를 직접 이스케이프하지 않는다(React 자동).
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- 브랜치: `feat/survey-date-always-visible` (이미 존재, 스펙 커밋 917ed08이 올라가 있음).

---

## File Structure

- **Modify** `src/week.ts` — 표시용 순수 포맷터. `surveyedLabel(days, surveyedOn)` 추가.
- **Create** `tests/week.test.ts` — `surveyedLabel` 순수 테스트.
- **Modify** `src/view-types.ts` — `Freshness` 유니온 재설계.
- **Modify** `src/app.ts` — `STALE_AFTER_DAYS` 제거, `freshnessOf` 재작성.
- **Modify** `tests/app.test.ts` — freshness 기대값을 새 타입으로.
- **Modify** `src/components/App.tsx` — stale 경고 제거, `.surveyed` 상시 줄 추가.
- **Modify** `src/components/App.test.tsx` — base freshness 갱신 + 상시 줄/none 테스트.
- **Modify** `src/components/App.stories.tsx` — pageView 기본값·오래된가격·none 스토리·진짜앱 주석 갱신.
- **Modify** `src/style.css` — `.stale` 제거, `.surveyed` 추가.

---

## Task 1: 표시 포맷터 `surveyedLabel`

**Files:**
- Modify: `src/week.ts`
- Test: `tests/week.test.ts` (create)

**Interfaces:**
- Consumes: (없음)
- Produces: `surveyedLabel(days: number, surveyedOn: string): string` — `days===0 → "오늘 · M월 D일 기준"`, 그 외 `"${days}일 전 · M월 D일 기준"`. `surveyedOn`은 `"YYYY-MM-DD"`; 월·일의 앞 0은 제거.

- [ ] **Step 1: 실패 테스트 작성** — `tests/week.test.ts`

```ts
import { describe, expect, test } from 'vitest'
import { surveyedLabel } from '../src/week'

describe('surveyedLabel', () => {
  test('오늘(0일)은 "오늘 · M월 D일 기준"', () => {
    expect(surveyedLabel(0, '2026-07-16')).toBe('오늘 · 7월 16일 기준')
  })

  test('N일 전은 "N일 전 · M월 D일 기준"', () => {
    expect(surveyedLabel(3, '2026-07-13')).toBe('3일 전 · 7월 13일 기준')
  })

  test('월·일의 앞 0을 제거한다', () => {
    expect(surveyedLabel(1, '2026-01-05')).toBe('1일 전 · 1월 5일 기준')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/week.test.ts`
Expected: FAIL — `surveyedLabel` is not exported / not a function.

- [ ] **Step 3: 구현** — `src/week.ts` 하단에 추가 (기존 `weekLabel`은 그대로)

```ts
/** days·조사일 → "오늘 · 7월 16일 기준" / "3일 전 · 7월 13일 기준" (표시용, 순수).
 *  surveyedOn은 KST 조사일 문자열(YYYY-MM-DD) — Date로 파싱하지 않고 쪼개 타임존 왜곡을 피한다. */
export function surveyedLabel(days: number, surveyedOn: string): string {
  const rel = days === 0 ? '오늘' : `${days}일 전`
  const [, m, d] = surveyedOn.split('-')
  return `${rel} · ${Number(m)}월 ${Number(d)}일 기준`
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run tests/week.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/week.ts tests/week.test.ts
git commit -m "$(cat <<'EOF'
feat: surveyedLabel — 조사일 상대+절대 표시 포맷터

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `Freshness` 타입 이관 + 로직 + 컴포넌트 렌더

타입을 바꾸면 소비처(app.ts·App.tsx·App.test.tsx·App.stories.tsx)가 전부 `tsc`에서 함께 깨지므로 한 태스크로 묶어 트리를 초록으로 유지한다. CSS(시각)는 Task 3.

**Files:**
- Modify: `src/view-types.ts:10-15` (Freshness 유니온)
- Modify: `src/app.ts:12-20` (STALE_AFTER_DAYS·freshnessOf)
- Modify: `tests/app.test.ts` (freshness 테스트 3개)
- Modify: `src/components/App.tsx:1-8, 27, 38-40`
- Modify: `src/components/App.test.tsx:29` + 신규 테스트
- Modify: `src/components/App.stories.tsx` (pageView·오래된가격·none·진짜앱 주석)

**Interfaces:**
- Consumes: `surveyedLabel(days, surveyedOn)` (Task 1), `snapshotAgeDays(snapshot, now)` (기존 `src/data.ts`).
- Produces: `Freshness = { kind: 'none' } | { kind: 'dated'; surveyedOn: string; days: number }`. `AppView.freshness: Freshness` (필드명 유지).

- [ ] **Step 1: 순수 테스트를 새 타입으로 고쳐 실패시킨다** — `tests/app.test.ts`

기존 freshness 테스트 3개를 아래로 교체한다.

교체 대상 1 — "조사일이 이틀 전이면 fresh …" 테스트 전체를:

```ts
  test('스냅샷 있으면 dated — 조사일·날수를 싣는다 (2일 전, 임계 없음)', () => {
    // 조사일 7/8, 기준 7/10 → 2일. 임계가 없으니 그대로 dated로 싣는다.
    const v = buildAppView([peach], snap(), null, null, JULY)
    expect(v.freshness).toEqual({ kind: 'dated', surveyedOn: '2026-07-08', days: 2 })
  })
```

교체 대상 2 — "조사일이 사흘 넘으면 stale …" 테스트 전체를:

```ts
  test('오래된 조사일도 임계 없이 날수 그대로 싣는다 (4일)', () => {
    const old = { ...snap(), surveyedOn: '2026-07-06' } // 7/10 기준 4일
    const v = buildAppView([peach], old, null, null, JULY)
    expect(v.freshness).toEqual({ kind: 'dated', surveyedOn: '2026-07-06', days: 4 })
  })
```

교체 대상 3 — "스냅샷 없으면 가격 null, freshness는 fresh …" 테스트 전체를:

```ts
  test('스냅샷 없으면 가격 null, freshness는 none (지어낼 조사일이 없다)', () => {
    const v = buildAppView([peach], null, null, null, JULY)
    expect(v.cards[0].price).toBeNull()
    expect(v.freshness).toEqual({ kind: 'none' })
  })
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/app.test.ts`
Expected: FAIL — 기대값이 `dated`/`none`인데 코드는 아직 `fresh`/`stale`을 낸다.

- [ ] **Step 3: `Freshness` 유니온 재설계** — `src/view-types.ts`의 기존 블록(주석 포함, 10~15행)을 교체

```ts
/** 가격 조사일. 스냅샷이 있으면 신선도와 무관하게 날짜를 항상 싣는다(상시 표시).
 *  임계·경고는 없앴다 — 상대 문구("3일 전")가 신선도를 말한다. 케이스를 타입으로
 *  갈라 뷰가 빠뜨릴 수 없게 한다(스냅샷 없음 vs 날짜 있음). */
export type Freshness =
  | { kind: 'none' }
  | { kind: 'dated'; surveyedOn: string; days: number }
```

- [ ] **Step 4: `freshnessOf` 재작성 + 임계 상수 제거** — `src/app.ts`

`STALE_AFTER_DAYS` 상수(및 그 주석)를 삭제하고 `freshnessOf`를 교체:

```ts
function freshnessOf(snapshot: PriceSnapshot | null, now: Date): Freshness {
  // 스냅샷이 없으면 지어낼 조사일이 없다 — 줄을 그리지 않는다.
  if (!snapshot) return { kind: 'none' }
  return { kind: 'dated', surveyedOn: snapshot.surveyedOn, days: snapshotAgeDays(snapshot, now) }
}
```

`buildAppView` 안의 `freshness: freshnessOf(snapshot, now)` 호출은 그대로 둔다. `snapshotAgeDays` import(`./data`)도 그대로.

- [ ] **Step 5: 컴포넌트 렌더 교체** — `src/components/App.tsx`

import 줄에 `surveyedLabel`을 추가 (기존 `weekLabel` 옆):

```tsx
import { surveyedLabel, weekLabel } from '../week'
```

헤더의 stale 분기(38~40행)를 아래로 교체:

```tsx
        {freshness.kind === 'dated' && (
          <p className="surveyed">{surveyedLabel(freshness.days, freshness.surveyedOn)}</p>
        )}
```

(`view`에서 `freshness`를 꺼내는 27행 구조분해는 그대로 — `freshness`가 이미 포함돼 있다.)

- [ ] **Step 6: 컴포넌트 테스트 갱신** — `src/components/App.test.tsx`

base의 freshness(29행)를 dated로:

```ts
  date: new Date('2026-07-10'), freshness: { kind: 'dated', surveyedOn: '2026-07-10', days: 0 },
```

그리고 `describe('App', …)` 안에 테스트 2개를 추가:

```tsx
  test('조사일 한 줄을 항상 보여준다 (오늘)', async () => {
    const { container } = await renderWithRouter(<App view={base} />)
    expect(container.querySelector('.surveyed')?.textContent).toBe('오늘 · 7월 10일 기준')
  })

  test('스냅샷 없으면(none) 조사일 줄이 없다', async () => {
    const view: AppView = { ...base, freshness: { kind: 'none' } }
    const { container } = await renderWithRouter(<App view={view} />)
    expect(container.querySelector('.surveyed')).toBeNull()
  })
```

(`AppView` 타입은 이 파일이 이미 import 한다 — 8행.)

- [ ] **Step 7: 스토리 갱신** — `src/components/App.stories.tsx`

(a) `pageView`의 기본 freshness를 dated로 (date가 `2026-07-14`이므로 days 0 → "오늘"):

```ts
    freshness: { kind: 'dated', surveyedOn: '2026-07-14', days: 0 },
```

(b) `오래된가격` 스토리와 그 위 주석을 교체 (임계가 사라졌으니 "경고"가 아니라 "며칠 전" 표시):

```ts
/** 조사일이 며칠 지난 날. 신선도와 무관하게 "N일 전 · 날짜 기준"이 항상 헤더에 뜬다. */
export const 오래된가격: StoryObj = {
  render: () => (
    <App view={pageView({ freshness: { kind: 'dated', surveyedOn: '2026-07-09', days: 5 } })} />
  ),
}
```

(c) `오래된가격` 바로 뒤에 none 스토리를 추가:

```ts
/** 스냅샷이 아예 없는 날(가격 fetch 실패 등). 조사일 줄이 사라진다 — 날짜를 지어내지 않는다. */
export const 조사일없음: StoryObj = {
  render: () => <App view={pageView({ freshness: { kind: 'none' } })} />,
}
```

(d) `그달의진짜앱` 스토리의 주석에서 "stale 경고를 끈다"를 갱신 (surveyedOn을 시뮬 날짜로 덮으므로 매달 "오늘 · 날짜 기준"이 뜬다). 해당 문장(주석 안 "1." 항목의 두 번째 문장)을 아래로 교체:

```
 *     surveyedOn을 시뮬레이션 날짜로 덮으므로 헤더엔 "오늘 · {그 달} 기준"이 뜬다 —
 *     선정·정렬·카드 구성은 전부 진짜지만, **가격 숫자는 7월 실측이라 다른 달에선 참고용이다.**
```

- [ ] **Step 8: 게이트 통과 확인**

Run: `npm test && npx tsc --noEmit`
Expected: PASS — 모든 테스트 통과, 타입 에러 0. (`fresh`/`stale`/`STALE_AFTER_DAYS` 잔존 참조가 있으면 여기서 tsc가 잡는다.)

- [ ] **Step 9: 커밋**

```bash
git add src/view-types.ts src/app.ts tests/app.test.ts src/components/App.tsx src/components/App.test.tsx src/components/App.stories.tsx
git commit -m "$(cat <<'EOF'
feat: 조사일을 신선도와 무관하게 상시 표시

Freshness를 none|dated 2-케이스로 재설계. STALE_AFTER_DAYS 임계·경고 제거,
헤더에 "오늘 · 7월 16일 기준" 한 줄을 항상 노출. 스냅샷 없으면 줄 없음.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `.surveyed` 스타일 + 브라우저 실측 사인오프

**Files:**
- Modify: `src/style.css:99-106` (`.stale` → `.surveyed`)

**Interfaces:**
- Consumes: `App.tsx`가 렌더하는 `<p className="surveyed">` (Task 2).
- Produces: (없음 — 시각만)

- [ ] **Step 1: `.stale` 규칙을 `.surveyed`로 교체** — `src/style.css`

기존 `.stale { … }` 블록(99~106행)을 삭제하고 아래로 교체:

```css
/* 조사일 상시 줄 — 경고가 아니라 메타. 아이브로(.week)보다 한 단계 조용하게. */
.surveyed {
  color: var(--muted);
  font-size: 0.8rem;
  letter-spacing: 0.02em;
  margin: 0.4rem 0 0;
}
```

- [ ] **Step 2: 개발 서버 기동**

Run: `npm run dev`
헤더에 h1 `지금 장바구니에 담기 좋은 것들` 아래로 `오늘 · 7월 16일 기준`이 흐린 색(`--muted`)으로 한 줄 뜨는지 연다.

- [ ] **Step 3: 브라우저 실측 (직접)**

확인 항목:
- h1과 조사일 줄 사이 간격이 과하지 않은지 (h1 `margin-bottom: 1.3rem`이 아래 여백을 만든다 — 붙여야 하면 h1 하단 마진 또는 `.surveyed` 상단 마진을 조정).
- 색이 경고처럼 튀지 않고 아이브로(`.week`)보다 조용한 위계인지.
- 스토리북(`npm run storybook`)의 `기본`(오늘) / `오래된가격`(5일 전) / `조사일없음`(줄 없음)이 스펙대로 보이는지.

- [ ] **Step 4: 스크린샷 사인오프**

헤더 스크린샷을 사용자에게 보여주고 승인받는다 (CLAUDE.md 완료 게이트 — 사용자향 시각 변경). 간격·색 피드백이 있으면 Step 1 CSS만 조정 후 재확인.

- [ ] **Step 5: 게이트 재확인 + 커밋**

Run: `npm test && npx tsc --noEmit`
Expected: PASS (CSS만 바뀌어 로직 영향 없음).

```bash
git add src/style.css
git commit -m "$(cat <<'EOF'
feat: .surveyed 스타일 — 조사일 줄을 중립 메타로

.stale 경고 박스를 제거하고 아이브로보다 조용한 흐린 한 줄로. 브라우저 실측·사인오프.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- 내용 모델(상대+절대, "기준") → Task 1 `surveyedLabel`. ✓
- 배치(헤더 h1 아래) → Task 2 Step 5. ✓
- 강조 없음/임계 제거 → Task 2 Step 3·4 (`STALE_AFTER_DAYS` 삭제), Task 3 (`.stale` 제거·중립 `.surveyed`). ✓
- 타입 `none | dated` → Task 2 Step 3. ✓
- 결측(none→줄 없음) → Task 2 Step 4·6·7, Task 3 Step 3. ✓
- 검증(순수·컴포넌트·스토리·브라우저·게이트) → Task 1·2 테스트, Task 3 브라우저 사인오프, 각 태스크 게이트. ✓
- 범위 밖(품목별 날짜·결측 메우기) → 건드리지 않음(플랜에 없음). ✓

**Placeholder scan:** TBD/TODO 없음. 모든 코드 스텝에 실제 코드·명령·기대출력 포함.

**Type consistency:** `surveyedLabel(days, surveyedOn)` — Task 1 정의, Task 2 Step 5 호출 시그니처 일치. `Freshness = none | dated{surveyedOn, days}` — Task 2 Step 3 정의, Step 4(생성)·5(소비 `freshness.days`/`freshness.surveyedOn`)·6·7 일치. `AppView.freshness` 필드명 유지.
