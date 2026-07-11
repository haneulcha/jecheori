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
- 식품안전나라(레시피) 키도 코드·저장소에 절대 넣지 않는다 (CI 시크릿 `FOODSAFETY_API_KEY`).
- KAMIS 매칭은 품목 코드가 아니라 `item_name` 문자열로 한다 (스펙 참고).
- 식약처 영양 매칭도 품목 코드가 아니라 `foodName` 문자열로 한다 (`produce.json`의 `foodDb`).
- 레시피 매칭은 품목 코드가 아니라 `RCP_NM` 문자열로 한다 (`produce.json`의 `recipeRef.names`).
- 순수 로직은 `picks/card/app`에, 표시는 `components`에. 컴포넌트는 사용자 텍스트를 직접
  이스케이프하지 않는다 (React 자동 이스케이프).

## 배포

`npm run build` → `dist/client/` 정적 산출물을 정적 호스트에 서빙 (`deploy.yml`).

- **루트 서빙**(Cloudflare Pages 등): 기본값 `base: '/'`. 추가 설정 없음.
- **하위경로**(GitHub Pages 프로젝트 사이트 `/jecheori/`): `BASE_PATH=/jecheori/`로 빌드.
  `vite.config.ts`의 `base`와 `router.tsx`의 `basepath: import.meta.env.BASE_URL`이
  자산 URL·라우팅을 하위경로로 다시 쓴다. **브라우저 실측 검증됨**(자산 200·렌더·하이드레이션).
