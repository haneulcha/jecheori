# 일일 가격 수집 — AWS Lambda (서울 리전 ap-northeast-2)

## 왜 Lambda 서울인가

KAMIS(`www.kamis.or.kr`)가 **해외/데이터센터 IP를 HTTP 406으로 차단**한다. 그래서 GitHub Actions
러너(Azure 미국 IP)에서 도는 `update-prices.yml`이 2026-07-14부터 매일 406으로 실패했고
`prices.json`이 그날 멈췄다. GitHub-호스티드 러너는 리전을 못 고른다.

**해결**: 서울 리전 **AWS Lambda**(ap-northeast-2, 한국 egress)에서 수집한다. 함수가 KAMIS를
불러 `prices.json`을 만들고 **GitHub Contents API로 저장소에 직접 커밋**한다. (씨앗
`coming-prices.json`은 씨앗형이라 로컬에서 1회 수집 — 이 함수 범위 아님.)

핵심 코드는 `scripts/lambda/index.mjs`, 수집 로직은 기존 `scripts/fetch-prices.mjs`(`buildLatestSnapshot`) 재사용.

> ⚠️ **검증 전 가정**: AWS 서울도 "데이터센터 IP"다. KAMIS가 지역이 아니라 **ASN(데이터센터)
> 기준으로** 막으면 서울 Lambda도 406일 수 있다(Naver·AWS는 다른 ASN이라 결과가 다를 수 있음).
> 그래서 **EventBridge 스케줄을 붙이기 전에 수동 test invoke로 200을 먼저 확인**한다(4번 스텝).
> 406이면 서울 datacenter가 막힌 것 → residential 한국 IP(집 상시 머신 + cron)로 피벗한다.

## 데드맨 스위치 (침묵 실패 감지 = CloudWatch)

가장 위험한 실패는 "함수 에러"가 아니라 **"아예 안 돎"** 과 **"돌았는데 유효값을 못 받음"** 이다.
서드파티 없이 **CloudWatch 알람 2개**로 셋 다 잡는다(5번 스텝에서 생성):

| 상황 | 신호 | 감지 |
|---|---|---|
| 406·유효가격 0건·커밋 실패 | `handler`가 throw → **Lambda Errors** 지표 ≥1 | Errors 알람 |
| 아예 안 돎(스케줄 미발화 등) | **Invocations** 지표 < 1 / 24h | Invocations 알람 |
| 성공(유효 가격 커밋/무변경) | Errors 0, Invocations ≥1 | (알람 없음) |

`buildLatestSnapshot`은 유효가격 비율<50%면 throw하고, 핸들러는 0건도 방어적으로 실패 처리한다 —
"돌았지만 값이 비었다"가 조용히 성공으로 넘어가지 않고 `handler` throw로 이어져 Errors 알람이 뜬다.

## 준비물 (Lambda 환경변수)

| 이름 | 값 |
|---|---|
| `KAMIS_CERT_KEY` / `KAMIS_CERT_ID` | KAMIS 오픈API 인증키 |
| `GITHUB_TOKEN` | fine-grained PAT — 이 저장소에 **Contents: Read and write** 권한만 |
| `GITHUB_REPO` | `haneulcha/jecheori` |

> `GITHUB_TOKEN`은 저장소 전체 권한이 아니라 **Contents만** 주는 fine-grained PAT를 쓴다(폭발 반경 최소화).
> Lambda 환경변수는 기본 KMS 키로 저장 시 암호화된다. 더 조이려면 SSM/Secrets Manager로 옮길 수 있으나 현재는 오버스펙.

## 1. 번들 빌드

```bash
npm run build:lambda
# → dist/lambda/index.js (CJS, 모든 의존성 인라인) + dist/lambda/package.json
cd dist/lambda && zip -r ../lambda-fetch-prices.zip . && cd -
# → dist/lambda-fetch-prices.zip
```

`dist/`는 gitignore(커밋 안 함). 배포할 때마다 로컬에서 빌드한다.

## 2. Lambda 함수 생성

AWS Console → **Lambda** → **Create function**(리전을 **ap-northeast-2 / 서울**로 반드시 먼저 전환):

- 이름: `jecheori-fetch-prices`
- 런타임: **Node.js 22.x**, 아키텍처: 기본(x86_64 or arm64 무관)
- **코드**: `dist/lambda-fetch-prices.zip` 업로드 (Upload from → .zip file)
- **핸들러**: `index.handler` (Runtime settings → Edit)
- **타임아웃**: **60초로 상향** (기본 3초는 너무 짧다 — KAMIS 부류별 호출 + 최대 7일 소급).
  Configuration → General configuration → Timeout.
