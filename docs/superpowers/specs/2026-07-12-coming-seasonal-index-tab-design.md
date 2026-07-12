# 다가오는 제철 — 인덱스 탭 · 전용 페이지 설계

> 2026-07-12 · 브레인스토밍 산출물
> 관련: `DESIGN.md`(팔레트·규율·톤·문구류 은유), `CONTEXT.md`(도메인·심),
> `docs/superpowers/specs/2026-07-11-tanstack-start-migration-design.md`(라우트·프리렌더),
> `docs/superpowers/specs/2026-07-11-fridge-memo-card-design.md`·`2026-07-12-recipe-pin-memo-design.md`(문구류 계보)

## 배경

지금 앱의 시선은 **이번 달**에만 고정돼 있다. "곧 올 것"의 씨앗은 이미 있다 — `comingSoon`이
다음 달 새로 철 드는 품목을 뽑고, `AppView.coming`에 이모지+이름 칩으로 담아, 메인 맨 아래
한 줄로 흘려놓는다("곧 제철 · 🍑 복숭아 · 🍇 포도"). 그러나 이 한 줄은 **언제쯤인지·얼마나
남았는지·뭐가 좋은 건지** 아무 맥락이 없어 "미리 본다"는 감각이 없다.

동시에, 다가오는 것들을 이번 달 카드와 **같은 화면**에 다 쏟으면 "지금 뭘 담을까"가 흐려진다.
그래서 다가오는 제철은 **별도 경로**로 분리하고, 메인에는 다이어리 옆면 인덱스 북마크 같은
**인덱스 탭**만 남겨 그리로 넘어가게 한다. 이 탭은 냉장고 메모·마스킹테이프·압정 낱장으로
이어져 온 **문구류(stationery) 은유의 다음 형제**다(DESIGN.md 컨셉: "손그림 요리책의 낱장이
계절 따라 넘어가는 앱").

## 범위

- **새로 생김:**
  - 순수 선정: `comingMonths`(picks.ts) — 앞으로 N개월, 달별로 묶은 다가오는 품목 + 절정 플래그.
  - 순수 조립: `buildComingView`(app.ts) — 프로필+시계 → `ComingView`.
  - 뷰 타입: `ComingView`(view-types.ts).
  - 라우트: `src/routes/coming.tsx`(로더가 `produce.json`만 읽어 프리렌더).
  - 컴포넌트: `Coming`(전용 페이지), `IndexTab`(양쪽 페이지 공유 탭).
- **바뀜:**
  - `App.tsx` — 오른쪽 `IndexTab` 추가, 맨 아래 "곧 제철" 한 줄 **제거**.
  - `style.css` — 인덱스 탭 + 다가오는 페이지 규칙.
  - `routeTree.gen.ts` — `npm run generate-routes`로 재생성.
  - `DESIGN.md`·`CONTEXT.md` — 결정 기록 · 새 용어(심).
- **안 바뀜:** 가격·영양·레시피 파이프라인, `card.ts`, `selectPicks`, 기존 로더, 데이터 JSON.
  다가오는 페이지는 **가격·영양·레시피를 쓰지 않는다** — `produce.json`(프로필)과 시계만으로 선다.

## 원칙

- **예고는 카드보다 가볍다.** 가격 없음, 펼침 없음, `<details>` 없음. "볼 것"이지 "살 것"이 아니다.
  이번 달 카드(행동 가능)와 다가오는 예고(관망)는 시각적으로 급이 다르다.
- 정적 프리렌더·서버 없음·런타임 외부요청 없음·무추적 유지. 새 경로도 정적 산출물 한 장.
- 기본 무JS. 탭은 진짜 `<Link>`(앵커) — 넘김은 브라우저 네비게이션. View Transitions는
  **선택적 향상**으로만 얹고, 미지원·`prefers-reduced-motion`에선 일반 이동으로 그레이스풀 다운.
- 텍스트·글리프는 오직 쪽빛(`--ink`). 계절 웜 컬러(`--tint`)는 탭 배경 등 채움으로만, 글자에 안 싣는다.
- 문구는 계절의 목소리로. 감탄사·느낌표 금지, 서술로 끝낸다.

## 순수 선정 — `comingMonths`

다음 N개월(기본 `horizon = 2`)을 훑어, 각 달에 **새로 드는** 품목을 모아 달별로 묶는다.

```
comingMonths(profiles, month, horizon = 2): ComingMonth[]
```

규칙:

- **현재 달 제외.** 이번 달에 이미 제철인 품목은 "지금"이지 "다가오는"이 아니다
  (`!seasonMonths.includes(month)` — 기존 `comingSoon` 가드 계승).
- **가장 이른 달에 한 번만.** 한 품목이 m+1·m+2 둘 다 걸리면 **먼저 드는 달**에만 놓는다
  (달별 중복 없음). 오프셋 k=1..horizon 중 `seasonMonths.includes(wrap(m+k))`인 **최소 k**에 배정.
- **연말 랩어라운드.** `wrap(13) → 1`, `wrap(14) → 2`. 12월이면 다음은 [1, 2].
- **절정 플래그.** 각 품목이 **그 배정된 달**에 절정이면(`peakMonths.includes(monthK)`) `peak: true`.
  "곧 나온다"가 아니라 "곧 **가장 맛있다**"를 예고에 싣는 값어치.
- **빈 달 생략.** 새로 드는 품목이 없는 달은 결과에서 뺀다. 두 달 다 비면 빈 배열.

`comingSoon`(다음 달 한 덩어리)은 이 함수로 대체 가능하나, 다른 소비처가 없으므로 이번에 제거하고
`comingMonths`로 일원화한다.

## 뷰 조립 — `ComingView`

```ts
interface ComingItem { emoji: string; name: string; peak: boolean }
interface ComingMonth { month: number; items: ComingItem[] }   // month: 1–12
interface ComingView { months: ComingMonth[]; date: Date; term?: string }
```

`buildComingView(profiles, now): ComingView` — 순수. `now`에서 현재 달을 얻어 `comingMonths`를
부르고, 아이브로용 `term`(현재 절기)만 곁들인다. 가격 스냅샷·staleDays 없음.

`coming.tsx` 로더는 `produce.json`만 임포트해 `buildComingView(produce, new Date())`를 프리렌더한다
(기존 `index.tsx` 패턴과 동형, 단 스냅샷 계열 인자 없음).

## 인덱스 탭 — `IndexTab`

양쪽 페이지가 공유하는 한 컴포넌트. 화면 옆면에 **고정**된, 다이어리 옆면에서 살짝 들린 종이
북마크.

```tsx
<IndexTab side="right" to="/coming" label="다가오는 제철" ariaLabel="다가오는 제철" />
<IndexTab side="left"  to="/"       label="지금"         ariaLabel="지금 담기 좋은 것" />
```

- **위치·방향.** `position: fixed`, 뷰포트 세로 중앙 근처. **오른쪽 = 미래**(시간은 앞 페이지로
  흐른다), **왼쪽 = 지금**. 두 페이지의 탭이 서로 마주 본다.
  - 메인 `/` : 오른쪽 "다가오는 제철" 탭.
  - `/coming` : 왼쪽 "지금" 탭.
  - 왼쪽 자리는 메인에선 비워둔다 — 훗날 "지나간 제철"이 생기면 그 자리.
- **표현.** 세로쓰기(`writing-mode: vertical-rl`) 라벨. 배경은 계절 `--tint`, 글자는 쪽빛(`--ink`),
  모서리는 바깥으로만 살짝 둥근 crisp 종이 결. 그림자는 "메모 부양 1단"(`--lift`) 예외 안에서만.
- **미세 모션(펼치는 느낌).** hover/focus·터치 시 탭이 옆으로 몇 px **들려 손끝에 걸리듯**
  나오는 transform 한 겹. `prefers-reduced-motion: reduce`면 끈다.
- **접근성.** 진짜 `<Link>`(앵커). 키보드 도달, `:focus-visible` 쪽빛 2px 아웃라인(기존 규율).
  세로/축약 라벨이면 `aria-label`로 완전한 이름을 준다. 터치 타깃 ≥ 44px 폭.

## 다가오는 페이지 — `Coming`

전용 페이지 마크업. 이번 달 카드처럼 무겁지 않게, 달 헤더 + 가벼운 칩 목록.

- 헤더: 아이브로(절기·주차, 메인과 동형) + 헤딩 "**다가오는 제철**".
- 각 `ComingMonth`: 달 헤더(예 "**8월**") 아래 품목 목록. 항목은 "🍑 복숭아" 칩.
  **절정 품목만** 살짝 구분해 표시(예 "🌰 밤 · *절정*") — 웜 컬러 배경/마커로, 글자는 쪽빛.
- 왼쪽 `IndexTab`("지금")로 돌아간다.
- **빈 상태.** `months`가 비면 앱 목소리로: "다가오는 제철 정보가 아직 없어요".
- 출처 각주(가격·영양·레시피)는 **없다** — 이 페이지는 그 데이터를 쓰지 않으니 표기도 없다.

## View Transitions (선택적 향상)

"/" ↔ "/coming"을 낱장 넘기듯 전환. TanStack Router의 `<Link viewTransition>`로 얹고,
지원 브라우저에서만 켜진다(내부적으로 `document.startViewTransition` 유무 특징 감지).

- 전환 이름(`view-transition-name`)을 인덱스 탭·페이지 컨테이너에 부여해 탭이 이어지거나 crossfade.
- **가드:** 미지원 브라우저·`prefers-reduced-motion: reduce`에선 아무 것도 켜지 않고 일반 이동.
  기본 규율(정적·무JS)을 깨지 않는, 얹으면 좋고 없어도 되는 층.
- 이번 구현에서 필수는 아니다 — 훅과 이름만 자리 잡아 두고, 켜기는 마지막에 판단.

## 정리 (기존 제거)

- `App.tsx` 맨 아래 "곧 제철 · …" 한 줄 **제거**(탭+페이지가 대체).
- `AppView.coming` 필드와 그 조립(`app.ts`), `comingSoon`(picks.ts) **제거** — 소비처가 사라짐.
  `comingMonths`로 일원화.
- "N월의 제철"(이번 달 전체 목록) 섹션은 **유지** — 이번 달 참조라 메인에 남는다.

## 테스트

- **순수 로직(Vitest):** `comingMonths` — 연말 랩어라운드, 달별 중복 제거(먼저 드는 달에만),
  현재 달 제외, 절정 플래그(배정된 달 기준), 빈 달 생략·전부 빈 경우. `buildComingView` —
  달 그룹·term 구성.
- **컴포넌트(RTL):** `IndexTab` — 올바른 경로로 가는 링크·라벨·`aria-label`·side 클래스.
  `Coming` — 달 헤더·품목 칩·절정 구분 렌더, 빈 상태 문구. `App` — 오른쪽 탭 존재·기존 "곧 제철"
  한 줄 부재.

## 아키텍처 경계 (유지)

`picks(comingMonths) ← app(buildComingView) ← components(Coming·IndexTab) ← routes(coming.tsx)`.
순수 로직은 picks/app, 표시는 components, 로드·프리렌더는 routes. 다가오는 슬라이스는 기존
의존 방향을 그대로 따르며, 가격·영양·레시피 심에는 손대지 않는다.
