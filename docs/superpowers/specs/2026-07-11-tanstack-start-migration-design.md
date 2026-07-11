# TanStack Start 마이그레이션 설계

> 2026-07-11 · 브레인스토밍 산출물
> 관련: `CLAUDE.md`(개정 대상), `DESIGN.md`(유지), `CONTEXT.md`(심 용어),
> `docs/superpowers/specs/2026-07-10-card-info-and-price-display-design.md`

## 배경·목표

jecheori는 현재 정적 Vite+TS 앱(런타임 의존성 0, ~10KB)이다. 제품 방향이
**개인화 앱 중심**(로그인·저장목록·개인화)으로 이동하기로 결정되면서, 뷰 계층을
React로 옮기고 서버 가능한 스택(**TanStack Start**)을 세운다.

**이번 마이그레이션의 목표는 "충실한 포팅 + 토대 마련"이다.** 계정·개인화·서버 함수는
**짓지 않는다**(다음 사이클). 지금 앱을 TanStack Start로 1:1 이식해 동작·비주얼을
보존하고, 배포·경량성은 오늘 그대로(정적 프리렌더) 유지한다.

이 마이그레이션은 직전 리팩토링(순수 `card.ts`/`picks.ts`/`app.ts` 심) 덕에 비용이
작다 — 비즈니스·파생 로직은 프레임워크 무관이라 그대로 이식되고, 바뀌는 건 뷰(`render.ts`
→ JSX)와 진입점뿐이다.

## 스택 결정

**TanStack Start** (풀스택 React, Vite 기반). 선정 근거:
- **Vite 기반** — 현재 툴체인·설정 지식 유지.
- **타입 안전 서버 RPC**(`createServerFn`) — 서버 로직을 타입째 호출하는 순수 함수 경계.
  이 프로젝트의 "순수 함수 심" 규율과 정합. (이번엔 미사용, 다음 사이클용 토대)
- **배포 유연성** — 정적 프리렌더/SPA로 시작해, 나중에 Cloudflare Workers 등 서버
  타겟으로 **재마이그레이션 없이** 전환 가능.
- 함수형·타입 안전·경량 지향과 정합.

**리스크(기록):** TanStack Start는 **alpha**다. 생태계·턴키 레시피가 적고 API·문서가
유동적이며, 정적/프리렌더 경로가 Next `output: export`·Astro만큼 검증되진 않았다.
구현 초기에 프리렌더 매끄러움을 반드시 실측 확인한다(아래 리스크 절).

## 범위

### 하는 것 (이번 사이클)
현재 앱의 **모든 화면·동작을 TanStack Start로 이식** — 제철 픽 카드, 가격 블록,
스파크라인, 절정 dot 툴팁, 장보기 노트, 과일/채소 필터, 빈 상태·곧 제철, 헤더/절기.

### 안 하는 것 (다음 사이클, 비범위)
- 계정·로그인·세션·개인화·저장목록
- 서버 함수(`createServerFn`) 실사용, 서버 배포(Cloudflare Workers)
- 실시간·알림
- 런타임 KAMIS 호출 (가격은 CI JSON 유지)

## 무엇이 남고 무엇이 바뀌나

| 파일 | 처리 | 비고 |
|---|---|---|
| `src/types.ts` | **그대로** | 도메인 타입 |
| `src/picks.ts` | **그대로** | 선정·매칭·정렬 (순수) |
| `src/card.ts` | **그대로** | 픽 → CardView 파생 (순수) |
| `src/app.ts` (buildAppView) | **그대로** | 조립 (순수) — 라우트 로더가 호출 |
| `src/season.ts` | **그대로** | 절기·계절 |
| `tests/{card,picks,app,season,produce,data,parse-kamis,fetch-prices}.test.*` | **그대로** | 순수 로직 가드 유지 |
| `src/render.ts` | **→ JSX 컴포넌트로 교체** | HTML 문자열 → React 컴포넌트 |
| `src/main.ts` | **→ 라우트/엔트리로 교체** | TanStack Start 부트스트랩 |
| `src/data.ts` | **→ 라우트 로더로 이동** | fetch → 로더에서 JSON 로드 |
| `index.html` | **→ 프레임워크 관리** | |
| `src/style.css` | **그대로** | 루트에서 import |
| `tests/render.test.ts` | **→ 컴포넌트 테스트로 대체** | RTL 또는 최소화 |
| `scripts/*`, `public/data/*.json` | **그대로** | CI 수집 파이프라인 유지 |
| `.github/workflows/update-prices.yml` | **그대로** | 가격 갱신 CI |
| `.github/workflows/deploy.yml` | **개정** | 정적 프리렌더 산출물 배포로 |
| `vite.config.ts` | **→ TanStack Start 설정** | Vite 플러그인 |

## 렌더·데이터

- 가격 데이터는 현행 유지: **CI가 `public/data/*.json`을 커밋**(`update-prices.yml`),
  런타임 KAMIS 호출 없음.
- 공개 달력 라우트 `/`는 **프리렌더(정적)** — TanStack Router 라우트 **로더**가
  `produce.json`·`prices.json`을 읽어 `buildAppView(profiles, snapshot, now)`를 호출,
  결과 `AppView`를 컴포넌트에 props로 전달. (`now`는 빌드/프리렌더 시각)
- 결과물은 **정적 HTML** → 오늘 쓰던 정적 호스트 그대로 서빙. SEO·공유·속도 유지.

## 컴포넌트 구조

