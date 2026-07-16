/** 날짜 → "7월 둘째 주" 같은 주간 라벨 (표시용, 순수) */
export function weekLabel(date: Date): string {
  const ordinals = ['첫째', '둘째', '셋째', '넷째', '다섯째']
  const idx = Math.min(Math.ceil(date.getDate() / 7), ordinals.length) - 1
  return `${date.getMonth() + 1}월 ${ordinals[idx]} 주`
}

/** days·조사일 → "오늘 · 7월 16일 기준" / "3일 전 · 7월 13일 기준" (표시용, 순수).
 *  surveyedOn은 KST 조사일 문자열(YYYY-MM-DD) — Date로 파싱하지 않고 쪼개 타임존 왜곡을 피한다. */
export function surveyedLabel(days: number, surveyedOn: string): string {
  const rel = days === 0 ? '오늘' : `${days}일 전`
  const [, m, d] = surveyedOn.split('-')
  return `${rel} · ${Number(m)}월 ${Number(d)}일 기준`
}
