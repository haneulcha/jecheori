# 품목 도메인 재분해 설계 — Produce / ProduceProfile / SourceRef / PriceMatch

작성 2026-07-14. A단계(`2026-07-14-price-domain-modeling.md`) 이후를 전제한다.

## 배경

`ProduceProfile` 한 레코드에 **바뀌는 속도도, 바꾸는 사람도 다른 네 가지**가 섞여 있다.

| 지금 한 레코드에 있는 것 | 실제로는 | 누가 바꾸나 | 얼마나 자주 |
| --- | --- | --- | --- |
| `id` `name` `emoji` `category` `seasonMonths` `peakMonths` | 세상에 대한 사실 | 거의 아무도 | 거의 안 바뀜 |
| `whyNow` `howToPick` `howToStore` `howToUse` | **이 앱의 편집 콘텐츠** | 편집자 | 톤·시즌마다 |
| `kamis` `foodDb` `recipeRef` | 외부 소스와의 **조인 키** | 데이터 담당 | 외부 API가 바뀔 때 |

배추가 11~2월 제철인 건 우리 앱과 무관한 사실이다. "속이 꽉 차고 묵직한 걸 고르세요"는 **우리가 쓴 문장**이다. 둘이 같은 레코드에 있으면 원장을 재사용하려는 순간 우리 화법이 딸려 간다.

그리고 **네 번째 칸이 비어 있다.** 프로필과 스냅샷을 **잇는 것**이 모델에 없다. 지금은 `matchEntry`가 화면 그릴 때마다 런타임에 문자열로 조인을 다시 하고, 그 결과를 아무 데도 남기지 않는다. 매 요청마다 `LIKE`로 조인하고 결과를 버리는 셈이다.

### 그래서 실제로 새는 것들

- **`CardView.kind`가 매칭된 품종이 아니라 프로필이 요청한 패턴을 보여준다** (`card.ts:117` — `profile.kamis?.kindName`). 상추를 요청해 적상추가 매칭돼도 카드엔 "상추"라고 쓴다.
- **상품이 없어 중품으로 폴백해도 화면은 조용하다** (`picks.ts:29` — `?? byKind[0]`).
- **`PickResult.price: null`이 여섯 가지를 뜻한다**: 참조 없음 / 스냅샷 없음 / 이름 안 맞음 / 품종 안 맞음 / 그날 조사 없음 / 제철 아님. 전부 "가격 없음"으로 뭉개져 매칭 버그가 조용히 산다.
- **`hasDrops`가 "데이터 없음"을 "안 내렸음"으로 단언한다** (`picks.ts:83`). 가격이 하나도 없는 달에 "이번 달은 내려온 게 없어요"라고 말한다.
- **`report-coverage.mjs`가 `matchEntry`의 규칙을 손으로 재구현하고 있다** (`:9-20`). 두 벌의 매칭 규칙이 각자 표류한다. 실제로 이미 한 번 어긋나서 리포트가 거짓 통과를 냈다.

## 원칙 (유지)

- 공개 페이지는 경량·무추적·런타임 외부요청 없음. 가격은 CI 커밋 JSON.
- 순수 로직은 `picks`/`card`/`app`에, 표시는 `components`에.
- 외부 소스 매칭은 코드가 아니라 **이름 문자열**로 한다.
- 사용자 문구는 한국어, 담백한 톤. 이커머스 화법 금지.

## 범위

**이 단계에서 한다**

1. `ProduceProfile` → `Produce` + `ProduceProfile` + `SourceRef` 셋으로 **타입** 분해
2. `PriceEntry` → `KamisQuote` (이름만; A단계에서 모양은 이미 확정)
3. **`PriceMatch` 신설** — 조인의 결과를 값으로 붙잡는 판별 유니온
4. 매칭을 `src/match.ts`로 독립 (두 소비자: `picks.ts` + 커버리지 리포트)
5. `report-coverage`의 중복 매칭 규칙 **삭제** — 진짜 매처를 부른다
6. `hasDrops`를 "데이터 없음"과 "안 내렸음"으로 가른다
7. `kindName` 한 이름 두 개념 해소, `rank: string` → `Grade` 유니온
8. **노트를 `notes: Note[]`로** — 카드 레이아웃이 도메인 필드 개수를 정하지 않게
9. **`whyNow` 키를 `Month` 유니온으로** — JSON의 문자열 키가 타입으로 새어나온 것

