import { useEffect, useId, useRef, useState } from 'react'
import type { CardView } from '../card'
import { PriceBlock } from './PriceBlock'
import { Sparkline } from './Sparkline'
import { NutritionLine } from './NutritionLine'
import { Note, NoteRow } from './Note'
import { PeakDot } from './PeakDot'
import { SeasonStrip } from './SeasonStrip'
import { RecipeChips } from './RecipeChips'
import { RecipeMemo } from './RecipeMemo'
import { useHydrated, usePager } from './usePager'
import styles from './ProduceCard.module.css'

/** 쪽 라벨. 순서가 곧 넘김 순서다.
 *  이 분할은 미감이 아니라 산술로 골랐다 — produce.json 84개·recipes.json 75개 실측으로
 *  "표지가 가장 긴 쪽"을 유지하는 안 중 남는 여백이 가장 작다(스펙 §쪽 구성). */
const PAGES = ['표지', '시세·영양', '고르는 법', '보관·쓰임'] as const
const RECIPE_PAGE = 3

function Mark({ card, eager, small }: { card: CardView; eager?: boolean; small?: boolean }) {
  const cls = small ? styles.markSm : styles.mark
  if (!card.image) {
    // 점진 도입 기간의 폴백. aria-hidden은 아래 alt=""와 같은 이유(품목명이 바로 옆에 있다).
    return (
      <span className={cls} aria-hidden="true">
        {card.emoji}
      </span>
    )
  }
  return (
    <img
      className={cls}
      src={`${import.meta.env.BASE_URL}assets/produce/${card.image}.webp`}
      width={small ? 40 : 96}
      height={small ? 40 : 96}
      // 품목명이 바로 옆에 있다 — 채우면 스크린리더가 이름을 두 번 읽는다.
      // 장식이라서가 아니라 중복이라서 비운다.
      alt=""
      // 첫 화면 카드까지 lazy면 빈 칸이 보였다가 채워진다
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : undefined}
    />
  )
}

/** 표지 — 지금 접힘 상태의 카드 그대로. 폴백의 <summary>이자 페이저의 0쪽이다. */
function Cover({ card, eager }: { card: CardView; eager?: boolean }) {
  return (
    <>
      {/* 48rem↑ 다열 격자에서는 이 행도 세로로 눕는다 — 도판이 카드 폭 전체를 쓰는 표지가
          된다(세로 스택 variant). 도판 기하·.kind display는 모듈이 이미 소유한 속성이라
          ProduceCard.module.css의 같은 미디어쿼리에 있다. */}
      <div className="flex items-center gap-sm md:flex-col md:items-stretch">
        <Mark card={card} eager={eager} />
        <span className="min-w-0 flex-1 md:flex md:flex-wrap md:items-baseline md:gap-xs">
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
    </>
  )
}

/** 속쪽 머리 — [작은 도판 | 품목명 | 쪽 라벨] 한 줄.
 *  4열 격자에서 여러 장을 각기 다른 쪽에 넘겨두면 "시세"만 있고 무슨 품목인지 알 수 없다.
 *  표지가 가장 긴 쪽이라 속쪽엔 어차피 여백이 남는다 — 그 여백의 일부를 신원에 쓴다. */
function PageHead({ card, label }: { card: CardView; label: string }) {
  return (
    <div className={styles.phead} aria-hidden="true">
      <Mark card={card} small />
      <b className={styles.pname}>{card.name}</b>
      <span className={styles.plabel}>{label}</span>
    </div>
  )
}

