import type { ComingView } from '../view-types'
import { weekLabel } from '../week'
import { Sprig } from './Sprig'
import { NavIndex } from './NavIndex'
import { ComingCard } from './ComingCard'

/** 다가오는 제철 전용 페이지. 카드형(껍데기 재활용), 예고는 가볍게. 표시 전용. */
export function Coming({ view }: { view: ComingView }) {
  const { months, date, term } = view
  const eyebrow = term ? `${term} · ${weekLabel(date)}` : weekLabel(date)
  return (
    <>
      <NavIndex current="coming" />
      <header>
        <Sprig />
        <p className="week">{eyebrow}</p>
        <h1>다가오는 제철</h1>
      </header>
      <main>
        {months.length > 0 ? (
          months.map((m) => (
            <section className="coming-month" key={m.month}>
              <h2>{m.month}월</h2>
              <div className="list">
                {m.items.map((it, i) => (
                  <ComingCard key={i} item={it} season={m.season} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <p className="empty">다가오는 제철 정보가 아직 없어요</p>
        )}
      </main>
    </>
  )
}
