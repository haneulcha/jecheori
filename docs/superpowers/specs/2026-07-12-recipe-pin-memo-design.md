# 레시피 표시 재설계 — 핀 메모 설계

> 2026-07-12 · 브레인스토밍 산출물
> 관련: `docs/superpowers/specs/2026-07-11-recipe-grounding-slice-design.md`(데이터·파이프라인 원본),
> `docs/superpowers/specs/2026-07-11-fridge-memo-card-design.md`(냉장고 메모 카드),
> `DESIGN.md`(팔레트·규율·톤), `CONTEXT.md`(도메인·심)

## 배경

레시피 grounding 슬라이스는 데이터(수집→`recipes.json`→로더→`recipe.ts`)와 표시를 함께
붙였다. 표시는 **카드 진입점(단일 "레시피 N개" 버튼) → 하단 바텀시트**였는데, 두 문제가 있다:

1. **바텀시트가 바텀시트답지 않다.** 슬라이드업 모션도, 그랩 핸들도 없어 하단에 붙은 모달로
   읽힌다.
2. **앱 감성과 겉돈다.** 바텀시트는 `box-shadow`·`border-radius: 1rem`을 쓰는데, DESIGN.md는
   그림자 금지(카드 부양 예외)·crisp 0.2rem 모서리("둥근 타일이 아니라 메모 낱장")를 규율로
   삼는다. iOS 관용구가 보태니컬 스케치북/냉장고-메모 위에 얹힌 이물감.

이 문서는 **데이터 계층을 그대로 두고 표시만** 재설계한다. 냉장고-메모 은유에 맞춰
진입점을 레시피별 칩으로, 상세를 **카드 위에 핀처럼 꽂히는 메모 한 장**으로 바꾼다.

## 범위

- **바뀜:** `src/components/` 표시 컴포넌트, `src/style.css` 관련 규칙, `DESIGN.md` 결정 기록.
- **안 바뀜:** `recipe.ts`(`RecipeView`·`matchRecipes`·`recipeView`), `card.ts`의 `CardView.recipes`,
  `app.ts`, 로더, `recipes.json`·`produce.json`. 표시에 필요한 데이터(`name`·`ingredients`·`steps[]`)는
  이미 `card.recipes: RecipeView | null`에 다 있다.

## 원칙 (유지)

- 텍스트만(사진 없음). 담백한 한국어, 이커머스 화법 금지. 출처는 페이지 하단 한 줄로 유지
  (`hasRecipes` — 메모마다 반복하지 않는다).
- 텍스트·글리프는 오직 쪽빛(`--ink`). 웜 컬러(계절 `--tint` 등)는 배경·칩 채움으로만.
- 순수 로직은 `recipe.ts`, 표시는 `components`. 컴포넌트에 비즈니스 로직 없음.

## 진입점 — 레시피별 칩, 횡스크롤

단일 "레시피 N개" 버튼을 **레시피마다 칩 하나**로 쪼갠다. 칩은 요리명을 달고, 한 줄에
가로로 흐르며 넘치면 **횡스크롤**된다.

- 위치: 카드 펼침 영역(`.open`) 안, 기존 버튼 자리. 위에 `레시피 N개` 소제목(`.label`) 유지.
- 시각: **지금 버튼 디자인 유지** — 점선 테두리(`--line`), 쪽빛 글자, 배경 없음, 라운드 0.4rem.
  hover 시 테두리 쪽빛. 열려 있는(현재 메모의) 칩은 **활성**: 실선 쪽빛 테두리 + `--tint` 채움.
- 컨테이너: `display: flex; gap; overflow-x: auto`. 칩은 `flex: 0 0 auto; white-space: nowrap`.
- 상호작용: 칩 탭 → 그 레시피 메모가 열린다. **이미 열린 칩을 다시 탭 → 닫힌다**(토글).

## 상세 — 카드 위 핀 메모 한 장

칩을 누르면 **카드 위에 메모가 한 장** 오버레이로 꽂힌다. 바텀시트(전면 백드롭) 아님 —
해당 카드 영역 위에만 얹히는, 압정으로 꽂은 종이 낱장.

### 레이아웃·시각
- 카드(`.card`, 이미 `position: relative`) 안에 `.memo-layer`(절대 위치 `inset: 0`,
  `pointer-events: none`)를 두고, 그 안에 `.memo` 한 장을 절대 위치로 띄운다. 메모만
  `pointer-events: auto` — 빈 레이어 영역 클릭은 카드로 통과한다.
- 메모: 가로 중앙(`left: 50%; translateX(-50%)`), 카드 상단에서 살짝 내려(`top: 12px`),
  아주 옅게 기움(`rotate(-0.7deg)` — 핀으로 꽂은 낱장의 온기). 폭 `min(21rem, 94%)`.
  좌우 여백을 넉넉히 둬 `‹ ›` 자리를 만든다(대략 `padding: 1.35rem 2.5rem 1rem`).
- 종이: 살짝 따뜻한 오프화이트(`--memo: #FFFCF3`) — 순백 카드와 구분되는 "낱장".
  테두리 1px `--line`, 모서리 crisp(0.15rem).
- 내용: 요리명(`h3`, 가운데) · 재료 한 줄(`.ing`, `--muted`) · 조리단계(`ol`,
  본문색) · 하단 위치표시(`.count`, 예 `2 / 5`, `--muted`). 단계가 길면 `ol`이
  메모 안에서 세로 스크롤(`max-height` + `overflow-y: auto`) — 메모 자체는 안 커진다.

