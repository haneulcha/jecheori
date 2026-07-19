/** 식약처 원물명의 상태 접미(마지막 토큰류)로 조리 상태를 분류.
 *  이름에 상태 토큰이 없으면 생것(raw)으로 본다. */
const COOKED = ['데친것', '삶은것', '찐것', '구운것', '볶은것', '조림', '튀김', '부침', '삶은']
const PROCESSED = [
  '통조림', '주스', '말린것', '건조', '냉동', '당절임', '설탕', '시럽',
  '분말', '가루', '잼', '농축', '절임', '장아찌', '액상',
]

export function classifyPrep(foodName) {
  if (PROCESSED.some((t) => foodName.includes(t))) return 'processed'
  if (COOKED.some((t) => foodName.includes(t))) return 'cooked'
  return 'raw'
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
