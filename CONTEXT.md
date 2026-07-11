# CONTEXT — jecheori 도메인·아키텍처 용어

코드가 쓰는 용어의 정의. 새 개념을 만들면 여기에 적는다.

## 도메인

- **프로필 (ProduceProfile)** — 한 품목의 불변 정보: 이름·이모지·분류(과일/채소)·제철/절정 월·월별 whyNow 문구·고르는법/보관/쓰임·KAMIS 매칭 참조. `public/data/produce.json`. `src/types.ts`.
- **스냅샷 (PriceSnapshot)** — 특정 일자의 KAMIS 소매가 수집본. 품목별 `PriceEntry`(당일·한 달 전·작년 가격). `public/data/prices.json`.
- **픽 (PickResult)** — 이번 달 제철 프로필 하나에 대한 선정 결과: 프로필 + 절정 여부(`inPeak`) + 가격 뷰(`PriceView | null`). "무엇을 보여줄지"의 비즈니스 결과. `selectPicks`가 절정 먼저·하락 큰 순으로 정렬해 만든다. `src/picks.ts`.
- **PriceView** — 픽의 가격 사실: 현재가·단위·한 달 전 대비 %·한 달 전/작년 절댓값. 순수 파생. `src/picks.ts`.

## 아키텍처 심 (seam)

- **CardView (`src/card.ts`)** — 픽의 **표시 투영**. 카드를 그리는 데 필요한 모든 값을 계산해 담는 순수 데이터: 식별(이모지·이름·품종·분류), 절정 플래그, whyNow, 노트 3필드, 가격 표시(`PriceCardView`). **비즈니스/파생 규칙**(개당값, 반올림, 1% "비슷" 임계, 스파크라인 좌표)은 전부 여기서 끝난다.
  - `toCardView(pick, month): CardView` — 픽 → 뷰. 순수 함수, DOM/시간 없음.
  - **경계**: `card.ts`는 계산만, `src/components/`는 `CardView → JSX`만 한다. 숫자 로케일 포맷·한국어 카피·마크업은 컴포넌트 소관. **규칙이 바뀌면 `card.ts`만, 화면이 바뀌면 `components`만** 바뀐다.
- **PriceCardView.change** — 등락을 판별 유니온으로: `{ kind:'fall'|'rise', pct }` | `{ kind:'similar' }` | `null`(지난달 데이터 없음). 컴포넌트가 케이스별로 소비하므로 누락이 타입으로 걸린다.
- **AppView (`src/view-types.ts`) · buildAppView (`src/app.ts`)** — 페이지 전체의 표시 데이터: 카드 목록(`CardView[]`)·noDrop 플래그·제철/곧제철 칩·절기·staleDays. `buildAppView(profiles, snapshot, now)`가 원시 데이터+시계 → `AppView` **조립**(순수)을 한 곳에 모은다. 라우트 로더가 이걸 호출해 프리렌더한다.
- **레이어 요약** — `picks.ts`(무엇을 고르나) → `card.ts`(카드로 어떻게 투영) → `app.ts`(페이지로 어떻게 조립) → `components/`(JSX로 그림) → `routes/`(로드+프리렌더). 순수 로직(picks/card/app)은 프레임워크 무관. 의존 방향: `picks ← card ← app ← components ← routes`.
