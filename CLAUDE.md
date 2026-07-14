# jecheori (제철이)

이번 달 제철인 과일·채소 중 가격이 내려온 것들을 알려주는 작은 모바일 웹앱.
이커머스가 아니라, 장보기 갈 때 옆에 두는 계절 달력에 가깝다.

## 스택

TanStack Start (React 19) + Vite + Vitest. 공개 달력은 라우트 로더가 CI 커밋 JSON을
읽어 `buildAppView`로 조립하고 **정적 프리렌더**한다(정적 호스트 서빙). 서버·계정·개인화는
다음 사이클(현재 없음). node ≥ 22 필요.

## 문서

- 마이그레이션: `docs/superpowers/specs/2026-07-11-tanstack-start-migration-design.md`,
  `docs/superpowers/plans/2026-07-11-tanstack-start-migration.md`
- 카드·가격 설계: `docs/superpowers/specs/2026-07-10-card-info-and-price-display-design.md`
- 도메인·아키텍처 용어: `CONTEXT.md`
- 비주얼 디자인: `DESIGN.md` (팔레트·타이포·컨셉 — UI 작업 전 필독)

## 명령어

- `npm run dev` — 개발 서버
- `npm run generate-routes` — 라우트 트리 생성 (`src/routeTree.gen.ts`, 빌드시 자동)
- `npm test` — Vitest 전체 (순수 로직 + 컴포넌트 RTL)
- `npm run storybook` — 뷰 상태 탐색기 (데이터→UI 인과를 노브로 확인, 스펙: `docs/superpowers/specs/2026-07-14-storybook-view-states-design.md`)
- `npm run build` — 프리렌더 정적 빌드 (`dist/client/`)
- `npm run fetch:prices` — KAMIS 가격 수집 (env: `KAMIS_CERT_KEY`, `KAMIS_CERT_ID`)
- `npm run fetch:nutrition` — 식약처 영양성분DB 수집 (env: `DATA_GO_KR_KEY`)
- `npm run fetch:recipes` — 식약처 조리식품 레시피DB 수집 (env: `FOODSAFETY_API_KEY`)
- `npm run report:coverage` — 제철 프로필 ↔ 가격 스냅샷 매칭 리포트

## 아키텍처 경계 (변경 시 여기만 바뀌게)

- **`src/picks.ts`** — 선정·매칭·정렬 (순수, "무엇을 고르나")
- **`src/card.ts`** — 픽 → `CardView` 파생 (개당값·스파크 좌표·등락 판별 유니온; "어떻게 표시하나")
- **`src/app.ts`** — `buildAppView`: 원시데이터+시계 → `AppView` 조립 (순수)
- **`src/components/`** — `AppView`/`CardView` → JSX. 표시만, 비즈니스 로직 없음
- **`src/routes/`** — 라우트·로더 (JSON 로드 + 프리렌더). 자세한 심(seam)은 `CONTEXT.md`.

## 규칙

- 사용자 문구는 한국어, 담백한 톤. 이커머스 화법 금지 ("사세요" ✕, "담기 좋아요" ○).
- 공개 페이지는 경량·무추적·런타임 외부요청 없음. 가격은 CI 커밋 JSON, KAMIS 호출은 CI에서만.
  (로그인·개인화는 다음 사이클 도입 예정 — 그때 이 규칙 재개정.)
- KAMIS 키는 코드·저장소에 절대 넣지 않는다 (CI 시크릿 `KAMIS_CERT_KEY`/`KAMIS_CERT_ID`).
- 식약처 키도 코드·저장소에 절대 넣지 않는다 (CI 시크릿 `DATA_GO_KR_KEY`).
- 식품안전나라(레시피) 키도 코드·저장소에 절대 넣지 않는다 (env `FOODSAFETY_API_KEY`).
  레시피·영양은 **씨앗형**(거의 안 변함) — 상시 CI 없이 확장 시 로컬에서 1회 수집해 커밋.
  가격만 매일 변해 CI cron 상주(`update-prices.yml`).
- KAMIS 매칭은 품목 코드가 아니라 `item_name` 문자열로 한다 (스펙 참고).
- 식약처 영양 매칭도 품목 코드가 아니라 `foodName` 문자열로 한다 (`produce.json`의 `foodDb`).
- 레시피 매칭은 품목 코드가 아니라 `RCP_NM` 문자열로 한다 (`produce.json`의 `recipeRef.names`).
- 순수 로직은 `picks/card/app`에, 표시는 `components`에. 컴포넌트는 사용자 텍스트를 직접
  이스케이프하지 않는다 (React 자동 이스케이프).

