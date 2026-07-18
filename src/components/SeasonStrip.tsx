import type { SeasonStripView } from '../card'

/** 카드 펼침 최상단의 제철 간트 바. 12개월 축 위에 제철=연함(--tint)·절정=짙음(--accent)으로
 *  얹고, 숫자는 제철 월과 이번 달만(이번 달은 볼드) — 나머지는 숨김.
 *  표시만 — 파생은 card.ts의 toSeasonStrip. */
export function SeasonStrip({ strip }: { strip: SeasonStripView }) {
  const { months, seasonLabel, peakLabel, currentMonth } = strip
  return (
    <div className="season-strip">
      <div
        className="season-bar"
        role="img"
        aria-label={`제철 ${seasonLabel}, 절정 ${peakLabel}, 이번 달 ${currentMonth}월`}
      >
        {months.map((c) => (
          <span
            key={c.month}
            aria-hidden="true"
            className={
              'season-cell' + (c.inSeason ? ' is-season' : '') + (c.isPeak ? ' is-peak' : '')
            }
          />
        ))}
      </div>
      <div className="season-labels" aria-hidden="true">
        {months.map((c) => (
          <span key={c.month} className={'season-label' + (c.isCurrent ? ' is-current' : '')}>
            {c.inSeason || c.isCurrent ? c.month : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
