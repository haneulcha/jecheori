import { useEffect, useState } from 'react'
import { filterCards, searchCards, searchHints, sortCards } from '../cardlist'
import type { AppView, Filter, SortMode } from '../view-types'
import { surveyedLabel, weekLabel } from '../week'
import { FilterBar } from './FilterBar'
import { NavIndex } from './NavIndex'
import { ProduceCard } from './ProduceCard'
import { SearchBar } from './SearchBar'
import { SeasonHint } from './SeasonHint'
import { SortControl } from './SortControl'
import { Sprig } from './Sprig'

// 절정 dot 툴팁: 데스크톱은 CSS hover/focus, 터치는 탭 토글 (문서 위임).
// dot 탭은 카드 펼침(<summary>)을 막고 자기 툴팁만 여닫는다.
function usePeakDotTooltip() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const dot = (e.target as HTMLElement).closest('.peak-dot')
      document.querySelectorAll('.peak-dot.show').forEach((d) => {
        if (d !== dot) d.classList.remove('show')
      })
      if (!dot) return
      e.preventDefault() // 카드 펼침 토글 방지
      dot.classList.toggle('show')
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])
}

export function App({ view }: { view: AppView }) {
  const { cards, noDrop, hasNutrition, hasRecipes, date, freshness, term } = view
  usePeakDotTooltip()
  const [ready, setReady] = useState(false)
  const [filters, setFilters] = useState<Set<Filter>>(new Set())
  const [sort, setSort] = useState<SortMode>('drop')
  const [query, setQuery] = useState('')
  useEffect(() => setReady(true), [])

  const toggle = (f: Filter) =>
    setFilters((prev) => {
      const next = new Set(prev)
      if (next.has(f)) next.delete(f)
      else {
        next.add(f)
        if (f === 'fruit') next.delete('vegetable') // 상호배타
        if (f === 'vegetable') next.delete('fruit')
      }
      return next
    })

  const q = query.trim()
  const searching = q.length > 0
  const base = searchCards(cards, q)
  const shown = sortCards(filterCards(base, filters), sort)
  const hints = searchHints(view.searchIndex, q)
  const eyebrow = term ? `${term} · ${weekLabel(date)}` : weekLabel(date)

  return (
    <>
      <NavIndex current="now" />
      <header>
        <Sprig />
        <p className="week">{eyebrow}</p>
        <h1>이 계절을 맛보는 가장 알뜰한 방법</h1>
        {freshness.kind === 'dated' && (
          <p className="surveyed">{surveyedLabel(freshness.days, freshness.surveyedOn)} · 전국 평균</p>
        )}
      </header>
      <main>
        <section className="picks">
          {cards.length > 0 ? (
            <>
              {ready && (
                <div className="controls">
                  <SearchBar query={query} onChange={setQuery} />
                  <FilterBar filters={filters} onToggle={toggle} />
                  <SortControl sort={sort} onChange={setSort} />
                </div>
              )}
              {noDrop && (
                <p className="nodrop">이번 주는 크게 내려온 게 없어요. 제철은 그대로 곁에 있어요.</p>
              )}
              {shown.length > 0 && (
                <div className="list">
                  {shown.map((c, i) => (
                    <ProduceCard key={c.name + i} card={c} />
                  ))}
                </div>
              )}
              {searching && hints.length > 0 && (
                <div className="off-season">
                  <p className="off-divider">지금은 제철이 아니에요</p>
                  <ul className="hint-list">
                    {hints.map((h, i) => (
                      <SeasonHint key={i} hint={h} />
                    ))}
                  </ul>
                </div>
              )}
              {searching && shown.length === 0 && hints.length === 0 && (
                <p className="empty">'{q}' 제철 품목을 찾지 못했어요</p>
              )}
              {!searching && shown.length === 0 && (
                <p className="empty">조건에 맞는 제철 품목이 없어요</p>
              )}
            </>
          ) : (
            <p className="empty">이번 달 제철 정보가 아직 없어요</p>
          )}
        </section>
      </main>
      <footer>
        <p>가격: KAMIS(한국농수산식품유통공사) 일별 소매가격 · 전국 평균</p>
        {hasNutrition && <p>영양: 식품의약품안전처 국가표준식품성분 · 100g 기준</p>}
        {hasRecipes && <p>레시피: 식품의약품안전처 조리식품 레시피 DB</p>}
      </footer>
    </>
  )
}