`render.ts`의 함수를 컴포넌트로 직역. `CardView`/`AppView`(및 `PriceCardView`·
`SparkView`·`NoteView`·`Chip`)가 **그대로 props 타입**이 된다.

- `<App view={AppView}>` — 헤더(절기·스케치·블롭)·필터·리스트·제철·곧 제철·푸터
- `<ProduceCard card={CardView}>` — `<details>`(펼침) + summary/open
- `<PriceBlock price={PriceCardView}>` — 취소선·칩·큰가격·개당값, `change` 유니온을 분기
- `<Sparkline spark={SparkView}>` — 인라인 SVG
- `<PeakDot>` — 절정 dot + 툴팁 (client 컴포넌트, 아래 인터랙션)
- `<Note note={NoteView}>` — 장보기 노트
- 스파크라인 좌표·개당값·등락 판별은 여전히 `card.ts`에서 계산돼 props로 도착
  (컴포넌트는 표시만).

## 인터랙션 — CSS 우선 유지

- **카드 펼침**: `<details>`를 JSX에서 그대로. React 상태 없음, SSR/프리렌더 그대로.
- **과일/채소 필터**: 라디오 + `:checked ~` CSS를 JSX에서 그대로. 클라 JS 0.
- **절정 dot 툴팁**: 데스크톱 hover/focus는 CSS. 터치 탭 토글만 **작은 client
  컴포넌트**(`<PeakDot>`)에서 처리 — 탭 시 카드 펼침을 막고(`preventDefault`) 자기
  툴팁만 여닫음. 현행 `main.ts` 위임 핸들러의 React 판.
- 원칙: **공개 페이지는 최대한 무JS**. 필요한 client 경계는 절정 dot 하나로 국한.

## 스타일

`src/style.css`를 루트에서 import. DESIGN.md 토큰·클래스(가격 블록·스파크·노트·필터·
절정 dot·헤더)는 **그대로**. 마크업 클래스명을 컴포넌트에서 동일하게 유지해 CSS 재사용.

## 테스트

- **순수 로직 테스트(card/picks/app/season/…)는 그대로** — 이 마이그레이션의 핵심
  회귀 가드. 프레임워크와 무관하므로 손대지 않는다.
- `render.test.ts`(HTML 문자열)는 **컴포넌트 테스트로 대체** — `@testing-library/react`
  + jsdom 환경(vitest)로 렌더 결과 검증(핵심 요소 존재·`change` 분기·필터 마크업).
  (devDependencies 추가 — 아래 원칙 개정 참고.)
- 실측 QA: 현행과 동일하게 브라우저(390px)에서 파리티 확인(펼침·필터·툴팁·스파크·노트).

## 배포 — 지금은 정적, 서버는 다음 사이클

- 공개 라우트를 **프리렌더**해 정적 산출물 생성 → **오늘의 정적 호스트 그대로**
  (Cloudflare Pages / GitHub Pages). 인프라 변경·사용자 액션 불필요.
- `deploy.yml`을 TanStack Start 프리렌더 빌드 산출물 배포로 개정. `base` 경로 환경변수
  관례(루트/하위경로)는 유지 검토.
- **다음 사이클**(인증 도입 시) 서버 타겟(Cloudflare Workers)으로 전환 + `createServerFn`
  도입. 이번엔 하지 않음.

## 문서·원칙 개정

- **CLAUDE.md**: "런타임 의존성 0"·"devDependencies는 vite/vitest/typescript만"·
  "광고·로그인·추적 없음"을 이 방향 전환에 맞게 개정. React·TanStack Start·(테스트)
  RTL이 새 의존성. 단 **이번 사이클 한정 원칙 유지**: 런타임 외부요청 없음, 공개 페이지
  경량·무추적, 담백한 한국어. (로그인·개인화는 다음 사이클에 원칙 재개정.)
- **DESIGN.md**: 비주얼 시스템 유지. 변경 없음.
- **CONTEXT.md**: CardView 심 그대로 유효. 컴포넌트 계층 용어 추가 가능.

## 마이그레이션 접근

- 새 브랜치에서 진행. 순수 모듈은 **그대로 이동**, 뷰만 재작성.
- 파리티 기준: 기존 순수 테스트 전부 green + 컴포넌트 테스트 + 브라우저 실측이
  리팩토링 전과 동일해야 완료.
- TanStack Start 스캐폴딩(CLI/템플릿)으로 골격을 세우고, `src/`의 순수 모듈을 얹은 뒤
  라우트·컴포넌트를 구성.

## 리스크 / 열린 질문

- **alpha 프리렌더**: 착수 초기에 "라우트 로더로 JSON 읽어 프리렌더 → 순수 정적 HTML"이
  매끄러운지 **작은 스파이크로 먼저 검증**. 막히면 대안(정적 산출 보강, 혹은 스택
  재검토)을 조기에 판단. (전체 이식 전에 이 스파이크를 게이트로 둔다.)
- **정적 호스트 선택**: Cloudflare Pages vs GitHub Pages — 현행 유지(둘 다 가능).
- **RTL/jsdom 도입**: 컴포넌트 테스트 범위(핵심만 vs 전면)는 구현 계획에서 확정.
- **base 경로**: 프리렌더에서 하위경로 배포가 필요한지 확인.

## 비범위 (명시)

계정·로그인·세션·개인화·저장목록·알림·실시간·서버 함수 실사용·서버 배포·런타임 KAMIS.
전부 다음 사이클. 이 스펙은 **뷰 계층의 TanStack Start 이식 + 정적 배포 유지**에 한정한다.
