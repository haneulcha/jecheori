import type { ComingView } from '../view-types'
import { weekLabel } from '../week'
import { Sprig } from './Sprig'
import { NavIndex } from './NavIndex'
import { ProduceCard } from './ProduceCard'

/** 다가오는 제철 페이지. 메인과 같은 풀 카드(ProduceCard). 표시 전용. */
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
            <section className="mt-xl" key={m.month} data-season={m.season}>
              {/* <h2>의 굵기는 UA 기본값이다(Preflight 미사용이라 유지된다) — font-bold를 추가하지 않는다 */}
              <h2 className="text-md tracking-wide mb-md">{m.month}월</h2>
              <div className="list">
                {m.items.map((card) => (
                  <ProduceCard key={card.name} card={card} />
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
