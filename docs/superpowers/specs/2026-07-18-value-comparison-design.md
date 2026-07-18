# 값어치 비교(평년 대비) — 설계

*`feat/list-polish`(PR #13) 위에 스택. 데이터 파이프라인 변경 포함.
근거: [제품-동작-지도](../../제품-동작-지도.md) 수집 정책, [CLAUDE.md](../../../CLAUDE.md) 데이터 정책, [DESIGN.md](../../DESIGN.md).*

작성: 2026-07-18. 폴리시 라운드에서 "전부 지난달 대비네?"를 계기로 카드 머리기사의 **축을 바꾼다**.

## 왜 (축의 전환)

지금까지 카드의 비교는 **변화 축**(지난달 대비 등락)이었다. 브레인스토밍에서 사용자가 근본을 되짚었다 —
보여주고 싶은 게 "**하락폭이 큰 품목**"인가 "**이맘때 싸게 먹을 수 있는 품목**"인가. 후자(값어치)가
h1 "이 계절을 맛보는 가장 **알뜰한** 방법", 그리고 북극성 "창이지 거울"(세일 리스트가 아니라 계절 달력)에
더 맞다. **변화(하락)는 세일 화법에 가깝고, 값어치는 계절이 하는 말이다.** 그래서:

- **머리기사·기본 정렬 = 값어치**(지금 값이 평소 이맘때보다 싼가).
- **하락 추세는 곁들임** — 펼침 그래프의 최근 궤적으로 드러낸다(접힌 카드에 별도 줄 없음).

### 값어치의 정직한 정의 (한계 표면화)

"값어치 = **평년 대비**"로 잡는다 — KAMIS `dpr7`(평년: 그 날짜의 역대 평균가). 이는 "지금 값이 **예년
이맘때 정상가보다** 싼가"를 말한다. **주의: 이는 "이 품목의 연중(1년 중) 최저 철"이 아니다.** 진짜 연중
최저는 품목의 12개월 가격 곡선이 필요한데 KAMIS 시점 비교값엔 없고, 월별 이력을 축적해야 한다(범위 밖).
평년 대비는 그 실용적 근사 — "이맘때치고 싸다"까지 정직하게 말하고, "연중 제일 싼 철"이라고 과장하지 않는다.
(제철/절정은 `produce.json`의 `peakMonths`가 이미 편집 지식으로 표시 중 — 별개 축.)

## 결정 (브레인스토밍 확정)

1. **머리기사 = 평년 대비, 폴백 사슬.** 비교 한 줄이 아래 순서로 기준을 고른다(첫 non-null):
   `평년(dpr7) → 작년(dpr6) → 지난달(dpr5) → (다 없으면) 비교 줄 없이 가격만`.
   라벨이 그에 따라 "평년 대비 / 작년 대비 / 지난달 대비"로 바뀐다.
2. **카드 레이아웃 불변.** 폴리시 라운드의 가격 블록(라벨 + ↓/↑ 칩 → 큰 숫자 → 단위) **그대로**.
   바뀌는 건 그 한 줄의 **라벨·값**뿐. 방향: 기준보다 **아래 = ↓(쪽빛, 쌈=좋음)**, 위 = ↑(러스트),
   ±1% = "{기준}과 비슷".
3. **정렬·필터는 지난달 축 그대로 (표시와 분리).** 값어치 폴백 사슬은 카드마다 기준이 달라(평년/작년/
   지난달) **% 가 사과 대 오렌지**가 된다 — 그걸로 줄 세우면 거짓 순서다. 그래서 **정렬·필터는 공통 기준인
   지난달(monthAgo)로 유지**해 사과 대 사과를 지킨다(#12/#13 그대로).
   - **기본 정렬 = 지난달 대비 하락 큰 순.** 옵션도 그대로: 하락 큰 순 / 이름 / 가격 낮은 순.
   - **의도된 축 분리**: 목록 순서 = "무엇이 최근(지난달) 움직였나", 카드 머리기사 = "값어치 있나(평년)".
     그래서 지난달 −5%지만 "평년보다 +3% 비싸요"인 카드가 상단에 올 수 있다(브레인스토밍에서 사용자 확인).
4. **필터 "가격 하락" 유지 (지난달 기준).** 정렬과 같은 축이라 라벨을 안 바꾼다. 필터 셋은 #13 그대로:
   과일 · 채소 · 가격 하락 · 한창 제철 · 가격 있음.
5. **펼침 그래프 재설계.** 기존 3점(작년·1달·지금) → **최근 4점 궤적(1달·2주·1주·지금) + 평년 점선 기준선
   + 각주("평년 X원 · 작년 이맘때 Y원")**. 하락 추세(곁들임)가 여기서 드러난다.
6. **데이터 수집 확장.** `parse-kamis`가 `dpr3(1주)·dpr4(2주)·dpr7(평년)`를 baseline에 추가 저장.
   `schemaVersion` 2→3. 가격은 매일 CI cron(`update-prices.yml`)이라 새 필드가 앞으로 자동 유입.
   기존 커밋 스냅샷(schema 2)엔 없으니 **다음 CI 실행이 재수집** — 그 사이 옛 스냅샷은 폴백(1번)으로 안전.

## 데이터 (types.ts)

`Baseline`을 확장(전부 `number | null`, KAMIS 라벨 매핑은 `parse-kamis` 주석의 dpr 표 유지):

```ts
export interface Baseline {
  weekAgo: number | null      // dpr3 (신규)
  twoWeeksAgo: number | null  // dpr4 (신규)
  monthAgo: number | null     // dpr5
  yearAgo: number | null      // dpr6
  normalYear: number | null   // dpr7 평년 (신규) — 그 날짜의 역대 평균가
}
```

`PriceSnapshot.schemaVersion` 2→3. `prices-snapshot.test.ts`·픽스처(`kamis-daily-200.json`은 이미
dpr1~7 보유) 반영.

## 로직 (picks.ts)

가격 뷰가 **해결된 값어치 비교**를 담는다:

```ts
export type CompareBasis = 'normalYear' | 'yearAgo' | 'monthAgo'
export interface ValueComparison {
  basis: CompareBasis
  basisLabel: string   // '평년' | '작년' | '지난달'
  pct: number          // (now - base)/base*100, 음수 = 기준보다 쌈
}

/** 평년 → 작년 → 지난달 순으로 첫 non-null 기준을 골라 비교. 다 없으면 null. */
export function valueComparison(price: number, b: Baseline): ValueComparison | null
```

`PriceView`가 **둘 다** 싣는다 — 표시용 `comparison`과 정렬·필터용 지난달 변화:

```ts
export interface PriceView {
  price: number
  unit: Unit
  comparison: ValueComparison | null   // 표시 머리기사 (평년 폴백)
  changeVsMonthAgoPct: number | null   // 정렬·필터용 (지난달 공통 축, 기존 유지)
  baseline: Baseline                   // 그래프용
}
```

축 분리의 근거는 결정 3 참조 — 표시는 값어치(폴백), 정렬·필터는 지난달(공통 기준).

## 표시 파생 (card.ts)

`ChangeView`가 기준 라벨을 실어 뷰가 못 빠뜨리게:

```ts
export type ChangeView =
  | { kind: 'fall'; pct: number; basisLabel: string }   // 기준보다 쌈 (↓, 쪽빛)
  | { kind: 'rise'; pct: number; basisLabel: string }   // 기준보다 비쌈 (↑, 러스트)
  | { kind: 'similar'; basisLabel: string }             // ±1%
  | null                                                // 비교 기준 없음 → 줄 없음
```

`toChange(comparison)`: `|pct| < 1` → similar; `pct < 0` → fall; 아니면 rise. `basisLabel` 전달.
이 `ChangeView`는 **표시 전용**(평년 폴백). `PriceCardView`는 정렬·필터용 `monthAgoPct: number | null`
(= `changeVsMonthAgoPct`)도 별도로 싣는다 — cardlist가 이걸로 줄 세우고 거른다(지난달 공통 축).

**스파크**를 최근 궤적으로:

```ts
export interface SparkView {
  points: { label: string; value: number }[]  // [1달,2주,1주,지금] 중 존재하는 것
  levels: number[]                             // 각 점 상대위치 0~1 (sparklineLevels 재사용)
  normalYear: number | null                    // 평년 기준선
  yearAgo: number | null                       // 작년 각주
}
```

`toSpark(price, baseline)`: 존재하는 최근 점(monthAgo·twoWeeksAgo·weekAgo·now)을 시간순으로. 점이
2개 미만이면 `null`(그래프 없음). `normalYear`·`yearAgo`는 있으면 실어 기준선·각주로.

## 컴포넌트

- **`PriceBlock.tsx`** — 하드코딩 "지난달 대비"를 `change.basisLabel`로. `{basisLabel} 대비` + 칩,
  similar이면 `{basisLabel}과 비슷`. **그 외 레이아웃 불변.**
- **`Sparkline.tsx`** — 4점 궤적 폴리라인 + 평년 점선 기준선(+"평년" 라벨) + 하단 각주 줄(평년/작년 원).
  x는 등간격(기존 처리 계승 — 스케치이지 정밀 시간축 아님, 주석에 명시).
- **`SortControl.tsx`** — **변경 없음** (하락 큰 순 / 이름 / 가격 낮은 순, 기본 하락 큰 순).
- **`FilterBar.tsx`** — **변경 없음** (가격 하락 유지, 지난달 기준).
- **`cardlist.ts`** — **`SortMode`·`Filter` 변경 없음**(`'drop'` 유지). `signedChange`가 이제
  `card.price?.change`(값어치)가 아니라 **`card.price?.monthAgoPct`**(지난달)를 읽도록 바꾼다 —
  정렬·필터의 공통 축을 지난달로 고정. `filterCards`의 `drop` 술어도 `monthAgoPct < 0`(지난달 하락) 기준.
  (표시용 `change`는 값어치라 정렬·필터가 그걸 쓰면 축이 섞인다 — 반드시 `monthAgoPct`로.)
- **`app.ts` `buildAppView`** — 기본 정렬 `sortCards(cards, 'drop')` **그대로**(지난달 하락 큰 순).

## 수집 (scripts/lib/parse-kamis.mjs)

`baseline`에 세 필드 추가(dpr 표는 그대로):

```js
baseline: {
  weekAgo: parseNum(it.dpr3),
  twoWeeksAgo: parseNum(it.dpr4),
  monthAgo: parseNum(it.dpr5),
  yearAgo: parseNum(it.dpr6),
  normalYear: parseNum(it.dpr7),
}
```

`schemaVersion: 3`. 로컬 KAMIS 호출 불가(키 없음) → **재수집은 CI**(`update-prices.yml`)가 담당.
커밋된 `prices.json`은 CI가 갱신하기 전까지 schema 2 — 앱은 새 필드 부재를 `null`로 읽어 폴백(로직 1번).

## 제품-동작-지도 갱신

- 5·6절(가격 표시)에 **값어치(평년 대비) 머리기사 + 폴백 사슬**. **축 분리** 명시 — 표시는 값어치,
  정렬·필터는 지난달(공통 기준).
- 기준선을 2종(한달·작년)에서 **5종(1주·2주·1달·작년·평년)** 저장으로. 표시엔 평년(머리기사)·최근 3점+
  작년/평년(그래프)이, 정렬·필터엔 지난달이 쓰임.
- 지렛대 지도: 값어치 기준 = `picks.valueComparison`(표시), 정렬 = `cardlist.sortCards('drop')`(지난달),
  그래프 = `card.toSpark` + `Sparkline`.
- **"평년 대비 ≠ 연중 최저 철"** 한계 한 줄 명시(위 정의).

## 검증 (완료 게이트)

- **순수 테스트**:
  - `valueComparison` (`tests/picks.test.ts`) — 폴백 사슬(평년→작년→지난달→null), pct 부호, 결측.
  - `toChange`/`toSpark` (`tests/card.test.ts`) — basisLabel 전달, similar 임계, 4점 궤적/점 부족 시 null,
    normalYear·yearAgo 실림.
  - `signedChange`가 `monthAgoPct`를 읽는지 + `sortCards('drop')`(지난달 순)·`filterCards('drop')`
    (지난달 하락)가 **표시 값어치와 무관하게** 동작하는지 (`tests/cardlist.test.ts`).
  - `parse-kamis` (`tests/parse-kamis.test.js`) — dpr3/4/7 매핑, schema 3.
- **컴포넌트 테스트**: `PriceBlock`(평년/작년/지난달 라벨·비슷·무기준), `Sparkline`(4점+평년선+각주).
  `SortControl`·`FilterBar`는 변경 없음 — 기존 테스트가 회귀 없이 통과하는지 확인. `App`은 기본 정렬이
  지난달 하락 순 유지인지.
- **스토리북**: 값어치 상태(평년 쌈·평년 비쌈·작년 폴백·무비교) + 그래프 상태.
- **브라우저 실측 + 사인오프**(컨트롤러): 값어치 머리기사 4상태, 정렬 값어치 순, 필터 평년보다 쌈,
  펼침 그래프(4점·평년 점선·각주), 색 규율(쪽빛만). 레이아웃 불변 확인.
- **게이트 = `npm test` 와 `npx tsc --noEmit` 둘 다.** 픽스처·스키마 타입 반영.

## 범위 밖 (하지 않는다)

- **연중 최저 철(12개월 곡선).** 월별 가격 이력 축적이 필요 — 별도·큰 작업. 이번은 평년 대비 근사.
- **1일 전(dpr2) 사용.** 일일 노이즈라 최근 하락 후보에서 제외(1주·2주·1달만).
- **값어치 강조에 웜/초록 색.** 색 규율(쪽빛만) 유지 — 값어치는 문구·부호로 전달.
- **값어치 기준 정렬.** 폴백으로 기준이 섞여 사과 대 오렌지 — 정렬은 지난달 공통 축 유지(결정 3).
- **연중 최저 철 정렬/필터.** 위와 같은 이유 + 데이터 없음(범위 밖).
