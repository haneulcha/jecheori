# 카테고리 ButtonGroup 분리 설계 (2026-07-23)

## 배경·문제

지금 `FilterBar`는 성격이 다른 칩을 한 줄에 섞어 놓았다:

- **카테고리** (상호배타, 하나만): 과일 · 채소 · 수산물
- **상태 토글** (다중 선택): 한창 제철 · 가격 하락 · 가격 있음

둘은 선택 시맨틱이 다르다("하나만" vs "여럿"). 그런데 시각이 똑같은 알약 칩이라
사용자가 카테고리도 여러 개 켤 수 있다고 오독한다. 상호배타는 `App.tsx`의
`EXCLUSIVE_FILTERS` 런타임 로직으로만 숨어 있어, 화면에 그 규칙이 드러나지 않는다.

## 목표

1. 재사용 가능한 **`ButtonGroup`**(단일 선택 세그먼트 컨트롤) 컴포넌트를 만든다.
2. 과일·채소·수산물을 `FilterBar`에서 빼내 **`[전체 | 과일 | 채소 | 수산물]` 세그먼트**로 분리한다.
3. `FilterBar`(상태 칩)는 그대로 둔다. `ChipGroup` 추출은 이번 범위가 **아니다**.

비목표: ChipGroup 컴포넌트화, 정렬/검색 변경, 무JS 카테고리 필터.

## 확정된 결정 (사인오프 완료)

- **선택 모델**: `'전체'` 세그먼트를 추가해 **항상 정확히 하나** 선택. 기본값 `'전체'`(=카테고리 미필터).
  기존의 "다시 눌러 해제(0개 가능)" 토글 동작은 버린다.
- **시각 (시안 A · A2)**: 연결된 세그먼트 트랙. 선택 칸은 `--tint` 채움 + `--accent` 테두리 알약이
  칸 사이를 **미끄러진다**(슬라이딩 썸). 트랙 배경에 **은은한 inset 그림자**로 눌린 홈 느낌.
  - 슬라이드 이징: `transform .32s cubic-bezier(.2,.75,.2,1)` (차양 언롤과 같은 어휘).
  - `prefers-reduced-motion: reduce`면 슬라이드·색 전환 전부 즉시.
  - 라벨 텍스트는 규율대로 항상 쪽빛(`--ink`), 비선택은 `--muted`, 선택은 `700`.
- **규율 예외 기록**: DESIGN.md는 그림자 금지(냉장고 메모 `--lift` 1단만 예외)다. A2의 트랙
  inset 그림자는 **두 번째 그림자 예외**를 여는 결정이다 → DESIGN.md 결정 기록에 남긴다.

## 타입 변경 (`src/view-types.ts`)

```ts
// 카테고리를 Filter에서 분리
export type Filter = 'drop' | 'peak' | 'priced'
export type CategoryFilter = 'all' | 'fruit' | 'vegetable' | 'seafood'
```

`CategoryFilter`는 카드의 `category`(`'fruit'|'vegetable'|'seafood'`)에 `'all'`을 더한 유니온이다.
(기존 `src/types.ts`의 `Category`(livestock 포함)와 이름 충돌을 피하려 `CategoryFilter`로 둔다.)

## 순수 로직 (`src/cardlist.ts`)

카테고리와 상태 필터를 **두 함수로 분리**한다(각자 순수·독립 테스트 가능):

```ts
const PRED: Record<Filter, (c: CardView) => boolean> = {
  drop: (c) => (c.price?.monthAgoPct ?? 0) < 0,
  peak: (c) => c.inPeak,
  priced: (c) => c.price != null,
}
// 과일/채소/수산 PRED 항목 삭제

/** 카테고리 단일 선택 필터. 'all'이면 전부 통과. */
export function filterByCategory(cards: CardView[], category: CategoryFilter): CardView[] {
  return category === 'all' ? cards : cards.filter((c) => c.category === category)
}

/** 상태 필터 술어 AND (기존 유지, 카테고리 멤버만 빠짐). */
export function filterCards(cards: CardView[], filters: Set<Filter>): CardView[] {
  return cards.filter((c) => [...filters].every((f) => PRED[f](c)))
}
```

App 합성: `filterCards(filterByCategory(base, category), filters)`.

## 컴포넌트

### `ButtonGroup` (신규, 재사용 프리미티브)

`src/components/ButtonGroup.tsx` + `ButtonGroup.module.css`. 제네릭 단일 선택 세그먼트 컨트롤.

```ts
interface ButtonGroupOption<T extends string> { value: T; label: string }
function ButtonGroup<T extends string>(props: {
  options: ButtonGroupOption<T>[]
  value: T
  onChange: (v: T) => void
  ariaLabel: string
}): JSX.Element
```

