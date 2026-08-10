import type { PriceCardView } from '../card'
import type { Unit } from '../types'
import { cx } from '../cx'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

/** 받침 유무로 조사 과/와를 고른다 ("지난 주와", "지난달과"). 라벨이 한글이 아니면 '과'. */
function gwaWa(word: string): string {
  const last = word.charCodeAt(word.length - 1)
  const isHangul = last >= 0xac00 && last <= 0xd7a3
  const hasFinal = isHangul && (last - 0xac00) % 28 !== 0
  return `${word}${hasFinal ? '과' : '와'}`
}

/** "10개 기준 · 개당 704원" — 이 숫자를 무엇으로 재었나.
 *  개당값과 같은 계층이다: 둘 다 큰 숫자를 어떻게 읽는지 말하는 각주다. */
function basisLine(unit: Unit, perUnit: number | null): string {
  const basis = `${unit.quantity}${unit.measure.unit} 기준`
  return perUnit === null ? basis : `${basis} · 개당 ${won(perUnit)}`
}

const ArrowDown = () => (
  <svg className="block" width="11" height="12" viewBox="0 0 11 12" aria-hidden="true">
    <path d="M5.5 1 V10 M2 6.5 L5.5 10 L9 6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const ArrowUp = () => (
  <svg className="block" width="11" height="12" viewBox="0 0 11 12" aria-hidden="true">
    <path d="M5.5 11 V2 M2 5.5 L5.5 2 L9 5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export function PriceBlock({ price: p }: { price: PriceCardView }) {
  const dir = p.change?.kind === 'rise' ? 'rise' : 'fall'
  // 방향 분기는 반드시 완전한 클래스 문자열로 고른다 — Tailwind는 소스를 문자열로
  // 스캔하므로 `text-${dir}` 같은 보간은 아무 CSS도 생성하지 않는다.
  const bigColor = dir === 'rise' ? 'text-rise' : 'text-ink'
  const chipColor = dir === 'rise' ? 'bg-rise-lo text-rise' : 'bg-tint text-ink'
  const chip =
    p.change?.kind === 'fall' || p.change?.kind === 'rise' ? (
      <span
        className={cx('inline-flex items-center gap-3xs text-xs font-bold py-3xs px-xs rounded-pill', chipColor)}
        data-testid="chip"
      >
        {p.change.kind === 'fall' ? <ArrowDown /> : <ArrowUp />}
        {p.change.pct}%
      </span>
    ) : null
  return (
    <div className="flex flex-col items-end" data-testid="price" data-dir={dir}>
      {chip && p.change && (p.change.kind === 'fall' || p.change.kind === 'rise') && (
        <span className="inline-flex items-center gap-2xs mb-3xs" data-testid="compare">
          <span className="text-muted text-2xs">{p.change.basisLabel} 대비</span>
          {chip}
        </span>
      )}
      {p.change?.kind === 'similar' && p.change && (
        <span className="text-muted text-2xs mb-3xs">{gwaWa(p.change.basisLabel)} 비슷</span>
      )}
      {p.change?.kind === 'basis' && (
        <span className="text-muted text-2xs mb-3xs">{p.change.basisLabel} 기준</span>
      )}
      <span className={cx('text-xl font-extrabold tracking-tight leading-none tabular-nums', bigColor)}>
        {p.now.toLocaleString('ko-KR')}
        <span className="text-md font-semibold">원</span>
      </span>
      <span className="text-muted text-2xs mt-2xs whitespace-nowrap tabular-nums" data-testid="basis">
        {basisLine(p.unit, p.perUnit)}
      </span>
    </div>
  )
}
