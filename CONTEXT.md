# CONTEXT — jecheori 도메인·아키텍처 용어

코드가 쓰는 용어의 정의. 새 개념을 만들면 여기에 적는다.

## 도메인

- **프로필 (ProduceProfile)** — 한 품목의 불변 정보: 이름·이모지·분류(과일/채소)·제철/절정 월·월별 whyNow 문구·고르는법/보관/쓰임·KAMIS 매칭 참조. `public/data/produce.json`. `src/types.ts`.
- **스냅샷 (PriceSnapshot)** — 특정 일자의 KAMIS 소매가 수집본. 품목별 `PriceEntry`(당일·한 달 전·작년 가격). `public/data/prices.json`.
- **픽 (PickResult)** — 이번 달 제철 프로필 하나에 대한 선정 결과: 프로필 + 절정 여부(`inPeak`) + 가격 뷰(`PriceView | null`). "무엇을 보여줄지"의 비즈니스 결과. `selectPicks`가 절정 먼저·하락 큰 순으로 정렬해 만든다. `src/picks.ts`.
- **PriceView** — 픽의 가격 사실: 현재가·단위·한 달 전 대비 %·한 달 전/작년 절댓값. 순수 파생. `src/picks.ts`.
- **comingMonths (`src/picks.ts`)** — 앞으로 N개월(기본 2개월) 각 달에 **새로 드는** 품목을 달별로 묶는다: 현재 달 제외, 가장 이른 달에 한 번만(달별 중복 없음), 연말 랩어라운드, 배정된 달의 절정 플래그. `ComingGroup{month, items: ComingPick[]}`을 반환. `/coming` 페이지의 선정 로직.

## 아키텍처 심 (seam)

- **CardView (`src/card.ts`)** — 픽의 **표시 투영**. 카드를 그리는 데 필요한 모든 값을 계산해 담는 순수 데이터: 식별(이모지·이름·품종·분류), 절정 플래그, whyNow, 노트 3필드, 가격 표시(`PriceCardView`). **비즈니스/파생 규칙**(개당값, 반올림, 1% "비슷" 임계, 스파크라인 좌표)은 전부 여기서 끝난다.
  - `toCardView(pick, month): CardView` — 픽 → 뷰. 순수 함수, DOM/시간 없음.
  - **경계**: `card.ts`는 계산만, `src/components/`는 `CardView → JSX`만 한다. 숫자 로케일 포맷·한국어 카피·마크업은 컴포넌트 소관. **규칙이 바뀌면 `card.ts`만, 화면이 바뀌면 `components`만** 바뀐다.
- **PriceCardView.change** — 등락을 판별 유니온으로: `{ kind:'fall'|'rise', pct }` | `{ kind:'similar' }` | `null`(지난달 데이터 없음). 컴포넌트가 케이스별로 소비하므로 누락이 타입으로 걸린다.
- **AppView (`src/view-types.ts`) · buildAppView (`src/app.ts`)** — 페이지 전체의 표시 데이터: 카드 목록(`CardView[]`)·noDrop 플래그·제철/곧제철 칩·절기·staleDays. `buildAppView(profiles, snapshot, now)`가 원시 데이터+시계 → `AppView` **조립**(순수)을 한 곳에 모은다. 라우트 로더가 이걸 호출해 프리렌더한다.
- **ComingView (`src/view-types.ts`) · buildComingView (`src/app.ts`)** — `/coming` 페이지의 표시 데이터: `ComingMonth[]`(월별 `month`·`season`·`items`) + date + term. `ComingItem{emoji, name, peak, whyNow}`는 **미래 월 기준** whyNow(그 품목이 배정된 달의 한마디). `buildComingView(profiles, now)`는 프로필+시계만 쓴다(가격·영양·레시피 없음) — `comingMonths`를 부르고 각 그룹에 `seasonOf(month)`, 각 품목에 `whyNowLine(profile, month)`을 얹는다(둘 다 `season.ts`/`card.ts`의 기존 순수 함수 재사용, 새 로직 아님).
- **NavIndex (`src/components/`)** — `/`·`/coming` 양쪽 페이지가 공유하는 내비게이션. 우상단 램프줄(SVG 선+원)을 당기면 목차가 차양(shade)처럼 아래로 풀려 내리는 컴팩트 패널. 열림/닫힘은 React `useState`(`data-open`), 목차 링크는 TanStack `<Link viewTransition>`(클라이언트 라우팅 — 전체 리로드 없이 전환, basepath 자동 처리). 현재 페이지는 `aria-current="page"`.
- **ComingCard (`src/components/`)** — 냉장고-메모 카드의 표지 껍데기(`.card`·마스킹테이프·crisp 모서리 등)를 재활용한 **정적 `<div>`**(가격·스파크라인·`<details>` 펼침 없음). `data-season={그 품목의 미래 달 season}`을 달아 마스킹테이프 색이 그 미래 달의 계절로 재정의되게 한다(8월 품목은 여름 노랑, 9월 품목은 가을 오렌지).
- **레이어 요약** — `picks.ts`(무엇을 고르나) → `card.ts`(카드로 어떻게 투영) → `app.ts`(페이지로 어떻게 조립) → `components/`(JSX로 그림) → `routes/`(로드+프리렌더). `/coming`도 같은 결: `picks(comingMonths)` → `app(buildComingView)` → `components(Coming/ComingCard/NavIndex)` → `routes(coming.tsx)`가 프리렌더. 순수 로직(picks/card/app)은 프레임워크 무관. 의존 방향: `picks ← card ← app ← components ← routes`.
