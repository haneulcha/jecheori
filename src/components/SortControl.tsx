import type { SortMode } from '../view-types'
import styles from './SortControl.module.css'

const OPTS: { value: SortMode; label: string }[] = [
  { value: 'drop', label: '하락 큰 순' },
  { value: 'name', label: '이름' },
  { value: 'priceLow', label: '가격 낮은 순' },
]

// 내림차순 어휘의 계단 막대 — "정렬" 글자를 대신한다. 현재값은 옆 <select>가 그대로 보인다.
const SortIcon = () => (
  <svg
    className={styles.sortIcon}
    data-testid="sort-icon"
    width="15"
    height="15"
    viewBox="0 0 15 15"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M2 3.5h10.5M2 7.5h6.5M2 11.5h3" />
  </svg>
)

export function SortControl({ sort, onChange }: { sort: SortMode; onChange: (s: SortMode) => void }) {
  return (
    <label className={styles.sort}>
      <SortIcon />
      <select aria-label="정렬" value={sort} onChange={(e) => onChange(e.target.value as SortMode)}>
        {OPTS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}
