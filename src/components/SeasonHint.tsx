import { Link } from '@tanstack/react-router'
import type { OffSeasonHint } from '../view-types'
import styles from './SeasonHint.module.css'

export function SeasonHint({ hint }: { hint: OffSeasonHint }) {
  return (
    <li className={styles.seasonHint}>
      <span className="emoji">{hint.emoji}</span>
      <span className={styles.hintName}>{hint.name}</span>
      <span className={styles.hintWhen}>{hint.seasonLabel} 제철</span>
      {hint.comingSoon && (
        <Link to="/coming" className={styles.hintComing}>다가오는 제철에서 보기</Link>
      )}
    </li>
  )
}