- **환경변수**: 위 4개 (Configuration → Environment variables).
- 실행 역할(execution role): 기본 생성(CloudWatch Logs 권한)이면 충분 — 외부 AWS 리소스 접근 없음.

## 3. 첫 수동 test invoke = **게이트** (반드시)

EventBridge를 붙이기 **전에** 콘솔의 **Test** 버튼으로 1회 실행(이벤트 페이로드는 아무 `{}`):

- 반환 `{ ok: true, priced: N, surveyedOn: "YYYY-MM-DD" }` → **한국 egress OK, 진행**.
- 반환/로그에 **406** → **AWS 서울 ASN이 KAMIS에 막힘.** 여기서 멈추고 residential(집 상시 머신 +
  launchd/cron) 방식으로 피벗한다. (Lambda·EventBridge에 시간 더 쓰지 않는다.)
- 그다음 **커밋 확인**: 저장소에 `chore: 가격 데이터 갱신 (조사일)` 커밋 + `public/data/prices.json` 갱신.

## 4. EventBridge Scheduler cron

당일 소매가는 오후에 공표되고 일·공휴일엔 조사가 없다(함수가 최대 7일 소급). 17:00 KST 실행:

AWS Console → **EventBridge** → **Scheduler** → **Create schedule**:

- 일정 유형: **Cron-based**, 표현식 **`cron(0 17 * * ? *)`**.
- **타임존: `Asia/Seoul`** (Scheduler는 타임존을 네이티브 지원 — UTC 환산 불필요).
- 대상: **AWS Lambda → Invoke**, 함수 = `jecheori-fetch-prices`.
- **재시도**: Maximum retries = 2, Maximum age = 1시간 정도(당일 내 일시 오류만 흡수).
  재시도는 안전하다 — `commitJson`이 내용 동일 시 커밋을 생략해 중복 커밋을 안 만든다.
- 권한: 스케줄이 Lambda를 호출할 역할은 콘솔이 자동 생성하도록 둔다.

## 5. CloudWatch 알람 (침묵 실패 감지)

먼저 알림 받을 **SNS 토픽**(예: `jecheori-alerts`)을 만들고 이메일 구독을 confirm한다.
그다음 CloudWatch → **Alarms** → Create에서 알람 2개(둘 다 액션 = 위 SNS 토픽):

- **Errors 알람** — Lambda > By Function Name > `jecheori-fetch-prices` **Errors**.
  통계 **Sum**, 기간 1일, 임계 **> 0 → ALARM**. (406·빈값·커밋 실패 시 handler가 throw → 여기서 뜬다.)
  참고: EventBridge 재시도가 결국 성공해도 실패한 시도가 Errors≥1로 남아 알람이 뜰 수 있다 —
  일 1회 잡에선 감내할 만하다(데이터는 커밋됨). 노이즈가 거슬리면 나중에 조인다.
- **Invocations 알람("안 돎")** — 같은 함수의 **Invocations**.
  통계 **Sum**, 기간 1일, 임계 **< 1 → ALARM**, **결측 데이터 = breaching**(0회면 지표가 아예 없을 수 있어 이 설정이 필요).

## 실패 시 동작

- KAMIS 406·네트워크 오류 → `main`이 `{ok:false}` 반환 → `handler` throw → `prices.json` **미변경**(기존 파일 보존), Lambda Errors 지표↑.
- 유효가격 0건 → 실패 처리, 미변경.
- 내용 동일 → 커밋 생략(`unchanged`), `ok:true` 정상 실행(Errors 없음).

## 지렛대 지도

| 하고 싶은 것 | 어디 |
|---|---|
| 수집·커밋·실패신호 로직 | `scripts/lambda/index.mjs` (`main`/`commitJson`/`handler`) |
| KAMIS 수집 규칙(부류·소급·유효비율) | `scripts/fetch-prices.mjs` (`buildLatestSnapshot`/`buildSnapshot`) — Lambda와 공유 |
| 번들/배포 | `npm run build:lambda` → zip → Lambda 업로드 |
| 실행 스케줄 | EventBridge Scheduler cron (`Asia/Seoul`) |
| 침묵 실패 알림 | CloudWatch Errors·Invocations 알람 → SNS |

## 참고

- 씨앗(`coming-prices.json`) 수집: `npm run fetch:coming-prices` — 한국 IP 로컬에서 1회. (`docs/제품-동작-지도.md`)
- 예전 GitHub 워크플로(`update-prices.yml`·`fetch-coming-prices.yml`)는 IP 차단으로 못 돌아 제거했다.