### 이미 끝난 것 (A단계 리뷰에서 선반영, `b735bf3`)

앵커링 리뷰에서 나온 넷은 A단계 브랜치에서 이미 고쳤다 — 화면을 안 바꾸고 즉시 갚아졌기 때문:

- `Measure`를 KAMIS 글자가 아니라 **무게/개수**로 (개당값 규칙이 응답의 우연에 붙어 있었다)
- `sparklineGeometry` → `sparklineLevels`, **픽셀은 컴포넌트로**
- `staleDays >= 3` 임계를 JSX에서 꺼내 **`Freshness` 유니온**으로
- 죽은 `itemCode` 삭제

**이 단계에서 안 한다**

- 데이터 **파일** 분해 (아래 "파일은 왜 안 가르나" 참고)
- 매칭된 품종·등급을 **화면에 드러내는 것** — 사용자향 시각 변경이라 시안·사인오프가 먼저 (아래 "화면에 새어나오는 것" 참고)
- 서버·계정·개인화

## 이름

**`Product`가 아니라 `Produce`다.** 셋 다 이유가 있다.

1. `Product`는 이커머스 어휘다. `CLAUDE.md`가 "이커머스가 아니라 계절 달력에 가깝다"고 못박아 뒀다.
2. 우리는 이미 **"제품"을 이 앱을 가리키는 말로** 쓰고 있다. 코드에 `Product`가 있으면 "제품(앱)"과 "품목"이 같은 단어를 쓴다.
3. `Produce`(농산물)가 도메인 그대로다. 기존 `produce.json` · `ProduceProfile`과도 이어진다.

## 도메인 모델

```
Produce          id · name · emoji · category · seasonMonths · peakMonths
                 └ 세상에 대한 사실. 이 앱을 몰라야 한다. 외부 소스도 몰라야 한다.

ProduceProfile   produceId · whyNow · notes[]
                 └ 이 앱의 편집 콘텐츠. Produce를 알지만, Produce는 이걸 모른다.
                   노트는 배열이다 — 카드가 세 줄을 그린다고 도메인 필드가 셋일 이유는 없다.

SourceRef        produceId · kamis? · foodDb? · recipeRef?
                 └ 외부 소스와의 조인 키. KAMIS·식약처를 아는 유일한 도메인 타입.

KamisQuote       itemName · variety · grade · unit · price · baseline
                 └ KAMIS 좌표계의 관측 한 줄. **Produce를 모른다.**

PriceSnapshot    surveyedOn · fetchedAt · schemaVersion · KamisQuote[]
                 └ 하나의 조사일. (A단계에서 확정)

PriceMatch       Produce ↔ KamisQuote 조인의 결과. 성공이든 실패든 "왜"가 값으로 남는다.
```

### 왜 `Price`가 아니라 `KamisQuote`인가

처음엔 `Price`라고 부르려 했다. 그런데 이 타입은 **"배추의 가격"이 아니라 "남의 조사표의 한 행"**이다. `itemName`·`variety`·`grade`가 전부 KAMIS의 좌표계고, 두 번째 가격 소스가 오면 이 모양은 깨진다.

지금 소스가 하나라 추상화(`PriceSource` 인터페이스 같은 것)는 YAGNI다 — **어댑터 하나는 가설상의 심(seam)**이다. 하지만 **이름은 지금 정직해야 한다.** `Price`라고 부르면 다음 사람이 이걸 도메인의 가격이라 믿고 여기저기 들고 다닌다. `KamisQuote`라고 부르면 "이건 KAMIS 것"이라는 게 호출부마다 보인다.

`PriceMatch`가 그걸 도메인 쪽으로 번역하는 자리다.

의존 방향: `Produce ← ProduceProfile`, `Produce ← SourceRef`, `Produce ← PriceMatch → KamisQuote`.
**`Produce`는 아무것도 모른다.** 이게 앵커링을 푸는 축이다.

### 타입

