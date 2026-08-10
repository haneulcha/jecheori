export function SearchBar({ query, onChange }: { query: string; onChange: (q: string) => void }) {
  return (
    <>
      {/* 플레이스홀더는 입력값보다 한 단계 작게 — 채워지면 큰 글씨로 또렷해진다 */}
      <input
        type="search"
        className="w-full bg-card border border-line text-ink rounded-crisp py-sm px-md text-md placeholder:text-muted placeholder:text-sm focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-0! focus-visible:border-transparent"
        placeholder="품목 검색 — 오이, 참외…"
        value={query}
        onChange={(e) => onChange(e.target.value)}
      />
    </>
  )
}
