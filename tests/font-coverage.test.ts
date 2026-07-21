import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { bodyGlyphs, handGlyphs } from '../scripts/lib/font-glyphs.mjs'

// coverage.json = scripts/subset-fonts.mjs 가 마지막으로 서브셋한 글자(본문/손글씨).
// 콘텐츠가 바뀌었는데 서브셋을 다시 안 돌리면 이 검사가 깨진다.
const coverage = JSON.parse(readFileSync(new URL('../src/fonts/coverage.json', import.meta.url), 'utf8')) as {
  body: string
  hand: string
}

const missing = (need: Set<string>, have: string) => {
  const has = new Set(have)
  return [...need].filter((c) => !has.has(c)).sort()
}

describe('폰트 서브셋 커버리지', () => {
  it('본문(Wanted Sans)이 앱의 모든 글자를 덮는다', () => {
    expect(missing(bodyGlyphs(), coverage.body)).toEqual([])
  })
  it('손글씨(받아쓰기)가 whyNow의 모든 글자를 덮는다', () => {
    expect(missing(handGlyphs(), coverage.hand)).toEqual([])
  })
})
