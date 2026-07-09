import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { buildSnapshot, kstDateString } from '../scripts/fetch-prices.mjs'

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/kamis-daily-200.json', import.meta.url), 'utf-8'),
)
const errorFixture = JSON.parse(
  readFileSync(new URL('./fixtures/kamis-error.json', import.meta.url), 'utf-8'),
)

const okFetch = (json) => async () => ({ ok: true, json: async () => json })

describe('kstDateString', () => {
  test('UTC 자정 직전은 KST로 다음 날이다', () => {
    // 2026-07-09 22:00 UTC = 2026-07-10 07:00 KST
    expect(kstDateString(new Date('2026-07-09T22:00:00Z'))).toBe('2026-07-10')
  })
})

describe('buildSnapshot', () => {
  test('부류 3개(100/200/400)를 호출해 엔트리를 합친다', async () => {
    const calls = []
    const fetchFn = async (url) => {
      calls.push(new URL(url).searchParams.get('p_item_category_code'))
      return { ok: true, json: async () => fixture }
    }
    const snap = await buildSnapshot({
      certKey: 'k',
      certId: 'i',
      regday: '2026-07-10',
      fetchFn,
    })
    expect(calls).toEqual(['100', '200', '400'])
    expect(snap.schemaVersion).toBe(1)
    expect(snap.entries).toHaveLength(12) // 픽스처 4행 × 3부류
    expect(new Date(snap.fetchedAt).getTime()).not.toBeNaN()
  })

  test('요청 파라미터에 인증키와 소매 구분이 들어간다', async () => {
    let captured
    const fetchFn = async (url) => {
      captured = new URL(url).searchParams
      return { ok: true, json: async () => fixture }
    }
    await buildSnapshot({ certKey: 'MYKEY', certId: 'MYID', regday: '2026-07-10', fetchFn })
    expect(captured.get('action')).toBe('dailyPriceByCategoryList')
    expect(captured.get('p_cert_key')).toBe('MYKEY')
    expect(captured.get('p_cert_id')).toBe('MYID')
    expect(captured.get('p_product_cls_code')).toBe('01')
    expect(captured.get('p_regday')).toBe('2026-07-10')
    expect(captured.get('p_returntype')).toBe('json')
  })

  test('HTTP 오류면 throw한다', async () => {
    const fetchFn = async () => ({ ok: false, status: 500 })
    await expect(
      buildSnapshot({ certKey: 'k', certId: 'i', regday: '2026-07-10', fetchFn }),
    ).rejects.toThrow(/500/)
  })

  test('KAMIS 오류 응답이면 throw한다', async () => {
    await expect(
      buildSnapshot({
        certKey: 'k',
        certId: 'i',
        regday: '2026-07-10',
        fetchFn: okFetch(errorFixture),
      }),
    ).rejects.toThrow(/KAMIS/)
  })
})
