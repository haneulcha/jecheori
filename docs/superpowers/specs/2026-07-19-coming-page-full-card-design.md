# 다가오는 제철 페이지 — 풀 카드 싱크 · 드로워 정리 — 설계

*근거: [제품 동작 지도](../../제품-동작-지도.md) §7(다가오는 제철)·수집 정책, [CLAUDE.md](../../../CLAUDE.md)의
데이터 정책·씨앗형 규칙, [DESIGN.md](../../DESIGN.md)의 냉장고-메모 카드 결정. 북극성(창이지 거울).*

작성: 2026-07-19. 브레인스토밍에서 두 방향과 카드/가격 형태를 사인오프.

## 왜 (문제)

`/coming`(다가오는 제철)은 지금 **껍데기만 재활용한 정적 `ComingCard`**(가격·펼침·간트 없음)로,
`/`(메인)의 냉장고-메모 카드와 **다른 물건**이다. 두 페이지를 오가면 카드가 갈려 이질적이고,
다가오는 품목의 "얼마쯤 하나·언제가 절정인가·어떻게 손질하나"를 볼 길이 없다. 램프줄 드로워도
"목차" 제목 + 두 링크뿐이라 목적("어디로 갈지")이 흐리다.

방향: **다가오는 카드를 메인과 같은 카드로 싱크**하고(간트·펼침·영양·레시피 동일), 가격은
미래 예고라 지금 값이 없으니 **작년 같은 시기 가격**을 씨앗으로 붙인다. 드로워는 목차 성격을
유지하되 라벨·군더더기를 정리한다.

## 현재 동작 (변경 전)

- **`components/Coming.tsx`**: 월 섹션(`8월`/`9월`)마다 `ComingCard` 나열. 로더는 `produce.json`만.
- **`components/ComingCard.tsx`**: 정적 `div.card` — 이모지·이름·절정뱃지·`whyNow`뿐. 가격·펼침·간트 없음.
- **`app.ts` `buildComingView`**: 프로필+시계만. 가격·영양·레시피 안 씀(지도 §7 결정).
- **`NavIndex.tsx`**(램프줄 드로워): "목차" 제목 + `지금 담기 좋은 것`(`/`)·`다가오는 제철`(`/coming`) 두 링크.
- **가격 데이터**: `prices.json`은 오늘 하루치 스냅샷. 다가오는 품목 중 KAMIS가 연중 조사하는
  사과·배·상추·고구마는 있으나 값이 **"지금(이번 달)"** 가격이고, 포도·샤인머스캣·쪽파는 아예 없다.
  → **"작년 이맘때" 가격은 현재 데이터에 없다.** (실측: 7월 스냅샷 기준 확인.)

## 결정 (확정 — 브레인스토밍)

| # | 결정 | 요지 |
|---|---|---|
| 1 | **다가오는 카드 = 메인 카드(`ProduceCard`)** | `ComingCard` 폐기. 월 섹션(8월/9월) 안에서 풀 카드. |
| 2 | **간트·펼침·영양·레시피 동일** | 프로필/씨앗 기반이라 계절 무관하게 다 붙는다. |
| 3 | **가격 = 작년 같은 시기, 씨앗 수집** | KAMIS를 작년 각 달 날짜로 1회 소급 수집 → `coming-prices.json`. 상시 CI 없음(씨앗형). |
| 4 | **가격 표시 = 기존 `PriceCardView` 그대로** | 새 필드 없음. `now`=작년가격·`unit` 그대로·`perUnit` 계산. 등락·스파크 없음. |
| 5 | **라벨 "작년 기준"** | `ChangeView` 유니온에 `{ kind: 'basis'; basisLabel }` 한 케이스 추가 → `PriceBlock`이 `{basisLabel} 기준` 렌더. |
| 6 | **간트 현재월 표시 = 오늘 달** | 다가오는 품목은 이번 달이 비어 "지금은 없고 M월부터 제철"로 정직하게 보인다. |
| 7 | **드로워 = 목차 링크(nav 유지)** | "목차" 제목·구분선 제거. 라벨 `지금 제철인 품목`·`다가오는 제철 품목`. 터치타깃·여백·전환 정리. |

## 화면 동작

### 카드 (메인과 동일)

