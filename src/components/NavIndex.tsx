import { useState } from 'react'
import { Link } from '@tanstack/react-router'

/** 램프줄(A) + 인덱스 서랍. 목차 링크는 클라이언트 라우팅(viewTransition·부드러운 전환) +
 *  선택 시 서랍 닫힘. 열고/닫기는 상태(최소 JS). 양쪽 페이지 공유. */
export function NavIndex({ current }: { current: 'now' | 'coming' }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <nav className="nav-index" data-open={open || undefined}>
      <button
        type="button"
        className="nav-cord"
        aria-label="목차"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 12 72" fill="none" aria-hidden="true">
          <path d="M6 0 V58" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="6" cy="64" r="5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <button type="button" className="nav-backdrop" aria-label="목차 닫기" onClick={close} />
      )}
      <div className="nav-panel">
        <p className="nav-panel-title">목차</p>
        <Link to="/" viewTransition aria-current={current === 'now' ? 'page' : undefined} onClick={close}>
          지금 담기 좋은 것
        </Link>
        <Link to="/coming" viewTransition aria-current={current === 'coming' ? 'page' : undefined} onClick={close}>
          다가오는 제철
        </Link>
      </div>
    </nav>
  )
}
