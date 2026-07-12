import type { ComingView } from '../view-types'
import { weekLabel } from '../week'
import { IndexTab } from './IndexTab'
import { Sprig } from './Sprig'

/** 다가오는 제철 전용 페이지. 예고는 카드보다 가볍게 — 가격·펼침 없음. 표시 전용. */
export function Coming({ view }: { view: ComingView }) {
  const { months, date, term } = view
  const eyebrow = term ? `${term} · ${weekLabel(date)}` : weekLabel(date)
  return (
    <>
      <IndexTab side="left" path="" label="지금" ariaLabel="지금 담기 좋은 것" />
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
              <ul>
                {m.items.map((it, i) => (
                  <li key={i} className={it.peak ? 'peak' : undefined}>
                    {it.emoji} {it.name}
                    {it.peak && <span className="peak-tag">절정</span>}
                  </li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <p className="empty">다가오는 제철 정보가 아직 없어요</p>
        )}
      </main>
    </>
  )
}