- 요약: 이모지·이름·절정 dot·간트(`SeasonStrip`) + 가격 슬롯.
- **가격 슬롯**: `card.price ? <PriceBlock/> : null`. 다가오는 카드는 `price`에 작년값을 실어
  `PriceBlock`이 그대로 그린다 — 큰 숫자(작년 가격) + "작년 기준" + "N개 기준 · 개당 X원"(셀 수 있을 때).
  등락 칩·스파크라인은 없다(`change.kind==='basis'`, `spark===null`).
- **가격 매칭 실패**(쪽파 등 KAMIS 미조사·씨앗 결측): 메인과 같은 규칙으로 **가격 없이** 카드만.
- 펼침(`.open`): 손질법(`Note`)·영양(`NutritionLine`)·레시피(`RecipeChips`/`RecipeMemo`) — 메인과 동일.
  `spark`가 null이라 스파크라인만 자연히 빠진다.

### 간트 (`SeasonStrip`)

- `currentMonth = 오늘 달`. 제철·절정은 프로필대로. 다가오는 품목은 오늘 달 칸이 제철 밖이라
  "지금은 비었고 대상월부터 제철"로 읽힌다 — 예고 페이지의 정직한 신호.

### 드로워 (`NavIndex`)

- `.nav-panel-title`("목차") 제거. 링크 위/사이 구분선 없음.
- 라벨: `지금 제철인 품목`(`/`) · `다가오는 제철 품목`(`/coming`). `aria-current` 유지.
- 링크 터치타깃 ≥44px, 여백·열림 전환 정리(`apple-design` 렌즈 + 브라우저 실측).
- 메인 페이지 `<h1>`("지금 담기 좋은 것")은 이번 스코프 밖 — 드로워 라벨과 다름은 감수(원하면 별건).

## 아키텍처 경계별 변경

경계는 CLAUDE.md 지도를 따른다(순수는 `picks`/`card`/`app`, 표시는 `components`).

### 데이터 씨앗 — `public/data/coming-prices.json` (신규)

- **신규 스크립트 `scripts/fetch-coming-prices.mjs`**: 기존 `fetch-prices.mjs`의 `buildSnapshot({ regday })`를
  **작년 12개월** 각 달 대표 날짜로 재사용. 부류 3개(100·200·400)만(기존 정책 동일).
- 형태: `{ collectedYear: number; months: { "1": PriceEntry[]; … "12": PriceEntry[] } }` — 작년 월별 미니 스냅샷.
- **씨앗형**: 영양·레시피와 동급. 상시 CI 없이 로컬 1회 수집→커밋. 갱신은 연 단위(다른 씨앗과 함께).
  KAMIS 키는 CI 시크릿(`KAMIS_CERT_KEY`/`KAMIS_CERT_ID`) 재사용, 저장소엔 안 넣는다.
- 12개월 전부 수집: 배포가 연중 아무 달에나 돌아 다가오는 대상 달이 매달 바뀌므로 미래 방지.

### `src/picks.ts` (순수 — "무엇을 고르나")

- **신규 `comingPriceView(profile, entries): PriceView | null`**: 기존 `matchEntry`(itemName/kindName)로
  대상월 엔트리를 찾고, 그 `price`·`unit`만 취해 작년-기준 `PriceView`를 만든다 — `comparison`은
  basis=작년(라벨 "작년"), `changeVsMonthAgoPct`=null, `baseline`은 빈(궤적 없음). 매칭 규칙은 재사용.

### `src/card.ts` (순수 — 표시 파생)

- **`ChangeView`에 케이스 추가**: `{ kind: 'basis'; basisLabel: string }`. `toChange`가 다가오는
  가격에 대해 이 값을 낸다(등락 계산 없이 provenance 라벨만).
- `toPriceCardView`는 그대로 — `spark`는 궤적 점 <2라 자연히 null, `monthAgoPct`는 null.
- **신규 `toComingCardView(profile, targetMonth, currentMonth, price, nutrition, recipes)`**:
  `whyNow`=대상월, 간트 `currentMonth`=오늘 달로 갈라 조립. 나머지는 `toCardView`와 동일.

### `src/app.ts` (순수 — 뷰 조립)

- `buildComingView(profiles, comingSeed, nutrition, recipes, now)`로 시그니처 확장.
- `comingMonths` 각 그룹의 품목을 `toComingCardView`로 풀 카드(`CardView`)로 조립.

### `src/view-types.ts`

- `ComingItem` 폐기. `ComingMonth.items: CardView[]`. `ComingView`는 유지(months·date·term).

### `src/components/`

