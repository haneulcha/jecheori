import type { SeasonStripView } from '../card'

/** 카드 펼침의 12칸 제철 달력 띠. 원장 프레임에 색을 채우고(제철=옅음, 절정=진함),
 *  이번 달은 ▼로 가리킨다. 표시만 — 파생은 card.ts의 toSeasonStrip. */
export function SeasonStrip({ strip }: { strip: SeasonStripView }) {
  const { months, seasonLabel, peakLabel, currentMonth } = strip
  return (
    <div className="season-strip">
      <p className="season-cap">제철 달력 · 이번 달 {currentMonth}월</p>
      <div
        className="season-cells"
        role="img"
        aria-label={`제철 ${seasonLabel}, 절정 ${peakLabel}, 이번 달 ${currentMonth}월`}
      >
        {months.map((c) => (
          <span
            key={c.month}
            className={
              'season-cell' +
              (c.inSeason ? ' is-season' : '') +
              (c.isPeak ? ' is-peak' : '') +
              (c.isCurrent ? ' is-current' : '')
            }
          />
        ))}
      </div>
      <div className="season-nums" aria-hidden="true">
        {months.map((c) => (
          <span
            key={c.month}
            className={
              'season-num' +
              (c.isCurrent ? ' is-current' : c.inSeason ? ' is-season' : '')
            }
          >
            {c.month}
          </span>
        ))}
      </div>
    </div>
  )
}
