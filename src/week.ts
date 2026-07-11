/** 날짜 → "7월 둘째 주" 같은 주간 라벨 (표시용, 순수) */
export function weekLabel(date: Date): string {
  const ordinals = ['첫째', '둘째', '셋째', '넷째', '다섯째']
  const idx = Math.min(Math.ceil(date.getDate() / 7), ordinals.length) - 1
  return `${date.getMonth() + 1}월 ${ordinals[idx]} 주`
}
