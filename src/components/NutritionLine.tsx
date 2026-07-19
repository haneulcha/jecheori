import type { NutritionView } from '../nutrition'
import styles from './NutritionLine.module.css'

/** 소수 첫째 자리까지, 정수면 정수로 (11.13 → "11.1", 53 → "53"). */
function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

/** 카드 펼침 영역의 영양 스탯 — 열량·탄수화물·당류·식이섬유·단백질·지방을 라벨-값으로.
 *  탄수화물 계열(탄수화물·당류·식이섬유)을 먼저 묶고 단백질·지방을 잇는다.
 *  결측 항목은 셀을 만들지 않고, 하나도 없으면 아무것도 그리지 않는다.
 *  출처는 카드마다 반복하지 않고 페이지 하단에 한 번 표기한다. */
export function NutritionLine({ nutrition }: { nutrition: NutritionView }) {
  const cells: { label: string; num: string; unit: string }[] = []
  if (nutrition.kcal !== null) cells.push({ label: '열량', num: fmt(nutrition.kcal), unit: 'kcal' })
  if (nutrition.carbs !== null) cells.push({ label: '탄수화물', num: fmt(nutrition.carbs), unit: 'g' })
  if (nutrition.sugar !== null) cells.push({ label: '당류', num: fmt(nutrition.sugar), unit: 'g' })
  if (nutrition.fiber !== null) cells.push({ label: '식이섬유', num: fmt(nutrition.fiber), unit: 'g' })
  if (nutrition.protein !== null) cells.push({ label: '단백질', num: fmt(nutrition.protein), unit: 'g' })
  if (nutrition.fat !== null) cells.push({ label: '지방', num: fmt(nutrition.fat), unit: 'g' })
  if (cells.length === 0) return null
  return (
    <div className={styles.nutrition}>
      <div className={styles.stats}>
        {cells.map((c) => (
          <span className={styles.cell} key={c.label}>
            <span className={styles.lab}>{c.label}</span>
            <span className={styles.val}>
              {c.num}
              <span className={styles.u}>{c.unit}</span>
            </span>
          </span>
        ))}
      </div>
      <p className={styles.serv}>{nutrition.serving} 기준</p>
    </div>
  )
}
