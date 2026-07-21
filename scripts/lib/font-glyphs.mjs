// 폰트 서브셋 생성(scripts/subset-fonts.mjs)과 커버리지 가드(tests/font-coverage.test.ts)가
// 공유하는 "필요 글자" 계산. 둘이 같은 로직을 쓰므로, 콘텐츠를 바꾸고 서브셋을 다시 안
// 돌리면 coverage.json이 낡아 가드가 깨진다.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const readText = (p) => readFileSync(join(ROOT, p), 'utf8')
const loadProduce = () => JSON.parse(readText('public/data/produce.json'))

// 손글씨(.why=whyNow)에 흔히 섞이는 문장부호·숫자. 손글씨 폰트만 이 세트를 여백으로 받는다.
export const HAND_PUNCT = "0123456789 .,·–—…“”‘’()~%/"

const stripSpace = (set) => {
  for (const c of [...set]) if (/\s/.test(c)) set.delete(c)
  return set
}

/** 절기명(‘소서’ 등) — season.ts 를 원문으로 읽어 name 리터럴만 뽑는다. */
function seasonTermChars() {
  const src = readText('src/season.ts')
  const chars = new Set()
  for (const m of src.matchAll(/name:\s*'([^']+)'/g)) for (const c of m[1]) chars.add(c)
  return chars
}

export function bodyGlyphs() {
  const chars = new Set()
  for (const p of loadProduce()) {
    for (const c of p.name ?? '') chars.add(c)
    for (const c of p.kind ?? '') chars.add(c)
    for (const k of ['howToPick', 'howToStore', 'howToUse']) for (const c of p[k] ?? '') chars.add(c)
    for (const line of Object.values(p.whyNow ?? {})) for (const c of line) chars.add(c)
  }
  for (const c of seasonTermChars()) chars.add(c)
  for (const c of readText('scripts/lib/font-extra-glyphs.txt')) chars.add(c)
  return stripSpace(chars)
}

export function handGlyphs() {
  const chars = new Set()
  for (const p of loadProduce()) {
    for (const c of p.name ?? '') chars.add(c)
    for (const c of p.kind ?? '') chars.add(c)
    for (const line of Object.values(p.whyNow ?? {})) for (const c of line) chars.add(c)
  }
  for (const c of HAND_PUNCT) chars.add(c)
  return stripSpace(chars)
}
