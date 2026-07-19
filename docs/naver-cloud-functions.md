# 일일 가격 수집 — Naver Cloud Functions (서울 리전)

## 왜 NCF인가

KAMIS(`www.kamis.or.kr`)가 **해외/데이터센터 IP를 HTTP 406으로 차단**한다. 그래서 GitHub Actions
러너(Azure 미국 IP)에서 도는 `update-prices.yml`이 2026-07-14부터 매일 406으로 실패했고
`prices.json`이 그날 멈췄다. GitHub-호스티드 러너는 리전을 못 고른다.

**해결**: 서울 리전 **Naver Cloud Functions**에서 수집한다(한국 egress → 200). 함수가 KAMIS를
불러 `prices.json`을 만들고 **GitHub Contents API로 저장소에 직접 커밋**한다. (씨앗
`coming-prices.json`은 씨앗형이라 로컬에서 1회 수집 — 이 함수 범위 아님.)

핵심 코드는 `scripts/ncf/index.mjs`, 수집 로직은 기존 `scripts/fetch-prices.mjs`(`buildLatestSnapshot`) 재사용.

## 데드맨 스위치 (침묵 실패 감지)

가장 위험한 실패는 "함수 에러"가 아니라 **"아예 안 돎"** 과 **"돌았는데 유효값을 못 받음"** 이다.
셋 다 잡도록 healthchecks.io(무료)에 ping한다:

| 상황 | ping | 결과 |
|---|---|---|
| 실행 시작 | `HEALTHCHECK_URL/start` | 타이머 시작 |
| 성공(유효 가격 커밋/무변경) | `HEALTHCHECK_URL` | 타이머 리셋 |
| 406·유효가격 0건·커밋 실패 | `HEALTHCHECK_URL/fail` | **즉시 알림** |
| 아예 안 돎(트리거 실패 등) | (ping 없음) | grace 초과 시 **알림** |

`buildLatestSnapshot`은 유효가격 비율<50%면 throw하고, 핸들러는 0건도 방어적으로 실패 처리한다 —
"돌았지만 값이 비었다"가 조용히 성공으로 넘어가지 않는다.

## 준비물 (시크릿)

| 이름 | 값 |
|---|---|
| `KAMIS_CERT_KEY` / `KAMIS_CERT_ID` | KAMIS 오픈API 인증키 (기존 GitHub Secret과 동일값) |
| `GITHUB_TOKEN` | fine-grained PAT — 이 저장소에 **Contents: Read and write** 권한만 |
| `GITHUB_REPO` | `haneulcha/jecheori` |
| `HEALTHCHECK_URL` | healthchecks.io 체크의 ping URL (예: `https://hc-ping.com/<uuid>`) |

> `GITHUB_TOKEN`은 저장소 전체 권한이 아니라 **Contents만** 주는 fine-grained PAT를 쓴다(폭발 반경 최소화).

## 1. 번들 빌드

```bash
npm run build:ncf
# → dist/ncf/index.js (CJS, 모든 의존성 인라인) + dist/ncf/package.json
cd dist/ncf && zip -r ../ncf-fetch-prices.zip . && cd -
# → dist/ncf-fetch-prices.zip
```

`dist/`는 gitignore(커밋 안 함). 배포할 때마다 로컬에서 빌드한다.

## 2. healthchecks.io 체크 생성

1. healthchecks.io 가입 → **Add Check**.
2. **Period** = 1 day, **Grace** = 6 hours(당일 공표 지연·폴백 소급 여유).
3. 알림 채널(이메일 등) 연결.
4. 생성된 ping URL을 `HEALTHCHECK_URL` 시크릿으로.

## 3. NCF 액션 생성

Naver Cloud Console → **Cloud Functions** → Action 생성:

- 런타임: **Node.js 20**
- 코드: `dist/ncf-fetch-prices.zip` 업로드 (핸들러 = `index.main`)
- **트리거·환경변수(시크릿)**: 위 5개를 액션 파라미터(또는 환경변수)로. 핸들러는
  `params`(바인딩) → `process.env` 순으로 읽는다.

## 4. cron 트리거

당일 소매가는 오후에 공표되고 일·공휴일엔 조사가 없다(함수가 최대 7일 소급). 17:00 KST 실행:

- NCF 트리거 cron: **`0 8 * * *`** (UTC 기준일 때 = 17:00 KST). 콘솔 트리거 타임존이 KST면 `0 17 * * *`.
  → **첫 실행에서 실제 발화 시각을 확인**하고 맞춘다.

## 5. 첫 실행 검증 (반드시)

수동 실행 1회 후 확인:

1. **KR egress 확인**: 함수 반환 `{ ok: true, priced: N, surveyedOn: "YYYY-MM-DD" }` (406이면 `ok:false`
   에 406 — 그럼 NCF가 서울 리전이 아니거나 egress가 한국이 아님).
2. **커밋 확인**: 저장소에 `chore: 가격 데이터 갱신 (조사일)` 커밋 + `public/data/prices.json` 갱신.
3. **healthchecks 확인**: 체크가 up(초록)으로. 실패 케이스 확인하려면 잘못된 키로 1회 → `/fail` 알림 오는지.

## 실패 시 동작

- KAMIS 406·네트워크 오류 → throw → `/fail` ping, `prices.json` **미변경**(기존 파일 보존).
- 유효가격 0건 → 실패 처리(`/fail`), 미변경.
- 내용 동일 → 커밋 생략(`unchanged`)이지만 성공 ping(정상 실행).
- ping은 실패해도 수집을 막지 않는다(ping 오류는 삼킴).

## 지렛대 지도

| 하고 싶은 것 | 어디 |
|---|---|
| 수집·커밋·ping 로직 | `scripts/ncf/index.mjs` (`main`/`commitJson`) |
| KAMIS 수집 규칙(부류·소급·유효비율) | `scripts/fetch-prices.mjs` (`buildLatestSnapshot`/`buildSnapshot`) — NCF와 공유 |
| 번들/배포 | `npm run build:ncf` → zip → NCF 업로드 |
| 실행 스케줄 | NCF cron 트리거 |
| 알림 임계(period·grace) | healthchecks.io 체크 설정 |

## 참고

- 씨앗(`coming-prices.json`) 수집: `npm run fetch:coming-prices` — 한국 IP 로컬에서 1회. (`docs/제품-동작-지도.md`)
- 예전 GitHub 워크플로(`update-prices.yml`·`fetch-coming-prices.yml`)는 IP 차단으로 못 돌아 제거했다.
