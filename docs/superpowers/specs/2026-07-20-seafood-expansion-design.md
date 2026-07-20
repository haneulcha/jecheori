# 수산물 확대 설계 (Seafood Expansion)

> 상태: 승인됨 (2026-07-20). 다음 단계: writing-plans.

## 목표

제철 달력에 **수산물(KAMIS 부류 600)**을 새 카테고리로 추가한다. 이번 컷은 **가격·계절만** —
영양·레시피·다가오는-가격 씨앗은 명시적 후속. 범위는 "KAMIS 소매에 실제로 잡히는 만큼"(가격 주도).

## 왜 지금 · 왜 수산물

계절성이 이 앱의 심장인데, 수산물은 계절성이 가장 뚜렷하다(봄 주꾸미·바지락, 여름 오징어·전복,
가을 전어·고등어·꽃게, 겨울 굴·방어·과메기). 제철 달력에 이보다 잘 맞는 카테고리가 없다.
북극성("창이지 거울 아님")과도 어긋나지 않는다 — 장보기 옆에 두는 계절 달력의 자연스러운 확장이다.

## 핵심 접근: 프로브 우선 (영양 확장과 동일한 패턴)

범위가 "KAMIS 소매에 있는 만큼"이라, **부류 600을 먼저 로컬 프로브로 찍어** 실제
`item_name`·`kind_name`·**단위 표기**를 눈으로 확인한 뒤 그 위에 프로필과 단위 지원을 짠다.

- **단위를 추측하지 않는다.** (영양 확장의 "명세부터 확인" 교훈 — 백로그 `3-수산`의 마리·근은
  가정일 뿐, 프로브가 실제 표기를 확정한다: 손·팩·봉 등 예상 밖 단위가 있을 수 있다.)
- **프로브 실행 주체는 사용자(로컬, 한국 IP).** KAMIS는 해외/데이터센터 IP를 406으로 막아
  개발 머신에서 못 돈다 — 상시 수집은 서울 Lambda가, 1회 탐색은 한국 로컬이 한다(영양 때와 동일).
- 프로브 산출물(품목·단위 목록)을 보고 **범위를 최종 확정**한다. 부류 600 일일 소매가 얇으면
  (품목 적거나 단위 제각각) 그 실측에 맞춰 프로필 수를 정한다.

## 설계 결정 (표면화)

CLAUDE.md 데이터·정책 규칙에 따라, 화면에 "부재로" 나타날 선택들을 코딩 전에 못박는다.

- **범위 필터:** KAMIS 부류 `600`만 추가. 전국 평균·소매·상품 등급 기준은 기존 부류(100/200/400)와
  동일한 파이프라인을 그대로 탄다(새 정책 없음).
- **단위 정책:** 환산하지 않고 KAMIS 표기를 보존한다(앱 원칙). 근(≈600g)도 g으로 안 바꾸고 '근'
  그대로 둔다. 마리는 셀 수 있는 단위. 모르는 단위엔 `parseUnit`이 여전히 throw(조용한 오염 방지).
- **결측·폴백:** 프로필에 `kamis` 참조가 없거나 그날 조사가 없으면 무가격 카드(기존 produce 규칙 그대로,
  다른 날 값으로 안 메움).
- **영양·레시피 부재:** 수산 프로필엔 `foodDb`·`recipeRef` 없음 → 카드에 영양 줄·레시피 진입점 없음
  (기존 폴백). 후속 컷에서 어패류 영양 추가 가능(explore 도구 재활용).

## 컴포넌트별 변경

경계는 CLAUDE.md 아키텍처 지도를 따른다. 각 파일의 책임 안에서만 바꾼다.

### 1. 단위 지원 — `scripts/lib/parse-kamis.mjs` + `src/types.ts`

프로브가 밝힌 단위를 두 곳에 추가한다(환산 없음):

- `parse-kamis.mjs`
  - `MEASURES`에 실측 단위 추가. 예상: `마리: { kind: 'count', unit: '마리' }`,
    `근: { kind: 'weight', unit: '근' }`. (프로브가 손·팩 등을 내면 그 kind를 확정해 추가.)
  - `parseUnit` 정규식의 단위 그룹에 새 표기 추가. **모르는 단위엔 여전히 throw** — 안전장치 유지.
- `src/types.ts` `Measure` 유니온
  - `count` 쪽 `unit`에 `'마리'`, `weight` 쪽 `unit`에 `'근'`(+ 프로브 실측) 추가.
  - 유니온이라 `parse-kamis`가 만든 값과 타입이 tsc에서 맞는지 검증된다.

`perUnitPrice`(card.ts)는 **변경 없음** — `count` & 수량>1일 때만 개당값을 내므로 마리는
자동으로 마리당값, 근(무게)은 개당값 없음. 값어치 비교는 단위 무관 %라 그대로 동작한다.

### 2. 가격 수집 범위 — `scripts/fetch-prices.mjs` + `src/types.ts`

