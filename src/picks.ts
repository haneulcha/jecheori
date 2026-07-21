import type { Baseline, PriceEntry, PriceSnapshot, ProduceProfile, Unit } from './types'

export type CompareBasis = 'weekAgo' | 'twoWeeksAgo' | 'monthAgo'

export interface ValueComparison {
  basis: CompareBasis
  basisLabel: string
  pct: number // (price - base)/base*100, 음수 = 기준보다 쌈
}

export interface PriceView {
  price: number
  unit: Unit
  /** 1개월 전 대비 % (음수 = 하락). 기준선이 없으면 null */
  changeVsMonthAgoPct: number | null
  /** 1주전→2주전→지난달 우선도로 첫 non-null 기준 대비 비교. 표시용(칩·큰가격).
   *  평년·작년은 궤적/기준선으로만 보이고 이 비교엔 들어가지 않는다 — 헤드라인은 최근 움직임. */
  comparison: ValueComparison | null
  baseline: Baseline
}

export interface PickResult {
  profile: ProduceProfile
  inPeak: boolean
  price: PriceView | null
}

const BASIS_ORDER: { key: CompareBasis; label: string }[] = [
  { key: 'weekAgo', label: '지난 주' },
  { key: 'twoWeeksAgo', label: '2주전' },
  { key: 'monthAgo', label: '지난달' },
]

/** 1주전→2주전→지난달 순 첫 non-null 기준 대비 비교. 다 없으면 null. */
export function valueComparison(price: number, b: Baseline): ValueComparison | null {
  for (const { key, label } of BASIS_ORDER) {
    const ref = b[key]
    if (ref !== null && ref !== undefined) {
      return { basis: key, basisLabel: label, pct: ((price - ref) / ref) * 100 }
    }
  }
  return null
}

export function seasonalThisMonth(profiles: ProduceProfile[], month: number): ProduceProfile[] {
  return profiles.filter((p) => p.seasonMonths.includes(month))
}

export function matchEntry(profile: ProduceProfile, entries: PriceEntry[]): PriceEntry | null {
  if (!profile.kamis) return null
  const byName = entries.filter((e) => e.itemName === profile.kamis!.itemName && e.price !== null)
  if (byName.length === 0) return null
  const kind = profile.kamis.kindName
  let byKind = byName
  if (kind) {
    // 정확일치 우선 — "갈비"가 "갈비살"을 substring 오매칭하는 걸 막는다.
    // 정확일치가 없을 때만 부분일치로 폴백(예: "신선"→"신선냉장", "샤인"→"샤인머스캣").
    const exact = byName.filter((e) => e.kindName === kind)
    byKind = exact.length ? exact : byName.filter((e) => e.kindName.includes(kind))
  }
  if (byKind.length === 0) return null
  // rank 지정 시 그 등급/원산지만 (한우 1++등급, 수입 미국산 등). 없으면 기존대로 '상품' 선호.
  const rank = profile.kamis.rank
  const byRank = rank ? byKind.filter((e) => e.rank === rank) : byKind
  if (byRank.length === 0) return null
  return byRank.find((e) => e.rank === '상품') ?? byRank[0]
}

export function priceView(entry: PriceEntry): PriceView | null {
  if (entry.price === null) return null
  const { monthAgo } = entry.baseline
  const change = monthAgo !== null ? ((entry.price - monthAgo) / monthAgo) * 100 : null
  return {
    price: entry.price,
    unit: entry.unit,
    changeVsMonthAgoPct: change,
    comparison: valueComparison(entry.price, entry.baseline),
    baseline: entry.baseline,
  }
}

export interface ComingPick {
  profile: ProduceProfile
  peak: boolean
}

export interface ComingGroup {
  month: number
  items: ComingPick[]
}

/** 앞으로 horizon개월, 각 달에 새로 드는 품목을 달별로. 현재 달 제외,
 *  가장 이른 달에 한 번만, 연말 랩어라운드, 배정된 달의 절정 여부 표시. */
export function comingMonths(
  profiles: ProduceProfile[],
  month: number,
  horizon = 2,
): ComingGroup[] {
  const wrap = (m: number) => ((m - 1) % 12) + 1
  const assigned = new Set<string>()
  const groups: ComingGroup[] = []
  for (let k = 1; k <= horizon; k++) {
    const mk = wrap(month + k)
    const items: ComingPick[] = []
    for (const profile of profiles) {
      if (profile.seasonMonths.includes(month)) continue // 이번 달은 "지금"
      if (assigned.has(profile.id)) continue // 먼저 든 달에만
      if (!profile.seasonMonths.includes(mk)) continue
      assigned.add(profile.id)
      items.push({ profile, peak: profile.peakMonths.includes(mk) })
    }
    if (items.length > 0) groups.push({ month: mk, items })
  }
  return groups
}

/** 하락 픽이 하나라도 있는지 */
export function hasDrops(picks: PickResult[]): boolean {
  return picks.some((p) => p.price != null && p.price.changeVsMonthAgoPct != null && p.price.changeVsMonthAgoPct < 0)
}

/** 이번 달 제철 전체를 픽으로. cap·정렬 없음 — 정렬은 cardlist.sortCards, 표시 조립은 app.ts. */
export function selectPicks(
  profiles: ProduceProfile[],
  snapshot: PriceSnapshot | null,
  today: Date,
): PickResult[] {
  const month = today.getMonth() + 1
  return seasonalThisMonth(profiles, month).map((profile) => {
    const entry = snapshot ? matchEntry(profile, snapshot.entries) : null
    return {
      profile,
      inPeak: profile.peakMonths.includes(month),
      price: entry ? priceView(entry) : null,
    }
  })
}
