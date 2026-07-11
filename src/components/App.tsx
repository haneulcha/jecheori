import { useEffect } from 'react'
import type { AppView } from '../view-types'
import { weekLabel } from '../week'
import { ProduceCard } from './ProduceCard'

const Sprig = () => (
  <svg className="sprig" viewBox="0 0 120 120" fill="none" aria-hidden="true">
    <path d="M20 110 C 45 85, 70 55, 98 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M46 82 C 38 68, 40 58, 52 50 C 56 62, 54 72, 46 82 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M64 60 C 74 46, 86 42, 98 46 C 92 58, 80 64, 64 60 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M34 96 C 26 88, 24 78, 30 70 C 38 76, 40 88, 34 96 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="98" cy="18" r="4" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

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
  const { cards, noDrop, seasonal, coming, date, staleDays, term } = view
  usePeakDotTooltip()
  const month = date.getMonth() + 1
  const eyebrow = term ? `${term} · ${weekLabel(date)}` : weekLabel(date)
  return (
    <>
      <header>
        <Sprig />
        <p className="week">{eyebrow}</p>
        <h1>지금 장바구니에 담기 좋은 것들</h1>
        {staleDays >= 3 && <p className="stale">가격은 {staleDays}일 전 기준이에요</p>}
      </header>
      <main>
        <section className="picks">
          {cards.length > 0 ? (
            <>
              <input type="radio" name="cat-filter" id="f-all" defaultChecked />
              <input type="radio" name="cat-filter" id="f-fruit" />
              <input type="radio" name="cat-filter" id="f-veg" />
              <div className="filter">
                <label htmlFor="f-all">전체</label>
                <label htmlFor="f-fruit">과일</label>
                <label htmlFor="f-veg">채소</label>
              </div>
              {noDrop && (
                <p className="nodrop">이번 주는 크게 내려온 게 없어요. 제철은 그대로 곁에 있어요.</p>
              )}
              <div className="list">
                {cards.map((c, i) => (
                  <ProduceCard key={i} card={c} />
                ))}
              </div>
            </>
          ) : (
            <p className="empty">이번 달 제철 정보가 아직 없어요</p>
          )}
        </section>
        <section className="seasonal">
          <h2>{month}월의 제철</h2>
          <ul>
            {seasonal.map((c, i) => (
              <li key={i}>{c.emoji} {c.name}</li>
            ))}
          </ul>
        </section>
        {coming.length > 0 && (
          <p className="coming">
            <span>곧 제철</span> · {coming.map((c) => `${c.emoji} ${c.name}`).join(' · ')}
          </p>
        )}
      </main>
      <footer>
        <p>가격: KAMIS(한국농수산식품유통공사) 일별 소매가격 · 전국 평균</p>
      </footer>
    </>
  )
}