- **`ComingCard.tsx`·`ComingCard.test.tsx` 삭제.**
- **`Coming.tsx`**: 월 섹션 안에서 `ProduceCard` 렌더(월 그룹 유지).
- **`PriceBlock.tsx`**: `change.kind==='basis'`일 때 `{basisLabel} 기준` 한 줄(칩·화살표 없음).
- **`NavIndex.tsx`**: 제목 제거·라벨 변경.
- **`routes/coming.tsx`**: 로더가 produce + coming-prices + nutrition + recipe 로드.

### `src/style.css`

- `.nav-panel-title` 제거분 정리, 링크 터치타깃/여백. 필요 시 `.price`의 basis 라벨 여백만 미세 조정
  (기존 `.compare`/`.near` 규율 재사용).

## 데이터 정책 (표면화 — CLAUDE.md 요구)

- **범위**: 작년 12개월, KAMIS 부류 3개(100·200·400)만. 기존 스냅샷과 동일 범위.
- **기본값**: 전국 평균·`상품` 등급 우선(기존 `matchEntry` 규칙 그대로).
- **결측·폴백**: 씨앗에 그 달·그 품목이 없으면 **가격 없이** 카드(메인의 무가격 카드와 동일). 지어내지 않는다.
- **표시 임계**: 등락 임계 해당 없음(등락 자체를 안 씀). "작년 기준"은 그 값이 작년 같은 달 실측임을 밝히는 provenance.
- **정직성 경계**: "작년 기준"은 "작년 그 달 실제 조사가"이지 "올해도 이 값"이 아니다 — 예고용 참고치.
  → `제품-동작-지도.md` §7·수집 정책·지렛대 지도를 이 반전에 맞게 갱신.

## 검증 (완료 게이트)

- **게이트 = `npm test` 와 `npx tsc --noEmit` 둘 다.** 픽스처 타입 유효값(`KamisRef.categoryCode` 등).
- **순수 테스트**(`tests/`): `comingPriceView`(대상월 매칭·결측 null), `toChange`의 `basis` 케이스,
  `toComingCardView`(간트 현재월=오늘·whyNow=대상월), `buildComingView`(풀 카드·가격 붙음/없음).
- **컴포넌트 테스트**(`src/components/*.test.tsx`, jsdom, `<Link>`는 `renderWithRouter`):
  `PriceBlock`의 "작년 기준" 렌더(칩 없음), `Coming` 월그룹 + `ProduceCard` 렌더·펼침, `NavIndex` 라벨·제목 제거.
- **스토리북**(`Coming.stories.tsx`): 가격있음/가격없음/절정/펼침 상태를 노브로.
- **브라우저 실측 + 사인오프**: 드로워 열고닫힘·라벨·터치타깃, coming 풀카드 펼침·간트·"작년 기준" 줄·
  무가격 카드·무JS 폴백. 스크린샷 사인오프.

## 결정 기록

- **§7 반전.** 지도 §7은 "coming 페이지 가격·영양·레시피 안 씀"이었다. 사용자 요청으로 **셋 다 붙인다** —
  영양·레시피는 씨앗이라 계절 무관하게 이미 가능했고, 가격만 작년 씨앗을 새로 들인다. 지도를 함께 갱신.
- **새 `preview` 필드 폐기 → 기존 `PriceCardView` 재사용.** 브레인스토밍 중 별도 preview 객체를
  제안했으나, 필드가 전부 이미 있어 군더더기 — `now`=작년가격·`unit` 그대로로 쓰고, "작년 기준"만
  `ChangeView` 유니온 한 케이스로 표현한다(새 인터페이스 대신 기존 유니온 확장).
- **가격은 예고, 등락은 없음.** 미래 품목엔 "지금 값"·궤적이 없어 등락 칩·스파크라인을 뺀다 —
  값어치 비교(평년→작년→지난달)는 메인의 정렬·표시 축이고, coming은 단일 참고치다.

## 범위 밖 (하지 않는다 — YAGNI)

- **작년 전체 baseline·스파크 궤적을 coming 카드에.** 단일 작년값만. 궤적을 그리려면 여러 달 씨앗이 필요 — 스코프 밖.
- **메인 페이지 `<h1>` 문구 변경.** 드로워 라벨만 손댄다.
- **coming 가격의 상시 CI 갱신.** 씨앗형 유지(연 단위 로컬 재수집). 가격 cron은 메인 스냅샷만.
- **지역별·등급별 다가오는 가격.** 전국 평균·상품 등급 그대로.
