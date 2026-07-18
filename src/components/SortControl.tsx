import type { SortMode } from '../view-types'

const OPTS: { value: SortMode; label: string }[] = [
  { value: 'drop', label: '하락 큰 순' },
  { value: 'name', label: '이름' },
  { value: 'priceLow', label: '가격 낮은 순' },
]

export function SortControl({ sort, onChange }: { sort: SortMode; onChange: (s: SortMode) => void }) {
  return (
    <label className="sort">
      정렬
      <select aria-label="정렬" value={sort} onChange={(e) => onChange(e.target.value as SortMode)}>
        {OPTS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}
