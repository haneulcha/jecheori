import { useEffect, useRef, useState } from 'react'
import type { RecipeView } from '../recipe'

/** 닫힘 전환 길이(ms) — CSS memo-out과 맞춘다. reduced-motion이면 전환은 안 보이지만
 *  이 타이머로 제거는 그대로 일어난다. */
const CLOSE_MS = 180

/** 카드 위에 핀처럼 꽂히는 레시피 메모 한 장. ‹ ›로 넘기고 압정/Esc로 닫는다.
 *  넘김(index 변경)은 리마운트 없이 내용만 제자리 교체 — 부모가 key를 주지 않는다. */
export function RecipeMemo({
  recipes,
  index,
  id,
  onClose,
  onStep,
}: {
  recipes: RecipeView
  index: number
  id?: string
  onClose: () => void
  onStep: (delta: number) => void
}) {
  const [closing, setClosing] = useState(false)
  const rootRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // 열릴 때(마운트) 포커스를 메모로. 언마운트 시 타이머 정리.
  useEffect(() => {
    rootRef.current?.focus()
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  // index가 바뀌면(다른 레시피로 전환) 진행 중이던 닫힘을 취소한다.
  useEffect(() => {
    setClosing(false)
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = undefined
    }
  }, [index])

  const beginClose = () => {
    // 이미 예약된 닫힘이 있으면 취소하고 새로 잡는다 — 압정 연타·압정+Esc로 타이머가 고아가
    // 돼 나중에 엉뚱한 레시피를 닫는 걸 막는다. (Esc 리스너는 마운트 클로저라 stale한 closing을
    // 읽으므로, guard 대신 무조건 clear로 정확성을 보장한다.)
    if (timer.current) clearTimeout(timer.current)
    setClosing(true)
    timer.current = setTimeout(() => onCloseRef.current(), CLOSE_MS)
  }

  // Esc 닫기. beginClose는 stable 참조만 쓰므로 첫 렌더 캡처로 안전.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') beginClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const r = recipes[index]
  return (
    <article
      ref={rootRef}
      id={id}
      className={closing ? 'memo memo-closing' : 'memo'}
      role="group"
      aria-label={r.name}
      tabIndex={-1}
    >
      <button type="button" className="pin" onClick={beginClose} aria-label="레시피 떼기" />
      <button
        type="button"
        className="nav nav-prev"
        onClick={() => onStep(-1)}
        disabled={index === 0}
        aria-label="이전 레시피"
      >
        ‹
      </button>
      <button
        type="button"
        className="nav nav-next"
        onClick={() => onStep(1)}
        disabled={index === recipes.length - 1}
        aria-label="다음 레시피"
      >
        ›
      </button>
      <h3>{r.name}</h3>
      {r.ingredients && <p className="ing">{r.ingredients}</p>}
      {r.steps.length > 0 && (
        <ol className="steps">
          {r.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}
      <p className="count">
        {index + 1} / {recipes.length}
      </p>
    </article>
  )
}
