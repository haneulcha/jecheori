import { readFileSync } from 'node:fs'

const read = (p) => JSON.parse(readFileSync(new URL(`../public/data/${p}`, import.meta.url), 'utf-8'))
const profiles = read('produce.json')
const snapshot = read('prices.json')

const month = Number(snapshot.surveyedOn.slice(5, 7))

/** picks.ts matchEntry와 같은 규칙 — itemName 일치 + kindName 정확일치 우선(부분일치 폴백) + rank 필터.
 *  kindName까지 봐야 단호박류 함정(itemName은 맞는데 품종이 없는 경우)을 잡는다. */
function match(profile) {
  const byName = snapshot.entries.filter(
    (e) => e.itemName === profile.kamis.itemName && e.price !== null,
  )
  if (byName.length === 0) return { hit: null, reason: 'itemName' }
  const kind = profile.kamis.kindName
  let byKind = byName
  if (kind) {
    // 정확일치 우선 — "갈비"가 "갈비살"을 substring 오매칭하는 걸 막는다.
    // 정확일치가 없을 때만 부분일치로 폴백(예: "신선"→"신선냉장", "샤인"→"샤인머스캣").
    const exact = byName.filter((e) => e.kindName === kind)
    byKind = exact.length ? exact : byName.filter((e) => e.kindName.includes(kind))
  }
  if (byKind.length === 0) return { hit: null, reason: 'kindName' }
  // rank 지정 시 그 등급/원산지만 (한우 1++등급, 수입 미국산 등). 없으면 기존대로 '상품' 선호.
  const rank = profile.kamis.rank
  const byRank = rank ? byKind.filter((e) => e.rank === rank) : byKind
  if (byRank.length === 0) return { hit: null, reason: 'rank' }
  return { hit: byRank.find((e) => e.rank === '상품') ?? byRank[0], reason: null }
}

const matched = []
const unsurveyed = [] // KAMIS가 조사하지 않는 품목 — 실패가 아니다
const offSeason = [] // 이번 달 제철이 아니라 스냅샷에 없는 것 — 정상
const broken = [] // 제철인데 못 맞춘 것 — 진짜 문제

for (const p of profiles) {
  if (!p.kamis) {
    unsurveyed.push(p)
    continue
  }
  const { hit, reason } = match(p)
  if (hit) matched.push(p)
  else if (p.category === 'livestock') broken.push({ profile: p, reason }) // 축산물은 제철 없음 — 미스는 진짜 문제
  else if (!p.seasonMonths.includes(month)) offSeason.push(p)
  else broken.push({ profile: p, reason })
}

const priced = snapshot.entries.filter((e) => e.price !== null).length
console.log(
  `스냅샷: 조사일 ${snapshot.surveyedOn} — ${priced}/${snapshot.entries.length}개 항목에 가격`,
)
console.log(`매칭됨: ${matched.length}/${profiles.length - unsurveyed.length} (KAMIS 참조가 있는 프로필 기준)`)

if (unsurveyed.length > 0) {
  console.log(`\nKAMIS 미조사 — 가격 없이 제철만 표시 (정상, ${unsurveyed.length}개):`)
  for (const p of unsurveyed) console.log(`  · ${p.name}`)
}

if (offSeason.length > 0) {
  console.log(`\n이번 달(${month}월) 제철 아님 — 스냅샷에 없는 게 정상 (${offSeason.length}개):`)
  for (const p of offSeason) console.log(`  · ${p.name}`)
}

if (broken.length > 0) {
  console.log(`\n⚠ 제철인데 가격을 못 맞췄다 — 확인 필요 (${broken.length}개):`)
  for (const { profile: p, reason } of broken) {
    const ref =
      reason === 'kindName'
        ? `kindName="${p.kamis.kindName}" 이 어느 품종과도 안 맞음 (itemName="${p.kamis.itemName}"은 스냅샷에 있음)`
        : reason === 'rank'
          ? `rank="${p.kamis.rank}" 인 행이 없음 (itemName="${p.kamis.itemName}", kindName="${p.kamis.kindName}"까진 맞음)`
          : `itemName="${p.kamis.itemName}" 이 스냅샷에 없음`
    console.log(`  - ${p.name}: ${ref}`)
  }
  process.exitCode = 1
}
