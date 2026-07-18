import { Link } from '@tanstack/react-router'
import type { OffSeasonHint } from '../view-types'

export function SeasonHint({ hint }: { hint: OffSeasonHint }) {
  return (
    <li className="season-hint">
      <span className="emoji">{hint.emoji}</span>
      <span className="hint-name">{hint.name}</span>
      <span className="hint-when">{hint.seasonLabel} 제철</span>
      {hint.comingSoon && (
        <Link to="/coming" className="hint-coming">다가오는 제철에서 보기</Link>
      )}
    </li>
  )
}
