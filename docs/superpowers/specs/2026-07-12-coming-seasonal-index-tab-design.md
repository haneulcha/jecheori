# 다가오는 제철 — 램프줄 인덱스 · 카드형 전용 페이지 설계

> 2026-07-12 · 브레인스토밍 산출물 (개정: 재설계)
> 관련: `DESIGN.md`(팔레트·규율·톤·문구류 은유), `CONTEXT.md`(도메인·심),
> `docs/superpowers/specs/2026-07-11-tanstack-start-migration-design.md`(라우트·프리렌더),
> `docs/superpowers/specs/2026-07-11-fridge-memo-card-design.md`·`2026-07-12-recipe-pin-memo-design.md`(문구류 계보·카드)

## 개정 이력

- **초안(폐기):** 좌/우 옆면에 마주 보는 세로 인덱스 탭(오른쪽=다가오는, 왼쪽=지금).
  브라우저 실측 결과 (1) 좌/우 배치가 "페이지 넘김" 연상을 못 주고, (2) 모바일 단일 컬럼이
  화면 폭을 다 써 **고정 탭이 본문을 덮는**(품목 이모지가 탭 뒤로 가려지는) 문제가 드러났다.
- **확정(이 문서):** 우측 상단 **램프줄(A)** 하나 → 당기면 **목차가 그 줄에서 아래로 풀려 내리는
  차양(shade) 컴팩트**(가로 읽기, 본문 안 가림). 목차 링크는 **클라이언트 라우팅(`<Link viewTransition>`)**
  으로 리로드 없이 부드럽게. 그리고 **다가오는 페이지는 냉장고-메모 카드 껍데기를 재활용**해 메인과
  한 가족으로 보이게 한다. (중간에 풀하이트 슬라이드 드로워안이 있었으나 "화면을 덮는다"는 이유로
  HTML 시안 비교 후 차양 드롭으로 확정.)

## 배경

지금 앱의 시선은 **이번 달**에만 고정돼 있다. "곧 올 것"의 씨앗은 있었다 — `comingSoon`이 다음 달
새로 철 드는 품목을 메인 맨 아래 한 줄로 흘려놓았을 뿐, 언제쯤인지·뭐가 좋은지 맥락이 없었다.
이 슬라이스는 다가오는 제철을 **별도 경로**(`/coming`)로 세우고, 두 페이지를 **램프줄 인덱스**로
넘나들게 하며, 예고를 **카드형**으로 보여준다. 냉장고-메모·마스킹테이프·압정 낱장으로 이어진
문구류 은유의 연장이다.

## 범위

- **새로 생김:**
  - 순수 선정: `comingMonths`(picks.ts) — 앞으로 N개월, 달별 묶음 + 절정 플래그.
  - 순수 조립: `buildComingView`(app.ts) — 프로필+시계 → `ComingView`. **카드 재활용을 위해
    품목별 미래 월 `whyNow`와 달별 계절(`season`)까지 싣는다.**
  - 뷰 타입: `ComingView`/`ComingMonth`/`ComingItem`(view-types.ts).
  - 라우트: `src/routes/coming.tsx`(로더가 `produce.json`만 읽어 프리렌더).
  - 컴포넌트: `NavIndex`(램프줄 A + 차양 드롭 목차, 상태·`<Link viewTransition>`, 양쪽 페이지 공유),
    `ComingCard`(카드 껍데기 재활용, 정적·경량), `Sprig`(머리말 공유, App에서 추출).
    테스트 헬퍼 `src/test-utils.tsx`(`renderWithRouter` — `<Link>` 라우터 컨텍스트).
- **바뀜:**
  - `App.tsx` — `NavIndex` 추가, 맨 아래 옛 "곧 제철" 한 줄 제거.
  - `style.css` — 램프줄·서랍·카드형 다가오는 페이지 규칙 + **계절 토큰을 요소 단위로 스코프**.
  - `routeTree.gen.ts` — `npm run generate-routes`로 재생성(gitignored, 커밋 대상 아님).
  - `DESIGN.md`·`CONTEXT.md` — 결정 기록·새 용어.
- **안 바뀜:** 가격·영양·레시피 파이프라인, `card.ts`(단 `whyNowLine`·`seasonOf` 재사용),
  `selectPicks`, 데이터 JSON.
- **폐기(초안 산출물 되돌림):** `IndexTab` 컴포넌트와 그 CSS — 램프줄 서랍이 대체.

## 원칙

