import type { LivestockView } from '../view-types'
import { relativeDayLabel, surveyedDateLabel, weekLabel } from '../week'
import { Sprig } from './Sprig'
import { NavIndex } from './NavIndex'
import { ProduceCard } from './ProduceCard'
import styles from './Livestock.module.css'

/** 축산물 값 페이지. 제철이 아니라 "값이 내려온 순". 표시 전용. */
export function Livestock({ view }: { view: LivestockView }) {
  const { cards, date, freshness } = view
  const eyebrow = weekLabel(date)
  return (
    <>
      <NavIndex current="livestock" />
      <header>
        <Sprig />
        <p className="week">{eyebrow}</p>
        <h1>요즘 값이 내려온 축산물</h1>
        {freshness.kind === 'dated' && (
          <p className={styles.surveyed}>
            {relativeDayLabel(freshness.days)} · {surveyedDateLabel(freshness.surveyedOn)} · 전국 평균
          </p>
        )}
      </header>
      <main>
        {cards.length > 0 ? (
          <div className="list">
            {cards.map((c) => (
              <ProduceCard key={c.name} card={c} />
            ))}
          </div>
        ) : (
          <p className="empty">축산물 값 정보가 아직 없어요</p>
        )}
      </main>
    </>
  )
}
