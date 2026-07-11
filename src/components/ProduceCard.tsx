import { useCallback, useState } from 'react'
import type { CardView } from '../card'
import { PriceBlock } from './PriceBlock'
import { Sparkline } from './Sparkline'
import { NutritionLine } from './NutritionLine'
import { Note } from './Note'
import { PeakDot } from './PeakDot'
import { RecipeSheet } from './RecipeSheet'

export function ProduceCard({ card }: { card: CardView }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const closeSheet = useCallback(() => setSheetOpen(false), [])
  return (
    <details className="card" data-cat={card.category}>
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
        {card.recipes && (
          <button type="button" className="recipe-open" onClick={() => setSheetOpen(true)}>
            레시피 {card.recipes.length}개
          </button>
        )}
      </div>
      {sheetOpen && card.recipes && (
        <RecipeSheet recipes={card.recipes} onClose={closeSheet} />
      )}
    </details>
  )
}