- **예고는 카드보다 가볍다 — 껍데기는 같게, 알맹이는 덜어낸다.** 냉장고-메모 카드의 **표지(면)**를
  그대로 쓰되(마스킹테이프·종이 부양·crisp 모서리·이모지·이름·손글씨 한마디·절정 배지),
  미래 품목에는 **가격·스파크라인·영양·레시피·펼침(`<details>`)을 뺀다**. 아직 철이 아니라 가격
  신호가 없고, 예고는 "볼 것"이지 "살 것"이 아니다.
- 정적 프리렌더·서버 없음·런타임 외부요청 없음·무추적 유지. 새 경로도 정적 산출물 한 장.
- **인덱스는 상태(최소 JS)로 여닫고**(레시피 메모 선례와 같은 결), 목차 링크는 **클라이언트 라우팅**
  (`<Link viewTransition>`)으로 리로드 없이 부드럽게 전환한다. `prefers-reduced-motion: reduce`면
  차양 언롤·램프줄 당김을 즉시로.
- 텍스트·글리프는 오직 쪽빛(`--ink`). 계절 웜 컬러(`--tint`/`--accent`)는 배경·마스킹테이프·배지
  채움으로만, 글자에 안 싣는다.
- 문구는 계절의 목소리로, 감탄사·느낌표 금지, 서술로 끝낸다.
- 하위경로 배포 대비: 링크 href는 `import.meta.env.BASE_URL`을 접두로 붙인다(루트 `/`, 하위경로 `/jecheori/`).
- 순수 로직은 `picks`/`app`, 표시는 `components`, 로드·프리렌더는 `routes`.

## 순수 선정 — `comingMonths`

다음 N개월(기본 `horizon = 2`)을 훑어 각 달에 **새로 드는** 품목을 달별로 묶는다.

```
comingMonths(profiles, month, horizon = 2): ComingGroup[]
```

- **현재 달 제외**(`!seasonMonths.includes(month)`) · **가장 이른 달에 한 번만**(달별 중복 없음) ·
  **연말 랩어라운드**(`month`·결과 월 1–12) · **절정 플래그**(배정된 달에 절정이면 `peak: true`) ·
  **빈 달 생략**.
- 도메인 타입: `ComingPick { profile: ProduceProfile; peak: boolean }`,
  `ComingGroup { month: number; items: ComingPick[] }`. `src/picks.ts`.
- (구현 완료 — 재설계에도 변경 없음.)

## 뷰 조립 — `ComingView` (카드 재활용을 위해 확장)

카드 껍데기를 그리려면 이모지·이름·절정만으로 부족하다. 미래 월의 한마디와 그 달의 계절색이 필요하다.

```ts
interface ComingItem {
  emoji: string
  name: string
  peak: boolean
  /** 배정된(미래) 월 기준 한마디 — whyNowLine(profile, month) */
  whyNow: string
}
interface ComingMonth {
  month: number            // 1–12
  season: Season           // seasonOf(month) — 카드 마스킹테이프 색
  items: ComingItem[]
}
interface ComingView { months: ComingMonth[]; date: Date; term?: string }
```

`buildComingView(profiles, now): ComingView` — 순수. `comingMonths`를 부르고, 각 그룹에
`season: seasonOf(g.month)`을, 각 품목에 `whyNow: whyNowLine(pick.profile, g.month)`을 싣는다
(`whyNowLine`·`seasonOf`는 `card.ts`·`season.ts`의 기존 순수 함수 재사용). 가격·영양·레시피 안 씀.

`coming.tsx` 로더는 `produce.json`만 임포트해 `buildComingView(produce, new Date())`를 프리렌더한다
(구현 완료 — 로더/라우트는 변경 없음).

## 내비게이션 — 램프줄(A) + 차양 드롭 인덱스 (`NavIndex`)

양쪽 페이지가 공유하는 한 컴포넌트. 화면 **우측 상단**에 램프줄 하나가 늘어져 있고, 당기면(탭/클릭/키)
목차가 그 줄에서 **아래로 스르륵 풀려 내린다**(창 차양처럼). 본문을 덮지 않는 우상단 컴팩트 카드.

- **램프줄(A)의 형태.** DESIGN.md 라인아트 어휘(**선 + 끝점 원** — 머리말 `Sprig`가 그 모양)와
  라임을 맞춘 **얇은 쪽빛 스트로크 한 획 + 작은 링**(SVG, `currentColor`). 유광/테크 질감(iOS 아일랜드)
  금지. hover/focus 시 살짝 **당겨지는(내려가는)** 미세 모션(`translateY`), reduced-motion이면 끈다.
  줄은 뷰포트 상단 위로 **오버슈트**(`.nav-index { top: -8px }`)시켜, 당겨도 위쪽에 틈이 생기지 않는다.