- `CATEGORY_CODES`: `['100', '200', '400']` → `['100', '200', '400', '600']`.
- `KamisRef.categoryCode` 유니온: `'100' | '200' | '400'` → `'100' | '200' | '400' | '600'`
  (주석의 부류 설명도 "600 수산물" 추가). 매칭은 기존대로 `item_name` 문자열.

### 3. 카테고리·필터 — `src/types.ts`·`src/view-types.ts`·`src/cardlist.ts`·`src/components/FilterBar.tsx`·`src/components/App.tsx`

- `types.ts` `Category`: `'fruit' | 'vegetable'` → `'fruit' | 'vegetable' | 'seafood'`.
- `view-types.ts` `Filter`: `'seafood'` 추가.
- `cardlist.ts` `PRED`: `seafood: (c) => c.category === 'seafood'`.
- `FilterBar.tsx` `CHIPS`: `{ key: 'seafood', label: '수산물' }` 추가(과일·채소 뒤).
- `App.tsx` 상호배타를 **3자**로 확장: 과일/채소/수산물 중 하나를 켜면 나머지 둘을 해제한다.
  (현재 fruit↔vegetable 2자 상호배타의 자연스러운 일반화.)

### 4. 프로필 작성 — `public/data/produce.json`

프로브가 밝힌 각 품목에 수기 작성:
- `id`(영문 kebab), `name`(한글), `emoji`(🐟🦑🦪🦀 등), `category: 'seafood'`.
- `kamis: { categoryCode: '600', itemName: '<KAMIS item_name 정확일치>', kindName?: '<부분일치>' }`.
- `seasonMonths`·`peakMonths`(peak ⊆ season) — 제철 도메인 지식으로 수기.
- `whyNow`(월별 "왜 지금" 한 줄 + `default`), `howToPick`·`howToStore`·`howToUse` — 담백한 톤,
  이커머스 화법 금지("사세요" ✕).
- `foodDb`·`recipeRef`는 **넣지 않는다**(이번 컷 비범위).

## 명시적 비범위 (이번 컷 제외 — 후속)

- **어패류 영양** — `explore:nutrition`에 수산 카테고리(어패류 등) 추가 + `foodDb` 참조. 도구 재활용 가능.
- **수산 레시피** — `recipeRef` 작성.
- **다가오는-가격 씨앗** — 수산 미래 제철은 당분간 무가격 예고 카드(작년 씨앗 수집은 후속).
- **파일 구조 분리** — `produce.json`이 과일·채소·수산을 계속 혼재. 구분은 `category` 필드로만.

## 검증 (완료 게이트)

- **순수 로직 테스트**(`tests/`):
  - `parse-kamis`: 새 단위(마리·근 등) 파싱 성공, **모르는 단위엔 throw 유지**.
  - `perUnitPrice`: 마리(수량>1) 개당값 성립, 근(무게) 개당값 null.
  - `cardlist`: `seafood` 필터 술어가 수산 카드만 남긴다.
- **컴포넌트 테스트**(`src/components/*.test.tsx`, jsdom):
  - `FilterBar`/`App`: 과일↔채소↔수산 3자 상호배타.
  - 수산 카드 렌더(영양·레시피 줄 없음 폴백 확인).
- **게이트: `npm test` 와 `npx tsc --noEmit` 둘 다.** 픽스처도 유효 타입값(`categoryCode:'600'`).
- **필터 UX는 브라우저 실측**(`npm run dev`) — 칩 3자 토글, 수산 카드 목록.
- 프로브 실측 후 **`docs/제품-동작-지도.md` 수집 정책 갱신**(부류 600 추가·단위 정책·비범위 명시).

## 파일 요약

| 파일 | 변경 |
|---|---|
| `scripts/probe-seafood.mjs`(신규) | 부류 600 프로브 — item/kind/단위 목록 출력 (사용자 로컬 실행) |
| `scripts/lib/parse-kamis.mjs` | `MEASURES`·`parseUnit`에 실측 단위 추가 (throw 유지) |
| `scripts/fetch-prices.mjs` | `CATEGORY_CODES`에 `'600'` |
| `src/types.ts` | `Measure` 단위·`KamisRef.categoryCode`·`Category`에 수산/600 추가 |
| `src/view-types.ts` | `Filter`에 `'seafood'` |
| `src/cardlist.ts` | `PRED.seafood` |
| `src/components/FilterBar.tsx` | "수산물" 칩 |
| `src/components/App.tsx` | 3자 상호배타 |
| `public/data/produce.json` | 수산 프로필(프로브 확정 품목) |
| `docs/제품-동작-지도.md` | 수집 정책 갱신 |

## 리스크

- **부류 600 소매가 얇을 수 있음** — 품목 적거나 단위 제각각. 프로브로 실측해 범위 확정.
- **예상 밖 단위** — 손·팩·봉 등. 프로브가 밝히면 kind를 확정해 가르치고, 그전엔 throw로 시끄럽게 실패(정상).
- **KAMIS 406(해외 IP)** — 프로브는 사용자 로컬(한국 IP)에서만. CI/개발머신 불가.
