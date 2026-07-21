import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import type { ProduceProfile } from '../src/types'

const profiles: ProduceProfile[] = JSON.parse(
  readFileSync(new URL('../public/data/produce.json', import.meta.url), 'utf-8'),
)

describe('produce.json 스키마', () => {
  test('최소 40개 품목이 있다', () => {
    expect(profiles.length).toBeGreaterThanOrEqual(40)
  })

  test.each(profiles.map((p) => [p.id, p] as const))('%s: 필수 필드가 유효하다', (_id, p) => {
    expect(p.id).toMatch(/^[a-z0-9-]+$/)
    expect(p.name.length).toBeGreaterThan(0)
    expect(p.emoji.length).toBeGreaterThan(0)
    expect(['fruit', 'vegetable', 'seafood']).toContain(p.category)
    // kamis는 선택 — KAMIS가 조사하지 않는 품목(가지·옥수수·부추·단호박)은 참조가 없다.
    // 있다면 유효해야 한다. (500 = 축산물, 600 = 수산물)
    if (p.kamis) {
      expect(['100', '200', '400', '500', '600']).toContain(p.kamis.categoryCode)
      expect(p.kamis.itemName.length).toBeGreaterThan(0)
    }
    for (const m of [...p.seasonMonths, ...p.peakMonths]) {
      expect(m).toBeGreaterThanOrEqual(1)
      expect(m).toBeLessThanOrEqual(12)
    }
    // 절정 월은 제철 월의 부분집합
    for (const m of p.peakMonths) expect(p.seasonMonths).toContain(m)
    expect(p.whyNow.default?.length).toBeGreaterThan(0)
    expect(p.howToPick.length).toBeGreaterThan(0)
    expect(p.howToStore.length).toBeGreaterThan(0)
    expect(p.howToUse.length).toBeGreaterThan(0)
  })

  test('id가 중복되지 않는다', () => {
    const ids = profiles.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
