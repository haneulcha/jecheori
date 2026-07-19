import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import {
  buildLatestSnapshot,
  buildSnapshot,
  kstDateString,
  shiftDateString,
} from '../scripts/fetch-prices.mjs'

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/kamis-daily-200.json', import.meta.url), 'utf-8'),
)
const errorFixture = JSON.parse(
  readFileSync(new URL('./fixtures/kamis-error.json', import.meta.url), 'utf-8'),
)

const okFetch = (json) => async () => ({ ok: true, json: async () => json })

/** 픽스처를 복제하되 모든 행의 당일·1일전을 결측('-')으로 — 공표 전/일요일 응답 */
const blankToday = () => {
  const clone = structuredClone(fixture)
  for (const item of clone.data.item) {
    item.dpr1 = '-'
    item.dpr2 = '-'
  }
  return clone
}

describe('kstDateString', () => {
  test('UTC 자정 직전은 KST로 다음 날이다', () => {
    // 2026-07-09 22:00 UTC = 2026-07-10 07:00 KST
    expect(kstDateString(new Date('2026-07-09T22:00:00Z'))).toBe('2026-07-10')
  })
})

describe('shiftDateString', () => {
  test('하루 전으로 물러난다', () => expect(shiftDateString('2026-07-13', -1)).toBe('2026-07-12'))
  test('월 경계를 넘는다', () => expect(shiftDateString('2026-07-01', -1)).toBe('2026-06-30'))
})

describe('buildSnapshot', () => {
  test('부류 3개(100/200/400)를 호출해 엔트리를 합친다', async () => {
    const calls = []
    const fetchFn = async (url) => {
      calls.push(new URL(url).searchParams.get('p_item_category_code'))
      return { ok: true, json: async () => fixture }
    }
    const snap = await buildSnapshot({ certKey: 'k', certId: 'i', regday: '2026-07-13', fetchFn })
    expect(calls).toEqual(['100', '200', '400'])
    expect(snap.schemaVersion).toBe(3)
    expect(snap.surveyedOn).toBe('2026-07-13')
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

  test('요청에 User-Agent·Accept 헤더를 실어 보낸다 (KAMIS 406 방지)', async () => {
    let opts
    const fetchFn = async (_url, options) => {
      opts = options
      return { ok: true, json: async () => fixture }
    }
    await buildSnapshot({ certKey: 'k', certId: 'i', regday: '2026-07-13', fetchFn })
    expect(opts?.headers?.['User-Agent']).toMatch(/Mozilla/)
    expect(opts?.headers?.Accept).toMatch(/json/)
  })

  test('HTTP 오류면 throw한다', async () => {
    const fetchFn = async () => ({ ok: false, status: 500 })
    await expect(
      buildSnapshot({ certKey: 'k', certId: 'i', regday: '2026-07-10', fetchFn }),
    ).rejects.toThrow(/500/)
  })

  test('KAMIS 오류 응답(200 파라미터 오류)이면 throw한다', async () => {
    await expect(
      buildSnapshot({ certKey: 'k', certId: 'i', regday: '2026-07-10', fetchFn: okFetch(errorFixture) }),
    ).rejects.toThrow(/KAMIS/)
  })

  test('조사 없는 날(001)은 throw가 아니라 빈 엔트리로 돌려준다', async () => {
    // KAMIS는 일요일·공휴일처럼 조사가 없는 날 { data: ["001"] }로 응답한다.
    const noData = { condition: [{ p_returntype: 'json' }], data: ['001'] }
    const snap = await buildSnapshot({ certKey: 'k', certId: 'i', regday: '2026-07-19', fetchFn: okFetch(noData) })
    expect(snap.entries).toEqual([])
  })
})

describe('buildLatestSnapshot', () => {
  test('요청일에 가격이 있으면 그 날짜를 쓴다', async () => {
    const snap = await buildLatestSnapshot({
      certKey: 'k',
      certId: 'i',
      from: '2026-07-13',
      fetchFn: okFetch(fixture),
    })
    expect(snap.surveyedOn).toBe('2026-07-13')
    expect(snap.entries.filter((e) => e.price !== null).length).toBeGreaterThan(0)
  })

  test('당일 가격이 아직 공표되지 않았으면 전날로 물러난다', async () => {
    // 07-13은 전부 결측(공표 전 + 1일전은 일요일), 07-12부터는 정상
    const asked = []
    const fetchFn = async (url) => {
      const regday = new URL(url).searchParams.get('p_regday')
      asked.push(regday)
      return { ok: true, json: async () => (regday === '2026-07-13' ? blankToday() : fixture) }
    }
    const snap = await buildLatestSnapshot({ certKey: 'k', certId: 'i', from: '2026-07-13', fetchFn })
    expect(snap.surveyedOn).toBe('2026-07-12')
    expect(asked).toContain('2026-07-13')
    expect(snap.entries.every((e) => e.price !== null || e.itemName === '당근')).toBe(true)
  })

  test('조사 없는 날(001)은 건너뛰고 직전 조사일로 물러난다 (일요일 시나리오)', async () => {
    // 2026-07-19(일)·07-18(토)은 조사 없음(001), 07-17(금)부터 정상. Lambda가 실제로 이 케이스에서
    // 죽었다 — parseCategoryResponse가 001을 throw해 소급 탐색이 첫날에 멈췄던 회귀를 잡는다.
    const noData = { condition: [{ p_returntype: 'json' }], data: ['001'] }
    const asked = new Set()
    const fetchFn = async (url) => {
      const regday = new URL(url).searchParams.get('p_regday')
      asked.add(regday)
      return { ok: true, json: async () => (regday >= '2026-07-18' ? noData : fixture) }
    }
    const snap = await buildLatestSnapshot({ certKey: 'k', certId: 'i', from: '2026-07-19', fetchFn })
    expect(snap.surveyedOn).toBe('2026-07-17')
    expect(asked.has('2026-07-19')).toBe(true)
    expect(asked.has('2026-07-18')).toBe(true)
    expect(snap.entries.filter((e) => e.price !== null).length).toBeGreaterThan(0)
  })

  test('연휴처럼 조회 구간이 통째로 비면 throw한다 (all-null을 커밋하지 않는다)', async () => {
    await expect(
      buildLatestSnapshot({
        certKey: 'k',
        certId: 'i',
        from: '2026-07-13',
        maxLookbackDays: 3,
        fetchFn: okFetch(blankToday()),
      }),
    ).rejects.toThrow(/유효한 가격/)
  })
})
