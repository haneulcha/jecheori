/** 다이어리 옆면 인덱스 북마크. 진짜 앵커(무JS 네비게이션).
 *  href는 BASE_URL 접두 — 루트('/')·하위경로('/jecheori/') 모두 맞는다. */
export function IndexTab({
  side,
  path,
  label,
  ariaLabel,
}: {
  side: 'left' | 'right'
  path: string
  label: string
  ariaLabel: string
}) {
  const href = `${import.meta.env.BASE_URL}${path}`
  return (
    <a className={`index-tab index-tab-${side}`} href={href} aria-label={ariaLabel}>
      <span>{label}</span>
    </a>
  )
}
