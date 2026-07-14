import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import type { PriceSnapshot } from '../src/types'

// 라우트 로더가 이 파일을 `as unknown as PriceSnapshot`으로 캐스팅해 임포트한다.
// 즉 tsc는 shape 불일치를 못 잡는다 — 그래서 여기서 실제 파일을 타입에 대고 확인한다.
const snapshot: PriceSnapshot = JSON.parse(
  readFileSync(new URL('../public/data/prices.json', import.meta.url), 'utf-8'),
)

describe('커밋된 prices.json', () => {
  test('스키마 버전 2다', () => {
    expect(snapshot.schemaVersion).toBe(2)
  })

  test('조사일이 있고 YYYY-MM-DD 꼴이다', () => {
    expect(snapshot.surveyedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('엔트리가 있고, 과반이 가격을 갖는다 (all-null 스냅샷을 커밋하지 않는다)', () => {
    expect(snapshot.entries.length).toBeGreaterThan(0)
    const priced = snapshot.entries.filter((e) => e.price !== null).length
    expect(priced / snapshot.entries.length).toBeGreaterThan(0.5)
  })

  test('모든 엔트리가 기준선 칸을 갖는다 (평면 priceMonthAgo가 아니다)', () => {
    for (const e of snapshot.entries) {
      expect(e.baseline).toBeDefined()
      expect(e).not.toHaveProperty('priceMonthAgo')
      expect(e).not.toHaveProperty('priceYearAgo')
    }
  })

  test('모든 엔트리의 단위가 구조체이고, 계량은 닫힌 집합 안에 있다', () => {
    for (const e of snapshot.entries) {
      expect(typeof e.unit.quantity).toBe('number')
      expect(e.unit.quantity).toBeGreaterThan(0)
      expect(['kg', 'g', '개', '포기']).toContain(e.unit.measure)
    }
  })
})
