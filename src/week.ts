/** 날짜 → "7월 둘째 주" 같은 주간 라벨 (표시용, 순수) */
export function weekLabel(date: Date): string {
  const ordinals = ['첫째', '둘째', '셋째', '넷째', '다섯째']
  const idx = Math.min(Math.ceil(date.getDate() / 7), ordinals.length) - 1
  return `${date.getMonth() + 1}월 ${ordinals[idx]} 주`
}

/** days → "오늘" | "5일 전" (표시용, 순수). 조사일 줄에 상시 보이는 상대 표현. */
export function relativeDayLabel(days: number): string {
  return days === 0 ? '오늘' : `${days}일 전`
}

/** 조사일(YYYY-MM-DD) → "7월 13일 조사" (표시용, 순수). 상대 표현에 호버/탭하면 뜨는 툴팁의
 *  절대날짜. surveyedOn은 KST 조사일 문자열 — Date로 파싱하지 않고 쪼개 타임존 왜곡을 피한다. */
export function surveyedDateLabel(surveyedOn: string): string {
  const [, m, d] = surveyedOn.split('-')
  return `${Number(m)}월 ${Number(d)}일 조사`
}
