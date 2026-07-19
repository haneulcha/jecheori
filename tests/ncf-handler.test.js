import { describe, expect, test } from 'vitest'
import { commitJson, main } from '../scripts/ncf/index.mjs'

const b64 = (s) => Buffer.from(s, 'utf-8').toString('base64')
const bodyOf = (obj) => JSON.stringify(obj, null, 2) + '\n'

/** 호출을 기록하고 url별 응답을 돌려주는 fetch 목. */
function mockFetch(routes) {
  const calls = []
  const fetchFn = async (url, opts = {}) => {
    calls.push({ url, method: opts.method ?? 'GET', body: opts.body })
    for (const [test, res] of routes) if (test(url, opts)) return res(url, opts)
    return { ok: true, json: async () => ({}) } // 기본: ping 등
  }
  return { fetchFn, calls }
}

describe('commitJson', () => {
  const obj = { a: 1 }

  test('없던 파일(404)이면 sha 없이 PUT하고 committed', async () => {
    const { fetchFn, calls } = mockFetch([
      [(u, o) => o.method === 'PUT', () => ({ ok: true, json: async () => ({}) })],
      [() => true, () => ({ ok: false, status: 404 })], // GET
    ])
    const r = await commitJson({ repo: 'o/r', token: 't', path: 'p.json', obj, message: 'm', fetchFn })
    expect(r).toBe('committed')
    const put = calls.find((c) => c.method === 'PUT')
    expect(JSON.parse(put.body).sha).toBeUndefined()
  })

  test('내용이 같으면 PUT 없이 unchanged', async () => {
    const { fetchFn, calls } = mockFetch([
      [() => true, () => ({ ok: true, json: async () => ({ sha: 'x', content: b64(bodyOf(obj)) }) })],
    ])
    const r = await commitJson({ repo: 'o/r', token: 't', path: 'p.json', obj, message: 'm', fetchFn })
    expect(r).toBe('unchanged')
    expect(calls.some((c) => c.method === 'PUT')).toBe(false)
  })

  test('내용이 다르면 기존 sha로 PUT하고 committed', async () => {
    const { fetchFn, calls } = mockFetch([
      [(u, o) => o.method === 'PUT', () => ({ ok: true, json: async () => ({}) })],
      [() => true, () => ({ ok: true, json: async () => ({ sha: 'x', content: b64('다른내용') }) })],
    ])
    const r = await commitJson({ repo: 'o/r', token: 't', path: 'p.json', obj, message: 'm', fetchFn })
    expect(r).toBe('committed')
    expect(JSON.parse(calls.find((c) => c.method === 'PUT').body).sha).toBe('x')
  })
})

const HC = 'https://hc-ping.com/abc'
const baseParams = {
  KAMIS_CERT_KEY: 'k',
  KAMIS_CERT_ID: 'i',
  GITHUB_TOKEN: 't',
  GITHUB_REPO: 'o/r',
  HEALTHCHECK_URL: HC,
}
const snapshot = { surveyedOn: '2026-07-13', entries: [{ itemName: '감자', price: 344 }] }

describe('main — 데드맨 스위치 + 커밋', () => {
  test('성공: /start·성공 ping, GitHub 커밋, ok:true', async () => {
    const { fetchFn, calls } = mockFetch([
      [(u, o) => u.includes('api.github.com') && o.method === 'PUT', () => ({ ok: true, json: async () => ({}) })],
      [(u) => u.includes('api.github.com'), () => ({ ok: false, status: 404 })],
    ])
    const r = await main(baseParams, { buildLatestSnapshot: async () => snapshot, fetch: fetchFn })
    expect(r.ok).toBe(true)
    expect(r.result).toBe('committed')
    expect(r.priced).toBe(1)
    const pings = calls.map((c) => c.url)
    expect(pings).toContain(`${HC}/start`)
    expect(pings).toContain(HC) // 성공(접미 없음)
    expect(pings).not.toContain(`${HC}/fail`)
  })

  test('수집 실패(406 throw): /start·/fail ping, 성공 ping 없음, ok:false', async () => {
    const { fetchFn, calls } = mockFetch([])
    const r = await main(baseParams, {
      buildLatestSnapshot: async () => {
        throw new Error('KAMIS HTTP 406 (부류 100)')
      },
      fetch: fetchFn,
    })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/406/)
    const pings = calls.map((c) => c.url)
    expect(pings).toContain(`${HC}/start`)
    expect(pings).toContain(`${HC}/fail`)
    expect(pings).not.toContain(HC) // 성공 ping은 안 나감
  })

  test('돌았지만 유효가격 0건이면 실패(/fail)로 취급', async () => {
    const { fetchFn, calls } = mockFetch([])
    const r = await main(baseParams, {
      buildLatestSnapshot: async () => ({ surveyedOn: '2026-07-13', entries: [{ itemName: '감자', price: null }] }),
      fetch: fetchFn,
    })
    expect(r.ok).toBe(false)
    expect(calls.map((c) => c.url)).toContain(`${HC}/fail`)
  })

  test('키가 없으면 KAMIS 호출 전에 실패(/fail)', async () => {
    const { fetchFn, calls } = mockFetch([])
    let built = false
    const r = await main(
      { ...baseParams, KAMIS_CERT_KEY: '' },
      { buildLatestSnapshot: async () => { built = true; return snapshot }, fetch: fetchFn },
    )
    expect(r.ok).toBe(false)
    expect(built).toBe(false)
    expect(calls.map((c) => c.url)).toContain(`${HC}/fail`)
  })
})
