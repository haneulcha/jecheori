export function SearchBar({ query, onChange }: { query: string; onChange: (q: string) => void }) {
  return (
    <input
      type="search"
      className="search"
      placeholder="품목 검색 — 오이, 참외…"
      value={query}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
