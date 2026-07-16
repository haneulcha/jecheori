# 조사일 상시 표시 — 설계

*백로그 #4("조사일 상시 표시 — 값싼 정직함")를 스펙으로. 근거: [제품 동작 지도](../../제품-동작-지도.md)의 수집 정책, [아이디어 백로그](../../아이디어-백로그.md) #4.*

작성: 2026-07-16.

## 왜

스냅샷은 **조사일(`surveyedOn`) 하나**를 갖고, 그날 값이 없는 품목은 `null`로 뺀다(다른 날 값으로
안 메운다). 그래서 **화면의 모든 가격은 같은 하루의 값**이다 — 그 하루가 언제인지가 신뢰의 근거다.

그런데 지금은 그 날짜가 **3일 이상 묵어야만** `가격은 N일 전 기준이에요`로 헤더에 뜬다
(`STALE_AFTER_DAYS = 3`). 그 미만이면 날짜가 화면에 **아예 없다**. 오늘·어제·2일 전 값도
"언제 기준인지" 알 수 없다. 이 스펙은 조사일을 신선도와 무관하게 **항상** 노출한다.

## 현재 동작 (변경 전)

- `app.ts`의 `freshnessOf`: 스냅샷 없으면 `{kind:'fresh'}`, 있으면 나이 계산해
  `days >= 3`일 때만 `{kind:'stale', days}`, 아니면 `{kind:'fresh'}`.
- `view-types.ts`의 `Freshness = { kind:'fresh' } | { kind:'stale'; days }`.
- `App.tsx`: `freshness.kind === 'stale'`일 때만 `<p className="stale">가격은 {days}일 전 기준이에요</p>`.
- `style.css`의 `.stale`: 경고색(`var(--rise)`) + 테두리 박스.
- 나이 계산은 `data.ts`의 `snapshotAgeDays(snapshot, now)` — 조사일 KST 자정 기준.

## 결정 (확정)

브레인스토밍에서 사용자가 정한 것:

- **내용 모델 — 상대 + 절대 함께, 항상.** `{오늘 | N일 전} · {M월 D일} 기준`.
  - 상대: `days === 0 → "오늘"`, 그 외 `"${days}일 전"`.
  - 절대: `surveyedOn`(YYYY-MM-DD)을 `M월 D일`로. **연도 없음.**
  - 문구는 "조사"가 아니라 **"기준"**. 예: `오늘 · 7월 16일 기준`, `3일 전 · 7월 13일 기준`.
- **배치 — 헤더, h1 아래.** 지금 stale 경고가 있던 자리. 항상 표시.
- **강조 없음 — 완전 중립.** 3일 임계·경고 스타일을 **없앤다**. 상대 문구("3일 전")가 이미 신선도를
  말하므로 별도 경고는 불필요. `.stale` 경고 박스 제거, 아이브로(`.week`)처럼 은은한 중립 스타일.
- **결측 — 스냅샷 없으면 줄을 안 그린다.** 날짜 자체가 없으니 지어내지 않는다.

## 타입 (view-types.ts)

`Freshness`를 2-케이스 유니온으로 재설계 — 스냅샷이 있으면 날짜를 **항상** 싣는다:

```ts
/** 가격 조사일. 스냅샷이 있으면 항상 날짜를 싣는다(상시 표시).
 *  임계·경고는 없앴다 — 상대 문구가 신선도를 말한다. */
export type Freshness =
  | { kind: 'none' }                             // 스냅샷 없음 → 줄 안 그림
  | { kind: 'dated'; surveyedOn: string; days: number }
```

`AppView.freshness: Freshness`는 그대로. `days`는 임계가 사라졌으므로 규칙이 아니라 **나이(순수 데이터)**
이며, 컴포넌트가 상대 문구로 옮기기 위한 값이다.

기존 유니온의 `ChangeView 철학` 주석(임계를 뷰가 못 빠뜨리게)은 이제 임계가 없으므로 갱신한다.

## 로직 (app.ts)

- `STALE_AFTER_DAYS` 상수 **제거**.
- `freshnessOf` 재작성:

```ts
function freshnessOf(snapshot: PriceSnapshot | null, now: Date): Freshness {
  if (!snapshot) return { kind: 'none' }
  return { kind: 'dated', surveyedOn: snapshot.surveyedOn, days: snapshotAgeDays(snapshot, now) }
}
```

`snapshotAgeDays`(data.ts)는 그대로 재사용. 나이 계산 규칙은 여기 한 곳.

