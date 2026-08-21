import { Link } from '@tanstack/react-router'
import type { OffSeasonHint } from '../view-types'

export function SeasonHint({ hint }: { hint: OffSeasonHint }) {
  return (
    <li className="flex items-center gap-sm py-sm text-muted">
      <span>{hint.emoji}</span>
      <span className="text-ink font-semibold">{hint.name}</span>
      <span className="text-sm">{hint.seasonLabel} 제철</span>
      {hint.comingSoon && (
        <Link to="/coming" className="ml-auto text-sm text-ink no-underline">다가오는 제철에서 보기</Link>
      )}
    </li>
  )
}