- **접근성**: `role="radiogroup"` + 각 칸 `role="radio"` `aria-checked`. **로빙 tabindex**(선택 칸만
  `tabIndex=0`) + **←/→ 방향키**로 이동(이동 즉시 선택·onChange). 클릭도 선택. `:focus-visible` 쪽빛 아웃라인.
  DESIGN.md 89번 줄의 "라디오+CSS" 의도를 라디오 시맨틱으로 잇되, 상태는 React가 관장(하이드레이션 후 노출).
- **썸**: `options.length` 등분 절대배치 알약. `transform: translateX(index * 100%)`로 슬라이드.
  트랙 `padding:3px`, 썸 `width: calc((100% - 6px)/N)`. inset 그림자는 트랙에.
- **표시 전용**: 비즈니스 로직 없음. options·value를 받아 그리기만.

카테고리 옵션 리스트(`CATEGORIES`)는 `App.tsx`가 소유하고 `ButtonGroup`에 넘긴다
(`FilterBar`가 `CHIPS`를 내부에 갖는 것과 대칭이나, 재사용 프리미티브는 옵션을 밖에서 받는다).

### `FilterBar` (수정)

`CHIPS`에서 `fruit`·`vegetable`·`seafood` 세 항목만 제거. 나머지(peak·drop·priced) 그대로.

### `App.tsx` (수정)

- 상태 추가: `const [category, setCategory] = useState<CategoryFilter>('all')`.
- `EXCLUSIVE_FILTERS` 상수·`toggle`의 상호배타 분기 **삭제** → `toggle`은 단순 add/delete.
- `CATEGORIES: ButtonGroupOption<CategoryFilter>[]` 상수 추가(전체·과일·채소·수산물).
- 필터 합성: `sortCards(filterCards(filterByCategory(base, category), filters), sort)`.
- 렌더: `.ctrlrow` 안, `FilterBar` **위 줄**에 `<ButtonGroup options={CATEGORIES} value={category}
  onChange={setCategory} ariaLabel="카테고리" />`를 놓는다(세그먼트=1차 축, 상태 칩=보조 축).
  하이드레이션 게이트(`ready`)는 기존대로.
- 하이드레이션 기본: `category`는 `'all'`(추가 설정 불필요), `filters`는 기존 `['peak']` 유지.

## 테스트 (게이트: `npm test` + `npx tsc --noEmit`)

- `tests/cardlist.test.ts`: `filterCards`의 `fruit`/`seafood` 셋 케이스를 **`filterByCategory`** 테스트로 이전
  (`'all'`=전부, 각 카테고리, 없는 카테고리=빈). `filterCards`는 peak/drop/priced/AND만 남긴다.
- `src/components/ButtonGroup.test.tsx` (신규, `// @vitest-environment jsdom`): 옵션 렌더, 선택 반영
  (`aria-checked`), 클릭 onChange, ←/→ 방향키 이동+onChange, `ariaLabel` → `radiogroup` 접근명.
- `src/components/App.test.tsx`: 카테고리 상호작용이 칩(`role="button"`)이 아니라 세그먼트
  (`role="radio"`)로 바뀜 — 66번 줄 주석·과일 선택 단언 갱신. `data-cat` 렌더 단언은 유지.
- `src/components/App.stories.tsx`: '과일' 선택 상호작용(323·366번 줄)을 `findByRole('radio', …)`로 갱신.
- `ButtonGroup.stories.tsx`(선택): 뷰 상태 탐색기용 스토리.

## 브라우저 실측 (UI 변경 완료 게이트)

`npm run dev`로 실제 확인: (1) 4칸 슬라이드가 부드럽고 끊김 없음, (2) 선택 칸만 tint 채움+
accent 테두리, inset 홈 보임, (3) 방향키·탭 포커스 링, (4) `prefers-reduced-motion`에서 즉시 전환,
(5) 카테고리+상태 칩 동시 적용이 목록에 반영, (6) 각 계절 팔레트(data-season)에서 색 규율 유지.
사용자향 시각 변경이므로 스크린샷 사인오프.

## 문서 갱신

- **DESIGN.md**: 결정 기록에 "카테고리 세그먼트 ButtonGroup 분리 + 트랙 inset 그림자 예외(두 번째
  그림자 예외)" 한 항목 추가. 89번 줄 "과일/채소 필터도 라디오+CSS로 무JS" 메모를 현 구현(하이드레이션 후
  JS radiogroup 세그먼트)에 맞게 수정. 모션 절에 세그먼트 슬라이드(차양 곡선 재사용) 추가.
- **docs/제품-동작-지도.md**: 카테고리 기본값이 `'전체'`(미필터)이고 항상 하나 선택임을 한 줄 표면화.
