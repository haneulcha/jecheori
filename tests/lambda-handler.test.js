import { describe, expect, test } from 'vitest'
import { commitJson, handler, main } from '../scripts/lambda/index.mjs'

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

const baseParams = {
  KAMIS_CERT_KEY: 'k',
  KAMIS_CERT_ID: 'i',
  GITHUB_TOKEN: 't',
  GITHUB_REPO: 'o/r',
}
const snapshot = { surveyedOn: '2026-07-13', entries: [{ itemName: '감자', price: 344 }] }

describe('main — 수집 + 커밋', () => {
  test('성공: GitHub 커밋, ok:true', async () => {
    const { fetchFn } = mockFetch([
      [(u, o) => u.includes('api.github.com') && o.method === 'PUT', () => ({ ok: true, json: async () => ({}) })],
      [(u) => u.includes('api.github.com'), () => ({ ok: false, status: 404 })],
    ])
    const r = await main(baseParams, { buildLatestSnapshot: async () => snapshot, fetch: fetchFn })
    expect(r.ok).toBe(true)
    expect(r.result).toBe('committed')
    expect(r.priced).toBe(1)
  })

  test('수집 실패(406 throw): ok:false, 커밋 없음', async () => {
    const { fetchFn, calls } = mockFetch([])
    const r = await main(baseParams, {
      buildLatestSnapshot: async () => {
        throw new Error('KAMIS HTTP 406 (부류 100)')
      },
      fetch: fetchFn,
    })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/406/)
    expect(calls.some((c) => c.url.includes('api.github.com'))).toBe(false)
  })

  test('돌았지만 유효가격 0건이면 실패로 취급', async () => {
    const { fetchFn } = mockFetch([])
    const r = await main(baseParams, {
      buildLatestSnapshot: async () => ({ surveyedOn: '2026-07-13', entries: [{ itemName: '감자', price: null }] }),
      fetch: fetchFn,
    })
    expect(r.ok).toBe(false)
  })

  test('키가 없으면 KAMIS 호출 전에 실패', async () => {
    const { fetchFn } = mockFetch([])
    let built = false
    const r = await main(
      { ...baseParams, KAMIS_CERT_KEY: '' },
      { buildLatestSnapshot: async () => { built = true; return snapshot }, fetch: fetchFn },
    )
    expect(r.ok).toBe(false)
    expect(built).toBe(false)
  })
})

describe('handler — Lambda 진입점', () => {
  // handler는 deps 주입구가 없어 process.env를 직접 읽는다. 이 테스트가 실제 KAMIS/
  // GitHub 네트워크를 건드리지 않도록, 관련 env를 지워 main()이 첫 키 가드에서
  // (어떤 fetch보다 먼저) 실패하게 만든다 — handler는 그 ok:false를 throw로 승격한다.
  test('수집 실패 시 throw해 Lambda 호출을 실패로 만든다', async () => {
    const KEYS = ['KAMIS_CERT_KEY', 'KAMIS_CERT_ID', 'GITHUB_TOKEN', 'GITHUB_REPO']
    const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]))
    for (const k of KEYS) delete process.env[k]
    try {
      await expect(handler()).rejects.toThrow()
    } finally {
      for (const k of KEYS) if (saved[k] !== undefined) process.env[k] = saved[k]
    }
  })
})
