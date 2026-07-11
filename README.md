# 지금 담기 좋은 것 (jecheori)

이번 달 제철인 과일·채소 중 가격이 내려온 것들을 알려주는 작은 모바일 웹앱.
이커머스가 아니라, 장보기 갈 때 옆에 두는 계절 달력에 가깝습니다.

- 데이터: [KAMIS 오픈API](https://www.kamis.or.kr) 일별 소매가격 (전국 평균)
- 제철 프로필: `public/data/produce.json` (직접 큐레이션)
- 스택: **TanStack Start (React 19) + Vite + Vitest**
- 서버 없음 — GitHub Actions가 매일 07:00 KST에 가격 스냅샷을 커밋하고, 공개 달력
  라우트를 **정적 프리렌더**해 정적 호스트로 배포합니다. (계정·개인화 없음)

## 동작 방식

라우트 로더가 커밋된 JSON(`public/data/*.json`)을 읽어 `buildAppView`로 화면 데이터를
조립하고, 빌드 시점에 **정적 HTML로 프리렌더**합니다. 브라우저는 JS 없이도 콘텐츠를 보고,
하이드레이션 후 인터랙션(카드 펼침·과일/채소 필터·절정 dot 툴팁)이 붙습니다.

## 개발

    npm install        # node >= 22
    npm run dev        # 개발 서버
    npm test           # Vitest (순수 로직 + 컴포넌트 RTL)
    npm run build      # 프리렌더 정적 빌드 → dist/client/

## 코드 구조

순수 로직(프레임워크 무관)과 뷰가 갈려 있습니다. 자세한 용어·경계는 `CONTEXT.md`.

- `src/picks.ts` — 선정·매칭·정렬 ("무엇을 고르나")
- `src/card.ts` — 픽 → `CardView` 파생 (개당값·스파크 좌표·등락 판별)
- `src/app.ts` — `buildAppView`: 원시데이터+시계 → `AppView` 조립
- `src/components/` — `AppView`/`CardView` → JSX (표시만)
- `src/routes/` — 라우트·로더 (JSON 로드 + 프리렌더)

## 가격 데이터 갱신 (수동)

    KAMIS_CERT_KEY=... KAMIS_CERT_ID=... npm run fetch:prices
    npm run report:coverage   # 프로필-가격 매칭 확인

## 배포

`npm run build` → `dist/client/` 정적 산출물을 정적 호스트에 서빙 (`deploy.yml`).

- **루트 서빙** (Cloudflare Pages 등): 기본값. 추가 설정 없음.
- **하위경로** (GitHub Pages 프로젝트 사이트 `https://<사용자>.github.io/jecheori/`):
  `BASE_PATH=/jecheori/`로 빌드. `vite.config.ts`의 `base`와 `router.tsx`의
  `basepath`가 자산 URL·라우팅을 하위경로로 재작성합니다 (검증됨). 저장소 이름을
  바꾸면 `deploy.yml`의 `BASE_PATH`도 함께 수정.

### 배포 설정 (1회, GitHub Pages 기준)

1. Settings → Pages → Source를 "GitHub Actions"로.
2. Settings → Secrets → Actions에 `KAMIS_CERT_KEY`, `KAMIS_CERT_ID` 등록
   (키 발급: kamis.or.kr → Open-API 인증키 신청).

## 문서

- 도메인·아키텍처 용어: `CONTEXT.md`
- 비주얼 디자인: `DESIGN.md`
- 설계·계획: `docs/superpowers/specs/`, `docs/superpowers/plans/`
