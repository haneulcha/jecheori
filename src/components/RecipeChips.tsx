import type { RecipeView } from '../recipe'

/** 카드 펼침 영역의 레시피 진입점 — 레시피별 칩, 횡스크롤. 표시 전용. */
export function RecipeChips({
  recipes,
  current,
  onSelect,
  memoId,
}: {
  recipes: RecipeView
  current: number | null
  onSelect: (index: number) => void
  memoId: string
}) {
  return (
    <div className="chips">
      {recipes.map((r, i) => (
        <button
          key={r.name}
          type="button"
          className="chip-btn"
          aria-pressed={current === i}
          aria-controls={memoId}
          onClick={() => onSelect(i)}
        >
          {r.name}
        </button>
      ))}
    </div>
  )
}