### 압정(닫기)
- 메모 위 모서리 가운데에 **압정**을 꽂는다 = 닫기 버튼(`.pin`, `aria-label="레시피 떼기"`).
- 시각: 러스트(`--rise`) **단색** 원 + 작은 흰 하이라이트 점(`::after`). **그라데이션 안 씀**
  (DESIGN.md 그라데이션 금지 준수). 압정은 글자가 아닌 장식 오브젝트라 웜/러스트 허용
  (마스킹테이프 완화와 같은 결).

### `‹ ›` 레시피 넘김
- 메모 좌·우 여백에 원형 넘김 버튼(`.nav-prev`/`.nav-next`, 쪽빛 테두리·`--card` 배경·
  쪽빛 `‹`/`›` 글리프). 세로 가운데 정렬.
- **clamp**: 첫 레시피에서 `‹` 비활성, 마지막에서 `›` 비활성(`disabled`, 저채도). 순환 없음.
- 넘기면 메모 내용이 그 레시피로 교체되고, **아래 칩의 활성 상태도 동기화**된다(활성 칩을
  `scrollIntoView`로 보이게). 위치표시(`n / N`)도 갱신.

### 열기·닫기·포커스
- 열기: 칩 탭 → 메모 등장, 포커스를 메모로 이동(압정 또는 메모 컨테이너).
- 닫기: **압정 클릭 · Esc · 같은 칩 재탭** 셋 중 하나. 백드롭 없음(전면 모달 아님)이라
  바깥 클릭으로는 닫지 않는다. 닫으면 포커스를 마지막 활성 칩으로 되돌린다.
- 카드(`<details>`)가 접히면 열린 레시피 상태를 초기화한다(`onToggle` → 닫힘이면 `current=null`).
- 메모는 **비모달**(`aria-modal` 아님). 접근명은 요리명. 칩은 트리거로 `aria-pressed`·
  `aria-controls`로 메모와 연결.

### 모션
- 메모 등장에 짧은 페이드+살짝 떠오름(`pin-in`, ~0.22s). `prefers-reduced-motion: reduce`면
  끈다. DESIGN.md의 "모션은 카드 펼침 하나"에 **메모 등장**을 한 개 더한다(문서 결정 기록에 명시).

## 컴포넌트 구조

상태(어느 레시피가 열렸나)는 `ProduceCard`가 쥔다 — 칩(트리거)은 `.open` 안에, 메모
오버레이는 카드 레이어에 있어 DOM 위치가 달라서다(포털 대신 상태를 위로 올린다).

- **`ProduceCard`** — `current: number | null` 상태. `.open` 안에 `RecipeChips`를,
  카드 자식으로 `.memo-layer` + `RecipeMemo`(열렸을 때만)를 렌더. `<details onToggle>`로
  접힘 시 `current=null`.
- **`RecipeChips`** — props `{ recipes: RecipeView, current: number | null, onSelect(i) }`.
  칩 횡스크롤 행만 그린다(표시 전용). 활성 칩 `aria-pressed`.
- **`RecipeMemo`** — props `{ recipes: RecipeView, index: number, onClose(), onStep(delta) }`.
  메모 한 장(요리명·재료·단계·`n / N`) + 압정 + `‹ ›`(clamp). Esc→`onClose`.
- **`RecipeSheet.tsx` 삭제**(바텀시트 대체).

## 스타일 (`src/style.css`)

- 제거: `.sheet-backdrop`, `.sheet`, `.sheet-close`, `.sheet .recipe*`.
- 유지·개명: 기존 `.recipe-open` 버튼 룩(점선·쪽빛)을 칩(`.chip-btn`)으로 재사용.
- 추가: `.chips`(횡스크롤), `.chip-btn`(+ `[aria-pressed="true"]`), `.memo-layer`, `.memo`,
  `.pin`(+`::after`), `.nav`/`.nav-prev`/`.nav-next`(+`:disabled`), `.count`.
- 토큰 추가: `--memo: #FFFCF3`. 메모 그림자는 DESIGN.md 예외로 절제된 1단만
  (`0 12px 26px -12px rgba(43,69,134,.32)` 수준) — 부양이 "위에 꽂힘"을 전달.

## 테스트

순수 로직 변경 없음(`recipe.ts` 그대로) → 신규 순수 테스트 없음. 컴포넌트(RTL):

- `RecipeChips`: 레시피 수만큼 칩 렌더 · 활성 칩만 `aria-pressed=true` · 칩 클릭이
  `onSelect(i)` 호출 · 활성 칩 재클릭도 `onSelect(같은 i)`(부모가 토글).
- `RecipeMemo`: 요리명·재료·단계·`n / N` 렌더 · 첫/끝에서 `‹`/`›` `disabled` ·
  `‹ ›` 클릭이 `onStep(∓1)` · 압정 클릭이 `onClose` · Esc가 `onClose`.
- `ProduceCard` 통합: 초기 메모 없음 · 칩 클릭 → 메모 등장 · `‹ ›`로 메모 내용·활성
  칩 동기화 · 압정 → 메모 사라짐 · 카드 접힘 시 상태 초기화.

## DESIGN.md 결정 기록 (추가)

- 레시피 상세를 바텀시트에서 **카드 위 핀 메모 한 장**으로 바꿨다 (2026-07-12). 진입점은
  레시피별 칩(횡스크롤), 상세는 압정으로 꽂힌 낱장 + `‹ ›` 넘김(clamp). 냉장고-메모 은유의
  연장. 이로써 **그림자**(절제된 1단, 메모 부양)와 **모션**(메모 등장)에 각각 예외를 하나씩
  더 연다 — 마스킹테이프 완화(2026-07-11)와 같은 결의, 은유를 눈에 보이게 하는 최소 예외.
  압정은 단색(그라데이션 금지 유지).

## 미해결 / 다음 사이클

- 실 기기 브라우저 실측(핀 메모 오버레이·`‹ ›`·횡스크롤)은 구현 후 확인 — `[[verify-ui-in-browser]]`.
