import type { NutritionView } from '../nutrition'

/** 소수 첫째 자리까지, 정수면 정수로 (11.13 → "11.1", 53 → "53"). */
function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

/** 카드 펼침 영역의 영양 스탯 — 열량·당류·식이섬유를 라벨-값으로.
 *  결측 항목은 셀을 만들지 않고, 셋 다 없으면 아무것도 그리지 않는다.
 *  출처는 카드마다 반복하지 않고 페이지 하단에 한 번 표기한다. */
export function NutritionLine({ nutrition }: { nutrition: NutritionView }) {
  const cells: { label: string; num: string; unit: string }[] = []
  if (nutrition.kcal !== null) cells.push({ label: '열량', num: fmt(nutrition.kcal), unit: 'kcal' })
  if (nutrition.sugar !== null) cells.push({ label: '당류', num: fmt(nutrition.sugar), unit: 'g' })
  if (nutrition.fiber !== null) cells.push({ label: '식이섬유', num: fmt(nutrition.fiber), unit: 'g' })
  if (cells.length === 0) return null
  return (
    <div className="nutrition">
      <div className="stats">
        {cells.map((c) => (
          <span className="cell" key={c.label}>
            <span className="lab">{c.label}</span>
            <span className="val">
              {c.num}
              <span className="u">{c.unit}</span>
            </span>
          </span>
        ))}
      </div>
      <p className="serv">{nutrition.serving} 기준</p>
    </div>
  )
}