## UI/UX 결정

**룩/UX 결정은 어물쩍 넘기지 않는다.** 화면·인터랙션의 "어떻게 보이고 움직일지"를 정할 때:

1. 해당 렌즈 스킬을 **먼저 연다** (`DESIGN.md` 필독 전제):
   - **인터랙션·모션·제스처** (드로워/시트/차양, 스와이프, 스프링, 드래그, `reduced-motion`, 재질) → **`apple-design`**
   - **일반 UI/UX 품질·리뷰·폴리시** (시각 위계, 정보구조, 인지부하, 접근성, 상태/빈화면, UX 카피, 반응형, 안티패턴) → **`impeccable`**
   - **미감·비주얼 방향** (타이포·색·정체성, 템플릿 티 안 나게) → **`frontend-design`**
2. **2~3개 시안**을 **`playground`**(인터랙티브 HTML) 또는 **`artifact-design`**(호스팅 목업)으로 만들어
   빌드 전에 **사인오프**를 받는다. (좌우탭→풀드로워→차양 재작업이 이 단계 생략에서 나왔다.)
3. 확정 후에야 `brainstorming`→스펙, `writing-plans`→플랜. 구현 중에도 그 스킬 렌즈 + 브라우저 실측 유지.

## 검증·테스트 (완료 게이트)

작업을 "완료"로 부르기 전 아래를 통과시킨다. 이 규칙들은 실제로 반복해 새어나간 이슈에서 나왔다.

- **게이트 = `npm test` **와** `npx tsc --noEmit` 둘 다.** Vitest는 타입체크를 하지 않아,
  테스트 픽스처의 타입에러(예: 잘못된 리터럴)가 `npm test`만으론 통과한다. 반드시 `tsc`도 돌린다.
- **UI·CSS·인터랙션 변경은 브라우저로 실측한다.** 단위테스트·코드리뷰는 렌더된 화면·모션·레이어·
  터치타깃을 못 본다(예: `grid-template-rows:0fr`가 패딩 때문에 0으로 안 접힘 → 닫아도 남는 박스;
  옆면/오버레이가 본문을 덮음; 하드 리로드로 전환 끊김). 개발서버(`npm run dev`)를 띄워 실제로
  열고/닫고/넘겨본 뒤 완료로 부른다. 사용자향 시각 변경이면 스크린샷으로 사인오프.
- **시각/인터랙션 방향은 빌드 전에 확정한다.** 좌우탭→풀드로워→차양처럼 완제품을 만든 뒤 뒤집히면
  풀 재작업이다. 방향이 갈리면 가벼운 HTML/브라우저 프로토타입으로 "느낌"부터 정하고 구현한다.

### 테스트 관례

- **순수 로직 테스트는 `tests/`**에 두고 `'../src/…'`로 임포트한다(예: `tests/picks.test.ts`).
  `src/*.test.ts`에 만들지 않는다 — 중복·혼선.
- **컴포넌트 테스트는 `src/components/*.test.tsx`** + 상단 `// @vitest-environment jsdom`.
- **`<Link>` 등 라우터 컨텍스트가 필요한 컴포넌트**는 `src/test-utils.tsx`의 `renderWithRouter`로 렌더.
- **테스트 픽스처도 유효한 타입값**을 쓴다 — `KamisRef.categoryCode`는 `'100' | '200' | '400'`
  (`src/types.ts`). 임의값(`'0'` 등)은 `tsc`에서 깨진다.
- `src/routeTree.gen.ts`는 gitignore(빌드시 자동 생성) — 커밋 대상 아님.

## 배포

`npm run build` → `dist/client/` 정적 산출물을 정적 호스트에 서빙 (`deploy.yml`).

- **루트 서빙**(Cloudflare Pages 등): 기본값 `base: '/'`. 추가 설정 없음.
- **하위경로**(GitHub Pages 프로젝트 사이트 `/jecheori/`): `BASE_PATH=/jecheori/`로 빌드.
  `vite.config.ts`의 `base`와 `router.tsx`의 `basepath: import.meta.env.BASE_URL`이
  자산 URL·라우팅을 하위경로로 다시 쓴다. **브라우저 실측 검증됨**(자산 200·렌더·하이드레이션).
