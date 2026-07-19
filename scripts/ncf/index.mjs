// Naver Cloud Functions 핸들러 — 서울 리전(한국 egress)에서 KAMIS 일일 소매가를
// 수집해 GitHub Contents API로 public/data/prices.json에 직접 커밋한다.
//
// 왜 NCF인가: KAMIS가 GitHub Actions 러너(해외/데이터센터 IP)를 HTTP 406으로 막아
// update-prices.yml이 못 돈다. NCF는 한국 IP라 정상 수집된다. (docs/naver-cloud-functions.md)
//
// 데드맨 스위치(healthchecks.io): 시작 시 /start, 성공 시 base ping, 실패 시 /fail.
// - 아예 안 돎  → ping 미도착 → grace 초과 시 healthchecks가 알림
// - 406·빈값·에러 → /fail → 즉시 알림  (buildLatestSnapshot이 유효가격<50%면 throw)
// - 성공        → base ping → 타이머 리셋
//
// 시크릿은 NCF 액션 파라미터(바인딩)나 환경변수로 주입: KAMIS_CERT_KEY/ID,
// GITHUB_TOKEN(Contents read/write), GITHUB_REPO("owner/repo"), HEALTHCHECK_URL.
import { buildLatestSnapshot as realBuild, kstDateString } from '../fetch-prices.mjs'

const GH = 'https://api.github.com'
const PRICES_PATH = 'public/data/prices.json'

/** healthchecks ping. 절대 실패를 던지지 않는다 — ping 자체가 수집을 깨면 안 된다. */
async function ping(base, suffix, fetchFn) {
  if (!base) return
  try {
    await fetchFn(base + suffix, { method: 'POST' })
  } catch {
    /* 무시 */
  }
}

/** GitHub Contents API로 obj(JSON)를 path에 커밋. 내용이 같으면 커밋 생략.
 *  반환: 'committed' | 'unchanged'. 실패는 throw(→ 호출부가 /fail). */
export async function commitJson({ repo, token, path, obj, message, fetchFn = fetch }) {
  const url = `${GH}/repos/${repo}/contents/${path}`
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'jecheori-ncf',
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

/** NCF 진입점. params = 바인딩 시크릿 + 트리거 페이로드. deps는 테스트 주입용. */
export async function main(params = {}, deps = {}) {
  const cfg = { ...process.env, ...params }
  const buildLatestSnapshot = deps.buildLatestSnapshot ?? realBuild
  const fetchFn = deps.fetch ?? fetch
  const { KAMIS_CERT_KEY, KAMIS_CERT_ID, GITHUB_TOKEN, GITHUB_REPO, HEALTHCHECK_URL } = cfg

  await ping(HEALTHCHECK_URL, '/start', fetchFn)
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
    // 실패로 확실히 잡기 위해 0건도 방어적으로 실패 처리한다(→ /fail).
    if (priced === 0) throw new Error('유효 가격 0건 — 수집 실패로 간주')

    const result = await commitJson({
      repo: GITHUB_REPO,
      token: GITHUB_TOKEN,
      path: PRICES_PATH,
      obj: snapshot,
      message: `chore: 가격 데이터 갱신 (${snapshot.surveyedOn})`,
      fetchFn,
    })

    await ping(HEALTHCHECK_URL, '', fetchFn) // 성공(커밋 or 변경없음 모두 정상 실행)
    return { ok: true, result, priced, surveyedOn: snapshot.surveyedOn }
  } catch (err) {
    await ping(HEALTHCHECK_URL, '/fail', fetchFn)
    const error = String(err?.message ?? err)
    console.error('일일 가격 수집 실패:', error)
    return { ok: false, error }
  }
}