- **여는 방식 — 상태(최소 JS).** 램프줄은 `<button aria-label="목차" aria-expanded>`이고, React `useState`가
  열림을 소유한다(`.nav-index[data-open]`). 바깥 클릭 닫기는 열릴 때만 렌더되는 투명 백드롭 버튼.
  레시피 메모처럼 이미 앱에 있는 상태 인터랙션과 같은 결의 최소 JS.
- **차양 드롭 애니메이션.** 목차 패널은 우상단 컴팩트 카드(`top: 2.6rem; right: 0.8rem; width: 11rem`)로,
  `grid-template-rows: 0fr → 1fr`(내부 래퍼 `overflow: hidden`) 트릭으로 **위에서 아래로 언롤**된다.
  `prefers-reduced-motion: reduce`면 전환 제거. 상단 모서리는 각지게(줄에서 늘어지는 차양).
- **인덱스 내용 — 가로 읽기 목차.** 다이어리 목차처럼 페이지 목록을 **가로 읽기** 행으로:
  "지금 담기 좋은 것"(`/`) · "다가오는 제철"(`/coming`). 각 항목은 **TanStack `<Link viewTransition>`**
  (클라이언트 라우팅). **현재 페이지**는 `aria-current="page"`로 굵게 표시. 선택 시 서랍이 닫힌다
  (`onClick`). 지금은 두 항목이지만 목차 구조라 훗날 "지나간 제철" 등으로 자란다.
- **부드러운 전환 — 클라이언트 라우팅.** 초안의 평범한 `<a>`는 **전체 페이지 하드 리로드**라 전환이
  뚝 끊겼다(브라우저 실측·`window` 플래그로 확인). `<Link viewTransition>`으로 바꿔 리로드 없이
  SPA 전환(+`document.startViewTransition`)을 얹었다. `Link`가 basepath를 자동 처리하므로 수동
  `BASE_URL` 접두가 사라진다. 프리렌더·SSR에선 여전히 `<a href>`로 렌더돼 `/coming`이 크롤된다.
- **접근성.** 링크는 진짜 앵커(`<Link>`가 `<a>` 렌더). 토글은 `<button>`이라 키보드로 열림.
  `:focus-visible` 쪽빛 아웃라인. 램프줄에 `aria-label`("목차")·`aria-expanded`. (Esc 닫기·포커스
  이동은 후속 향상 여지.)
- 위치는 `position: fixed` 우상단. 목차는 **본문 위 컴팩트 팝오버**로 콘텐츠 높이만큼만 열리고
  닫히면 자취가 없다(초안의 상시-고정-탭이 본문을 가리던 문제, 그리고 풀하이트 드로워가 화면을
  덮던 문제를 모두 해소).

## 다가오는 페이지 — 카드형 (`Coming` + `ComingCard`)

전용 페이지. 머리말(공유 `Sprig` + 절기 아이브로 + 헤딩 "다가오는 제철") + 우측 상단 `NavIndex`
+ 달별 섹션. 각 달 섹션은 헤더(예 "8월") 아래에 그 달 품목을 **카드**로 세운다.

- **`ComingCard` — 카드 껍데기 재활용.** 냉장고-메모 카드의 **표지 면**과 **같은 클래스**
  (`.card`·`.summary-row`·`.id`·`.emoji`·`.card-title`·`.why`·마스킹테이프 `::before`·미세 기울기)를
  써서 시각적으로 한 가족이 되게 하되, **정적 `<div>`**로 렌더한다(`<details>`/`<summary>` 아님 —
  펼침 없음). 담는 것: 이모지 · 이름 · **절정 배지**(`inPeak`이면 `PeakDot` 재사용 또는 동형 배지) ·
  **미래 월 한마디**(`.why` 손글씨 한 줄). 빼는 것: 가격블록·스파크라인·영양·레시피·`.open` 영역 전부.
- **마스킹테이프 색 = 그 품목의 미래 계절색.** 8월 품목은 여름 노랑, 9월 품목은 가을 오렌지 —
  "달력을 미리 넘겨보는" 느낌이 색으로도 산다. `ComingCard`(또는 달 섹션)에 `data-season={month의 season}`을
  달아 카드 안쪽에서 `--accent`/`--tint`가 그 계절로 잡히게 한다.
- **빈 상태.** `months`가 비면 앱 목소리로: "다가오는 제철 정보가 아직 없어요".
- 출처 각주(가격·영양·레시피)는 **없다** — 이 페이지는 그 데이터를 안 쓴다.