```ts
export type Category = 'fruit' | 'vegetable'

/** 세상에 대한 사실. 이 앱도, KAMIS도 모른다. */
export interface Produce {
  id: string
  name: string
  emoji: string
  category: Category
  /** 제철 월 (1~12) */
  seasonMonths: number[]
  /** 절정 월 — seasonMonths의 부분집합 */
  peakMonths: number[]
}

/** 이 앱의 편집 콘텐츠. 다른 제품이 같은 Produce를 써도 이건 다를 수 있다. */
export interface ProduceProfile {
  produceId: string
  /** 월별 "왜 지금인지" 한 줄 */
  whyNow: WhyNow
  notes: Note[]
}

/** 키가 "1"~"12" | "default"인 Record<string,string>이었다. JSON 모양이 타입으로
 *  새어나온 것 — "13"도, 오타 "defualt"도 타입이 못 잡았다. */
export type Month = 1|2|3|4|5|6|7|8|9|10|11|12
export interface WhyNow {
  byMonth: Partial<Record<Month, string>>
  fallback: string
}

/** 장보기 노트 한 장. **개수가 고정이 아니다.** */
export interface Note {
  kind: NoteKind
  text: string
}
export type NoteKind = 'pick' | 'store' | 'use'

/** 외부 소스와의 조인 키. 없으면 그 소스가 그 품목을 다루지 않는다는 뜻 —
 *  "아직 못 맞춘 것"이 아니라 "원래 없는 것". */
export interface SourceRef {
  produceId: string
  kamis?: KamisRef
  foodDb?: FoodDbRef
  recipeRef?: RecipeRef
}

export interface KamisRef {
  categoryCode: '100' | '200' | '400'
  /** KAMIS item_name과 정확 일치 */
  itemName: string
  /** 선호 품종을 고르는 **질의 패턴** — KAMIS 응답의 품종명에 부분 일치 (예: "샤인").
   *  응답의 실제 품종값(KamisQuote.variety)과 다른 개념이다. 그래서 이름도 다르다. */
  varietyPattern?: string
}
```

**`kindName`이 두 개념에 한 이름을 쓰던 걸 여기서 끊는다.** 질의 쪽은 `varietyPattern`(패턴), 응답 쪽은 `variety`(값). 지금은 둘 다 `kindName`이라 `card.ts`가 패턴을 값인 양 화면에 찍고 있다.

### 노트는 왜 배열인가 — 화면이 도메인의 모양을 정하고 있었다

지금 `howToPick` / `howToStore` / `howToUse`가 정확히 **셋**인 이유는, `Note.tsx`가 "고르는 법 / 보관 / 쓰임" 세 줄을 그리기 때문이다. **카드 레이아웃이 도메인 레코드의 필드 개수를 정하고 있다.** 카드에 네 번째 줄이 생기면 도메인 타입이 바뀐다.

그리고 `card.ts`의 `NoteView { pick, store, use }`는 그 셋을 **1:1로 베낀 얕은 통과**다 — 삭제 테스트를 해보면 복잡도가 재등장하지 않고 그냥 이름만 바뀐다. 지워도 되는 타입이다.

`notes: Note[]`로 바꾸면 편집 콘텐츠가 **자기 모양을 스스로 갖는다.** 카드는 그중 자기가 그릴 것을 고른다. `NoteKind`는 지금 셋뿐이지만, 늘리는 데 도메인 타입 수술이 필요 없다.

이건 이 스펙이 처음 놓쳤던 지점이다 — `ProduceProfile`을 "편집 콘텐츠"라고 **이름만 옮기고 모양은 카드가 정한 채로 뒀다.** 앵커링을 반만 푼 셈이었다.

```ts
/** KAMIS 등급. 실측 결과 이 둘뿐 (2026-07-14 스냅샷 80행: 상품·중품). */
export type Grade = '상품' | '중품'

/** KAMIS 좌표계의 관측 한 줄. Produce를 모른다 —
 *  "배추의 가격"이 아니라 "남의 조사표의 한 행"이다. */
export interface KamisQuote {
  itemName: string
  /** 응답의 실제 품종명 (예: "적상추(100g)") */
  variety: string
  grade: Grade
  unit: Unit
  /** 조사일의 관측. 그날 조사가 없으면 null */
  price: number | null
  baseline: Baseline
}
```

