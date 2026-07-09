import type { PriceEntry, PriceSnapshot, ProduceProfile } from './types'

export interface PriceView {
  price: number
  unit: string
  /** 1개월 전 대비 % (음수 = 하락). 1개월 전 가격이 없으면 null */
  changeVsMonthAgoPct: number | null
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
  const pool = byKind.length > 0 ? byKind : byName
  return pool.find((e) => e.rank === '상품') ?? pool[0]
}

export function priceView(entry: PriceEntry): PriceView | null {
  if (entry.price === null) return null
  const change =
    entry.priceMonthAgo !== null
      ? ((entry.price - entry.priceMonthAgo) / entry.priceMonthAgo) * 100
      : null
  return { price: entry.price, unit: entry.unit, changeVsMonthAgoPct: change }
}

export function whyNowLine(profile: ProduceProfile, month: number): string {
  return profile.whyNow[String(month)] ?? profile.whyNow['default'] ?? ''
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
