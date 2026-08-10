import type { NutritionView } from '../nutrition'

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
    <>
      {/* 영양 블록은 스탯 너비로 줄여 카드 중앙에 두고, "100g 기준"은 그 블록 안에서
          우측 정렬 → 스탯 너비 아래 오른쪽에 붙는다. self-center가 그 핵심이다. */}
      <div className="text-ink self-center">
        {/* 스탯 6개가 모바일 카드 폭(~325px)에 한 줄로 들어오게 간격을 lg로.
            xl(1.5rem)이면 6셀+간격이 폭을 ~10px 넘겨 지방 하나가 둘째 줄로 밀렸다. */}
        <div className="flex flex-wrap gap-lg justify-center">
          {cells.map((c) => (
            <span className="flex flex-col items-center" key={c.label}>
              <span className="text-2xs tracking-wider text-muted">{c.label}</span>
              <span className="text-md font-bold text-ink tabular-nums mt-3xs">
                {c.num}
                <span className="text-2xs font-semibold ml-3xs">{c.unit}</span>
              </span>
            </span>
          ))}
        </div>
        {/* m-0을 넣지 않는다 — 원래 .serv는 margin-top만 지정하고 <p>의 UA margin-bottom은
            그대로 둔다. .nutrition이 flex 아이템이라 그 마진이 상쇄되지 않고 실제 높이(약 11px)로
            남아 있다. m-0을 넣으면 펼친 카드가 그만큼 짧아진다. */}
        <p className="text-2xs text-muted text-right mt-2xs">{nutrition.serving} 기준</p>
      </div>
    </>
  )
}
