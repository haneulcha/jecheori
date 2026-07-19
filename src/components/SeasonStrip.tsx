import type { SeasonStripView } from '../card'
import { cx } from '../cx'
import styles from './SeasonStrip.module.css'

/** 카드 펼침 최상단의 제철 간트 바. 12개월 축 위에 제철=연함(--tint)·절정=짙음(--accent)으로
 *  얹고, 숫자는 제철 월과 이번 달만(이번 달은 볼드) — 나머지는 숨김.
 *  표시만 — 파생은 card.ts의 toSeasonStrip. */
export function SeasonStrip({ strip }: { strip: SeasonStripView }) {
  const { months, seasonLabel, peakLabel, currentMonth } = strip
  return (
    <div className={styles.seasonStrip}>
      <div
        className={styles.seasonBar}
        role="img"
        aria-label={`제철 ${seasonLabel}, 절정 ${peakLabel}, 이번 달 ${currentMonth}월`}
      >
        {months.map((c) => (
          <span
            key={c.month}
            aria-hidden="true"
            className={cx(styles.seasonCell, c.inSeason && styles.isSeason, c.isPeak && styles.isPeak)}
          />
        ))}
      </div>
      <div className={styles.seasonLabels} aria-hidden="true">
        {months.map((c) => (
          <span key={c.month} className={cx(styles.seasonLabel, c.isCurrent && styles.isCurrent)}>
            {c.inSeason || c.isCurrent ? c.month : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
