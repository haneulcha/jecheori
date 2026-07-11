import type { PriceCardView } from '../card'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

const ArrowDown = () => (
  <svg className="arrow" width="11" height="12" viewBox="0 0 11 12" aria-hidden="true">
    <path d="M5.5 1 V10 M2 6.5 L5.5 10 L9 6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const ArrowUp = () => (
  <svg className="arrow" width="11" height="12" viewBox="0 0 11 12" aria-hidden="true">
    <path d="M5.5 11 V2 M2 5.5 L5.5 2 L9 5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export function PriceBlock({ price: p }: { price: PriceCardView }) {
  const dir = p.change?.kind === 'rise' ? 'rise' : 'fall'
  const chip =
    p.change?.kind === 'fall' || p.change?.kind === 'rise' ? (
      <span className="chip">
        {p.change.kind === 'fall' ? <ArrowDown /> : <ArrowUp />}
        {p.change.pct}%
      </span>
    ) : null
  return (
    <div className={`price ${dir}`}>
      {p.wasMonthAgo !== null && <span className="was num">{won(p.wasMonthAgo)}</span>}
      <span className="nowline">
        {chip}
        <span className="big num">
          {p.now.toLocaleString('ko-KR')}
          <span className="wonu">원</span>
        </span>
      </span>
      {p.perUnit !== null && <span className="per num">개당 {won(p.perUnit)}</span>}
      {p.change?.kind === 'similar' && <span className="near">한 달 전과 비슷해요</span>}
    </div>
  )
}
