/** 식약처 원물명의 상태 접미(마지막 토큰류)로 조리 상태를 분류.
 *  원물 항목은 실데이터상 항상 '생것'을 명시한다("감자_수미_생것"). '감자 및 전분류' 등엔
 *  상태표시 없는 가공품(감자전분 등)이 섞여 있어, '생것' 명시가 있어야 raw, 없으면
 *  (cooked 토큰도 없으면) 원물이 아닌 것으로 보고 제외한다. */
const PROCESSED = [
  '말린것', '건조', '통조림', '주스', '냉동', '당절임', '설탕', '시럽',
  '분말', '가루', '잼', '농축', '절임', '장아찌', '액상', '전분', '플레이크', '칩',
]
const COOKED = ['삶은것', '데친것', '찐것', '구운것', '볶은것', '조림', '부침', '튀김', '구이']

export function classifyPrep(foodName) {
  if (PROCESSED.some((t) => foodName.includes(t))) return 'processed'
  if (foodName.includes('생것')) return 'raw'
  if (COOKED.some((t) => foodName.includes(t))) return 'cooked'
  return 'processed' // 상태표시 없는 이름(감자전분·감자국·오이지)은 원물 아님 → 제외
}

const PREP_RANK = { raw: 0, cooked: 1 }

/** 중가공 제외 후 생것 우선 정렬. pick=첫 항목, flag=상태.
 *  같은 상태끼리는 토큰 수·이름 길이가 짧은(더 일반적인) 것을 먼저 둔다. */
export function rankNutritionCandidates(candidates) {
  const ranked = candidates
    .map((cand) => ({ ...cand, prep: classifyPrep(cand.foodName) }))
    .filter((cand) => cand.prep !== 'processed')
    .sort(
      (a, b) =>
        PREP_RANK[a.prep] - PREP_RANK[b.prep] ||
        a.foodName.split('_').length - b.foodName.split('_').length ||
        a.foodName.length - b.foodName.length,
    )
  const pick = ranked[0] ?? null
  const flag = pick === null ? 'no-match' : pick.prep === 'cooked' ? 'cooked' : 'ok'
  return { pick, ranked, flag }
}
