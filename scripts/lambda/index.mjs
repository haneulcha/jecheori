// AWS Lambda 핸들러 — 서울 리전(ap-northeast-2, 한국 egress)에서 KAMIS 일일 소매가를
// 수집해 GitHub Contents API로 public/data/prices.json에 직접 커밋한다.
//
// 왜 Lambda 서울인가: KAMIS가 GitHub Actions 러너(해외/데이터센터 IP)를 HTTP 406으로
// 막아 update-prices.yml이 못 돈다. 서울 리전 Lambda는 한국 egress라 정상 수집된다.
// (단 AWS 서울도 "데이터센터 IP"라 KAMIS가 지역이 아닌 ASN 기준으로 막으면 406일 수 있다 —
//  EventBridge 연결 전 수동 test invoke로 200을 먼저 확인한다. docs/aws-lambda.md)
//
// 침묵 실패 감지 = CloudWatch(서드파티 없음): handler가 실패 시 throw하므로
// - 406·빈값·커밋 실패 → Lambda Errors 지표 → 알람          ("돌았는데 실패")
// - 스케줄 미발화 등   → Invocations<1/24h 지표 → 알람       ("아예 안 돎")
// buildLatestSnapshot은 유효가격<50%면 throw하고, 핸들러는 0건도 방어적으로 실패 처리한다 —
// "돌았지만 값이 비었다"가 조용히 성공으로 넘어가지 않는다.
//
// 시크릿은 Lambda 환경변수로 주입: KAMIS_CERT_KEY/ID, GITHUB_TOKEN(Contents read/write),
// GITHUB_REPO("owner/repo").
import { buildLatestSnapshot as realBuild, kstDateString } from '../fetch-prices.mjs'

const GH = 'https://api.github.com'
const PRICES_PATH = 'public/data/prices.json'

/** GitHub Contents API로 obj(JSON)를 path에 커밋. 내용이 같으면 커밋 생략.
 *  반환: 'committed' | 'unchanged'. 실패는 throw(→ 호출부가 실패 반환). */
export async function commitJson({ repo, token, path, obj, message, fetchFn = fetch }) {
  const url = `${GH}/repos/${repo}/contents/${path}`
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'jecheori-lambda',
  }
  const body = JSON.stringify(obj, null, 2) + '\n'
  const b64 = Buffer.from(body, 'utf-8').toString('base64')

  let sha
  const cur = await fetchFn(url, { headers })
  if (cur.ok) {
    const j = await cur.json()
    sha = j.sha
    const current = Buffer.from(j.content, 'base64').toString('utf-8')
    if (current === body) return 'unchanged'
  } else if (cur.status !== 404) {
    throw new Error(`GitHub GET ${cur.status}`)
  }

  const put = await fetchFn(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ message, content: b64, ...(sha ? { sha } : {}) }),
  })
  if (!put.ok) throw new Error(`GitHub PUT ${put.status}`)
  return 'committed'
}

/** 수집 진입점. params = 오버라이드(주로 테스트). deps는 테스트 주입용.
 *  실행 시크릿은 process.env(Lambda 환경변수)에서 읽는다. */
export async function main(params = {}, deps = {}) {
  const cfg = { ...process.env, ...params }
  const buildLatestSnapshot = deps.buildLatestSnapshot ?? realBuild
  const fetchFn = deps.fetch ?? fetch
  const { KAMIS_CERT_KEY, KAMIS_CERT_ID, GITHUB_TOKEN, GITHUB_REPO } = cfg

  try {
    if (!KAMIS_CERT_KEY || !KAMIS_CERT_ID) throw new Error('KAMIS 키가 없습니다')
    if (!GITHUB_TOKEN || !GITHUB_REPO) throw new Error('GITHUB_TOKEN/GITHUB_REPO가 없습니다')

    const snapshot = await buildLatestSnapshot({
      certKey: KAMIS_CERT_KEY,
      certId: KAMIS_CERT_ID,
      from: kstDateString(),
      fetchFn,
    })
    const priced = snapshot.entries.filter((e) => e.price !== null).length
    // buildLatestSnapshot이 유효가격<50%면 이미 throw하지만, "돌았는데 값이 없다"를
    // 실패로 확실히 잡기 위해 0건도 방어적으로 실패 처리한다.
    if (priced === 0) throw new Error('유효 가격 0건 — 수집 실패로 간주')

    const result = await commitJson({
      repo: GITHUB_REPO,
      token: GITHUB_TOKEN,
      path: PRICES_PATH,
      obj: snapshot,
      message: `chore: 가격 데이터 갱신 (${snapshot.surveyedOn})`,
      fetchFn,
    })

    return { ok: true, result, priced, surveyedOn: snapshot.surveyedOn }
  } catch (err) {
    const error = String(err?.message ?? err)
    console.error('일일 가격 수집 실패:', error)
    return { ok: false, error }
  }
}

/** AWS Lambda 진입점 — EventBridge Scheduler가 매일 호출한다. event 페이로드는 쓰지 않고
 *  (시크릿은 Lambda 환경변수 → process.env), main()에 위임한다. 실패 시 throw해 Lambda
 *  호출 자체를 실패로 기록한다 — CloudWatch Errors 알람이 이걸로 뜬다(침묵 실패 감지).
 *  EventBridge 재시도는 안전하다: commitJson이 내용 동일 시 커밋을 생략해 중복 커밋을 안 만든다. */
export async function handler() {
  const result = await main()
  if (!result.ok) throw new Error(result.error ?? '가격 수집 실패')
  return result
}