(`Unit`·`Baseline`·`PriceSnapshot`은 A단계에서 확정. 여기선 `PriceEntry` → `KamisQuote`, `kindName` → `variety`, `rank: string` → `grade: Grade` 리네임만. `itemCode`는 A단계 리뷰에서 이미 삭제됐다.)

### PriceMatch — 이 단계의 핵심

```ts
/** Produce ↔ KamisQuote 조인의 결과. null 하나로 뭉개지 않는다. */
export type PriceMatch =
  | { kind: 'matched'; quote: KamisQuote; provenance: Provenance }
  /** SourceRef에 kamis가 없다 — KAMIS가 애초에 조사하지 않는 품목 (정상) */
  | { kind: 'unsurveyed' }
  /** 스냅샷 자체가 없다 (수집 실패·최초 배포) */
  | { kind: 'noSnapshot' }
  /** itemName이 스냅샷에 없다 — 제철이 아니거나, 이름이 틀렸다 */
  | { kind: 'itemNotFound'; wanted: string }
  /** itemName은 있는데 varietyPattern에 맞는 품종이 없다 */
  | { kind: 'varietyNotFound'; wanted: string; available: string[] }
  /** 엔트리는 있는데 그날 관측이 없다 (price === null) */
  | { kind: 'notSurveyedThatDay'; wanted: string }

/** 실제로 무엇이 골라졌는가 — 요청한 패턴이 아니라 응답의 값. */
export interface Provenance {
  /** 매칭된 KAMIS 품종명. 프로필이 요청한 패턴이 아니다. */
  variety: string
  grade: Grade
  /** 상품을 원했는데 중품으로 내려갔나 */
  gradeFellBack: boolean
}
```

**여섯 갈래가 필요한 이유는 화면이 아니라 게이트다.** 화면은 셋으로 접힌다 — 가격 있음 / 조용히 없음(`unsurveyed`) / **버그 신호**(나머지). 하지만 커버리지 리포트와 테스트는 여섯을 다 구분해야 "마늘 이름이 틀렸다"와 "옥수수는 원래 없다"를 가를 수 있다. 지금 그걸 **별도 스크립트가 손으로 재구현**하고 있는 게 문제의 뿌리다.

### 매칭 모듈

```ts
// src/match.ts
export function matchPrice(
  ref: SourceRef | undefined,
  snapshot: PriceSnapshot | null,
): PriceMatch
```

규칙은 지금과 같다 (itemName 정확일치 → varietyPattern 부분일치 → 상품 우선, 없으면 첫 행). 바뀌는 건 **실패를 삼키지 않는다**는 것뿐.

**두 소비자가 있으니 진짜 심(seam)이다:** `picks.ts`와 커버리지 리포트. 지금 후자가 규칙을 복제하고 있고, 그래서 표류했다.

### 커버리지 리포트를 테스트로

`report-coverage.mjs`(node)는 `.ts` 모듈을 임포트할 수 없어서 규칙을 복제했다. 새 의존성(`tsx`/`vite-node`)을 넣는 대신 **vitest로 옮긴다** — vitest는 TS를 그대로 임포트한다.

- `tests/coverage.test.ts` — 커밋된 `produce.json` + `prices.json`을 진짜 `matchPrice`로 돌려 분류하고, **`broken`이 0이 아니면 실패**한다.
- `npm run report:coverage` → `vitest run tests/coverage.test.ts --reporter=verbose`
- 부수효과: 커버리지가 **`npm test`에 자동 포함**된다. 따로 기억해서 돌릴 필요가 없어진다.
- 기준 달은 `new Date()`가 아니라 **`snapshot.surveyedOn`의 달**을 쓴다 — 그래야 테스트가 날짜에 흔들리지 않는다.

### hasDrops

```ts
export type DropState =
  | { kind: 'hasDrops' }
  | { kind: 'noDrops' }      // 가격은 있는데 전부 상승/보합
  | { kind: 'noPriceData' }  // 비교할 가격 자체가 없다
```

지금은 `noPriceData`를 `noDrops`로 단언해 "이번 달은 내려온 게 없어요"라고 말한다. 사실이 아니라 무지다.

