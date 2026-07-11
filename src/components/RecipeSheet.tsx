import { useEffect, useRef } from 'react'
import type { RecipeView } from '../recipe'

/** 하단 바텀시트 오버레이 — 요리명·재료·조리단계(텍스트만).
 *  배경 탭·Esc로 닫는다. 출처는 페이지 하단에 별도 표기(여기선 반복 안 함). */
export function RecipeSheet({ recipes, onClose }: { recipes: RecipeView; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="레시피"
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="sheet-close" onClick={onClose} aria-label="닫기">
          ✕
        </button>
        {recipes.map((r) => (
          <article className="recipe" key={r.name}>
            <h3>{r.name}</h3>
            {r.ingredients && <p className="ing">{r.ingredients}</p>}
            {r.steps.length > 0 && (
              <ol className="steps">
                {r.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
