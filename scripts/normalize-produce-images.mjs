#!/usr/bin/env node
// 품목 도판 후처리 — 1회성 로컬 작업 (씨앗형, CI 없음. 스펙 §7).
// 사용: node scripts/normalize-produce-images.mjs <원본 PNG 폴더> [출력 폴더]
import { mkdirSync, readdirSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { normalizeImage } from './lib/normalize-image.mjs'

const [inDir, outDir = 'public/assets/produce'] = process.argv.slice(2)
if (!inDir) {
  console.error('사용: node scripts/normalize-produce-images.mjs <원본 PNG 폴더> [출력 폴더]')
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })
const files = readdirSync(inDir).filter((f) => f.endsWith('.png'))
if (files.length === 0) {
  console.error(`${inDir}에 .png가 없다`)
  process.exit(1)
}

let total = 0
for (const f of files) {
  const out = join(outDir, `${basename(f, '.png')}.webp`)
  const webp = await normalizeImage(await readFile(join(inDir, f)))
  await writeFile(out, webp)
  total += webp.length
  console.log(`${out}  ${(webp.length / 1024).toFixed(1)}KB`)
}
console.log(`\n${files.length}장  합계 ${(total / 1024).toFixed(0)}KB  평균 ${(total / files.length / 1024).toFixed(1)}KB`)
