import type { PriceSnapshot, ProduceProfile } from './types'
import { comingSoon, hasDrops, seasonalThisMonth, selectPicks } from './picks'
import { toCardView } from './card'
import { currentTerm } from './season'
import { snapshotAgeDays } from './data'
import type { AppView } from './render'

const label = (p: ProduceProfile) => ({ emoji: p.emoji, name: p.name })

/** 원시 데이터(프로필·스냅샷·시계) → 화면 뷰. 순수 함수 — "무엇을 보여줄지" 조립을 한 곳에 모은다. */
export function buildAppView(
  profiles: ProduceProfile[],
  snapshot: PriceSnapshot | null,
  now: Date,
): AppView {
  const month = now.getMonth() + 1
  const picks = selectPicks(profiles, snapshot, now)
  return {
    cards: picks.map((p) => toCardView(p, month)),
    noDrop: picks.length > 0 && !hasDrops(picks),
    seasonal: seasonalThisMonth(profiles, month).map(label),
    coming: comingSoon(profiles, month).map(label),
    date: now,
    staleDays: snapshot ? snapshotAgeDays(snapshot, now) : 0,
    term: currentTerm(now),
  }
}
