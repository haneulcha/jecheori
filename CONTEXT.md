# CONTEXT — jecheori 도메인·아키텍처 용어

코드가 쓰는 용어의 정의. 새 개념을 만들면 여기에 적는다.

## 도메인

- **프로필 (ProduceProfile)** — 한 품목의 불변 정보: 이름·이모지·분류(과일/채소)·제철/절정 월·월별 whyNow 문구·고르는법/보관/쓰임·KAMIS 매칭 참조. `public/data/produce.json`. `src/types.ts`.
- **스냅샷 (PriceSnapshot)** — **하나의 조사일**에 대한 KAMIS 소매가 수집본. 품목별 `PriceEntry`. `public/data/prices.json`.
- **조사일 (surveyedOn)** — KAMIS가 실제로 소매가를 조사한 날. **스냅샷 전체가 단 하나의 조사일을 갖는다** (엔트리마다 다르지 않다). **수집시각(`fetchedAt`)과 다르다** — 당일 가격은 오후에 공표되고 일요일·공휴일엔 조사가 없어서, 조사일은 수집시각보다 며칠 앞설 수 있다. 신선도(`staleDays`)는 조사일로 잰다. `fetchedAt`으로 재면 cron이 매일 도는 한 항상 0이다.
- **관측 (PriceEntry.price)** — **조사일에 실제로 조사된** 가격. 그날 그 품목 조사가 없으면 `null`(결측). **다른 날 값으로 메우지 않는다** — 예전엔 KAMIS의 "1일전" 칸으로 폴백했는데, 그러면 스냅샷의 조사일과 실제 가격의 날짜가 어긋난다. 조사일 찾기는 수집 단계(`buildLatestSnapshot`)가 거슬러 올라가며 해결한다.
- **기준선 (baseline)** — 비교용 과거 가격(1개월전·1년전). **KAMIS가 날짜를 주지 않고 라벨만 준다** — 그래서 관측이 아니다. 관측과 같은 칸·같은 타입에 두지 않는다. (`priceMonthAgo`를 KAMIS의 1주일전 컬럼에서 읽는 버그가 실제로 있었다.)
  - **왜 하필 둘인가는 화면이 정했다.** KAMIS는 비교값을 다섯 개 준다(1일전·1주일전·2주일전·1개월전·1년전·일평년). 우리가 둘만 고른 건 카드가 점 3개짜리 스파크라인과 "한 달 대비" 칩을 그리기 때문이다. **도메인 사실이 아니라 제품 결정이다** — 화면이 바뀌면 이 둘도 바뀔 수 있다. 다음 사람이 이걸 KAMIS가 준 사실로 착각하지 않도록 적어둔다.
- **단위 (Unit)** — `{ quantity, measure }`. **`measure`는 KAMIS의 글자가 아니라 무게냐 개수냐로 가른다**: `{ kind:'weight', unit:'kg'|'g' }` | `{ kind:'count', unit:'개'|'포기' }`. 개당값은 **셀 수 있고 수량이 1보다 클 때** 성립한다 — '개'인지 아닌지가 아니다(포기도 셀 수 있다). 예전엔 `measure !== '개'`로 걸렀는데, KAMIS가 우연히 1포기만 주기 때문에 안 틀렸을 뿐이다. **응답의 우연을 규칙으로 굳히지 않는다.** 환산은 하지 않는다 — KAMIS 표기를 그대로 보존한다. 환산이 없으면 오차도 없다.
- **픽 (PickResult)** — 이번 달 제철 프로필 하나에 대한 선정 결과: 프로필 + 절정 여부(`inPeak`) + 가격 뷰(`PriceView | null`). "무엇을 보여줄지"의 비즈니스 결과. `selectPicks`가 절정 먼저·하락 큰 순으로 정렬해 만든다. `src/picks.ts`.
- **PriceView** — 픽의 가격 사실: 현재가·단위·한 달 전 대비 %·한 달 전/작년 절댓값. 순수 파생. `src/picks.ts`.
- **comingMonths (`src/picks.ts`)** — 앞으로 N개월(기본 2개월) 각 달에 **새로 드는** 품목을 달별로 묶는다: 현재 달 제외, 가장 이른 달에 한 번만(달별 중복 없음), 연말 랩어라운드, 배정된 달의 절정 플래그. `ComingGroup{month, items: ComingPick[]}`을 반환. `/coming` 페이지의 선정 로직.