## 표시 (App.tsx + 작은 유틸)

헤더 h1 아래에 한 줄. `none`이면 안 그린다:

```tsx
{freshness.kind === 'dated' && (
  <p className="surveyed">{surveyedLabel(freshness.days, freshness.surveyedOn)}</p>
)}
```

포맷은 **표시**라 로직층(app/card)이 아니라 표시층에 둔다. `src/week.ts`에 순수 함수로 추가
(주간 라벨과 같은 성격 — 날짜→한국어 문자열):

```ts
/** days·조사일 → "오늘 · 7월 16일 기준" / "3일 전 · 7월 13일 기준" (표시용, 순수) */
export function surveyedLabel(days: number, surveyedOn: string): string {
  const rel = days === 0 ? '오늘' : `${days}일 전`
  const [, m, d] = surveyedOn.split('-')          // "2026-07-13" → ["2026","07","13"]
  return `${rel} · ${Number(m)}월 ${Number(d)}일 기준`
}
```

- 기존 `가격은 N일 전 기준이에요` 경고 줄과 `freshness.kind === 'stale'` 분기 **제거**.
- `M월 D일`은 `surveyedOn` 문자열을 직접 쪼개 만든다(연도 무시). `Date` 파싱을 피해 타임존
  왜곡을 안 만든다 — `surveyedOn`은 이미 KST 조사일 문자열이다.

## 스타일 (style.css)

- `.stale`(경고색 + 테두리 박스) **제거**.
- `.surveyed` 추가 — 중립·은은하게. 아이브로 `.week`와 같은 계열(작은 글씨, 흐린 색, 박스 없음).
  정확한 값은 브라우저 실측으로 맞춘다(아래 검증). h1 아래 여백 조정 포함.

## 결측·엣지

- **스냅샷 `null`** → `kind:'none'` → 날짜 줄 없음. 프로덕션은 `prices.json`이 커밋돼 있어 드물지만,
  fetch 실패 시 `loadSnapshot`이 `null`을 준다. 이때 카드도 가격이 없으므로 날짜만 없는 게 아니라
  가격 자체가 없다 — 날짜를 지어내지 않는 게 정직하다.
- **`days` 상한 없음** — 스냅샷이 아주 묵으면(예: cron 장기 중단) "30일 전 · … 기준"처럼 그대로
  큰 수가 뜬다. 숨기지 않는다(그게 정직함). cron이 도는 한 0~1일이 정상.

## 검증 (완료 게이트)

- **순수 테스트** (`tests/app.test.ts` 또는 기존 파일): `freshnessOf`
  - 스냅샷 `null` → `{kind:'none'}`.
  - 오늘 조사 → `{kind:'dated', days:0}`; 2일 전 → `days:2`; 5일 전 → `days:5` (임계 경계 없음).
  - `surveyedLabel` (`tests/week.test.ts` 또는 신규): `(0,'2026-07-16')→"오늘 · 7월 16일 기준"`,
    `(3,'2026-07-13')→"3일 전 · 7월 13일 기준"`.
- **컴포넌트 테스트** (`src/components/App.test.tsx`): `dated`에서 `오늘 · … 기준` 렌더,
  `none`에서 `.surveyed` 없음.
- **스토리북** (`App.stories.tsx`): 기존 `freshness:{kind:'stale',days:5}` 스토리를 새 타입으로
  갱신 — `dated`(오늘·묵음) / `none` 상태를 보이게. `pageView` 헬퍼 시그니처 반영.
- **브라우저 실측 + 사인오프** — UI·CSS 변경이므로 `npm run dev`로 실제 헤더를 열어
  중립 스타일·여백·h1과의 위계를 확인하고 스크린샷으로 사인오프(CLAUDE.md 완료 게이트).
- **게이트 = `npm test` 와 `npx tsc --noEmit` 둘 다.** 스토리 타입도 새 유니온에 맞춘다.

## 범위 밖 (하지 않는다)

- **품목별 날짜.** 스냅샷은 조사일 하나뿐이라 화면의 모든 가격이 같은 하루다 — 품목마다 다른 날짜는
  '결측을 다른 날 값으로 메우는' 정책으로 바꿀 때만 의미가 생긴다(백로그 #4 반전). 안 바꾼다.
- **결측 메우기.** `null`을 다른 날 값으로 안 메운다(현행 유지).
- **강조·경고 재도입.** 이번엔 중립만. 나중에 필요하면 별도 결정.
