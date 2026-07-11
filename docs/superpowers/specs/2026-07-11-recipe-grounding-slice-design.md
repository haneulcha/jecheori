# 레시피 grounding 슬라이스 설계

> 2026-07-11 · 브레인스토밍 산출물
> 관련: `docs/superpowers/specs/2026-07-11-produce-content-pipeline-design.md`(데이터원·리서치 근거),
> `docs/superpowers/plans/2026-07-11-nutrition-grounding-slice.md`(데칼코마니 원본),
> `CONTEXT.md`(도메인·심), `CLAUDE.md`(규칙·배포), `DESIGN.md`(팔레트·톤)

## 배경

영양 grounding(식약처 영양성분DB → `nutrition.json` → 카드 스탯)이 자리를 잡았다. 다음은
**레시피**다. `produce.json`의 `howToUse`는 지금 수기 한 줄인데, 이걸 식약처 조리식품
레시피 DB(**COOKRCP01**)로 근거화해 "이 제철 재료로 뭐 해먹지"를 실제 레시피로 답한다.

파이프라인 성격은 영양과 동일한 데칼코마니(수집→파싱→스냅샷 커밋→로더→표시)다. 다만
**소스·키가 다르다**: 영양은 `apis.data.go.kr`(공공데이터포털, `DATA_GO_KR_KEY`)이고,
COOKRCP01은 **식품안전나라**(`openapi.foodsafetykorea.go.kr`, 별도 키)다. 이 문서는 그
차이를 명시하고, 표시를 **카드 진입점 → 바텀시트**로 나눈다.

## 원칙 (유지)

- **공개 페이지는 경량·무추적·런타임 외부요청 0.** 수집은 CI/빌드 타임에만, 앱은 커밋된
  정적 `recipes.json`만 읽는다. (가격·영양 파이프라인과 동일 모양.)
- **API 키는 코드·저장소에 절대 넣지 않는다.** CI 시크릿으로만. COOKRCP01 키 env 이름:
  `FOODSAFETY_API_KEY` (식품안전나라 계정 키, 경로 삽입식).
- **재배포 데이터는 출처표시 의무**(KOGL 1유형). 화면에 "식품의약품안전처 조리식품 레시피
  DB" 명시.
- **사용자 문구는 담백한 한국어, 이커머스 화법 금지.** 레시피 단계도 예외 없음
  ("드셔보세요" ✕).
- **텍스트만.** 완성/단계 사진은 런타임 외부요청·용량 부담이라 수집·표시하지 않는다.
- 순수 로직은 `picks/card/app/recipe`, 표시는 `components`.

## 데이터원 (설계 근거)

`produce-content-pipeline-design.md`의 리서치·실측을 재사용한다. 핵심만:

- **COOKRCP01** — 재료(`RCP_PARTS_DTLS`)·조리단계(`MANUAL01~20`)·요리명(`RCP_NM`) 제공.
  무료 REST, KOGL1(출처표시) → 재배포 OK.
- **생과일은 조리 레시피가 거의 없음** — 복숭아 2 · 사과 11 · 토마토 52(이름 등장 기준).
  이는 데이터 공백이 아니라 현실(여름 생과일은 조리하지 않고 먹는다). 그래서 매칭은
  **수기 지정**으로 하고, 실 `RCP_NM`이 없는 품목은 진입점을 그냥 안 보인다.

## 매칭 전략 — 수기 참조 (`recipeRef`)

KAMIS(`item_name`)·영양(`FOOD_NM_KR`)과 같은 철학. 자동 재료검색은 노이즈(가공식품)가
많고 담백 톤을 보장 못 한다. 대신 프로필에 실제 `RCP_NM`을 손으로 몇 개 건다.

```jsonc
// produce.json 프로필
"recipeRef": { "names": ["토마토스파게티", "토마토달걀볶음"] }
```

- `names`의 각 문자열은 **실제 `RCP_NM`과 정확일치**해야 한다(존재하지 않으면 수집에서 조용히
  스킵 — 부분일치·추측 금지).
- 시작 세트: **복숭아·토마토·사과** 3개(이미 `foodDb` 있는 트리오). 복숭아는 커버리지가
  얇아 1개 이하일 수 있고, 0건이면 카드에 레시피 진입점이 안 뜬다(정상).

## 데이터 모델 (`src/types.ts`)

```ts
export interface RecipeRef {
  /** 실제 RCP_NM 정확일치 이름들 (수기 지정) */
  names: string[]
}

export interface RecipeEntry {
  name: string          // RCP_NM
  ingredients: string   // RCP_PARTS_DTLS (원문 한 줄)
  steps: string[]       // MANUAL01~20 중 비어있지 않은 단계 (번호 접두 제거)
}

export interface RecipeSnapshot {
  schemaVersion: number
  fetchedAt: string     // ISO 8601
  entries: RecipeEntry[]  // name으로 조회하는 평면 목록
}
```

`ProduceProfile`에 선택 필드 `recipeRef?: RecipeRef` 추가. 없으면 카드에 레시피 없음
(`foodDb`와 동일 패턴).

## 파이프라인 (CI 전용, 영양 데칼코마니)

### 파서 `scripts/lib/parse-recipe.mjs`

COOKRCP01 한 행 → `RecipeEntry`. `parse-nutrition.mjs`와 같은 위치·방어 패턴.

- `parseRecipeEntry(json, name): RecipeEntry | null`
  - `json.COOKRCP01.row`(식품안전나라 응답 루트)에서 `RCP_NM === name` 정확일치 행을 찾음.
  - **단일객체 응답 대응**: `row`가 배열 아니면 배열로 감쌈.
  - 없으면 `null`. `COOKRCP01`/`row` 자체가 없거나 `RESULT.CODE`가 오류면 `throw`.
  - `steps`: `MANUAL01`~`MANUAL20`을 순서대로 모아 **빈 문자열 제거**, 각 값 앞의
    번호 접두("1. ", "2 " 등) 정리해 담백하게.
  - `ingredients`: `RCP_PARTS_DTLS` 원문(trim). 비면 빈 문자열.

