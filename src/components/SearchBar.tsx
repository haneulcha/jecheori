export function SearchBar({ query, onChange }: { query: string; onChange: (q: string) => void }) {
  return (
    // 플레이스홀더는 입력값보다 한 단계 작게 — 채워지면 큰 글씨로 또렷해진다
    // 포커스 링 자체는 global.css의 :focus-visible(outline 2px solid ink, outline-offset 2px)이
    // 그린다 — outline-2/outline-ink 유틸리티는 그 규칙과 똑같이만 그려질 뿐이라 여기 안 쓴다.
    // offset-0!만 예외로 남긴다: global.css의 offset 2px을 이겨 링을 테두리에 밀착시켜야 해서다.
    <input
      type="search"
      className="w-full bg-card border border-line text-ink rounded-crisp py-sm px-md text-md placeholder:text-muted placeholder:text-sm focus-visible:outline-offset-0! focus-visible:border-transparent"
      placeholder="품목 검색 — 오이, 참외…"
      value={query}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
