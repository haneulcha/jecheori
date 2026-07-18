import type { Filter } from '../view-types'

const CHIPS: { key: Filter; label: string }[] = [
  { key: 'fruit', label: '과일' },
  { key: 'vegetable', label: '채소' },
  { key: 'drop', label: '가격 하락' },
  { key: 'peak', label: '한창 제철' },
  { key: 'priced', label: '가격 있음' },
]

export function FilterBar({ filters, onToggle }: { filters: Set<Filter>; onToggle: (f: Filter) => void }) {
  return (
    <div className="filter">
      {CHIPS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={`fchip${filters.has(key) ? ' on' : ''}`}
          aria-pressed={filters.has(key)}
          onClick={() => onToggle(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
