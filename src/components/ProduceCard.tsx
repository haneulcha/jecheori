import { useId, useRef, useState } from 'react'
import type { CardView } from '../card'
import { PriceBlock } from './PriceBlock'
import { Sparkline } from './Sparkline'
import { NutritionLine } from './NutritionLine'
import { Note } from './Note'
import { PeakDot } from './PeakDot'
import { RecipeChips } from './RecipeChips'
import { RecipeMemo } from './RecipeMemo'

export function ProduceCard({ card }: { card: CardView }) {
  const [current, setCurrent] = useState<number | null>(null)
  const rootRef = useRef<HTMLDetailsElement>(null)
  const memoId = useId()
  const recipes = card.recipes

  const select = (i: number) => setCurrent((c) => (c === i ? null : i))
  const step = (delta: number) =>
    setCurrent((c) =>
      c === null || !recipes ? c : Math.min(Math.max(c + delta, 0), recipes.length - 1),
    )
  // 닫기: 아직 붙어 있는 해당 칩으로 포커스를 돌리고 상태를 지운다.
  const close = () => {
    if (current !== null) {
      rootRef.current?.querySelectorAll<HTMLButtonElement>('.chip-btn')[current]?.focus()
    }
    setCurrent(null)
  }

  return (
    <details
      ref={rootRef}
      className="card"
      data-cat={card.category}
      onToggle={(e) => {
        if (!e.currentTarget.open) setCurrent(null)
      }}
    >
      <summary>
        <div className="summary-row">
          <span className="id">
            <span className="emoji">{card.emoji}</span>
            <span>
              <span className="card-title">
                {card.name}
                {card.inPeak && <PeakDot />}
              </span>
              <span className="kind">{card.kind}</span>
            </span>
          </span>
          {card.price && <PriceBlock price={card.price} />}
        </div>
        {card.whyNow && <p className="why">{card.whyNow}</p>}
      </summary>
      <div className="open">
        {card.price?.spark && <Sparkline spark={card.price.spark} />}
        {card.nutrition && <NutritionLine nutrition={card.nutrition} />}
        <Note note={card.note} />
        {recipes && (
          <>
            <p className="recipe-label">레시피 {recipes.length}개</p>
            <RecipeChips recipes={recipes} current={current} onSelect={select} memoId={memoId} />
          </>
        )}
      </div>
      {recipes && current !== null && (
        <div className="memo-layer">
          <RecipeMemo
            recipes={recipes}
            index={current}
            id={memoId}
            onClose={close}
            onStep={step}
          />
        </div>
      )}
    </details>
  )
}
