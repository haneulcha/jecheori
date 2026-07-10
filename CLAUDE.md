# jecheori (제철이)

이번 달 제철인 과일·채소 중 가격이 내려온 것들을 알려주는 작은 모바일 웹앱.
이커머스가 아니라, 장보기 갈 때 옆에 두는 계절 달력에 가깝다.

## 문서

- 스펙: `docs/superpowers/specs/2026-07-09-seasonal-picks-design.md`
- 구현 계획: `docs/superpowers/plans/2026-07-10-seasonal-picks.md`
- 비주얼 디자인: `DESIGN.md` (팔레트·타이포·컨셉 — UI 작업 전 필독)

## 명령어

- `npm run dev` — 개발 서버 (http://localhost:5173/)
- `npm test` — Vitest 전체 실행
- `npm run build` — 정적 빌드 (dist/)
- `npm run fetch:prices` — KAMIS 가격 수집 (env: `KAMIS_CERT_KEY`, `KAMIS_CERT_ID`)
- `npm run report:coverage` — 제철 프로필 ↔ 가격 스냅샷 매칭 리포트

## 규칙

- 런타임 의존성 0개. devDependencies는 vite/vitest/typescript만.
- 사용자 문구는 한국어, 담백한 톤. 이커머스 화법 금지 ("사세요" ✕, "담기 좋아요" ○).
- 광고·로그인·추적·런타임 외부 요청 없음. KAMIS 호출은 CI에서만.
- KAMIS 키는 코드·저장소에 절대 넣지 않는다 (CI 시크릿 `KAMIS_CERT_KEY`/`KAMIS_CERT_ID`).
- 열린 설계: 선정 로직은 순수 함수(`src/picks.ts`), 데이터 접근은 `src/data.ts`로만.
  UI가 JSON 경로를 직접 알면 안 된다.
- KAMIS 매칭은 품목 코드가 아니라 `item_name` 문자열로 한다 (스펙 참고).
- Vite `base`는 환경변수: 기본 `/`(Cloudflare 등 루트), GitHub Pages는
  `deploy.yml`에서 `BASE_PATH=/jecheori/`. 저장소 이름과 일치해야 한다.
