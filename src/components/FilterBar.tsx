import type { Filter } from '../view-types'
import { cx } from '../cx'
import styles from './FilterBar.module.css'

const CHIPS: { key: Filter; label: string }[] = [
  { key: 'peak', label: '한창 제철' },
  { key: 'fruit', label: '과일' },
  { key: 'vegetable', label: '채소' },
  { key: 'seafood', label: '수산물' },
  { key: 'drop', label: '가격 하락' },
  { key: 'priced', label: '가격 있음' },
]

export function FilterBar({ filters, onToggle }: { filters: Set<Filter>; onToggle: (f: Filter) => void }) {
  return (
    <div className={styles.filter} data-testid="filter">
      {CHIPS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={cx(styles.fchip, filters.has(key) && styles.on)}
          aria-pressed={filters.has(key)}
          onClick={() => onToggle(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