## 파일은 왜 안 가르나

타입은 셋으로 가르지만 **씨앗 파일(`public/data/produce.json`)은 하나로 둔다.** 로더가 한 레코드를 셋으로 가른다.

DB로 치면 **하나의 임포트 파일 → 세 테이블**이다. 파일은 편집 포맷이고, 타입이 모델이다. 40개 품목을 손으로 고치는데 파일 셋을 오가는 건 순손해다(현재 1,172줄, 편집자는 한 명).

**나중에 파일을 가를 트리거**: 편집 콘텐츠를 CMS가 쓰기 시작하거나, 조인 키를 데이터 파이프라인이 자동 갱신하기 시작할 때. 즉 **쓰는 사람이 갈릴 때** 파일도 갈린다. 그전엔 아니다.

우리가 지금 얻는 것은 **의존 방향의 강제**다. `card.ts`가 `SourceRef`를 타입으로 못 받으면 `profile.kamis.kindName`을 화면에 찍는 일이 애초에 컴파일되지 않는다.

## 화면에 새어나오는 것 (사인오프 필요)

`Provenance`가 생기면 카드가 **처음으로 진실을 말할 수 있게 된다**. 그런데 그게 곧 화면 변경이다.

- `CardView.kind`가 `"상추"`(요청 패턴) → `"적상추(100g)"`(매칭된 값)로 바뀐다. 괄호 안 규격을 그대로 보여줄지, 벗겨낼지, 아예 안 보여줄지는 **디자인 결정**이다.
- `gradeFellBack`이면 뭐라고 말할지 — 아무 말 안 할지, 조용한 각주를 달지.
- `hasDrops`가 `noPriceData`일 때 뭐라고 쓸지 — "이번 달은 내려온 게 없어요"는 이제 못 쓴다.

**이 셋은 시안 없이 구현하지 않는다.** `CLAUDE.md`의 UI/UX 규칙대로 `impeccable` 렌즈를 열고 2~3개 시안으로 사인오프를 받는다. 그전까지 구현은 `Provenance`를 **계산해서 들고만 있고 화면엔 안 찍는다** — 그러면 이 단계는 화면을 안 바꾼다.

## 이 단계가 끝나면

- **`Produce`는 이 앱도 KAMIS도 모른다.** 원장을 재사용해도 우리 화법이 안 딸려 간다.
- `card.ts`가 `SourceRef`를 못 본다 — 요청 패턴을 화면에 찍는 버그가 컴파일되지 않는다.
- **조인의 결과가 값으로 남는다.** 왜 못 맞췄는지가 여섯 갈래로 갈리고, 커버리지 게이트가 그걸 읽는다.
- **매칭 규칙이 한 벌뿐이다.** 리포트가 진짜 매처를 부른다.
- 커버리지가 `npm test`에 들어온다 — 매칭이 깨지면 CI가 즉시 빨개진다.

## 비범위 / 열린 질문

- **`seasonMonths`가 정말 `Produce`의 속성인가?** 제철은 지역·기후에 따라 달라지는 관측이기도 하다. 지금은 상수로 다루고 `Produce`에 둔다. 지역별 제철이 들어오면 `Seasonality`로 떼야 한다.
- **`PriceMatch`를 미리 계산해 커밋할까?** DB라면 `price_match` 테이블에 조인 결과를 물질화할 것이다. 지금은 프리렌더 시점에 계산한다 — 정적 사이트라 그 시점이 곧 빌드타임이라 사실상 같다. 서버가 생기면 다시 본다.
- **`Grade`가 정말 둘뿐인가?** 2026-07-14 스냅샷 80행에서 `상품`·`중품`뿐임을 확인했다. `parse-kamis.mjs`가 **처음 보는 등급을 만나면 throw**하게 해서, 틀렸다면 조용히가 아니라 시끄럽게 틀리게 한다.
- **`foodDb`/`recipeRef`도 `PriceMatch`처럼 실패를 갈라야 하나?** 영양·레시피는 없어도 카드가 성립한다(가격과 달리 정렬 키가 아니다). 지금은 `null`로 둔다. 필요해지면 같은 패턴을 쓴다.