## 아키텍처 심 (seam)

- **KAMIS 어댑터 (`scripts/lib/parse-kamis.mjs`)** — KAMIS 응답 **형태**를 아는 유일한 곳. `dpr1~dpr7` 컬럼, `"-"` 결측 표기, `unit` 문자열 표기법이 **전부 여기서 끝난다**. 바깥(`picks`/`card`/`app`/`components`)은 KAMIS를 몰라야 한다.
  - **컬럼은 순서가 아니라 의미로 고른다**: `dpr1`=당일 `dpr2`=1일전 `dpr3`=1주일전 `dpr4`=2주일전 `dpr5`=1개월전 `dpr6`=1년전 `dpr7`=일평년. (응답의 `day1~day7`이 라벨을 준다. 1개월전을 `dpr3`에서 읽어 조용히 1주일전 값이 들어간 적이 있다.)
  - **모르는 형태를 만나면 조용히 넘기지 않고 실패한다** — 처음 보는 단위 표기는 `null`로 뭉개지 말고 throw. 조용한 오염보다 시끄러운 실패가 낫다.

- **CardView (`src/card.ts`)** — 픽의 **표시 투영**. 카드를 그리는 데 필요한 모든 값을 계산해 담는 순수 데이터: 식별(이모지·이름·품종·분류), 절정 플래그, whyNow, 노트 3필드, 가격 표시(`PriceCardView`). **비즈니스/파생 규칙**(개당값, 반올림, 1% "비슷" 임계, 스파크라인 상대 위치)은 전부 여기서 끝난다.
  - `toCardView(pick, month): CardView` — 픽 → 뷰. 순수 함수, DOM/시간 없음.
  - **경계**: `card.ts`는 계산만, `src/components/`는 `CardView → JSX`만 한다. 숫자 로케일 포맷·한국어 카피·마크업은 컴포넌트 소관. **규칙이 바뀌면 `card.ts`만, 화면이 바뀌면 `components`만** 바뀐다.
  - **픽셀은 컴포넌트 것이다.** `sparklineLevels`는 세 값의 **상대 위치(0~1)**만 낸다. x 좌표·viewBox·y 범위는 `Sparkline.tsx`가 정한다. 예전엔 `card.ts`가 `x=[45,150,255]`·`y=24~44`를 그대로 뱉어서, 스파크라인 크기를 바꾸면 "순수 파생" 레이어가 따라 바뀌었다. 도메인 사실은 "어디쯤인가"지 "x가 몇"이 아니다.
- **판별 유니온으로 올리는 규칙들** — 임계·분기는 뷰가 아니라 `card`/`app`에서 정하고, 컴포넌트는 케이스를 소비만 한다. 그래야 누락이 타입으로 걸린다.
  - `PriceCardView.change` — `{kind:'fall'|'rise', pct}` | `{kind:'similar'}` | `{kind:'basis'}`(작년 기준 — 다가오는 카드 예고, 칩·%·화살표 없음) | `null`
  - `AppView.freshness` (`src/view-types.ts`) — `{kind:'fresh'}` | `{kind:'stale', days}`. **"며칠부터 오래됐다고 알리나"(3일)는 제품 규칙**이라 `app.ts`가 정한다. 예전엔 `App.tsx`가 `staleDays >= 3`을 판정했다 — JSX에 박힌 규칙이었다.
