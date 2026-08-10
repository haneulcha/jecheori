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
    // 양옆 -mx-lg로 카드 안쪽 패딩을 상쇄해 횡스크롤 풀블리드, px-lg로 첫/끝 칩은 콘텐츠에 정렬
    <div className="flex gap-xs overflow-x-auto -mx-lg px-lg pb-2xs">
      {/* 누름 피드백은 활성(tint+실선)으로 충분 — scale 변형은 텍스트가 들썩여 쓰지 않는다 */}
      {recipes.map((r, i) => (
        <button
          key={r.name}
          type="button"
          className="flex-none font-body font-normal text-xs leading-body bg-transparent border border-dashed border-line rounded-soft py-2xs px-md text-ink cursor-pointer whitespace-nowrap transition-colors duration-150 hover:border-ink aria-pressed:border-solid aria-pressed:border-ink aria-pressed:bg-tint"
          aria-pressed={current === i}
          aria-controls={current === i ? memoId : undefined}
          onClick={() => onSelect(i)}
        >
          {r.name}
        </button>
      ))}
    </div>
  )
}
