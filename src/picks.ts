import type { PriceEntry, PriceSnapshot, ProduceProfile } from './types'

export interface PriceView {
  price: number
  unit: string
  /** 1개월 전 대비 % (음수 = 하락). 1개월 전 가격이 없으면 null */
  changeVsMonthAgoPct: number | null
  priceMonthAgo: number | null
  priceYearAgo: number | null
}

export interface PickResult {
  profile: ProduceProfile
  inPeak: boolean
  price: PriceView | null
}

export function seasonalThisMonth(profiles: ProduceProfile[], month: number): ProduceProfile[] {
  return profiles.filter((p) => p.seasonMonths.includes(month))
}

export function matchEntry(profile: ProduceProfile, entries: PriceEntry[]): PriceEntry | null {
  const byName = entries.filter(
    (e) => e.itemName === profile.kamis.itemName && e.price !== null,
  )
  if (byName.length === 0) return null
  const kind = profile.kamis.kindName
  const byKind = kind ? byName.filter((e) => e.kindName.includes(kind)) : byName
  if (byKind.length === 0) return null
  return byKind.find((e) => e.rank === '상품') ?? byKind[0]
}

export function priceView(entry: PriceEntry): PriceView | null {
  if (entry.price === null) return null
  const change =
    entry.priceMonthAgo !== null
      ? ((entry.price - entry.priceMonthAgo) / entry.priceMonthAgo) * 100
      : null
  return {
    price: entry.price,
    unit: entry.unit,
    changeVsMonthAgoPct: change,
    priceMonthAgo: entry.priceMonthAgo,
    priceYearAgo: entry.priceYearAgo,
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

/** 정렬: 절정 그룹 먼저 → 그룹 안에서 하락률 큰 순 → 가격 결측은 그룹 맨 뒤 */
export function selectPicks(
  profiles: ProduceProfile[],
  snapshot: PriceSnapshot | null,
  today: Date,
  limit = 5,
): PickResult[] {
  const month = today.getMonth() + 1
  const results: PickResult[] = seasonalThisMonth(profiles, month).map((profile) => {
    const entry = snapshot ? matchEntry(profile, snapshot.entries) : null
    return {
      profile,
      inPeak: profile.peakMonths.includes(month),
      price: entry ? priceView(entry) : null,
    }
  })
  const groupOf = (r: PickResult) => (r.price === null ? 2 : r.price.changeVsMonthAgoPct === null ? 1 : 0)
  results.sort((a, b) => {
    if (a.inPeak !== b.inPeak) return a.inPeak ? -1 : 1
    const ga = groupOf(a)
    const gb = groupOf(b)
    if (ga !== gb) return ga - gb
    if (ga === 0) return a.price!.changeVsMonthAgoPct! - b.price!.changeVsMonthAgoPct!
    return 0
  })
  return results.slice(0, limit)
}
