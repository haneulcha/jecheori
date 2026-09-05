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

export function ProduceCard({ card, eager = false }: { card: CardView; eager?: boolean }) {
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
      {/* 표지는 행 넷을 위에서 아래로 쌓는다 (게이트 2 확정안 B-2): 도판+이름 / 가격 /
          제철 띠 / 한마디. 마크(96)와 이름과 가격을 한 행에 두는 건 산술적으로 불가능하다
          — 카드 안쪽 324.4px에서 가격 열 하한 120.3px을 빼면 이름에 82.5px밖에 안 남는다
          (스펙 §10). 행 간격은 md(12.8) — 카드 패딩 lg(16)와 구분되는 안쪽 리듬이다. */}
      <summary className="flex flex-col gap-md">
        <div className="flex items-center gap-sm">
          {card.image ? (
            <img
              className={styles.mark}
              src={`${import.meta.env.BASE_URL}assets/produce/${card.image}.webp`}
              width={96}
              height={96}
              // 품목명이 바로 옆에 있다 — 채우면 스크린리더가 이름을 두 번 읽는다.
              // 장식이라서가 아니라 중복이라서 비운다.
              alt=""
              // 첫 화면 카드까지 lazy면 96px 빈 칸이 보였다가 채워진다
              loading={eager ? 'eager' : 'lazy'}
              fetchPriority={eager ? 'high' : undefined}
            />
          ) : (
            // 점진 도입 기간의 폴백. 도판과 같은 자리를 차지해 목록에서 카드 높이가
            // 들쭉날쭉해지지 않게 한다. aria-hidden은 위 alt=""와 같은 이유다.
            <span className={styles.mark} aria-hidden="true">
              {card.emoji}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className={styles.cardTitle} data-testid="card-name">
              {card.name}
              {card.inPeak && <PeakDot />}
            </span>
            <span className={styles.kind}>{card.kind}</span>
          </span>
        </div>
        {card.price && <PriceBlock price={card.price} />}
        {card.category !== 'livestock' && <SeasonStrip strip={card.season} />}
        {card.whyNow && <p className={styles.why}>{card.whyNow}</p>}
      </summary>
      <div className={styles.open}>
        {card.price?.spark && <Sparkline spark={card.price.spark} />}
        {card.nutrition && <NutritionLine nutrition={card.nutrition} />}
        <Note note={card.note} />
        {/* 라벨+칩 묶음 — .open의 flex gap이 둘 사이에 끼지 않게 하는 구조용 래퍼(스타일 없음) */}
        {recipes && (
          <div>
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
