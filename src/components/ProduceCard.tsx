import { useId, useRef, useState } from 'react'
import type { CardView } from '../card'
import { PriceBlock } from './PriceBlock'
import { Sparkline } from './Sparkline'
import { NutritionLine } from './NutritionLine'
import { Note } from './Note'
import { PeakDot } from './PeakDot'
import { SeasonStrip } from './SeasonStrip'
import { RecipeChips } from './RecipeChips'
import { RecipeMemo } from './RecipeMemo'
import styles from './ProduceCard.module.css'

export function ProduceCard({ card }: { card: CardView }) {
  const [current, setCurrent] = useState<number | null>(null)
  const rootRef = useRef<HTMLDetailsElement>(null)
  const memoId = useId()
  const recipes = card.recipes

  // 칩 재탭·카드 접힘은 즉시 닫힘(애니메이션 없음) — 압정/Esc만 대칭 닫힘 전환을 탄다.
  const select = (i: number) => setCurrent((c) => (c === i ? null : i))
  const step = (delta: number) =>
    setCurrent((c) =>
      c === null || !recipes ? c : Math.min(Math.max(c + delta, 0), recipes.length - 1),
    )
  // 닫기: 아직 붙어 있는 해당 칩으로 포커스를 돌리고 상태를 지운다.
  const close = () => {
    if (current !== null) {
      rootRef.current?.querySelectorAll<HTMLButtonElement>('[aria-pressed]')[current]?.focus()
    }
    setCurrent(null)
  }

  return (
    <details
      ref={rootRef}
      className={styles.card}
      data-cat={card.category}
      onToggle={(e) => {
        if (!e.currentTarget.open) setCurrent(null)
      }}
    >
      <summary>
        <div className={styles.summaryRow}>
          <div className={styles.idWrap}>
            <span className={styles.id}>
              <span className={styles.emoji}>{card.emoji}</span>
              <span>
                <span className={styles.cardTitle} data-testid="card-name">
                  {card.name}
                  {card.inPeak && <PeakDot />}
                </span>
                <span className={styles.kind}>{card.kind}</span>
              </span>
            </span>
            <SeasonStrip strip={card.season} />
          </div>
          {card.price && <PriceBlock price={card.price} />}
        </div>
        {card.whyNow && <p className={styles.why}>{card.whyNow}</p>}
      </summary>
      <div className={styles.open}>
        {card.price?.spark && <Sparkline spark={card.price.spark} />}
        {card.nutrition && <NutritionLine nutrition={card.nutrition} />}
        <Note note={card.note} />
        {recipes && (
          <div className="recipe-section">
            <p className={styles.recipeLabel}>레시피</p>
            <RecipeChips recipes={recipes} current={current} onSelect={select} memoId={memoId} />
          </div>
        )}
      </div>
      {recipes && current !== null && (
        <div className={styles.memoLayer}>
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
