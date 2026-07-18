export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

interface Term {
  name: string
  month: number
  day: number
}

/** 표기용 고정 날짜. 실제 절기는 해마다 ±1일 다르지만
 *  이 앱에서 절기는 시계가 아니라 계절 인사말이다 (DESIGN.md). */
const TERMS: Term[] = [
  { name: '소한', month: 1, day: 5 },
  { name: '대한', month: 1, day: 20 },
  { name: '입춘', month: 2, day: 4 },
  { name: '우수', month: 2, day: 19 },
  { name: '경칩', month: 3, day: 5 },
  { name: '춘분', month: 3, day: 20 },
  { name: '청명', month: 4, day: 5 },
  { name: '곡우', month: 4, day: 20 },
  { name: '입하', month: 5, day: 5 },
  { name: '소만', month: 5, day: 21 },
  { name: '망종', month: 6, day: 6 },
  { name: '하지', month: 6, day: 21 },
  { name: '소서', month: 7, day: 7 },
  { name: '대서', month: 7, day: 22 },
  { name: '입추', month: 8, day: 7 },
  { name: '처서', month: 8, day: 23 },
  { name: '백로', month: 9, day: 7 },
  { name: '추분', month: 9, day: 22 },
  { name: '한로', month: 10, day: 8 },
  { name: '상강', month: 10, day: 23 },
  { name: '입동', month: 11, day: 7 },
  { name: '소설', month: 11, day: 22 },
  { name: '대설', month: 12, day: 7 },
  { name: '동지', month: 12, day: 21 },
]

export function currentTerm(date: Date): string {
  const m = date.getMonth() + 1
  const d = date.getDate()
  const passed = TERMS.filter((t) => t.month < m || (t.month === m && t.day <= d))
  // 1월 초 소한 전이면 전년 마지막 절기(동지)
  return passed.length > 0 ? passed[passed.length - 1].name : TERMS[TERMS.length - 1].name
}

export function seasonOf(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

/** 제철 월 배열 → "12~4월" 같은 구간 라벨 (표시용, 순수).
 *  연속 정수를 구간으로 묶고, 12→1로 이어지면(랩어라운드) 병합한다. */
export function seasonLabel(months: number[]): string {
  const uniq = [...new Set(months)].sort((a, b) => a - b)
  if (uniq.length === 0) return ''
  // 연속 구간(runs) 나누기
  const runs: [number, number][] = []
  for (const m of uniq) {
    const last = runs[runs.length - 1]
    if (last && m === last[1] + 1) last[1] = m
    else runs.push([m, m])
  }
  // 랩어라운드: 1로 시작하는 첫 구간과 12로 끝나는 마지막 구간을 하나로
  if (runs.length > 1 && runs[0][0] === 1 && runs[runs.length - 1][1] === 12) {
    const first = runs.shift()!
    runs[runs.length - 1][1] = first[1] // [12,12] → [12,4]
  }
  return runs.map(([a, b]) => (a === b ? `${a}월` : `${a}~${b}월`)).join(', ')
}
