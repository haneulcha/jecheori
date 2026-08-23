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

// 70장 배치에서 한 장이 걸렸다고 멈추면 나머지를 다시 돌려야 한다.
// 실패는 모아서 끝에 보여주고, 하나라도 실패하면 종료코드를 세운다.
let total = 0
let done = 0
const failed = []
for (const f of files) {
  const out = join(outDir, `${basename(f, '.png')}.webp`)
  try {
    const webp = await normalizeImage(await readFile(join(inDir, f)))
    await writeFile(out, webp)
    total += webp.length
    done++
    console.log(`  ok    ${basename(f, '.png').padEnd(24)} ${(webp.length / 1024).toFixed(1)}KB`)
  } catch (e) {
    failed.push([f, e.message])
    console.log(`  실패  ${basename(f, '.png').padEnd(24)} ${e.message}`)
  }
}

if (done > 0) {
  console.log(`\n${done}장  합계 ${(total / 1024).toFixed(0)}KB  평균 ${(total / done / 1024).toFixed(1)}KB  → ${outDir}`)
}
if (failed.length > 0) {
  console.error(`\n${failed.length}장 실패:`)
  for (const [f, msg] of failed) console.error(`  ${f} — ${msg}`)
  process.exit(1)
}
