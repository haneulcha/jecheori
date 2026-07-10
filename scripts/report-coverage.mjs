import { readFileSync } from 'node:fs'

const read = (p) => JSON.parse(readFileSync(new URL(`../public/data/${p}`, import.meta.url), 'utf-8'))
const profiles = read('produce.json')
const snapshot = read('prices.json')

const matched = []
const unmatched = []
for (const p of profiles) {
  const hit = snapshot.entries.find((e) => e.itemName === p.kamis.itemName && e.price !== null)
  ;(hit ? matched : unmatched).push(p)
}

console.log(`스냅샷: ${snapshot.fetchedAt} (${snapshot.entries.length}개 항목)`)
console.log(`매칭됨: ${matched.length}/${profiles.length}`)
if (unmatched.length > 0) {
  console.log('\n가격 매칭 안 됨 (kamis.itemName 확인 필요):')
  for (const p of unmatched) console.log(`  - ${p.name} (itemName="${p.kamis.itemName}")`)
}