### 수집기 `scripts/fetch-recipes.mjs`

- `buildRecipeSnapshot({ key, profiles, fetchFn = fetch })` — `recipeRef` 있는 프로필의
  각 `name`을 조회해 엔트리 누적. 중복 name은 한 번만. `writeSnapshot` 재사용.
- 엔드포인트: `https://openapi.foodsafetykorea.go.kr/api/{key}/COOKRCP01/json/1/50/RCP_NM={name}`
  (키가 경로에 실리므로 반드시 https — 평문 전송 금지)
  (키가 **경로**에 들어간다 — serviceKey 쿼리 아님).
- main 가드: `FOODSAFETY_API_KEY` env 확인, `produce.json` 로드, 실패 시 기존
  `recipes.json` **불변**(원자적), 엔트리 0이면 에러.
- 산출: `public/data/recipes.json`.
- npm: `"fetch:recipes": "node scripts/fetch-recipes.mjs"`.

## 순수 로직 (`src/recipe.ts`)

- `matchRecipes(profile, snapshot): RecipeEntry[]` — `profile.recipeRef.names`에 속한
  엔트리들을 스냅샷에서 골라 반환(순서 보존). 참조·스냅샷 없으면 `[]`.
- `RecipeView` — 표시용 파생. `RecipeEntry[]`를 그대로 쓰되 표시에 필요한 값만
  (`{ name, ingredients, steps }[]`). 빈 배열이면 `null`.
- `recipeView(entries): RecipeView | null`.

## 조립 (`src/app.ts` · `src/card.ts`)

- `buildAppView(profiles, snapshot, nutrition, recipes, now)` — 4번째 인자 `recipes`
  추가(영양 다음). 카드마다 `recipeView(matchRecipes(profile, recipes))` 투영.
- `toCardView(pick, month, nutrition, recipes)` — 4번째 인자. `CardView.recipes: RecipeView | null`.
- `AppView.hasRecipes: boolean` — 파생 플래그(출처를 페이지 하단 1회 표기하려고;
  `hasNutrition`과 동형).
- **선정/정렬 불변** — `selectPicks`는 손대지 않는다. 레시피는 표시 grounding일 뿐.

## 표시 (`components/`)

### 카드 진입점

카드 펼침 영역에 담백한 진입점 — `recipes`가 있을 때만. 예: "레시피 2개" 정도의
버튼/링크(이커머스 화법 없음). `howToUse` 한 줄은 유지하고, 그 아래에 진입점을 둔다.

### 바텀시트 `RecipeSheet`

- 하단에서 슬라이드업하는 오버레이. **새 라우트 없음** — App(또는 카드) 로컬
  `useState`로 열림 상태·현재 레시피 목록 관리.
- 내용: 요리명 → 재료 한 줄 → 조리단계(번호 리스트). 텍스트만. dashed 디바이더 등 기존
  스타일 결. `steps`가 비면 단계 섹션 생략, `ingredients` 비면 재료 생략.
- 닫기: 배경(backdrop) 탭·Esc. 기본 접근성 — `role="dialog"`·`aria-label`·열릴 때 포커스
  이동·Esc 핸들러. 과설계 금지(포커스 트랩 라이브러리 등 도입 안 함).
- 여러 레시피면 시트 안에서 세로로 나열(스크롤). 담백하게 구분.

### 출처

"식품의약품안전처 조리식품 레시피 DB"를 **페이지 하단 1회**(영양 출처와 나란히),
`hasRecipes`일 때만.

## 테스트 (TDD)

| 파일 | 검증 |
|---|---|
| `tests/fixtures/cookrcp-tomato.json` | COOKRCP01 실 응답 축약(토마토 요리 1 + 노이즈 1) |
| `tests/parse-recipe.test.js` | 정확일치 추출·단일객체 대응·빈 MANUAL 제거·번호 정리·오류 throw·없으면 null |
| `tests/fetch-recipes.test.js` | `fetchFn` 주입, `recipeRef` 없는 프로필 스킵, 중복 name 1회, 스냅샷 형태 |
| `tests/recipe.test.ts` | `matchRecipes` 이름 소속 매칭·빈 참조 `[]`, `recipeView` 빈 배열 `null` |
| `tests/card.test.ts` | `toCardView` 4번째 인자 → `CardView.recipes` 투영, 없으면 null |
| `tests/app.test.ts` | `buildAppView` 배선·`hasRecipes` 파생 |
| `src/components/RecipeSheet.test.tsx` | 요리명·재료·단계 렌더, 단계 결측 시 생략, 닫기 |
| `src/components/App.test.tsx` (또는 카드) | 레시피 있을 때만 진입점, 출처 1회 |

## 규칙 유지 / YAGNI

- 런타임 외부요청 0·무추적·**텍스트만**. 검색·즐겨찾기·이미지·단계사진·필터 없음.
- 레시피는 선정/정렬에 영향 없음.
- 시작 세트 3개(복숭아·토마토·사과). 나머지는 `recipeRef`만 추가하면 자동 수집.

## 문서 갱신

- `CLAUDE.md` 명령어: `- \`npm run fetch:recipes\` — 식약처 조리식품 레시피DB 수집 (env: \`FOODSAFETY_API_KEY\`)`
- `CLAUDE.md` 규칙: 식품안전나라 키 시크릿 조항(`FOODSAFETY_API_KEY`), 레시피 매칭은
  `RCP_NM` 문자열이라는 조항.
