import type { PriceCardView } from '../card'
import type { Unit } from '../types'
import styles from './PriceBlock.module.css'
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
  <svg className={styles.arrow} width="11" height="12" viewBox="0 0 11 12" aria-hidden="true">
    <path d="M5.5 1 V10 M2 6.5 L5.5 10 L9 6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const ArrowUp = () => (
  <svg className={styles.arrow} width="11" height="12" viewBox="0 0 11 12" aria-hidden="true">
    <path d="M5.5 11 V2 M2 5.5 L5.5 2 L9 5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export function PriceBlock({ price: p }: { price: PriceCardView }) {
  const dir = p.change?.kind === 'rise' ? 'rise' : 'fall'
  const chip =
    p.change?.kind === 'fall' || p.change?.kind === 'rise' ? (
      <span className={styles.chip} data-testid="chip">
        {p.change.kind === 'fall' ? <ArrowDown /> : <ArrowUp />}
        {p.change.pct}%
      </span>
    ) : null
  return (
    <div className={cx(styles.price, styles[dir])} data-testid="price" data-dir={dir}>
      {chip && p.change && (p.change.kind === 'fall' || p.change.kind === 'rise') && (
        <span className={styles.compare} data-testid="compare">
          <span className={styles.cmpLabel}>{p.change.basisLabel} 대비</span>
          {chip}
        </span>
      )}
      {p.change?.kind === 'similar' && p.change && <span className={styles.near}>{gwaWa(p.change.basisLabel)} 비슷</span>}
      {p.change?.kind === 'basis' && <span className={styles.near}>{p.change.basisLabel} 기준</span>}
      <span className={cx(styles.big, 'num')}>
        {p.now.toLocaleString('ko-KR')}
        <span className={styles.wonu}>원</span>
      </span>
      <span className={cx(styles.basis, 'num')} data-testid="basis">{basisLine(p.unit, p.perUnit)}</span>
    </div>
  )
}
