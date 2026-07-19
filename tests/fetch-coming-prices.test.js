import { describe, expect, test } from 'vitest'
import { buildComingSeed } from '../scripts/fetch-coming-prices.mjs'

describe('buildComingSeed', () => {
  test('작년 12개월 각 15일을 조회해 months 맵을 만든다', async () => {
    const calls = []
    const buildFn = async (from) => {
      calls.push(from)
      return { entries: [{ itemName: from }] }
    }
    const seed = await buildComingSeed({ year: 2025, buildFn })
    expect(calls).toHaveLength(12)
    expect(calls[0]).toBe('2025-01-15')
    expect(calls[11]).toBe('2025-12-15')
    expect(seed.collectedYear).toBe(2025)
    expect(Object.keys(seed.months)).toHaveLength(12)
    expect(seed.months['1'][0].itemName).toBe('2025-01-15')
    expect(seed.months['12'][0].itemName).toBe('2025-12-15')
  })
})
