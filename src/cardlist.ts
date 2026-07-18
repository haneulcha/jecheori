import type { CardView } from './card'
import type { Filter, OffSeasonHint, SortMode } from './view-types'

/** CardView의 부호 있는 등락률(하락 음수). 무가격·기준선없음이면 null. */
export function signedChange(card: CardView): number | null {
  const ch = card.price?.change
  if (!ch) return null // price 없음 or change === null(기준선 없음)
  if (ch.kind === 'fall') return -ch.pct
  if (ch.kind === 'rise') return ch.pct
  return 0 // similar
}

function dropGroup(c: CardView): number {
  if (!c.price) return 2 // 무가격 맨 뒤
  if (signedChange(c) === null) return 1 // 가격은 있으나 등락 모름
  return 0
}

/** CardView 목록 정렬 (순수, 원본 불변). drop = 큰 하락 먼저. */
export function sortCards(cards: CardView[], mode: SortMode): CardView[] {
  const arr = [...cards]
  if (mode === 'name') return arr.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  if (mode === 'priceLow')
    return arr.sort((a, b) => (a.price?.now ?? Infinity) - (b.price?.now ?? Infinity))
  return arr.sort((a, b) => {
    const ga = dropGroup(a)
    const gb = dropGroup(b)
    if (ga !== gb) return ga - gb
    if (ga === 0) return signedChange(a)! - signedChange(b)!
    return 0
  })
}

const PRED: Record<Filter, (c: CardView) => boolean> = {
  fruit: (c) => c.category === 'fruit',
  vegetable: (c) => c.category === 'vegetable',
  drop: (c) => c.price?.change?.kind === 'fall',
  peak: (c) => c.inPeak,
  priced: (c) => c.price != null,
}

/** 필터 술어 AND (순수). 과일/채소 상호배타는 UI(FilterBar)가 관장. */
export function filterCards(cards: CardView[], filters: Set<Filter>): CardView[] {
  return cards.filter((c) => [...filters].every((f) => PRED[f](c)))
}

/** 이름 부분일치로 제철 카드 검색 (순수). 빈 쿼리면 전체. */
export function searchCards(cards: CardView[], query: string): CardView[] {
  const q = query.trim()
  return q ? cards.filter((c) => c.name.includes(q)) : cards
}

/** 이름 부분일치로 비제철 힌트 검색 (순수). */
export function searchHints(index: OffSeasonHint[], query: string): OffSeasonHint[] {
  const q = query.trim()
  return q ? index.filter((h) => h.name.includes(q)) : []
}