export function ProduceCard({ card, eager = false }: { card: CardView; eager?: boolean }) {
  const [current, setCurrent] = useState<number | null>(null)
  const rootRef = useRef<HTMLElement>(null)
  const memoId = useId()
  const recipes = card.recipes
  const hydrated = useHydrated()
  const { page, goTo, step, viewportRef, trackRef, viewportProps } = usePager(PAGES.length)

  // 레시피 쪽을 떠나면 열린 메모를 닫는다 — 폴백에서 카드를 접을 때와 같은 규칙이다.
  useEffect(() => {
    if (page !== RECIPE_PAGE) setCurrent(null)
  }, [page])

  // 칩 재탭·쪽 이탈은 즉시 닫힘(애니메이션 없음) — 압정/Esc만 대칭 닫힘 전환을 탄다.
  const select = (i: number) => setCurrent((c) => (c === i ? null : i))
  const stepRecipe = (delta: number) =>
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

  const pricePage = (
    <>
      {card.price?.spark && <Sparkline spark={card.price.spark} />}
      {card.nutrition && <NutritionLine nutrition={card.nutrition} />}
    </>
  )
  const keepPage = (
    <>
      <NoteRow label="보관" text={card.note.store} />
      <NoteRow label="쓰임" text={card.note.use} />
      {recipes && (
        <div>
          <p className={styles.recipeLabel}>레시피</p>
          <RecipeChips recipes={recipes} current={current} onSelect={select} memoId={memoId} />
        </div>
      )}
    </>
  )

  const memoLayer = recipes && current !== null && (
    <div className={styles.memoLayer}>
      <RecipeMemo
        recipes={recipes}
        index={current}
        id={memoId}
        onClose={close}
        onStep={stepRecipe}
      />
    </div>
  )

  // ── 무JS · 프리렌더 폴백 ─────────────────────────────────────────────
  // 하이드레이션 전에는 지금까지의 <details>를 그대로 낸다. JS가 없으면 이 상태로 남고,
  // 카드 안 모든 정보에 지금과 똑같이 닿을 수 있다. (App.tsx의 `ready`와 같은 패턴)
  if (!hydrated) {
    return (
      <details className={styles.card} data-cat={card.category}>
        <summary className="flex flex-col gap-md">
          <Cover card={card} eager={eager} />
        </summary>
        <div className={styles.open}>
          {pricePage}
          <Note note={card.note} />
          {recipes && (
            <div>
              <p className={styles.recipeLabel}>레시피</p>
              <RecipeChips recipes={recipes} current={null} onSelect={() => {}} memoId={memoId} />
            </div>
          )}
        </div>
      </details>
    )
  }

  // ── 페이저 ───────────────────────────────────────────────────────────
  return (
    <article
      ref={rootRef}
      className={styles.card}
      data-cat={card.category}
      data-page={page}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') {
          step(1)
          e.preventDefault()
        }
        if (e.key === 'ArrowLeft') {
          step(-1)
          e.preventDefault()
        }
      }}
    >
      {/* full bleed — 뷰포트만 카드 패딩 밖으로 나가고 여백은 쪽이 갖는다. 그래야 들어오는
          쪽이 카드 가장자리에서 나온다(안 그러면 16px 안쪽 창의 "액자 속 슬라이드"). */}
      <div className={styles.viewport} ref={viewportRef} {...viewportProps}>
        <div className={styles.track} ref={trackRef}>
          {/* 안 보이는 쪽은 inert — 네 쪽이 늘 흐름 안에 있어야 카드 높이가 안 변하지만
              (그게 이 설계의 전부다), 스크린리더가 네 쪽을 한꺼번에 읽거나 숨은 레시피 칩에
              탭이 걸려선 안 된다. hidden으로 빼면 높이가 무너지므로 inert가 유일한 답이다. */}
          <section className={styles.page} role="tabpanel" aria-label={PAGES[0]} inert={page !== 0}>
            <div className="flex flex-col gap-md">
              <Cover card={card} eager={eager} />
            </div>
          </section>
          <section className={styles.page} role="tabpanel" aria-label={PAGES[1]} inert={page !== 1}>
            <PageHead card={card} label={PAGES[1]} />
            <div className={styles.body}>{pricePage}</div>
          </section>
          <section className={styles.page} role="tabpanel" aria-label={PAGES[2]} inert={page !== 2}>
            <PageHead card={card} label={PAGES[2]} />
            <div className={styles.body}>
              <NoteRow label="고르는 법" text={card.note.pick} />
            </div>
          </section>
          <section className={styles.page} role="tabpanel" aria-label={PAGES[3]} inert={page !== 3}>
            <PageHead card={card} label={PAGES[3]} />
            <div className={styles.body}>{keepPage}</div>
          </section>
        </div>
      </div>
      <div className={styles.idx} role="tablist" aria-label={`${card.name} 쪽`}>
        {PAGES.map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            className={styles.dot}
            aria-selected={page === i}
            aria-label={label}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
      {memoLayer}
    </article>
  )
}