- **PriceCardView.change** — 등락을 판별 유니온으로: `{ kind:'fall'|'rise', pct }` | `{ kind:'similar' }` | `{ kind:'basis' }`(작년 기준 — 다가오는 카드 예고, 칩·%·화살표 없음) | `null`(지난달 데이터 없음). 컴포넌트가 케이스별로 소비하므로 누락이 타입으로 걸린다.
- **AppView (`src/view-types.ts`) · buildAppView (`src/app.ts`)** — 페이지 전체의 표시 데이터: 카드 목록(`CardView[]`)·noDrop 플래그·제철/곧제철 칩·절기·staleDays. `buildAppView(profiles, snapshot, nutrition, recipes, now)`가 원시 데이터+시계 → `AppView` **조립**(순수)을 한 곳에 모은다. 라우트 로더가 이걸 호출해 프리렌더한다.
- **ComingView (`src/view-types.ts`) · buildComingView (`src/app.ts`)** — `/coming` 페이지의 표시 데이터: `ComingMonth[]`(월별 `month`·`season`·`items`) + date + term. `ComingMonth.items`는 이제 메인과 같은 `CardView[]`다(`ComingItem{emoji, name, peak, whyNow}`는 폐기) — `ProduceCard`로 그대로 그린다. `buildComingView(profiles, comingSeed, nutrition, recipes, now)`가 `comingMonths`를 부른 뒤 각 그룹에 `seasonOf(month)`을, 각 품목엔 가격(작년 같은 시기 씨앗에서 `matchEntry`)·영양(`matchNutrition`/`nutritionView`)·레시피(`matchRecipes`/`recipeView`)를 매칭해 `toComingCardView`로 풀 카드를 조립한다. 가격은 등락 없이 `{kind:'basis'}`(작년 기준) 한 줄로만 보인다.
- **NavIndex (`src/components/`)** — `/`·`/coming` 양쪽 페이지가 공유하는 내비게이션. 우상단 램프줄(SVG 선+원)을 당기면 목차가 차양(shade)처럼 아래로 풀려 내리는 컴팩트 패널. 열림/닫힘은 React `useState`(`data-open`), 목차 링크는 TanStack `<Link viewTransition>`(클라이언트 라우팅 — 전체 리로드 없이 전환, basepath 자동 처리). 현재 페이지는 `aria-current="page"`.
- **ComingCard 폐기** — 다가오는 페이지는 `ProduceCard`(메인과 동일)를 쓴다. 간트·펼침·손질법·영양·레시피 동일, 가격만 작년 같은 시기 씨앗(`coming-prices.json`)이라 등락 칩·스파크라인 없이 "작년 기준" 한 줄로만 보인다. 마스킹테이프 색은 월 섹션 `data-season`이 그 달 계절로 정한다.
- **레이어 요약** — `picks.ts`(무엇을 고르나) → `card.ts`(카드로 어떻게 투영) → `app.ts`(페이지로 어떻게 조립) → `components/`(JSX로 그림) → `routes/`(로드+프리렌더). `/coming`도 같은 결: `picks(comingMonths)` → `app(buildComingView)` → `components(Coming/ProduceCard/NavIndex)` → `routes(coming.tsx)`가 프리렌더. 순수 로직(picks/card/app)은 프레임워크 무관. 의존 방향: `picks ← card ← app ← components ← routes`.
- **뷰 상태 탐색기 (`.storybook/`, `src/story-utils.tsx`)** — 스토리는 `CardView`를 손으로 조립하지 않는다. 노브 → `ProduceProfile`+`PriceEntry`(재료) → `priceView` → `toCardView` → 컴포넌트. 1% "비슷" 임계·개당값 조건·스파크 null 조건이 스토리에서도 **진짜로** 작동하고, 도달 불가능한 조합은 만들 수 없다. 영양·레시피도 **진짜 매처**(`matchNutrition`/`matchRecipes`)를 통과하므로 품목과 무관한 레시피가 붙지 못한다. 픽스처는 실물 `public/data/*.json`. CI에는 없다 — 게이트는 `tsc` + `npm test` + 브라우저.
