import type { PriceCardView } from '../card'
import type { Unit } from '../types'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

/** "10개 기준 · 개당 704원" — 이 숫자를 무엇으로 재었나.
 *  개당값과 같은 계층이다: 둘 다 큰 숫자를 어떻게 읽는지 말하는 각주다. */
function basisLine(unit: Unit, perUnit: number | null): string {
  const basis = `${unit.quantity}${unit.measure.unit} 기준`
  return perUnit === null ? basis : `${basis} · 개당 ${won(perUnit)}`
}

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
      <span className="basis num">{basisLine(p.unit, p.perUnit)}</span>
      {p.change?.kind === 'similar' && <span className="near">한 달 전과 비슷해요</span>}
    </div>
  )
}