### 계절 토큰을 요소 단위로 스코프

지금 `style.css`는 `body[data-season='…'] { --accent; --tint }`로 **전역 한 계절**만 준다(현재 월,
`__root.tsx`). 카드마다 미래 계절색을 주려면 이 토큰을 **요소 단위로도** 걸 수 있어야 한다.

- 계절 토큰 규칙을 `[data-season='…']`(임의 요소)로 일반화한다. `body`는 여전히 `data-season`을
  가지므로 전역 기본이 유지되고, `data-season`을 단 `ComingCard`는 그 하위에서 자기 계절로 **재정의**한다.
- 마스킹테이프(`.card::before`)·배지가 읽는 `--accent`/`--tint`가 가장 가까운 `[data-season]`에서
  내려오므로, 카드별 색이 자연히 갈린다.

## View Transitions

"/" ↔ "/coming"을 낱장 넘기듯. 주 경로는 **`<Link viewTransition>`(SPA)** — 클라이언트 라우팅이
`document.startViewTransition`으로 전환을 감싼다. 직접 URL 진입·무JS 폴백을 위해 CSS 크로스도큐먼트
(`@view-transition { navigation: auto }`)도 유지. `prefers-reduced-motion: reduce`에선 애니메이션 무효화.

## 정리 (기존 제거·되돌림)

- `IndexTab` 컴포넌트와 테스트, 그 CSS **폐기**(램프줄 서랍이 대체).
- 메인 맨 아래 옛 "곧 제철" 한 줄과 데이터 경로(`AppView.coming`·`comingSoon`) 제거 — **완료**.
- 죽은 `.coming`/`.coming span` CSS 제거 — **완료**(또는 스타일 태스크에서 확인).
- "N월의 제철"(이번 달 전체 목록) 섹션은 메인에 **유지**.

## 테스트

- **순수 로직(Vitest, `tests/`):** `comingMonths` — 랩어라운드·달별 중복 제거·현재 달 제외·절정·빈 달.
  `buildComingView` — 달별 `season` 파생, 품목별 미래 월 `whyNow` 문자열, 빈 경우. (`tests/`에 두고
  `'../src/…'` 임포트, 유효 `categoryCode` 사용 — 프로젝트 관례.)
- **컴포넌트(RTL, `src/components/`):** `ComingCard` — 이모지·이름·절정 배지·`.why` 한마디 렌더,
  **가격/`<details>`/펼침 부재**, `data-season` 부여. `Coming` — 달 헤더·카드 목록·빈 상태.
  `NavIndex` — 램프줄 버튼(aria-label·토글로 `data-open`)·`<Link>` 목차 href·현재 페이지(`aria-current`)·
  선택 시 서랍 닫힘. 라우터 컨텍스트가 필요하므로 `renderWithRouter`(`src/test-utils.tsx`)로 렌더.
  `App` — `NavIndex` 존재·옛 "곧 제철" 부재.

## 아키텍처 경계 (유지)

`picks(comingMonths) ← app(buildComingView) ← components(Coming·ComingCard·NavIndex) ← routes(coming.tsx)`.
순수 로직은 picks/app(단 `whyNowLine`·`seasonOf` 재사용), 표시는 components, 로드·프리렌더는 routes.
가격·영양·레시피 심에는 손대지 않는다.

## 결정 기록 (요약 — 상세는 개정 이력)

- 좌/우 옆면 탭 → 우측 상단 **램프줄 + 차양 드롭 컴팩트 목차**(가로 읽기). 이유: 넘김 연상 강화 +
  본문 가림 해소. (중간안이던 풀하이트 슬라이드 드로워는 "화면을 덮는다"는 이유로 폐기 —
  HTML 시안 3종 비교 후 **차양 드롭** 확정.)
- 램프줄은 라인아트 어휘(선+원)와 라임. iOS 아일랜드·유광 금지, 햄버거 3줄은 앱-크롬 클리셰라 회피.
  당김 시 위쪽 틈이 없도록 줄을 뷰포트 위로 오버슈트.
- 다가오는 페이지는 **카드 껍데기 재활용**(메인과 한 가족) + **알맹이 경량**(가격·펼침 제거) +
  **미래 계절색 마스킹테이프**(달력 미리 넘김의 색).
- 목차 열고/닫기는 **상태(최소 JS)**, 목차 링크는 **`<Link viewTransition>` 클라이언트 라우팅**
  (평범한 `<a>`는 하드 리로드로 전환이 끊겨 교체). `Link`가 basepath 자동 처리.
