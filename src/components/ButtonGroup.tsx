import { cx } from '../cx'
import styles from './ButtonGroup.module.css'

export interface ButtonGroupOption<T extends string> {
  value: T
  label: string
}

/** 단일 선택 세그먼트 컨트롤 (표시 전용, 재사용 프리미티브).
 *  radiogroup 시맨틱 + 로빙 tabindex + ←/→ 방향키. 선택 칸을 알약 썸이 슬라이드로 따라간다.
 *  상호배타는 "하나만 고르는 곳"이라는 시각을 규율로 만든다 — chip group(FilterBar)과 대비. */
export function ButtonGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: ButtonGroupOption<T>[]
  value: T
  onChange: (v: T) => void
  ariaLabel: string
}) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div className={styles.group} role="radiogroup" aria-label={ariaLabel} data-testid="button-group">
      <span
        className={styles.thumb}
        aria-hidden="true"
        style={{ width: `calc((100% - 6px) / ${options.length})`, transform: `translateX(${idx * 100}%)` }}
      />
      {options.map((o, buttonIndex) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={cx(styles.seg, selected && styles.on)}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              const dir =
                e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
                : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1
                : 0
              if (!dir) return
              e.preventDefault()
              const next = (buttonIndex + dir + options.length) % options.length
              onChange(options[next].value)
              // 방향키 이동은 포커스도 새 칸으로 옮긴다(로빙 tabindex 관례)
              const btns = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
              btns?.[next]?.focus()
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
