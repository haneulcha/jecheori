// 정적 마크업. 터치 탭 토글은 App의 위임 리스너(useEffect)가 처리.
export function PeakDot() {
  return (
    <button className="peak-dot" data-tip="peak" type="button" aria-label="지금이 제철 절정">
      <b></b>
      <span className="peak-tip">지금이 맛의 절정이에요</span>
    </button>
  )
}
