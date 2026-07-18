import type { CardView } from './card'

// SortMode는 Task 6에서 view-types.ts로 옮긴다. 그때 이 로컬 정의를 import로 교체.
export type SortMode = 'drop' | 'name' | 'priceLow'

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
