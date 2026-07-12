import type { Season } from '../season'
import type { ComingItem } from '../view-types'

/** 다가오는 품목 한 장 — 냉장고-메모 카드 껍데기 재활용(정적 div). 가격·펼침 없음. 표시 전용. */
export function ComingCard({ item, season }: { item: ComingItem; season: Season }) {
  return (
    <div className="card coming-card" data-season={season}>
      <div className="summary-row">
        <span className="id">
          <span className="emoji">{item.emoji}</span>
          <span>
            <span className="card-title">
              {item.name}
              {item.peak && (
                <span className="peak-badge" role="img" aria-label="절정">
                  <b></b>
                </span>
              )}
            </span>
          </span>
        </span>
      </div>
      {item.whyNow && <p className="why">{item.whyNow}</p>}
    </div>
  )
}
