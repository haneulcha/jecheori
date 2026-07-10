# 지금 담기 좋은 것 (jecheori)

이번 달 제철인 과일·채소 중 가격이 내려온 것들을 알려주는 작은 웹앱.
이커머스가 아니라, 장보기 갈 때 옆에 두는 계절 달력에 가깝습니다.

- 데이터: [KAMIS 오픈API](https://www.kamis.or.kr) 일별 소매가격 (전국 평균)
- 제철 프로필: `public/data/produce.json` (직접 큐레이션)
- 서버 없음 — GitHub Actions가 매일 07:00 KST에 가격 스냅샷을 커밋하고,
  GitHub Pages로 배포합니다.

## 개발

    npm install
    npm run dev        # http://localhost:5173/
    npm test

## 가격 데이터 갱신 (수동)

    KAMIS_CERT_KEY=... KAMIS_CERT_ID=... npm run fetch:prices
    npm run report:coverage   # 프로필-가격 매칭 확인

## 배포 설정 (1회)

1. Settings → Pages → Source를 "GitHub Actions"로.
   (GitHub Pages 배포 URL: `https://<사용자>.github.io/jecheori/` —
   `deploy.yml`의 `BASE_PATH: /jecheori/`가 저장소 이름과 일치해야 함.
   저장소 이름을 바꾸면 그 값도 함께 수정)
2. Settings → Secrets → Actions에 `KAMIS_CERT_KEY`, `KAMIS_CERT_ID` 등록
   (키 발급: kamis.or.kr → Open-API 인증키 신청)

Vite `base`는 환경변수로 결정됩니다: 기본값 `/`(루트 서빙 — Cloudflare Pages 등),
GitHub Pages는 `deploy.yml`에서 `BASE_PATH=/jecheori/`로 빌드.

## 설계 문서

- 스펙: `docs/superpowers/specs/2026-07-09-seasonal-picks-design.md`
- 구현 계획: `docs/superpowers/plans/2026-07-10-seasonal-picks.md`
- 디자인: `DESIGN.md`
