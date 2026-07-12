/** 램프줄(A) + CSS 슬라이드 인덱스 서랍. 양쪽 페이지 공유.
 *  열고/닫기는 체크박스 훅(무JS), 목차 링크는 진짜 앵커(BASE_URL 접두). */
export function NavIndex({ current }: { current: 'now' | 'coming' }) {
  const base = import.meta.env.BASE_URL
  return (
    <nav className="nav-index">
      <input type="checkbox" id="nav-toggle" className="nav-toggle" aria-label="목차 열기" />
      <label htmlFor="nav-toggle" className="nav-cord" aria-hidden="true">
        <svg viewBox="0 0 12 64" fill="none" aria-hidden="true">
          <path d="M6 0 V50" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="6" cy="56" r="5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </label>
      <label htmlFor="nav-toggle" className="nav-backdrop" aria-hidden="true" />
      <div className="nav-panel">
        <p className="nav-panel-title">목차</p>
        <a href={base} aria-current={current === 'now' ? 'page' : undefined}>지금 담기 좋은 것</a>
        <a href={`${base}coming`} aria-current={current === 'coming' ? 'page' : undefined}>다가오는 제철</a>
      </div>
    </nav>
  )
}
