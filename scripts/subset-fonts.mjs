#!/usr/bin/env node
// 앱 폰트 서브셋 재생성 — 본문(Wanted Sans, OFL) 4벌 + 손글씨(받아쓰기 L, OFL).
// 전체 한글(수백 KB/벌) 대신 콘텐츠(produce.json+season+정적문구)에 쓰인 글자만 서브셋한다.
// produce.json·whyNow·정적 UI 문구를 고쳐 새 음절이 들어오면 이 스크립트를 다시 돌린다.
//   npm run subset:fonts   (사전요구: python3 + fonttools + brotli, curl)
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bodyGlyphs, handGlyphs } from './lib/font-glyphs.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'src/fonts')
const tmp = mkdtempSync(join(tmpdir(), 'subset-'))

const WANTED = 'https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/otf'
const HAND_TTF = 'https://github.com/fonts-archive/HakgyoansimBadasseugi/raw/main/HakgyoansimBadasseugi-L.ttf'
const WEIGHTS = [ ['400', 'Regular'], ['600', 'SemiBold'], ['700', 'Bold'], ['800', 'ExtraBold'] ]

const dl = (url, path) => execFileSync('curl', ['-sL', url, '-o', path])
const subset = (src, chars, out) => {
  const cf = join(tmp, 'chars.txt'); writeFileSync(cf, chars)
  execFileSync('pyftsubset', [src, `--text-file=${cf}`, '--flavor=woff2',
    '--layout-features=*', '--desubroutinize', '--no-hinting', `--output-file=${out}`])
  return Math.round(statSync(out).size / 1024)
}

const bodyChars = [...bodyGlyphs()].sort().join('')
const handChars = [...handGlyphs()].sort().join('')

console.log('· 본문 Wanted Sans 4벌 서브셋…')
for (const [w, name] of WEIGHTS) {
  const src = join(tmp, `w-${w}.otf`); dl(`${WANTED}/WantedSans-${name}.otf`, src)
  const kb = subset(src, bodyChars, join(OUT, `WantedSans-${w}.woff2`))
  console.log(`  ${w}: ${kb}KB`)
}

console.log('· 손글씨 받아쓰기 L 재생성…')
const handSrc = join(tmp, 'hand.ttf'); dl(HAND_TTF, handSrc)
const handKb = subset(handSrc, handChars, join(OUT, 'HakgyoansimBadasseugi-L.woff2'))
console.log(`  ${handKb}KB`)

writeFileSync(join(OUT, 'coverage.json'), JSON.stringify({ body: bodyChars, hand: handChars }) + '\n')
rmSync(tmp, { recursive: true, force: true })
console.log('· 완료: src/fonts/ (WantedSans-*.woff2, HakgyoansimBadasseugi-L.woff2, coverage.json)')
